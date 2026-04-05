import { initPostHog } from "./posthog";
import { initPlausible } from "./plausible";

export function initAnalytics() {
  initPostHog();
}

export function initPlausibleAnalytics() {
  initPlausible();
}
