import { pgTable, text, serial, timestamp, jsonb, integer } from "drizzle-orm/pg-core";

// ─── Canonical event name types ───────────────────────────────────────────────

export type InternalEventName =
  | "homepage_viewed"
  | "pricing_viewed"
  | "signup_started"
  | "signup_completed"
  | "onboarding_completed"
  | "campaign_generated"
  | "landing_page_generated"
  | "email_campaign_created"
  | "credits_low"
  | "upgrade_clicked"
  | "checkout_started"
  | "subscription_active"
  | "subscription_canceled";

export type BusinessEventName =
  | "landing_page_viewed"
  | "form_started"
  | "form_submitted"
  | "lead_captured"
  | "email_sent"
  | "email_opened"
  | "email_clicked"
  | "unsubscribe_clicked"
  | "campaign_cta_clicked";

export type LeadSource =
  | "facebook"
  | "instagram"
  | "google"
  | "email"
  | "direct"
  | "referral";

export type EventCategory = "internal" | "business";

// Union for any tracked event name
export type AnalyticsEventType = InternalEventName | BusinessEventName;

// Maps each event name to its category — used server-side when inserting events
export const EVENT_CATEGORY_MAP: Record<AnalyticsEventType, EventCategory> = {
  // internal
  homepage_viewed: "internal",
  pricing_viewed: "internal",
  signup_started: "internal",
  signup_completed: "internal",
  onboarding_completed: "internal",
  campaign_generated: "internal",
  landing_page_generated: "internal",
  email_campaign_created: "internal",
  credits_low: "internal",
  upgrade_clicked: "internal",
  checkout_started: "internal",
  subscription_active: "internal",
  subscription_canceled: "internal",
  // business
  landing_page_viewed: "business",
  form_started: "business",
  form_submitted: "business",
  lead_captured: "business",
  email_sent: "business",
  email_opened: "business",
  email_clicked: "business",
  unsubscribe_clicked: "business",
  campaign_cta_clicked: "business",
};

export const LEAD_SOURCES: LeadSource[] = [
  "facebook",
  "instagram",
  "google",
  "email",
  "direct",
  "referral",
];

// ─── Table ─────────────────────────────────────────────────────────────────────

export const analyticsEventsTable = pgTable("analytics_events", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  // eventType holds the specific event name (e.g. "lead_captured", "campaign_generated")
  eventType: text("event_type").notNull(),
  // eventCategory distinguishes platform funnel events from customer-facing events
  eventCategory: text("event_category"),
  projectId: integer("project_id"),
  sessionId: text("session_id"),
  source: text("source"),
  medium: text("medium"),
  campaign: text("campaign"),
  referrer: text("referrer"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AnalyticsEvent = typeof analyticsEventsTable.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEventsTable.$inferInsert;
