import { getStripeSync, getUncachableStripeClient } from "./stripeClient";
import {
  db, usersTable, creditTransactionsTable, analyticsEventsTable,
  referralsTable, subscriptionCreditsTable,
} from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { logger } from "./lib/logger";
import { getPlanCreditLimit } from "@workspace/credits";

// Map Stripe price IDs to plan names
const PRICE_TO_PLAN: Record<string, string> = {
  "price_1TIPrT87xwLZFMFUABWYHxRh": "pro",
  "price_1TIPrU87xwLZFMFUANXT0LKp": "agency",
  ...(process.env.FULL_ACCESS_STRIPE_PRICE_ID
    ? { [process.env.FULL_ACCESS_STRIPE_PRICE_ID]: "full_access" }
    : {}),
};

async function findUserByStripeCustomerId(customerId: string) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.stripeCustomerId, customerId));
  return user ?? null;
}

async function activatePlan(clerkUserId: string, plan: string) {
  const planLimit = getPlanCreditLimit(plan);
  const now = new Date();
  await db
    .update(usersTable)
    .set({ plan, credits: planLimit, creditsResetAt: now, imageGenerationsUsed: 0, refinementsUsed: 0, exportsUsed: 0 })
    .where(eq(usersTable.clerkUserId, clerkUserId));
  await db.insert(creditTransactionsTable).values({
    clerkUserId,
    amount: planLimit,
    type: "MONTHLY_RESET",
    description: `Plan activated: ${plan} — ${planLimit} credits granted`,
  });
  db.insert(analyticsEventsTable).values({
    userId: clerkUserId,
    eventType: "subscription_active",
    eventCategory: "internal",
    metadata: { plan, credits: planLimit },
  }).catch(() => undefined);
  logger.info({ clerkUserId, plan, credits: planLimit }, "User plan activated via webhook");
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "STRIPE WEBHOOK ERROR: Payload must be a Buffer. " +
        "Received type: " + typeof payload + ". " +
        "This usually means express.json() parsed the body before reaching this handler. " +
        "FIX: Ensure webhook route is registered BEFORE app.use(express.json())."
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    try {
      const event = JSON.parse(payload.toString());
      const type: string = event.type;
      const obj = event.data?.object;

      // ── Credit top-up (one-time payment) ──────────────────────────────────
      if (
        type === "checkout.session.completed" &&
        obj?.mode === "payment" &&
        obj?.payment_status === "paid"
      ) {
        const clerkUserId: string | undefined = obj.metadata?.clerkUserId;
        const creditsAmount: string | undefined = obj.metadata?.creditsAmount;

        if (clerkUserId && creditsAmount) {
          const credits = parseInt(creditsAmount, 10);
          if (credits > 0) {
            await db
              .update(usersTable)
              .set({ addonCredits: sql`${usersTable.addonCredits} + ${credits}` })
              .where(eq(usersTable.clerkUserId, clerkUserId));
            await db.insert(creditTransactionsTable).values({
              clerkUserId,
              amount: credits,
              type: "TOPUP",
              description: `Purchased ${credits} add-on credits`,
            });
            logger.info({ clerkUserId, credits }, "Add-on credits added after successful one-time payment");
          }
        }
      }

      // ── Subscription created or updated → activate/update plan ────────────
      if (type === "customer.subscription.created" || type === "customer.subscription.updated") {
        const customerId: string | undefined = obj?.customer;
        const status: string | undefined = obj?.status;
        const priceId: string | undefined = obj?.items?.data?.[0]?.price?.id;

        if (!customerId || !priceId) {
          logger.warn({ type, customerId, priceId }, "Subscription event missing customer or price ID");
          return;
        }

        if (!["active", "trialing"].includes(status ?? "")) {
          logger.info({ type, status }, "Ignoring subscription event with non-active status");
          return;
        }

        const plan = PRICE_TO_PLAN[priceId];
        if (!plan) {
          logger.warn({ priceId }, "Unknown price ID in subscription event — cannot determine plan");
          return;
        }

        const user = await findUserByStripeCustomerId(customerId);
        if (!user) {
          logger.warn({ customerId }, "No user found for Stripe customer — plan will update lazily");
          return;
        }

        if (user.plan !== plan) {
          await activatePlan(user.clerkUserId, plan);
        } else {
          const planLimit = getPlanCreditLimit(plan);
          const now = new Date();
          const lastReset = user.creditsResetAt ? new Date(user.creditsResetAt) : null;
          const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
          const isPastMonth = !lastReset || (now.getTime() - lastReset.getTime()) > thirtyDaysMs;

          if (isPastMonth && type === "customer.subscription.updated") {
            await db
              .update(usersTable)
              .set({ credits: planLimit, creditsResetAt: now, imageGenerationsUsed: 0, refinementsUsed: 0, exportsUsed: 0 })
              .where(eq(usersTable.clerkUserId, user.clerkUserId));
            await db.insert(creditTransactionsTable).values({
              clerkUserId: user.clerkUserId,
              amount: planLimit,
              type: "MONTHLY_RESET",
              description: `Monthly credit reset — ${plan} plan (${planLimit} credits)`,
            });
            logger.info({ clerkUserId: user.clerkUserId, plan, credits: planLimit }, "Monthly credits reset via webhook");
          }
        }
      }

      // ── Invoice paid → issue referral reward + mark applied credits ────────
      if (type === "invoice.payment_succeeded") {
        const customerId: string | undefined = obj?.customer;
        const amountPaid: number | undefined = obj?.amount_paid;
        const billingReason: string | undefined = obj?.billing_reason;
        const invoiceId: string | undefined = obj?.id;
        const startingBalance: number | undefined = obj?.starting_balance;
        const endingBalance: number | undefined = obj?.ending_balance;

        if (!customerId) return;

        // ── 1. Issue $10 referral credit when a referred user pays their first subscription invoice
        if (amountPaid && amountPaid > 0 && billingReason === "subscription_create") {
          try {
            const payer = await findUserByStripeCustomerId(customerId);
            if (payer) {
              const [referral] = await db
                .select()
                .from(referralsTable)
                .where(eq(referralsTable.referredUserId, payer.clerkUserId));

              if (referral && referral.status === "pending") {
                const [referrerUser] = await db
                  .select({ clerkUserId: usersTable.clerkUserId, stripeCustomerId: usersTable.stripeCustomerId })
                  .from(usersTable)
                  .where(eq(usersTable.clerkUserId, referral.referrerId));

                if (referrerUser?.stripeCustomerId) {
                  const stripe = await getUncachableStripeClient();
                  const balanceTxn = await stripe.customers.createBalanceTransaction(
                    referrerUser.stripeCustomerId,
                    {
                      amount: -1000,
                      currency: "usd",
                      description: "Referral reward — friend subscribed to LeadForge",
                    }
                  );

                  // Update referral status
                  await db
                    .update(referralsTable)
                    .set({ status: "rewarded", rewardedAt: new Date() })
                    .where(eq(referralsTable.id, referral.id));

                  // Record in subscription_credits for local tracking
                  await db.insert(subscriptionCreditsTable).values({
                    clerkUserId: referrerUser.clerkUserId,
                    amountCents: 1000,
                    referralId: referral.id,
                    status: "available",
                    stripeBalanceTxnId: balanceTxn.id,
                  });

                  logger.info(
                    { referrerId: referrerUser.clerkUserId, referredUserId: payer.clerkUserId, balanceTxnId: balanceTxn.id },
                    "Referral reward issued: $10 Stripe balance credit + subscription_credits record created"
                  );
                }
              }
            }
          } catch (err) {
            logger.error({ err }, "Error processing referral reward");
          }
        }

        // ── 2. Mark subscription credits as applied when Stripe consumed balance on a paid invoice
        //    Stripe auto-applies negative customer balance to invoices.
        //    If starting_balance < 0, a credit was applied on this invoice.
        if (
          startingBalance !== undefined &&
          endingBalance !== undefined &&
          startingBalance < 0 &&
          invoiceId
        ) {
          try {
            const invoiceHolder = await findUserByStripeCustomerId(customerId);
            if (invoiceHolder) {
              // How many cents were applied (capped by invoice amount to prevent going below $0)
              const appliedCents = Math.min(Math.abs(startingBalance), amountPaid ?? 0);
              if (appliedCents <= 0) return;

              // Mark the oldest available credits for this user as applied, up to appliedCents
              const availableCredits = await db
                .select()
                .from(subscriptionCreditsTable)
                .where(
                  and(
                    eq(subscriptionCreditsTable.clerkUserId, invoiceHolder.clerkUserId),
                    eq(subscriptionCreditsTable.status, "available")
                  )
                )
                .orderBy(subscriptionCreditsTable.createdAt);

              let remaining = appliedCents;
              const now = new Date();

              for (const credit of availableCredits) {
                if (remaining <= 0) break;
                await db
                  .update(subscriptionCreditsTable)
                  .set({ status: "applied", appliedToInvoiceId: invoiceId, appliedAt: now })
                  .where(eq(subscriptionCreditsTable.id, credit.id));
                remaining -= credit.amountCents;
              }

              logger.info(
                { clerkUserId: invoiceHolder.clerkUserId, invoiceId, appliedCents },
                "Subscription credits marked as applied"
              );
            }
          } catch (err) {
            logger.error({ err }, "Error marking subscription credits as applied");
          }
        }
      }

      // ── Subscription cancelled → downgrade to free ─────────────────────────
      if (type === "customer.subscription.deleted") {
        const customerId: string | undefined = obj?.customer;
        if (!customerId) return;

        const user = await findUserByStripeCustomerId(customerId);
        if (!user) return;

        const previousPlan = user.plan;

        await db
          .update(usersTable)
          .set({ plan: "free", stripeSubscriptionId: null })
          .where(eq(usersTable.clerkUserId, user.clerkUserId));

        db.insert(analyticsEventsTable).values({
          userId: user.clerkUserId,
          eventType: "subscription_canceled",
          eventCategory: "internal",
          metadata: { previous_plan: previousPlan },
        }).catch(() => undefined);

        logger.info({ clerkUserId: user.clerkUserId }, "User downgraded to free after subscription cancelled");
      }

    } catch (err) {
      logger.error({ err }, "Error processing custom webhook logic");
    }
  }
}
