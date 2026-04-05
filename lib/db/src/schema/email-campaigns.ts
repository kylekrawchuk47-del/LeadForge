import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const EMAIL_CAMPAIGN_STATUSES = ["draft", "scheduled", "sent"] as const;
export type EmailCampaignStatus = (typeof EMAIL_CAMPAIGN_STATUSES)[number];

export const EMAIL_SEGMENTS = ["subscribed", "all_consented"] as const;
export type EmailSegment = (typeof EMAIL_SEGMENTS)[number];

export const emailCampaignsTable = pgTable("email_campaigns", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull().default("draft"),
  subject: text("subject"),
  previewText: text("preview_text"),
  headline: text("headline"),
  body: text("body"),
  ctaText: text("cta_text"),
  ctaUrl: text("cta_url"),
  offerContext: text("offer_context"),
  segment: text("segment").notNull().default("subscribed"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  recipientCount: integer("recipient_count").notNull().default(0),
  deliveredCount: integer("delivered_count").notNull().default(0),
  openedCount: integer("opened_count").notNull().default(0),
  clickedCount: integer("clicked_count").notNull().default(0),
  unsubscribedCount: integer("unsubscribed_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertEmailCampaignSchema = createInsertSchema(emailCampaignsTable).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  sentAt: true,
  recipientCount: true,
  deliveredCount: true,
  openedCount: true,
  clickedCount: true,
  unsubscribedCount: true,
});

export type InsertEmailCampaign = z.infer<typeof insertEmailCampaignSchema>;
export type EmailCampaign = typeof emailCampaignsTable.$inferSelect;
