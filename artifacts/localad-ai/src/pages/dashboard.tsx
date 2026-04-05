import React, { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/react";
import {
  Users, TrendingUp, Megaphone, DollarSign,
  ArrowUpRight, ArrowRight, ChevronRight,
  FileText, ClipboardList, Zap, Building2,
  CheckCircle2, Clock, Circle, Coins, AlertTriangle,
  Gift, Copy, Check as CheckIcon,
} from "lucide-react";
import { usePlan } from "@/hooks/use-plan";
import { useQuery } from "@tanstack/react-query";

// ─── Static data ──────────────────────────────────────────────────────────────

const stats = [
  {
    label: "Leads Generated",
    value: "47",
    change: "+12 this week",
    trend: "up",
    icon: Users,
    iconStyle: { background: "rgba(43,133,228,0.14)", color: "#2B85E4", boxShadow: "0 0 12px rgba(43,133,228,0.10)" },
  },
  {
    label: "Conversion Rate",
    value: "12.4%",
    change: "+2.1% vs last month",
    trend: "up",
    icon: TrendingUp,
    iconStyle: { background: "rgba(61,209,61,0.13)", color: "#3DD13D", boxShadow: "0 0 12px rgba(61,209,61,0.08)" },
  },
  {
    label: "Active Campaigns",
    value: "3",
    change: "2 paused",
    trend: "neutral",
    icon: Megaphone,
    iconStyle: { background: "rgba(25,211,255,0.12)", color: "#19D3FF", boxShadow: "0 0 12px rgba(25,211,255,0.08)" },
  },
  {
    label: "Estimated Revenue",
    value: "$3,200",
    change: "+$800 this month",
    trend: "up",
    icon: DollarSign,
    iconStyle: { background: "rgba(255,122,26,0.13)", color: "#FF7A1A", boxShadow: "0 0 12px rgba(255,122,26,0.08)" },
  },
];

const recentCampaigns = [
  {
    id: 1,
    name: "Spring Exterior Painting Promo",
    platform: "Facebook",
    status: "Active",
    leads: 18,
    date: "Apr 2",
    platformStyle: { background: "rgba(43,133,228,0.13)", border: "1px solid rgba(43,133,228,0.28)", color: "#5BA8F5" },
  },
  {
    id: 2,
    name: "Free Roof Inspection April",
    platform: "Google",
    status: "Active",
    leads: 11,
    date: "Mar 30",
    platformStyle: { background: "rgba(25,211,255,0.10)", border: "1px solid rgba(25,211,255,0.24)", color: "#19D3FF" },
  },
  {
    id: 3,
    name: "Lawn Cleanup Special Offer",
    platform: "Instagram",
    status: "Paused",
    leads: 7,
    date: "Mar 20",
    platformStyle: { background: "rgba(255,122,26,0.10)", border: "1px solid rgba(255,122,26,0.24)", color: "#FF9A4A" },
  },
  {
    id: 4,
    name: "HVAC Summer Tune-Up Deal",
    platform: "Facebook",
    status: "Draft",
    leads: 0,
    date: "Apr 4",
    platformStyle: { background: "rgba(43,133,228,0.13)", border: "1px solid rgba(43,133,228,0.28)", color: "#5BA8F5" },
  },
];

const leadActivity = [
  { id: 1, name: "James Callahan", source: "Spring Painting Promo", time: "2 min ago", status: "new" },
  { id: 2, name: "Priya Mehta", source: "Roof Inspection Ad", time: "14 min ago", status: "contacted" },
  { id: 3, name: "Tony Briggs", source: "Spring Painting Promo", time: "1 hr ago", status: "new" },
  { id: 4, name: "Laura Kim", source: "Lawn Cleanup Offer", time: "3 hrs ago", status: "closed" },
  { id: 5, name: "Ben Foster", source: "Roof Inspection Ad", time: "Yesterday", status: "contacted" },
];

const leadStatusConfig: Record<string, { label: string; style: React.CSSProperties; icon: typeof Circle }> = {
  new: { label: "New", style: { background: "rgba(43,133,228,0.12)", border: "1px solid rgba(43,133,228,0.30)", color: "#5BA8F5" }, icon: Circle },
  contacted: { label: "Contacted", style: { background: "rgba(255,122,26,0.10)", border: "1px solid rgba(255,122,26,0.28)", color: "#FF9A4A" }, icon: Clock },
  closed: { label: "Closed", style: { background: "rgba(61,209,61,0.10)", border: "1px solid rgba(61,209,61,0.28)", color: "#3DD13D" }, icon: CheckCircle2 },
};

const campaignStatusConfig: Record<string, React.CSSProperties> = {
  Active: { background: "rgba(61,209,61,0.10)", border: "1px solid rgba(61,209,61,0.28)", color: "#3DD13D" },
  Paused: { background: "rgba(255,122,26,0.10)", border: "1px solid rgba(255,122,26,0.25)", color: "#FF9A4A" },
  Draft: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.40)" },
};

// ─── Credit Card Component ─────────────────────────────────────────────────────

function CreditsCard() {
  const { plan, isFree, totalCredits, credits, addonCredits, planCreditLimit, creditsUsedThisPeriod, estimatedCampaignsLeft, isLowCredits, isOutOfCredits } = usePlan();

  const usagePercent = planCreditLimit > 0
    ? Math.min(100, Math.round((creditsUsedThisPeriod / planCreditLimit) * 100))
    : 0;

  const barColor = isOutOfCredits
    ? "bg-red-500"
    : isLowCredits
      ? ""
      : "bg-primary";

  return (
    <div className="bg-card rounded-2xl overflow-hidden"
      style={{ border: isOutOfCredits ? "1px solid rgba(220,60,60,0.40)" : isLowCredits ? "1px solid rgba(255,122,26,0.35)" : "1px solid rgba(255,255,255,0.08)" }}>
      <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-[15px] text-foreground flex items-center gap-2">
            <Coins className="w-4 h-4" style={{ color: "#FF7A1A" }} />
            Generation Credits
          </h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {isFree ? "Lifetime balance" : "Resets monthly"}
          </p>
        </div>
        {(isLowCredits || isOutOfCredits) && (
          <div className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={isOutOfCredits
              ? { background: "rgba(220,60,60,0.12)", border: "1px solid rgba(220,60,60,0.30)", color: "#FF6B6B" }
              : { background: "rgba(255,122,26,0.10)", border: "1px solid rgba(255,122,26,0.28)", color: "#FF9A4A" }}>
            <AlertTriangle className="w-3 h-3" />
            {isOutOfCredits ? "Out of credits" : "Running low"}
          </div>
        )}
      </div>

      <div className="p-6 space-y-4">
        {/* Big remaining number */}
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[38px] font-black leading-none text-foreground">{totalCredits}</div>
            <div className="text-[12px] font-semibold text-muted-foreground mt-1">credits remaining</div>
          </div>
          <div className="text-right">
            <div className="text-[22px] font-black leading-none text-foreground">{estimatedCampaignsLeft}</div>
            <div className="text-[11px] font-semibold text-muted-foreground mt-1">campaigns left</div>
          </div>
        </div>

        {/* Usage bar (paid plans only) */}
        {!isFree && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
              <span>{creditsUsedThisPeriod} used this month</span>
              <span>{planCreditLimit} total</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${usagePercent}%`, ...(isLowCredits && !isOutOfCredits ? { background: "#FF7A1A" } : {}) }}
              />
            </div>
          </div>
        )}

        {/* Credit breakdown */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted/40 rounded-xl p-3 text-center">
            <div className="text-[16px] font-black text-foreground">{credits}</div>
            <div className="text-[10px] font-semibold text-muted-foreground mt-0.5">Plan credits</div>
          </div>
          <div className="rounded-xl p-3 text-center"
            style={{ background: "rgba(255,122,26,0.10)", border: "1px solid rgba(255,122,26,0.20)" }}>
            <div className="text-[16px] font-black" style={{ color: "#FF9A4A" }}>{addonCredits}</div>
            <div className="text-[10px] font-semibold mt-0.5" style={{ color: "#FF7A1A" }}>Add-on credits</div>
          </div>
        </div>

        {/* Credit cost hint */}
        <div className="text-[11px] text-muted-foreground/70 leading-relaxed border-t border-border/30 pt-3">
          Campaign = 5 credits · Landing page = 2 · Email = 2 · SMS = 1
        </div>

        {/* CTA */}
        {(isOutOfCredits || isLowCredits) ? (
          <Link href="/billing">
            <button className="btn-forge w-full text-[13px] font-bold rounded-xl h-9 inline-flex items-center justify-center gap-1.5">
              {isOutOfCredits ? "Buy Credits or Upgrade" : "Top Up Credits"}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Link>
        ) : (
          <Link href="/billing">
            <span className="text-[12px] font-semibold text-primary/70 hover:text-primary transition-colors cursor-pointer flex items-center gap-1">
              Buy add-on credits <ChevronRight className="w-3 h-3" />
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── Referral Card ────────────────────────────────────────────────────────────

type ReferralStats = {
  referralCode: string;
  successfulReferrals: number;
  totalReferrals: number;
  totalEarned: number;
  availableBalance: number;
  history: { email: string; status: "completed" | "pending"; reward: number | null; date: string }[];
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={copy}
      className="shrink-0 flex items-center gap-1.5 px-3 h-9 rounded-lg border border-border/60 bg-muted/30 text-[12px] font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all"
    >
      {copied ? <CheckIcon className="w-3.5 h-3.5" style={{ color: "#3DD13D" }} /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function ReferralCard() {
  const { data, isLoading } = useQuery<ReferralStats>({
    queryKey: ["referral-stats"],
    queryFn: async () => {
      const res = await fetch("/api/referral/stats", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    staleTime: 60 * 1000,
  });

  const referralLink = data?.referralCode
    ? `${window.location.origin}/localad-ai/signup?ref=${data.referralCode}`
    : "";

  return (
    <div className="bg-card border border-border/40 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-2 mb-0.5">
          <Gift className="w-4 h-4" style={{ color: "#3DD13D" }} />
          <h2 className="font-bold text-[15px] text-foreground">Refer & Save</h2>
        </div>
        <p className="text-[12px] text-muted-foreground">
          Earn $10 off your next month for every paying user you refer.
        </p>
      </div>

      <div className="p-6 space-y-5">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-10 bg-muted/40 rounded-xl animate-pulse" />
            <div className="h-10 bg-muted/40 rounded-xl animate-pulse" />
            <div className="h-16 bg-muted/40 rounded-xl animate-pulse" />
          </div>
        ) : (
          <>
            {/* Referral Code */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-2">Your Referral Code</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-background border border-border/60 rounded-xl px-4 h-10 flex items-center font-mono text-[14px] font-black tracking-widest text-foreground select-all overflow-hidden">
                  {data?.referralCode ?? "—"}
                </div>
                <CopyButton text={data?.referralCode ?? ""} />
              </div>
            </div>

            {/* Referral Link */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-2">Your Referral Link</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-background border border-border/60 rounded-xl px-3 h-10 flex items-center text-[11px] text-muted-foreground select-all overflow-hidden min-w-0">
                  <span className="truncate">{referralLink || "—"}</span>
                </div>
                <CopyButton text={referralLink} />
              </div>
            </div>

            {/* Stats */}
            <div className="rounded-xl overflow-hidden border border-border/40">
              <div className="px-4 py-2 bg-muted/20 border-b border-border/30">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Stats</p>
              </div>
              <div className="divide-y divide-border/30">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[13px] text-muted-foreground">Successful referrals</span>
                  <span className="text-[13px] font-black text-foreground">{data?.successfulReferrals ?? 0}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[13px] text-muted-foreground">Available credit</span>
                  <span className="text-[13px] font-black" style={{ color: "#3DD13D" }}>
                    ${data?.availableBalance ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[13px] text-muted-foreground">Total earned</span>
                  <span className="text-[13px] font-black" style={{ color: "#5BA8F5" }}>
                    ${data?.totalEarned ?? 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Referral History */}
            {(data?.history?.length ?? 0) > 0 && (
              <div className="rounded-xl overflow-hidden border border-border/40">
                <div className="px-4 py-2 bg-muted/20 border-b border-border/30">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Referral History</p>
                </div>
                <div className="divide-y divide-border/30">
                  {data!.history.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="flex-1 text-[12px] text-foreground truncate min-w-0">{r.email}</span>
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0"
                        style={r.status === "completed"
                          ? { background: "rgba(61,209,61,0.10)", border: "1px solid rgba(61,209,61,0.25)", color: "#3DD13D" }
                          : { background: "rgba(255,122,26,0.10)", border: "1px solid rgba(255,122,26,0.25)", color: "#FF9A4A" }}
                      >
                        {r.status === "completed" ? "Completed" : "Pending"}
                      </span>
                      <span className="text-[12px] font-black shrink-0 w-8 text-right"
                        style={{ color: r.reward ? "#3DD13D" : "rgba(255,255,255,0.25)" }}>
                        {r.reward != null ? `$${r.reward}` : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[11px] text-muted-foreground/60 leading-relaxed border-t border-border/30 pt-3">
              Credits auto-apply to your next invoice · Not redeemable for cash
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useUser();
  const { isFree, isOutOfCredits } = usePlan();
  const firstName = user?.firstName || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-400">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-[26px] font-black tracking-tight text-foreground">
            {greeting}, {firstName}
          </h1>
          <p className="text-muted-foreground text-[14px] mt-1">
            Here's how your lead generation is performing.
          </p>
        </div>
        <Link href="/campaigns">
          <button className="btn-forge gap-2 rounded-full text-[13px] font-bold px-5 h-9 inline-flex items-center shrink-0">
            <Megaphone className="w-4 h-4" />
            Create Campaign
          </button>
        </Link>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i}
              className="bg-card border border-border/40 rounded-2xl p-6 hover:shadow-md hover:border-border transition-all duration-200">
              <div className="flex items-start justify-between mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={stat.iconStyle}>
                  <Icon className="w-5 h-5" />
                </div>
                {stat.trend === "up" && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(61,209,61,0.10)", border: "1px solid rgba(61,209,61,0.22)", color: "#3DD13D" }}>
                    <ArrowUpRight className="w-3 h-3" />
                    <span className="text-[11px] font-bold">Up</span>
                  </div>
                )}
              </div>
              <div className="text-[32px] font-black tracking-tight text-foreground leading-none mb-1.5">
                {stat.value}
              </div>
              <div className="text-[12px] font-semibold text-muted-foreground mb-1">{stat.label}</div>
              <div className="text-[11px] text-muted-foreground/70">{stat.change}</div>
            </div>
          );
        })}
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Left: Recent Campaigns + Lead Activity */}
        <div className="lg:col-span-2 space-y-6">

          {/* Recent Campaigns */}
          <div className="bg-card border border-border/40 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
              <div>
                <h2 className="font-bold text-[15px] text-foreground">Recent Campaigns</h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">Your latest lead campaigns</p>
              </div>
              <Link href="/campaigns">
                <span className="text-[13px] font-semibold text-primary hover:opacity-80 transition-opacity cursor-pointer flex items-center gap-1">
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            </div>

            {/* Table header */}
            <div className="grid grid-cols-12 px-6 py-2.5 border-b border-border/30 bg-muted/20">
              <span className="col-span-5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">Campaign</span>
              <span className="col-span-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">Platform</span>
              <span className="col-span-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60 text-center">Leads</span>
              <span className="col-span-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">Status</span>
              <span className="col-span-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60 text-right">Date</span>
            </div>

            <div className="divide-y divide-border/30">
              {recentCampaigns.map((c) => (
                <div key={c.id}
                  className="grid grid-cols-12 items-center px-6 py-3.5 hover:bg-muted/20 transition-colors cursor-pointer group">
                  <div className="col-span-5 flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                      <Megaphone className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-[13px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {c.name}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={c.platformStyle}>
                      {c.platform}
                    </span>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="text-[14px] font-black text-foreground">{c.leads}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full" style={campaignStatusConfig[c.status]}>
                      {c.status}
                    </span>
                  </div>
                  <div className="col-span-1 text-right text-[12px] text-muted-foreground">{c.date}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Lead Activity */}
          <div className="bg-card border border-border/40 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
              <div>
                <h2 className="font-bold text-[15px] text-foreground">Lead Activity</h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">Recent inquiries from your campaigns</p>
              </div>
              <Link href="/contacts">
                <span className="text-[13px] font-semibold text-primary hover:opacity-80 transition-opacity cursor-pointer flex items-center gap-1">
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            </div>

            <div className="divide-y divide-border/30">
              {leadActivity.map((lead) => {
                const cfg = leadStatusConfig[lead.status];
                const StatusIcon = cfg.icon;
                return (
                  <div key={lead.id}
                    className="flex items-center gap-4 px-6 py-3.5 hover:bg-muted/20 transition-colors cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[13px] shrink-0">
                      {lead.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-foreground">{lead.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">via {lead.source}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full" style={cfg.style}>
                        <StatusIcon className="w-2.5 h-2.5" />
                        {cfg.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground/60 w-16 text-right">{lead.time}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Credits + Quick Actions + Business Profile */}
        <div className="space-y-6">

          {/* Credits Usage Card */}
          <CreditsCard />

          {/* Quick Actions */}
          <div className="bg-card border border-border/40 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border/50">
              <h2 className="font-bold text-[15px] text-foreground">Quick Actions</h2>
              <p className="text-[12px] text-muted-foreground mt-0.5">Jump right into your work</p>
            </div>
            <div className="p-4 space-y-2.5">
              <Link href="/generate">
                <div className="flex items-center gap-4 p-4 rounded-xl cursor-pointer group transition-all"
                  style={{ background: "linear-gradient(135deg, #2B85E4 0%, #19D3FF 100%)", boxShadow: "0 4px 16px rgba(25,211,255,0.20)" }}>
                  <div className="w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center shrink-0">
                    <Megaphone className="w-4 h-4 text-[#060A14]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[14px] text-[#060A14]">Create Campaign</p>
                    <p className="text-[#060A14]/60 text-[12px]">Build lead-generating campaigns fast</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#060A14]/70 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>

              <Link href="/landing-pages">
                <div className="flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-muted/20 cursor-pointer hover:border-[rgba(255,122,26,0.30)] hover:bg-card/80 hover:shadow-sm transition-all group">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "rgba(255,122,26,0.12)", color: "#FF7A1A" }}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[14px] text-foreground">Create Landing Page</p>
                    <p className="text-muted-foreground text-[12px]">Turn your ad clicks into leads</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Link>

              <Link href="/contacts">
                <div className="flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-muted/20 cursor-pointer hover:border-[rgba(61,209,61,0.28)] hover:bg-card/80 hover:shadow-sm transition-all group">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "rgba(61,209,61,0.12)", color: "#3DD13D" }}>
                    <ClipboardList className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[14px] text-foreground">View Leads</p>
                    <p className="text-muted-foreground text-[12px]">Review and follow up on leads</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Link>
            </div>
          </div>

          {/* Business Profile Prompt */}
          <div className="bg-card border border-border/40 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-[14px] text-foreground">Business Profile</p>
                <p className="text-[12px] text-muted-foreground">Mike's Painting · Austin, TX</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {["Painting", "Homeowners", "Free Estimate"].map((tag) => (
                <span key={tag} className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-[11px] font-semibold border border-border/50">
                  {tag}
                </span>
              ))}
            </div>
            <Link href="/business-profile">
              <Button variant="outline" size="sm" className="w-full text-[13px] font-semibold rounded-lg border-border/60 gap-1.5">
                Edit Profile
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          {/* Referral Card */}
          <ReferralCard />

          {/* Upgrade nudge — only for free users or out of credits */}
          {(isFree || isOutOfCredits) && (
            <div className="bg-[hsl(215_75%_9%)] rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(circle,hsl(213_89%_55%/0.25),transparent)]" />
              <div className="relative z-10">
                <div className="w-9 h-9 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <p className="font-bold text-[14px] text-white mb-1.5">
                  {isOutOfCredits ? "You're out of credits" : "Upgrade to Pro"}
                </p>
                <p className="text-white/45 text-[12px] leading-relaxed mb-4">
                  {isOutOfCredits
                    ? "Buy a credit pack or upgrade your plan to keep generating campaigns."
                    : "Get 200 credits/month — enough for 40 full campaigns. Unlock all features."}
                </p>
                <Link href="/billing">
                  <button className="btn-forge w-full text-[13px] font-bold rounded-xl h-9 inline-flex items-center justify-center gap-1.5">
                    {isOutOfCredits ? "Buy Credits" : "See Plans"}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
