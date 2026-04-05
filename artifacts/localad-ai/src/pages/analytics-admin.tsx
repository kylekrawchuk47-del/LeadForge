import { useEffect, useState } from "react";

type InternalSummary = {
  totalSignups: number;
  checkoutStarts: number;
  activeSubscriptions: number;
  campaignGenerations: number;
  pricingViews: number;
  upgradeClicks: number;
};

function AdminStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<InternalSummary | null>(null);

  useEffect(() => {
    fetch(
      "/api/analytics/internal-summary?from=2026-03-01T00:00:00.000Z&to=2026-04-04T23:59:59.999Z"
    )
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <div className="p-6">Loading admin analytics...</div>;

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">LeadForge Analytics</h1>
        <p className="mt-1 text-slate-600">
          Internal product analytics for growth, usage, and subscriptions.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <AdminStat label="Total Signups"        value={data.totalSignups} />
        <AdminStat label="Checkout Starts"      value={data.checkoutStarts} />
        <AdminStat label="Active Subscribers"   value={data.activeSubscriptions} />
        <AdminStat label="Campaigns Generated"  value={data.campaignGenerations} />
        <AdminStat label="Pricing Views"        value={data.pricingViews} />
        <AdminStat label="Upgrade Clicks"       value={data.upgradeClicks} />
      </div>
    </div>
  );
}
