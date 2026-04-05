import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const referralsTable = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: text("referrer_id").notNull(),
  referredUserId: text("referred_user_id").notNull().unique(),
  referralCode: text("referral_code").notNull(),
  referredUserEmail: text("referred_user_email"),
  status: text("status").notNull().default("pending"),
  rewardedAt: timestamp("rewarded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Referral = typeof referralsTable.$inferSelect;
