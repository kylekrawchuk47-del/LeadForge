import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";

export const adConnectionsTable = pgTable("ad_connections", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  platform: text("platform").notNull(), // "meta" | "google"
  accountId: text("account_id"),
  accountName: text("account_name"),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type AdConnection = typeof adConnectionsTable.$inferSelect;
export type InsertAdConnection = typeof adConnectionsTable.$inferInsert;
