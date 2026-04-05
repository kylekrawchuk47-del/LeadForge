import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { db, usersTable, referralsTable, subscriptionCreditsTable } from "@workspace/db";
import { eq, and, sum } from "drizzle-orm";
import { clerkClient } from "@clerk/express";
import { logger } from "../lib/logger";
import { randomBytes } from "crypto";

const router: IRouter = Router();

function generateCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

async function getOrCreateReferralCode(clerkUserId: string): Promise<string> {
  const [user] = await db
    .select({ referralCode: usersTable.referralCode })
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId));

  if (user?.referralCode) return user.referralCode;

  let code = generateCode();
  let attempts = 0;

  while (attempts < 5) {
    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.referralCode, code));

    if (!existing) break;
    code = generateCode();
    attempts++;
  }

  await db
    .update(usersTable)
    .set({ referralCode: code })
    .where(eq(usersTable.clerkUserId, clerkUserId));

  return code;
}

router.get("/referral/my-code", requireAuth, async (req, res): Promise<void> => {
  try {
    const code = await getOrCreateReferralCode(req.userId!);
    res.json({ referralCode: code });
  } catch (err) {
    logger.error({ err }, "Error fetching referral code");
    res.status(500).json({ error: "Failed to fetch referral code" });
  }
});

router.get("/referral/stats", requireAuth, async (req, res): Promise<void> => {
  try {
    const code = await getOrCreateReferralCode(req.userId!);

    // All referrals this user sent
    const allReferrals = await db
      .select()
      .from(referralsTable)
      .where(eq(referralsTable.referrerId, req.userId!))
      .orderBy(referralsTable.createdAt);

    const successfulReferrals = allReferrals.filter(r => r.status === "rewarded").length;
    const totalEarned = successfulReferrals * 10;

    // Available credits from subscription_credits table
    const availableRows = await db
      .select()
      .from(subscriptionCreditsTable)
      .where(
        and(
          eq(subscriptionCreditsTable.clerkUserId, req.userId!),
          eq(subscriptionCreditsTable.status, "available")
        )
      );

    const availableBalance = availableRows.reduce((sum, r) => sum + r.amountCents, 0) / 100;

    const history = allReferrals.map(r => ({
      email: r.referredUserEmail ?? "—",
      status: r.status === "rewarded" ? "completed" : "pending",
      reward: r.status === "rewarded" ? 10 : null,
      date: r.createdAt,
    }));

    res.json({
      referralCode: code,
      successfulReferrals,
      totalReferrals: allReferrals.length,
      totalEarned,
      availableBalance,
      history,
    });
  } catch (err) {
    logger.error({ err }, "Error fetching referral stats");
    res.status(500).json({ error: "Failed to fetch referral stats" });
  }
});

router.post("/referral/apply", requireAuth, async (req, res): Promise<void> => {
  try {
    const { code } = req.body as { code?: string };
    if (!code || typeof code !== "string" || !code.trim()) {
      res.status(400).json({ error: "Referral code is required" });
      return;
    }

    const normalizedCode = code.trim().toUpperCase();

    const [codeOwner] = await db
      .select({ clerkUserId: usersTable.clerkUserId })
      .from(usersTable)
      .where(eq(usersTable.referralCode, normalizedCode));

    if (!codeOwner) {
      res.status(404).json({ error: "Invalid referral code" });
      return;
    }

    if (codeOwner.clerkUserId === req.userId!) {
      res.status(400).json({ error: "You cannot use your own referral code" });
      return;
    }

    const [existing] = await db
      .select({ id: referralsTable.id })
      .from(referralsTable)
      .where(eq(referralsTable.referredUserId, req.userId!));

    if (existing) {
      res.status(409).json({ error: "You have already applied a referral code" });
      return;
    }

    let referredUserEmail: string | null = null;
    try {
      const clerkUser = await clerkClient.users.getUser(req.userId!);
      referredUserEmail = clerkUser.primaryEmailAddress?.emailAddress ?? null;
    } catch (_err) {
    }

    await db.insert(referralsTable).values({
      referrerId: codeOwner.clerkUserId,
      referredUserId: req.userId!,
      referralCode: normalizedCode,
      referredUserEmail,
      status: "pending",
    });

    logger.info({ referrerId: codeOwner.clerkUserId, referredUserId: req.userId! }, "Referral applied");
    res.json({ success: true, message: "Referral applied — your friend will earn $10 when you subscribe" });
  } catch (err) {
    logger.error({ err }, "Error applying referral code");
    res.status(500).json({ error: "Failed to apply referral code" });
  }
});

export default router;
