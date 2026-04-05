// Plausible analytics wrapper — tracks custom events for landing page / campaign traffic
// Set VITE_PLAUSIBLE_DOMAIN in environment to enable (e.g. "yourdomain.com")

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string | number | boolean> }) => void;
  }
}

const PLAUSIBLE_DOMAIN = import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined;

function isEnabled(): boolean {
  return !!PLAUSIBLE_DOMAIN && !!window.plausible;
}

export function initPlausible() {
  if (!PLAUSIBLE_DOMAIN) return;

  const existing = document.getElementById("plausible-script");
  if (existing) return;

  const script = document.createElement("script");
  script.id = "plausible-script";
  script.defer = true;
  script.setAttribute("data-domain", PLAUSIBLE_DOMAIN);
  script.src = "https://plausible.io/js/script.tagged-events.js";
  document.head.appendChild(script);
}

export function trackPlausible(
  event: string,
  props?: Record<string, string | number | boolean>
) {
  if (!isEnabled()) return;
  window.plausible!(event, props ? { props } : undefined);
}

export const Plausible = {
  landingPageViewed: (props?: { campaign?: string; source?: string }) =>
    trackPlausible("landing_page_viewed", props),
  formStarted: (props?: { campaign?: string }) =>
    trackPlausible("form_started", props),
  formSubmitted: (props?: { campaign?: string; source?: string }) =>
    trackPlausible("form_submitted", props),
  emailCtaClicked: (props?: { campaign?: string }) =>
    trackPlausible("email_cta_clicked", props),
  campaignCtaClicked: (props?: { campaign?: string; platform?: string }) =>
    trackPlausible("campaign_cta_clicked", props),
};
