import { useEffect, useState } from "react";

// Matches the response shape from GET /api/analytics/business-summary
export type BusinessAnalyticsResponse = {
  overview: {
    totals: {
      landingPageViews: number;
      formStarts: number;
      formSubmissions: number;
      leadsCaptured: number;
      emailsSent: number;
      emailOpens: number;
      emailClicks: number;
      unsubscribes: number;
      facebookLeads: number;
      instagramLeads: number;
      googleLeads: number;
      emailLeads: number;
      directLeads: number;
      referralLeads: number;
      conversionRate: number;
      emailOpenRate: number;
      emailClickRate: number;
    };
    timeseries: Array<{
      day: string;
      landingPageViews: number;
      formStarts: number;
      formSubmissions: number;
      leadsCaptured: number;
      emailsSent: number;
      emailOpens: number;
      emailClicks: number;
      unsubscribes: number;
      facebookLeads: number;
      instagramLeads: number;
      googleLeads: number;
      emailLeads: number;
      directLeads: number;
      referralLeads: number;
    }>;
  };
  campaigns: Array<{
    projectId: number;   // integer FK to projects table — NOT a string campaignId
    day: string;
    visits: number;
    leads: number;
    emailSent: number;
    emailOpened: number;
    emailClicked: number;
    sourceFacebook: number;
    sourceInstagram: number;
    sourceGoogle: number;
    sourceEmail: number;
    sourceDirect: number;
    sourceReferral: number;
  }>;
};

export function useBusinessAnalytics(from: string, to: string) {
  const [data, setData] = useState<BusinessAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        // userId is derived server-side from the Clerk auth token — no param needed in the URL
        const res = await fetch(`/api/analytics/business-summary?from=${from}&to=${to}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: BusinessAnalyticsResponse = await res.json();
        if (!cancelled) {
          setData(json);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load analytics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => { cancelled = true; };
  }, [from, to]);

  return { data, loading, error };
}
