import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const adRefinementsTable = pgTable("ad_refinements", {
  id: uuid("id").primaryKey().defaultRandom(),
  generationId: uuid("generation_id").notNull(),
  actionType: text("action_type").notNull(),
  newPromptText: text("new_prompt_text").notNull(),
  newImageUrl: text("new_image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AdRefinement = typeof adRefinementsTable.$inferSelect;
