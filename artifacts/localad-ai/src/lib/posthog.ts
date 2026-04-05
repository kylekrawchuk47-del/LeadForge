import posthog from "posthog-js";

let initialized = false;

export function initPostHog() {
  if (initialized) return;
  if (typeof window === "undefined") return;

  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
  const apiHost = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? "https://us.i.posthog.com";

  if (!key) return;

  posthog.init(key, {
    api_host: apiHost,
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
  });

  initialized = true;
}

export { posthog };
