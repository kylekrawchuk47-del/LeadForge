import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const subscriptionCreditsTable = pgTable("subscription_credits", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull(),
  amountCents: integer("amount_cents").notNull().default(1000),
  referralId: integer("referral_id").notNull(),
  status: text("status").notNull().default("available"),
  stripeBalanceTxnId: text("stripe_balance_txn_id"),
  appliedToInvoiceId: text("applied_to_invoice_id"),
  appliedAt: timestamp("applied_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SubscriptionCredit = typeof subscriptionCreditsTable.$inferSelect;
