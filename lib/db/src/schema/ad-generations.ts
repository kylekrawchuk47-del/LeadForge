import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const adGenerationsTable = pgTable("ad_generations", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull(),
  variationType: text("variation_type").notNull(),
  promptText: text("prompt_text").notNull(),
  imageUrl: text("image_url"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AdGeneration = typeof adGenerationsTable.$inferSelect;
export type NewAdGeneration = typeof adGenerationsTable.$inferInsert;
