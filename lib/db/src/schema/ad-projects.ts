import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const adProjectsTable = pgTable("ad_projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  businessName: text("business_name").notNull(),
  service: text("service").notNull(),
  location: text("location"),
  offer: text("offer"),
  cta: text("cta").notNull(),
  tone: text("tone").notNull().default("professional"),
  format: text("format").notNull().default("square"),
  goal: text("goal").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AdProject = typeof adProjectsTable.$inferSelect;
export type NewAdProject = typeof adProjectsTable.$inferInsert;
