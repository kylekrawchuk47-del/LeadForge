import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import {
  Users,
  Eye,
  TrendingUp,
  Mail,
  Megaphone,
  MousePointerClick,
  ArrowUpRight,
  ArrowDownRight,
  BarChart2,
  Minus,
  Sparkles,
  Code2,
  Trophy,
  CalendarDays,
  Zap,
  Activity,
  CheckCircle2,
  FileText,
  MousePointer,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const API = "/api";

// ─── Brand palette ──────────────────────────────────────────────────────────
const CYAN = "#19D3FF";
const BLUE = "#2B85E4";
const GREEN = "#3DD13D";
const EMBER = "#FF7A1A";
const PURPLE = "#A855F7";
const TEAL = "#14B8A6";
const PINK = "#EC4899";
const GOLD = "#F59E0B";

const PIE_COLORS = [CYAN, BLUE, GREEN, EMBER, PURPLE, TEAL, PINK, GOLD];

// ─── Types ───────────────────────────────────────────────────────────────────

interface Overview {
  leadsThisMonth: number;
  leadsLastMonth: number;
  pageVisitsThisMonth: number;
  conversionRate: number;
  emailsSentThisMonth: number;
  emailsOpenedThisMonth: number;
  openRate: number;
  totalContacts: number;
  totalCampaigns: number;
  creditsUsedThisMonth: number;
}

interface TimelinePoint {
  date: string;
  leads: number;
  views: number;
}

interface LeadSource {
  source: string;
  count: number;
}

interface EmailCampaign {
  id: number;
  name: string;
  status: string;
  sentAt: string | null;
  recipientCount: number;
  openedCount: number;
  clickedCount: number;
  unsubscribedCount: number;
  openRate: number;
  clickRate: number;
}

interface CampaignAnalytics {
  id: number;
  businessName: string;
  serviceOffered: string;
  businessType: string;
  city: string;
  createdAt: string;
  pageViews: number;
  ctaClicks: number;
  formSubmissions: number;
}

interface FunnelData {
  pageViews: number;
  campaignViews: number;
  ctaClicks: number;
  leadsCaputred: number;
  formSubmissions: number;
}

interface CreditData {
  timeline: { date: string; used: number }[];
  totalUsedThisMonth: number;
  totalAddedThisMonth: number;
}

interface ActivityEvent {
  id: number;
  eventType: string;
  source: string | null;
  projectId: number | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  website: "Website",
  referral: "Referral",
  google_ads: "Google Ads",
  facebook_ads: "Facebook Ads",
  flyer: "Flyer",
  previous_customer: "Past Customer",
  manual: "Manual Entry",
  imported: "Imported",
};

const EVENT_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  // ── Business events ──────────────────────────────────────────────────
  landing_page_viewed: { label: "Landing page viewed", icon: Eye, color: BLUE },
  form_started: { label: "Form started", icon: FileText, color: CYAN },
  form_submitted: { label: "Form submitted", icon: CheckCircle2, color: GREEN },
  lead_captured: { label: "Lead captured", icon: Users, color: GREEN },
  email_sent: { label: "Email campaign sent", icon: Mail, color: PURPLE },
  email_opened: { label: "Email opened", icon: Mail, color: CYAN },
  email_clicked: { label: "Email link clicked", icon: MousePointer, color: BLUE },
  unsubscribe_clicked: { label: "Unsubscribed", icon: Users, color: EMBER },
  campaign_cta_clicked: { label: "CTA clicked", icon: MousePointer, color: EMBER },
  // ── Internal events ──────────────────────────────────────────────────
  homepage_viewed: { label: "Homepage viewed", icon: Eye, color: BLUE },
  pricing_viewed: { label: "Pricing page viewed", icon: Eye, color: PURPLE },
  signup_started: { label: "Sign-up started", icon: Users, color: CYAN },
  signup_completed: { label: "Sign-up completed", icon: CheckCircle2, color: GREEN },
  onboarding_completed: { label: "Onboarding completed", icon: CheckCircle2, color: GREEN },
  campaign_generated: { label: "Campaign generated", icon: FileText, color: CYAN },
  landing_page_generated: { label: "Landing page generated", icon: FileText, color: BLUE },
  email_campaign_created: { label: "Email campaign created", icon: Mail, color: PURPLE },
  credits_low: { label: "Credits running low", icon: Zap, color: GOLD },
  upgrade_clicked: { label: "Upgrade clicked", icon: Zap, color: GOLD },
  checkout_started: { label: "Checkout started", icon: Zap, color: EMBER },
  subscription_active: { label: "Subscription activated", icon: CheckCircle2, color: GREEN },
  subscription_canceled: { label: "Subscription canceled", icon: Activity, color: EMBER },
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useAnalytics<T>(path: string, defaultValue: T) {
  const { getToken } = useAuth();
  return useQuery<T>({
    queryKey: ["analytics", path],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`${API}${path}`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return defaultValue;
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      className="rounded-2xl border border-border/40 p-5 overflow-hidden relative"
      style={{ background: "#0C1528" }}
    >
      <div className="animate-pulse space-y-3">
        <div className="h-9 w-9 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }} />
        <div className="h-7 rounded-lg w-1/2" style={{ background: "rgba(255,255,255,0.05)" }} />
        <div className="h-3.5 rounded w-2/3" style={{ background: "rgba(255,255,255,0.04)" }} />
        <div className="h-3 rounded w-1/2" style={{ background: "rgba(255,255,255,0.03)" }} />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  trend,
  icon: Icon,
  iconColor,
  iconBg,
}: {
  label: string;
  value: string | number;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
}) {
  return (
    <div
      className="rounded-2xl border border-border/40 p-5 relative overflow-hidden group transition-all duration-200 hover:border-border/70"
      style={{ background: "#0C1528", boxShadow: "0 2px 12px rgba(0,0,0,0.25)" }}
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top left, ${iconColor}08, transparent 60%)` }}
      />
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: iconBg }}
        >
          <Icon className="w-4 h-4" style={{ color: iconColor }} />
        </div>
        {trend && (
          <div
            className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
            style={
              trend === "up"
                ? { background: "rgba(61,209,61,0.12)", color: GREEN }
                : trend === "down"
                ? { background: "rgba(239,68,68,0.12)", color: "#f87171" }
                : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" }
            }
          >
            {trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : trend === "down" ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            <span>{trend === "neutral" ? "Stable" : trend === "up" ? "Up" : "Down"}</span>
          </div>
        )}
      </div>
      <p className="text-2xl font-black text-foreground mb-0.5 tracking-tight">{value}</p>
      <p className="text-sm font-medium text-muted-foreground/80 mb-0.5">{label}</p>
      {sub && <p className="text-xs text-muted-foreground/50">{sub}</p>}
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-bold text-foreground">{title}</h2>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}

const CHART_TOOLTIP_STYLE = {
  background: "#0C1528",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "10px",
  fontSize: 12,
  color: "#ffffff",
  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
};

function EmptyState({ icon: Icon = BarChart2, title, message }: { icon?: React.ElementType; title?: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center px-6">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "rgba(25,211,255,0.07)", border: "1px solid rgba(25,211,255,0.12)" }}
      >
        <Icon className="w-6 h-6" style={{ color: CYAN }} />
      </div>
      {title && <p className="text-sm font-semibold text-foreground mb-1">{title}</p>}
      <p className="text-xs text-muted-foreground max-w-[260px] leading-relaxed">{message}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, React.CSSProperties> = {
    sent: { background: "rgba(61,209,61,0.12)", color: GREEN, border: "1px solid rgba(61,209,61,0.18)" },
    scheduled: { background: "rgba(25,211,255,0.10)", color: CYAN, border: "1px solid rgba(25,211,255,0.16)" },
    draft: { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.08)" },
  };
  const s = styles[status] ?? styles.draft;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold capitalize" style={s}>
      {status}
    </span>
  );
}

function ChartCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-border/40 p-6 ${className}`}
      style={{ background: "#0C1528", boxShadow: "0 2px 16px rgba(0,0,0,0.25)" }}
    >
      {children}
    </div>
  );
}

function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div
      className="animate-pulse rounded-xl w-full"
      style={{ height, background: "rgba(255,255,255,0.03)" }}
    />
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const DATE_RANGES = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

export default function AnalyticsPage() {
  const [dateRange] = useState(30);

  const { data: overview, isLoading: overviewLoading } = useAnalytics<Overview>(
    "/analytics/overview",
    {
      leadsThisMonth: 0, leadsLastMonth: 0, pageVisitsThisMonth: 0,
      conversionRate: 0, emailsSentThisMonth: 0, emailsOpenedThisMonth: 0,
      openRate: 0, totalContacts: 0, totalCampaigns: 0, creditsUsedThisMonth: 0,
    }
  );

  const { data: timelineData, isLoading: timelineLoading } = useAnalytics<{ timeline: TimelinePoint[] }>(
    "/analytics/timeline", { timeline: [] }
  );

  const { data: sourcesData, isLoading: sourcesLoading } = useAnalytics<{ sources: LeadSource[] }>(
    "/analytics/lead-sources", { sources: [] }
  );

  const { data: emailData, isLoading: emailLoading } = useAnalytics<{ campaigns: EmailCampaign[] }>(
    "/analytics/email-performance", { campaigns: [] }
  );

  const { data: campaignData, isLoading: campaignLoading } = useAnalytics<{ campaigns: CampaignAnalytics[] }>(
    "/analytics/campaigns", { campaigns: [] }
  );

  const { data: funnelData, isLoading: funnelLoading } = useAnalytics<FunnelData>(
    "/analytics/funnel",
    { pageViews: 0, campaignViews: 0, ctaClicks: 0, leadsCaputred: 0, formSubmissions: 0 }
  );

  const { data: creditData, isLoading: creditLoading } = useAnalytics<CreditData>(
    "/analytics/credits",
    { timeline: [], totalUsedThisMonth: 0, totalAddedThisMonth: 0 }
  );

  const { data: activityData, isLoading: activityLoading } = useAnalytics<{ events: ActivityEvent[] }>(
    "/analytics/activity", { events: [] }
  );

  // ── Derived data ────────────────────────────────────────────────────────────
  const timeline = (timelineData?.timeline ?? []).map((t) => ({
    ...t,
    date: formatShortDate(t.date),
  }));

  const sources = (sourcesData?.sources ?? []).map((s) => ({
    ...s,
    name: SOURCE_LABELS[s.source] ?? s.source,
  }));

  const emailCampaigns = emailData?.campaigns ?? [];
  const campaigns = campaignData?.campaigns ?? [];
  const events = activityData?.events ?? [];
  const creditTimeline = (creditData?.timeline ?? []).map((t) => ({
    date: formatShortDate(t.date),
    used: t.used,
  }));

  const leadTrend: "up" | "down" | "neutral" =
    (overview?.leadsThisMonth ?? 0) > (overview?.leadsLastMonth ?? 0) ? "up"
    : (overview?.leadsThisMonth ?? 0) < (overview?.leadsLastMonth ?? 0) ? "down"
    : "neutral";

  const bestCampaign = campaigns
    .slice()
    .sort((a, b) => b.formSubmissions - a.formSubmissions)[0];

  const totalSources = sources.reduce((acc, s) => acc + s.count, 0);

  // Funnel steps (always show as percentage of top step)
  const funnelSteps = [
    { label: "Page Views", value: funnelData?.pageViews ?? 0, color: CYAN },
    { label: "Campaign Views", value: funnelData?.campaignViews ?? 0, color: BLUE },
    { label: "CTA Clicks", value: funnelData?.ctaClicks ?? 0, color: EMBER },
    { label: "Leads Captured", value: funnelData?.leadsCaputred ?? 0, color: GREEN },
    { label: "Form Submissions", value: funnelData?.formSubmissions ?? 0, color: PURPLE },
  ];
  const funnelMax = Math.max(...funnelSteps.map((s) => s.value), 1);

  return (
    <div className="space-y-7 pb-8">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your marketing performance — leads, campaigns, emails, and credits.
          </p>
        </div>
        <div
          className="flex items-center gap-1 p-1 rounded-xl border border-border/40"
          style={{ background: "#0C1528" }}
        >
          <CalendarDays className="w-3.5 h-3.5 ml-2 text-muted-foreground" />
          {DATE_RANGES.map((r) => (
            <button
              key={r.value}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
              style={
                dateRange === r.value
                  ? { background: "linear-gradient(135deg, #19D3FF, #2B85E4)", color: "#fff", boxShadow: "0 2px 8px rgba(25,211,255,0.25)" }
                  : { color: "rgba(255,255,255,0.4)" }
              }
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {overviewLoading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard
              label="Leads This Month"
              value={overview?.leadsThisMonth ?? 0}
              sub={`${overview?.leadsLastMonth ?? 0} last month`}
              trend={leadTrend}
              icon={Users}
              iconColor={CYAN}
              iconBg="rgba(25,211,255,0.10)"
            />
            <StatCard
              label="Page Visits"
              value={overview?.pageVisitsThisMonth ?? 0}
              sub="Landing page views"
              icon={Eye}
              iconColor={BLUE}
              iconBg="rgba(43,133,228,0.12)"
            />
            <StatCard
              label="Conversion Rate"
              value={`${overview?.conversionRate ?? 0}%`}
              sub="Visits → leads"
              icon={TrendingUp}
              iconColor={GREEN}
              iconBg="rgba(61,209,61,0.10)"
            />
            <StatCard
              label="Emails Sent"
              value={overview?.emailsSentThisMonth ?? 0}
              sub={`${overview?.openRate ?? 0}% open rate`}
              icon={Mail}
              iconColor={EMBER}
              iconBg="rgba(255,122,26,0.10)"
            />
            <StatCard
              label="Total Campaigns"
              value={overview?.totalCampaigns ?? 0}
              sub="All time"
              icon={Megaphone}
              iconColor={PURPLE}
              iconBg="rgba(168,85,247,0.10)"
            />
            <StatCard
              label="Credits Used"
              value={overview?.creditsUsedThisMonth ?? 0}
              sub="This month"
              icon={Zap}
              iconColor={GOLD}
              iconBg="rgba(245,158,11,0.10)"
            />
          </>
        )}
      </div>

      {/* ── Top Performing Campaign ─────────────────────────────────────── */}
      {bestCampaign && (bestCampaign.pageViews > 0 || bestCampaign.formSubmissions > 0) && (
        <div
          className="rounded-2xl border p-5 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(25,211,255,0.06) 0%, rgba(43,133,228,0.06) 100%)",
            borderColor: "rgba(25,211,255,0.18)",
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, #19D3FF, transparent)" }} />
          <div className="flex items-start gap-4 flex-wrap">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(25,211,255,0.12)", border: "1px solid rgba(25,211,255,0.20)" }}
            >
              <Trophy className="w-5 h-5" style={{ color: CYAN }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: CYAN }}>Top Performing Campaign</p>
              <p className="text-base font-bold text-foreground truncate">{bestCampaign.businessName}</p>
              <p className="text-xs text-muted-foreground truncate">{bestCampaign.serviceOffered} · {bestCampaign.city}</p>
            </div>
            <div className="flex gap-6 text-center flex-wrap">
              {[
                { label: "Page Views", value: bestCampaign.pageViews, color: CYAN },
                { label: "CTA Clicks", value: bestCampaign.ctaClicks, color: BLUE },
                { label: "Leads", value: bestCampaign.formSubmissions, color: GREEN },
              ].map((m) => (
                <div key={m.label}>
                  <p className="text-xl font-black" style={{ color: m.color }}>{m.value}</p>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Lead Capture Timeline ────────────────────────────────────────── */}
      <ChartCard>
        <SectionTitle title="Lead Capture Over Time" subtitle="New leads and landing page visits — last 30 days" />
        {timelineLoading ? (
          <ChartSkeleton height={240} />
        ) : timeline.length === 0 ? (
          <EmptyState icon={TrendingUp} title="No data yet" message="Generate your first campaign to start tracking leads over time." />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={timeline} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CYAN} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={CYAN} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="viewGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BLUE} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={BLUE} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.30)" }} tickLine={false} axisLine={false} interval={4} />
              <YAxis tick={{ fontSize: 11, fill: "rgba(255,255,255,0.30)" }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={{ color: "rgba(255,255,255,0.5)", marginBottom: 4 }} itemStyle={{ color: "#ffffff" }} cursor={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 }} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 12, paddingTop: 12, color: "rgba(255,255,255,0.45)" }} />
              <Area type="monotone" dataKey="leads" name="New Leads" stroke={CYAN} strokeWidth={2} fill="url(#leadGrad)" dot={false} activeDot={{ r: 4, fill: CYAN, strokeWidth: 0 }} />
              <Area type="monotone" dataKey="views" name="Page Visits" stroke={BLUE} strokeWidth={2} fill="url(#viewGrad)" dot={false} activeDot={{ r: 4, fill: BLUE, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* ── Conversion Funnel + Credit Usage ────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-5">

        {/* Conversion Funnel */}
        <ChartCard>
          <SectionTitle title="Conversion Funnel" subtitle="From first view to captured lead — last 30 days" />
          {funnelLoading ? (
            <ChartSkeleton height={200} />
          ) : funnelMax <= 1 ? (
            <EmptyState icon={TrendingUp} title="No funnel data yet" message="Funnel tracking populates as leads, page views, and CTA clicks are recorded." />
          ) : (
            <div className="space-y-3 mt-2">
              {funnelSteps.map((step, i) => {
                const pct = funnelMax > 0 ? (step.value / funnelMax) * 100 : 0;
                const dropOff = i > 0 && funnelSteps[i - 1].value > 0
                  ? Math.round((1 - step.value / funnelSteps[i - 1].value) * 100)
                  : null;
                return (
                  <div key={step.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-muted-foreground">{step.label}</span>
                      <div className="flex items-center gap-2">
                        {dropOff !== null && dropOff > 0 && (
                          <span className="text-[10px] text-muted-foreground/50">−{dropOff}%</span>
                        )}
                        <span className="text-sm font-bold" style={{ color: step.color }}>{step.value.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: step.color, opacity: 0.85 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>

        {/* Credit Usage Over Time */}
        <ChartCard>
          <SectionTitle title="Credit Usage" subtitle={`${creditData?.totalUsedThisMonth ?? 0} credits used this month`} />
          {creditLoading ? (
            <ChartSkeleton height={200} />
          ) : (creditData?.totalUsedThisMonth ?? 0) === 0 ? (
            <EmptyState icon={Zap} title="No credit usage yet" message="Credits are recorded each time you generate a campaign, landing page, or email." />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={creditTimeline} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="creditGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={GOLD} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.30)" }} tickLine={false} axisLine={false} interval={6} />
                <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.30)" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={{ color: "rgba(255,255,255,0.5)", marginBottom: 4 }} itemStyle={{ color: "#ffffff" }} formatter={(v) => [`${v} credits`, "Used"]} cursor={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 }} />
                <Area type="monotone" dataKey="used" name="Credits Used" stroke={GOLD} strokeWidth={2} fill="url(#creditGrad)" dot={false} activeDot={{ r: 4, fill: GOLD, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Lead Sources + Email Performance ────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-5">

        {/* Lead Source Breakdown */}
        <ChartCard>
          <SectionTitle title="Lead Source Breakdown" subtitle="Where your contacts are coming from" />
          {sourcesLoading ? (
            <ChartSkeleton height={180} />
          ) : sources.length === 0 ? (
            <EmptyState icon={Users} title="No sources yet" message="Add contacts with a source label to see where your best leads come from." />
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="shrink-0">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={sources} cx="50%" cy="50%" innerRadius={44} outerRadius={72} dataKey="count" paddingAngle={3} strokeWidth={0}>
                      {sources.map((_, index) => (
                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value} leads`, name]} contentStyle={CHART_TOOLTIP_STYLE} itemStyle={{ color: "#ffffff" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2.5 w-full">
                {sources.map((s, i) => {
                  const pct = totalSources > 0 ? Math.round((s.count / totalSources) * 100) : 0;
                  const color = PIE_COLORS[i % PIE_COLORS.length];
                  return (
                    <div key={s.source}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                        <span className="text-xs font-medium text-foreground flex-1 truncate">{s.name}</span>
                        <span className="text-xs font-bold text-foreground">{s.count}</span>
                        <span className="text-xs text-muted-foreground w-7 text-right">{pct}%</span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </ChartCard>

        {/* Email Open & Click Rates */}
        <ChartCard>
          <SectionTitle title="Email Performance" subtitle="Open and click rates per campaign" />
          {emailLoading ? (
            <ChartSkeleton height={220} />
          ) : emailCampaigns.filter((c) => c.recipientCount > 0).length === 0 ? (
            <EmptyState icon={Mail} title="No emails sent yet" message="Send your first email campaign to see open and click rates here." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={emailCampaigns.filter((c) => c.recipientCount > 0).slice(0, 6).map((c) => ({
                  name: c.name.length > 14 ? c.name.slice(0, 12) + "…" : c.name,
                  "Open %": c.openRate,
                  "Click %": c.clickRate,
                }))}
                margin={{ top: 4, right: 8, left: -24, bottom: 0 }}
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.30)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.30)" }} tickLine={false} axisLine={false} unit="%" />
                <Tooltip formatter={(v) => `${v}%`} contentStyle={CHART_TOOLTIP_STYLE} itemStyle={{ color: "#ffffff" }} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }} />
                <Bar dataKey="Open %" fill={CYAN} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="Click %" fill={GREEN} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Recent Activity Feed + Campaign Table ────────────────────────── */}
      <div className="grid md:grid-cols-5 gap-5">

        {/* Activity Feed */}
        <div
          className="md:col-span-2 rounded-2xl border border-border/40 overflow-hidden flex flex-col"
          style={{ background: "#0C1528", boxShadow: "0 2px 16px rgba(0,0,0,0.25)" }}
        >
          <div className="px-5 pt-5 pb-4 border-b border-border/30">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" style={{ color: CYAN }} />
              <h2 className="text-base font-bold text-foreground">Recent Activity</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Live events from your account</p>
          </div>
          {activityLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)", flexShrink: 0 }} />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.05)", width: "70%" }} />
                    <div className="h-2.5 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.03)", width: "45%" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <EmptyState icon={Activity} title="No activity yet" message="Events appear here as you generate campaigns, add leads, and send emails." />
          ) : (
            <div className="divide-y divide-border/20 overflow-y-auto max-h-[400px]">
              {events.map((e) => {
                const meta = EVENT_LABELS[e.eventType] ?? { label: e.eventType, icon: Activity, color: CYAN };
                const Icon = meta.icon;
                return (
                  <div key={e.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: `${meta.color}12` }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">{meta.label}</p>
                      {e.source && (
                        <p className="text-[11px] text-muted-foreground/60 truncate">
                          via {SOURCE_LABELS[e.source] ?? e.source}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground/40 shrink-0 mt-0.5">{timeAgo(e.createdAt)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Campaign Performance Table */}
        <div
          className="md:col-span-3 rounded-2xl border border-border/40 overflow-hidden"
          style={{ background: "#0C1528", boxShadow: "0 2px 16px rgba(0,0,0,0.25)" }}
        >
          <div className="px-5 pt-5 pb-4 border-b border-border/30">
            <h2 className="text-base font-bold text-foreground">Campaign Performance</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Your saved campaigns with tracked metrics</p>
          </div>
          {campaignLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <EmptyState icon={Megaphone} title="No campaigns yet" message="Build your first campaign to see page views, clicks, and leads tracked here." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/30 hover:bg-transparent">
                    <TableHead className="pl-5 h-9 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>Campaign</TableHead>
                    <TableHead className="h-9 text-center text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>Views</TableHead>
                    <TableHead className="h-9 text-center text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>Clicks</TableHead>
                    <TableHead className="h-9 text-center text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>Leads</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.slice(0, 8).map((c, idx) => (
                    <TableRow
                      key={c.id}
                      className="border-b border-border/20 transition-colors duration-100"
                      style={idx % 2 === 1 ? { background: "rgba(255,255,255,0.015)" } : undefined}
                    >
                      <TableCell className="pl-5 py-3">
                        <div>
                          <p className="text-xs font-semibold text-foreground">{c.businessName}</p>
                          <p className="text-[10px] text-muted-foreground/50 truncate max-w-[150px]">{c.city}</p>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <span className="text-xs font-bold" style={{ color: c.pageViews > 0 ? CYAN : "rgba(255,255,255,0.2)" }}>{c.pageViews}</span>
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <span className="text-xs font-bold" style={{ color: c.ctaClicks > 0 ? BLUE : "rgba(255,255,255,0.2)" }}>{c.ctaClicks}</span>
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <span className="text-xs font-bold" style={{ color: c.formSubmissions > 0 ? GREEN : "rgba(255,255,255,0.2)" }}>{c.formSubmissions}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* ── Email Campaign Table ─────────────────────────────────────────── */}
      <div
        className="rounded-2xl border border-border/40 overflow-hidden"
        style={{ background: "#0C1528", boxShadow: "0 2px 16px rgba(0,0,0,0.25)" }}
      >
        <div className="px-6 pt-6 pb-4 border-b border-border/30">
          <SectionTitle title="Email Campaign Breakdown" subtitle="Detailed metrics for every email you've sent" />
        </div>
        {emailLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.03)" }} />
            ))}
          </div>
        ) : emailCampaigns.length === 0 ? (
          <EmptyState icon={Mail} title="No email campaigns" message="Create your first email campaign from the Email Campaigns page to see metrics here." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/30 hover:bg-transparent">
                  {["Campaign", "Status", "Sent", "Opens", "Clicks", "Open Rate", "Click Rate", "Date"].map((h, i) => (
                    <TableHead
                      key={h}
                      className={`h-10 text-xs font-semibold uppercase tracking-wider ${i === 0 ? "pl-6" : ""} ${i >= 2 && i <= 6 ? "text-center" : ""}`}
                      style={{ color: "rgba(255,255,255,0.35)" }}
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {emailCampaigns.map((c, idx) => (
                  <TableRow
                    key={c.id}
                    className="border-b border-border/20 transition-colors duration-100"
                    style={idx % 2 === 1 ? { background: "rgba(255,255,255,0.015)" } : undefined}
                  >
                    <TableCell className="pl-6 py-3.5">
                      <p className="text-sm font-semibold text-foreground">{c.name}</p>
                    </TableCell>
                    <TableCell className="py-3.5"><StatusBadge status={c.status} /></TableCell>
                    <TableCell className="py-3.5 text-center text-sm text-muted-foreground">{c.recipientCount}</TableCell>
                    <TableCell className="py-3.5 text-center text-sm text-muted-foreground">{c.openedCount}</TableCell>
                    <TableCell className="py-3.5 text-center text-sm text-muted-foreground">{c.clickedCount}</TableCell>
                    <TableCell className="py-3.5 text-center">
                      {c.openRate > 0 ? (
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-bold" style={{ color: c.openRate >= 30 ? GREEN : c.openRate >= 15 ? CYAN : "rgba(255,255,255,0.5)" }}>
                            {c.openRate}%
                          </span>
                          {c.openRate >= 30 && <span className="text-[10px] font-semibold" style={{ color: GREEN }}>Excellent</span>}
                        </div>
                      ) : (
                        <span className="text-sm" style={{ color: "rgba(255,255,255,0.2)" }}>—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3.5 text-center">
                      <span className="text-sm font-semibold text-muted-foreground">
                        {c.clickRate > 0 ? `${c.clickRate}%` : <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>}
                      </span>
                    </TableCell>
                    <TableCell className="py-3.5 text-xs text-muted-foreground/60">{formatDate(c.sentAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ── Landing Page Tracking Snippet ───────────────────────────────── */}
      <div
        className="rounded-2xl border p-6 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, rgba(43,133,228,0.06), rgba(6,10,20,1) 60%)", borderColor: "rgba(43,133,228,0.18)" }}
      >
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, #2B85E4, transparent)" }} />
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(43,133,228,0.12)", border: "1px solid rgba(43,133,228,0.20)" }}>
            <Code2 className="w-5 h-5" style={{ color: BLUE }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base font-bold text-foreground">Track Your Landing Pages</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(43,133,228,0.12)", color: BLUE, border: "1px solid rgba(43,133,228,0.18)" }}>OPTIONAL</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Paste this into your landing page to automatically track visits, CTA clicks, and form submissions — populating the funnel and campaign metrics above.
            </p>
            <div className="rounded-xl p-4 font-mono text-xs overflow-x-auto whitespace-pre leading-relaxed" style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.06)", color: GREEN }}>
{`// Paste into your landing page
fetch("/api/analytics/track", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    eventType: "landing_page_viewed",
    source: document.referrer || "direct",
    referrer: document.referrer,
  })
});`}
            </div>
          </div>
        </div>
      </div>

      {/* ── Business Insight Strip ──────────────────────────────────────── */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { icon: Sparkles, color: CYAN, bg: "rgba(25,211,255,0.08)", title: "AI campaigns save time", desc: "The average LeadForge campaign takes 90 seconds to build — vs. 6+ hours with an agency." },
          { icon: TrendingUp, color: GREEN, bg: "rgba(61,209,61,0.08)", title: "Conversion benchmark", desc: "A healthy landing page converts at 3–8%. Anything above 10% is exceptional for local services." },
          { icon: Mail, color: EMBER, bg: "rgba(255,122,26,0.08)", title: "Email open rate goal", desc: "Industry average is 18–22%. LeadForge businesses regularly hit 30%+ with personalized campaigns." },
        ].map((tip, i) => (
          <div key={i} className="rounded-2xl border border-border/40 p-4" style={{ background: "#0C1528" }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: tip.bg }}>
              <tip.icon className="w-4 h-4" style={{ color: tip.color }} />
            </div>
            <p className="text-sm font-bold text-foreground mb-1">{tip.title}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{tip.desc}</p>
          </div>
        ))}
      </div>

    </div>
  );
}
