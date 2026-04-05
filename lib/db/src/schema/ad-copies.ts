import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const adCopiesTable = pgTable("ad_copies", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  headline: text("headline").notNull(),
  subheadline: text("subheadline"),
  offerLine: text("offer_line"),
  cta: text("cta"),
  supportingBulletsJson: text("supporting_bullets_json"),
  designDirection: text("design_direction"),
  imageDirection: text("image_direction"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AdCopy = typeof adCopiesTable.$inferSelect;
export type NewAdCopy = typeof adCopiesTable.$inferInsert;
