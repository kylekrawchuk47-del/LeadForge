// Canonical analytics event types — kept in sync with lib/db/src/schema/analytics-events.ts

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

export type AnalyticsEventName = InternalEventName | BusinessEventName;
