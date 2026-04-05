import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const creditTransactionsTable = pgTable("credit_transactions", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull(),
  amount: integer("amount").notNull(),
  type: text("type").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CreditTransaction = typeof creditTransactionsTable.$inferSelect;
