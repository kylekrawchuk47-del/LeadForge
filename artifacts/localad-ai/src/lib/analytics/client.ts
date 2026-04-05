import { posthog } from "../posthog";
import type { InternalEventName } from "./types";

export { initPostHog as initAnalytics } from "../posthog";

// ─── User identification ───────────────────────────────────────────────────────

export function identifyAnalyticsUser(user: {
  id: string;
  email?: string | null;
  businessType?: string | null;
  city?: string | null;
  currentPlan?: string | null;
  creditsRemaining?: number | null;
  signupDate?: string | null;
  role?: string | null;
}) {
  posthog.identify(user.id, {
    email: user.email ?? undefined,
    business_type: user.businessType ?? undefined,
    city: user.city ?? undefined,
    current_plan: user.currentPlan ?? undefined,
    credits_remaining: user.creditsRemaining ?? undefined,
    signup_date: user.signupDate ?? undefined,
    role: user.role ?? undefined,
  });
}

// ─── Type-safe event tracking ─────────────────────────────────────────────────

export function trackInternalEvent(
  event: InternalEventName,
  properties?: Record<string, unknown>
) {
  posthog.capture(event, properties ?? {});
}

export function resetAnalytics() {
  posthog.reset();
}

// ─── Named event helpers ──────────────────────────────────────────────────────
// These map 1:1 to InternalEventName — call sites stay readable and refactor-safe.

export const Analytics = {
  homepageViewed: () =>
    trackInternalEvent("homepage_viewed"),
  pricingViewed: () =>
    trackInternalEvent("pricing_viewed"),
  signupStarted: () =>
    trackInternalEvent("signup_started"),
  signupCompleted: (props?: { plan?: string }) =>
    trackInternalEvent("signup_completed", props),
  onboardingCompleted: (props?: { business_type?: string; city?: string }) =>
    trackInternalEvent("onboarding_completed", props),
  campaignGenerated: (props?: { platform?: string; goal?: string; tone?: string; credits_remaining?: number }) =>
    trackInternalEvent("campaign_generated", props),
  landingPageGenerated: (props?: { credits_remaining?: number }) =>
    trackInternalEvent("landing_page_generated", props),
  emailCampaignCreated: (props?: { credits_remaining?: number }) =>
    trackInternalEvent("email_campaign_created", props),
  creditsLow: (props?: { credits_remaining?: number; plan?: string }) =>
    trackInternalEvent("credits_low", props),
  upgradeClicked: (props?: { from_plan?: string; to_plan?: string; location?: string }) =>
    trackInternalEvent("upgrade_clicked", props),
  checkoutStarted: (props?: { plan?: string; price_id?: string }) =>
    trackInternalEvent("checkout_started", props),
  subscriptionActive: (props?: { plan?: string }) =>
    trackInternalEvent("subscription_active", props),
  subscriptionCanceled: (props?: { plan?: string }) =>
    trackInternalEvent("subscription_canceled", props),
};
