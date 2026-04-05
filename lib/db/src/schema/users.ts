import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  plan: text("plan").notNull().default("free"),
  role: text("role").notNull().default("user"),
  credits: integer("credits").notNull().default(0),
  addonCredits: integer("addon_credits").notNull().default(0),
  creditsResetAt: timestamp("credits_reset_at", { withTimezone: true }),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  referralCode: text("referral_code").unique(),
  imageGenerationsUsed: integer("image_generations_used").notNull().default(0),
  refinementsUsed: integer("refinements_used").notNull().default(0),
  exportsUsed: integer("exports_used").notNull().default(0),
  imageTrialUsed: boolean("image_trial_used").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
