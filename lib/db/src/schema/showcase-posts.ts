import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const showcasePostsTable = pgTable("showcase_posts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  platform: text("platform").notNull(), // "facebook" | "instagram"
  socialConnectionId: text("social_connection_id").notNull(),
  externalPostId: text("external_post_id").notNull(),
  caption: text("caption"),
  mediaType: text("media_type"),
  mediaUrl: text("media_url"),
  permalink: text("permalink"),
  thumbnailUrl: text("thumbnail_url"),
  postTimestamp: timestamp("post_timestamp", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type ShowcasePost = typeof showcasePostsTable.$inferSelect;
export type InsertShowcasePost = typeof showcasePostsTable.$inferInsert;
