import React, { useState, useEffect } from "react";
import { useAuth } from "@clerk/react";
import { Link } from "wouter";
import { usePlan } from "@/hooks/use-plan";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import {
  Mail,
  Plus,
  Send,
  Clock,
  FileText,
  Trash2,
  Eye,
  Users,
  MousePointerClick,
  MailOpen,
  UserMinus,
  ChevronRight,
  Sparkles,
  BarChart2,
  ArrowUpRight,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const API = "/api";

type Campaign = {
  id: number;
  name: string;
  status: string;
  subject: string | null;
  previewText: string | null;
  headline: string | null;
  segment: string;
  scheduledAt: string | null;
  sentAt: string | null;
  recipientCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  unsubscribedCount: number;
  createdAt: string;
};

const SEGMENT_LABELS: Record<string, string> = {
  subscribed: "Subscribed contacts",
  all_consented: "All marketing-consented",
  subscribed_new_leads: "Subscribed new leads",
  subscribed_warm_leads: "Subscribed warm leads",
  subscribed_past_customers: "Subscribed past customers",
};

const TABS = [
  { key: "all", label: "All" },
  { key: "draft", label: "Drafts" },
  { key: "scheduled", label: "Scheduled" },
  { key: "sent", label: "Sent" },
];

function pct(num: number, denom: number) {
  if (!denom) return "0%";
  return `${Math.round((num / denom) * 100)}%`;
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtDateTime(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number | string;
  sub: string;
  accent: "blue" | "green" | "purple" | "gray";
}) {
  const accents = {
    blue: "bg-[hsl(213,89%,50%)]",
    green: "bg-emerald-500",
    purple: "bg-violet-500",
    gray: "bg-gray-400",
  };
  const textColors = {
    blue: "text-[hsl(213,89%,50%)]",
    green: "text-emerald-600",
    purple: "text-violet-600",
    gray: "text-gray-700",
  };

  return (
    <div className="bg-card border border-border/40 rounded-2xl p-5 shadow-sm flex gap-4 items-start">
      <div className={`w-1 self-stretch rounded-full ${accents[accent]} opacity-70 shrink-0`} />
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
        <p className={`text-3xl font-bold leading-none ${textColors[accent]}`}>{value}</p>
        <p className="text-xs text-gray-400 mt-1.5">{sub}</p>
      </div>
    </div>
  );
}

// ─── Campaign Card ────────────────────────────────────────────────────────────

function CampaignCard({
  campaign: c,
  onDelete,
  deleting,
}: {
  campaign: Campaign;
  onDelete: () => void;
  deleting: boolean;
}) {
  const isSent = c.status === "sent";
  const isDraft = c.status === "draft";
  const isScheduled = c.status === "scheduled";

  const openRate = isSent ? pct(c.openedCount, c.deliveredCount) : null;
  const clickRate = isSent ? pct(c.clickedCount, c.deliveredCount) : null;

  const statusDot = isSent
    ? "bg-emerald-400"
    : isScheduled
    ? "bg-amber-400"
    : "bg-gray-300";

  const statusLabel = isSent ? "Sent" : isScheduled ? "Scheduled" : "Draft";
  const statusText = isSent
    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
    : isScheduled
    ? "text-amber-700 bg-amber-50 border-amber-200"
    : "text-gray-600 bg-gray-100 border-gray-200";

  return (
    <div className="group px-6 py-5 hover:bg-gray-50/70 transition-colors border-b border-gray-100 last:border-b-0">
      <div className="flex items-start gap-4">
        {/* Status icon */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
            isSent
              ? "bg-emerald-50 border border-emerald-200"
              : isScheduled
              ? "bg-amber-50 border border-amber-200"
              : "bg-gray-100 border border-border/40"
          }`}
        >
          {isSent ? (
            <Send className="w-4 h-4 text-emerald-600" />
          ) : isScheduled ? (
            <Clock className="w-4 h-4 text-amber-600" />
          ) : (
            <FileText className="w-4 h-4 text-gray-500" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Row 1: name + badge */}
          <div className="flex items-center gap-2.5 mb-1 flex-wrap">
            <h3 className="font-bold text-gray-900 text-sm">{c.name}</h3>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusText}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
              {statusLabel}
            </span>
          </div>

          {/* Row 2: subject */}
          {c.subject && (
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
              <span className="text-gray-400 font-medium">Subject: </span>
              {c.subject}
            </p>
          )}

          {/* Row 3: metrics or date */}
          {isSent ? (
            <div className="flex items-center gap-5 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[hsl(213,89%,50%)]" />
                <span className="text-sm font-bold text-gray-800">{c.deliveredCount}</span>
                <span className="text-xs text-gray-400">delivered</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MailOpen className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-sm font-bold text-gray-800">{openRate}</span>
                <span className="text-xs text-gray-400">open rate</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MousePointerClick className="w-3.5 h-3.5 text-violet-500" />
                <span className="text-sm font-bold text-gray-800">{clickRate}</span>
                <span className="text-xs text-gray-400">CTR</span>
              </div>
              {c.unsubscribedCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <UserMinus className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-sm font-bold text-gray-800">{c.unsubscribedCount}</span>
                  <span className="text-xs text-gray-400">unsub</span>
                </div>
              )}
            </div>
          ) : isScheduled && c.scheduledAt ? (
            <div className="flex items-center gap-1.5 text-amber-600 text-xs font-medium">
              <Clock className="w-3.5 h-3.5" />
              Sending {fmtDateTime(c.scheduledAt)}
            </div>
          ) : (
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span>Created {fmt(c.createdAt)}</span>
              <span>·</span>
              <span>{SEGMENT_LABELS[c.segment] ?? c.segment}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {isDraft && (
            <Link href={`/email-campaigns/new`}>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[hsl(213,89%,50%)] bg-[hsl(213,89%,50%)]/8 hover:bg-[hsl(213,89%,50%)]/15 transition-colors">
                Continue
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          )}
          {!isDraft && (
            <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
              <Eye className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onDelete}
            disabled={deleting}
            className="p-2 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EmailCampaigns() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const { canUseEmail, isLoading: planLoading } = usePlan();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function apiFetch(path: string, options: RequestInit = {}) {
    const token = await getToken();
    return fetch(`${API}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
  }

  async function loadCampaigns() {
    setLoading(true);
    try {
      const res = await apiFetch("/email-campaigns");
      if (res.ok) setCampaigns(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function deleteCampaign(id: number) {
    setDeletingId(id);
    try {
      await apiFetch(`/email-campaigns/${id}`, { method: "DELETE" });
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      toast({ title: "Campaign deleted" });
    } catch {
      toast({ title: "Failed to delete campaign", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = campaigns.filter((c) => tab === "all" || c.status === tab);

  const counts = {
    all: campaigns.length,
    draft: campaigns.filter((c) => c.status === "draft").length,
    scheduled: campaigns.filter((c) => c.status === "scheduled").length,
    sent: campaigns.filter((c) => c.status === "sent").length,
  };

  const sentCampaigns = campaigns.filter((c) => c.status === "sent");
  const totalDelivered = sentCampaigns.reduce((s, c) => s + c.deliveredCount, 0);
  const totalOpened = sentCampaigns.reduce((s, c) => s + c.openedCount, 0);
  const totalClicked = sentCampaigns.reduce((s, c) => s + c.clickedCount, 0);
  const avgOpen = totalDelivered ? Math.round((totalOpened / totalDelivered) * 100) : 0;

  if (!planLoading && !canUseEmail) {
    return (
      <UpgradePrompt
        feature="Email Campaigns"
        description="Create automated email campaigns and send professional outreach to your captured leads. Available on Pro and Agency plans."
        highlights={[
          "Send email campaigns to your captured leads",
          "Pre-built templates for local service businesses",
          "Track open rates, clicks, and conversions",
          "Automated follow-up sequences",
          "Segment your audience by lead status",
        ]}
        planRequired="pro"
      />
    );
  }

  return (
    <div className="space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="w-6 h-6 text-[hsl(213,89%,50%)]" />
            Email Campaigns
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Build, preview, and send permission-based marketing emails to your contacts.
          </p>
        </div>
        <Link href="/email-campaigns/new">
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[hsl(213,89%,50%)] hover:bg-[hsl(213,89%,44%)] text-white text-sm font-bold shadow-md shadow-[hsl(213,89%,50%)]/25 transition-all shrink-0">
            <Plus className="w-4 h-4" />
            New Campaign
          </button>
        </Link>
      </div>

      {/* ── Stat Cards (if any sent) ──────────────────────────────────────── */}
      {counts.sent > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Campaigns Created"
            value={counts.all}
            sub="total across all statuses"
            accent="gray"
          />
          <StatCard
            label="Emails Delivered"
            value={totalDelivered.toLocaleString()}
            sub="across all sent campaigns"
            accent="blue"
          />
          <StatCard
            label="Average Open Rate"
            value={`${avgOpen}%`}
            sub={`${totalOpened.toLocaleString()} total opens`}
            accent="green"
          />
          <StatCard
            label="Total Clicks"
            value={totalClicked.toLocaleString()}
            sub="across all campaigns"
            accent="purple"
          />
        </div>
      )}

      {/* ── Campaign List ─────────────────────────────────────────────────── */}
      <div className="bg-card border border-border/40 rounded-2xl shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center gap-0 border-b border-gray-100 px-2 pt-1">
          {TABS.map((t) => {
            const count = counts[t.key as keyof typeof counts];
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors ${
                  active
                    ? "text-[hsl(213,89%,50%)]"
                    : "text-gray-400 hover:text-gray-700"
                }`}
              >
                {t.label}
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    active
                      ? "bg-[hsl(213,89%,50%)]/10 text-[hsl(213,89%,50%)]"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {count}
                </span>
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[hsl(213,89%,50%)]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-24 flex flex-col items-center gap-4 text-gray-400">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-[hsl(213,89%,50%)] rounded-full animate-spin" />
            <p className="text-sm">Loading campaigns…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 flex flex-col items-center gap-5 text-gray-400">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Mail className="w-8 h-8 text-gray-300" />
            </div>
            <div className="text-center">
              <p className="font-bold text-gray-600 text-base">
                {campaigns.length === 0 ? "No campaigns yet" : "Nothing here"}
              </p>
              <p className="text-sm mt-1 max-w-xs">
                {campaigns.length === 0
                  ? "Create your first email campaign and start reaching your contacts."
                  : "No campaigns match this filter."}
              </p>
            </div>
            {campaigns.length === 0 && (
              <Link href="/email-campaigns/new">
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[hsl(213,89%,50%)] text-white text-sm font-bold shadow-md shadow-[hsl(213,89%,50%)]/25 transition-all hover:bg-[hsl(213,89%,44%)]">
                  <Sparkles className="w-4 h-4" />
                  Create your first campaign
                </button>
              </Link>
            )}
          </div>
        ) : (
          <div>
            {filtered.map((c) => (
              <CampaignCard
                key={c.id}
                campaign={c}
                onDelete={() => deleteCampaign(c.id)}
                deleting={deletingId === c.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Permission Notice ─────────────────────────────────────────────── */}
      <div className="flex items-start gap-4 bg-[hsl(213,89%,50%)]/5 border border-[hsl(213,89%,50%)]/15 rounded-2xl px-5 py-4">
        <div className="w-8 h-8 rounded-lg bg-[hsl(213,89%,50%)]/10 flex items-center justify-center shrink-0 mt-0.5">
          <BarChart2 className="w-4 h-4 text-[hsl(213,89%,50%)]" />
        </div>
        <div>
          <p className="text-sm font-bold text-[hsl(213,89%,50%)] mb-1">
            Permission-based sending
          </p>
          <p className="text-xs text-gray-500 leading-relaxed">
            LeadForge only sends to contacts who have explicitly opted in. Every campaign includes a
            mandatory unsubscribe link. Unsubscribers are automatically excluded from future sends.{" "}
            <Link href="/contacts" className="text-[hsl(213,89%,50%)] font-semibold hover:underline">
              Manage contacts →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
