import { useMemo } from "react";
import { useBusinessAnalytics } from "@/hooks/use-business-analytics";

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
      {helper ? <div className="mt-1 text-sm text-slate-500">{helper}</div> : null}
    </div>
  );
}

export default function AnalyticsBusinessPage() {
  const from = "2026-03-01";
  const to = "2026-04-04";

  // userId is derived server-side from the Clerk auth token — no prop needed
  const { data, loading } = useBusinessAnalytics(from, to);

  const sourceRows = useMemo(() => {
    if (!data) return [];
    const t = data.overview.totals;
    const total =
      t.facebookLeads +
      t.instagramLeads +
      t.googleLeads +
      t.emailLeads +
      t.directLeads +
      t.referralLeads;

    const rows = [
      { label: "Facebook",  value: t.facebookLeads },
      { label: "Instagram", value: t.instagramLeads },
      { label: "Google",    value: t.googleLeads },
      { label: "Email",     value: t.emailLeads },
      { label: "Direct",    value: t.directLeads },
      { label: "Referral",  value: t.referralLeads },
    ];

    return rows.map((row) => ({
      ...row,
      pct: total > 0 ? ((row.value / total) * 100).toFixed(1) : "0.0",
    }));
  }, [data]);

  if (loading || !data) {
    return <div className="p-6">Loading analytics...</div>;
  }

  const t = data.overview.totals;

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
        <p className="mt-1 text-slate-600">
          Track your campaign performance, leads, and conversions in one place.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Leads This Month"    value={t.leadsCaptured} />
        <StatCard label="Landing Page Visits" value={t.landingPageViews} />
        <StatCard label="Conversion Rate"     value={`${t.conversionRate}%`} />
        <StatCard label="Emails Sent"         value={t.emailsSent} />
        <StatCard label="Email Open Rate"     value={`${t.emailOpenRate}%`} />
        <StatCard label="Email Click Rate"    value={`${t.emailClickRate}%`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Lead Sources</h2>
          <div className="mt-4 space-y-3">
            {sourceRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-slate-700">{row.label}</span>
                <span className="font-medium text-slate-900">
                  {row.value} ({row.pct}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Insights</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <div className="rounded-xl bg-slate-50 p-4">
              Your top conversion rate is currently {t.conversionRate}%.
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              Google and Facebook appear to be your strongest lead sources.
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              Email engagement is {t.emailOpenRate}% open rate and{" "}
              {t.emailClickRate}% click rate.
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Campaign Activity</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="py-3 pr-4">Project ID</th>
                <th className="py-3 pr-4">Day</th>
                <th className="py-3 pr-4">Visits</th>
                <th className="py-3 pr-4">Leads</th>
                <th className="py-3 pr-4">Email Sent</th>
                <th className="py-3 pr-4">Email Opened</th>
                <th className="py-3">Email Clicked</th>
              </tr>
            </thead>
            <tbody>
              {data.campaigns.map((row) => (
                <tr
                  key={`${row.projectId}-${row.day}`}
                  className="border-b border-slate-100"
                >
                  <td className="py-3 pr-4 font-medium text-slate-900">
                    {row.projectId}
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{row.day}</td>
                  <td className="py-3 pr-4">{row.visits}</td>
                  <td className="py-3 pr-4">{row.leads}</td>
                  <td className="py-3 pr-4">{row.emailSent}</td>
                  <td className="py-3 pr-4">{row.emailOpened}</td>
                  <td className="py-3">{row.emailClicked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
