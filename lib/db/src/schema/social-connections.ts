import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const socialConnectionsTable = pgTable("social_connections", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  platform: text("platform").notNull(), // "facebook" | "instagram"
  accountId: text("account_id").notNull(),
  username: text("username"),
  displayName: text("display_name"),
  accessToken: text("access_token").notNull(), // encrypted
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type SocialConnection = typeof socialConnectionsTable.$inferSelect;
export type InsertSocialConnection = typeof socialConnectionsTable.$inferInsert;
