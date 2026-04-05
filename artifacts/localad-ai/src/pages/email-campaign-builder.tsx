import React, { useState, useEffect } from "react";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Users,
  Send,
  Clock,
  FileText,
  Check,
  Mail,
  Eye,
  Pencil,
  CalendarDays,
  TestTube2,
  X,
  AlertTriangle,
  Zap,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { loadProfile } from "@/lib/profile";

const API = "/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type EmailCopy = {
  subject: string;
  subjectVariations: string[];
  previewText: string;
  headline: string;
  headlineVariations: string[];
  body: string;
  ctaText: string;
  ctaVariations: string[];
};

type ContactStats = {
  total: number;
  subscribed: number;
  all_consented: number;
  subscribed_new_leads: number;
  subscribed_warm_leads: number;
  subscribed_past_customers: number;
};

type WizardStep = 1 | 2 | 3 | 4 | 5;

const STEPS = [
  { n: 1, label: "Offer" },
  { n: 2, label: "Audience" },
  { n: 3, label: "Compose" },
  { n: 4, label: "Preview" },
  { n: 5, label: "Send" },
];

// ─── Step Progress Bar ────────────────────────────────────────────────────────

function StepBar({ current }: { current: WizardStep }) {
  return (
    <div className="flex items-center">
      {STEPS.map((s, i) => {
        const done = current > s.n;
        const active = current === s.n;
        return (
          <React.Fragment key={s.n}>
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-200 ${
                  done
                    ? "bg-[hsl(213,89%,50%)] border-[hsl(213,89%,50%)] text-white shadow-sm shadow-[hsl(213,89%,50%)]/30"
                    : active
                    ? "bg-card border-[hsl(213,89%,50%)] text-[hsl(213,89%,50%)] shadow-sm shadow-[hsl(213,89%,50%)]/20"
                    : "bg-card border-gray-200 text-muted-foreground/45"
                }`}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : s.n}
              </div>
              <span
                className={`text-[10px] font-bold tracking-wide ${
                  active
                    ? "text-[hsl(213,89%,50%)]"
                    : done
                    ? "text-gray-500"
                    : "text-muted-foreground/45"
                }`}
              >
                {s.label.toUpperCase()}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-px mx-3 mb-4 transition-colors duration-300 ${
                  done ? "bg-[hsl(213,89%,50%)]" : "bg-gray-200"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Variation Picker ─────────────────────────────────────────────────────────

function VariationPicker({
  variations,
  current,
  onSelect,
  label,
}: {
  variations: string[];
  current: string;
  onSelect: (v: string) => void;
  label: string;
}) {
  if (!variations.length) return null;
  const pills = ["A", "B", "C"];
  const pillColors = [
    "bg-violet-100 text-violet-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
  ];

  return (
    <div className="mt-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">
        {label}
      </p>
      <div className="space-y-2">
        {variations.map((v, i) => (
          <button
            key={i}
            onClick={() => onSelect(v)}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl border-2 text-xs transition-all flex items-start gap-3 ${
              current === v
                ? "border-[hsl(213,89%,50%)] bg-[hsl(213,89%,50%)]/5 text-gray-900"
                : "border-gray-100 bg-muted/20 text-muted-foreground hover:border-gray-200 hover:bg-card"
            }`}
          >
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-black shrink-0 ${pillColors[i] ?? pillColors[0]}`}
            >
              {pills[i] ?? String(i + 1)}
            </span>
            <span className={current === v ? "font-semibold" : ""}>{v}</span>
            {current === v && (
              <Check className="w-3.5 h-3.5 text-[hsl(213,89%,50%)] shrink-0 ml-auto mt-0.5" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Email Preview ────────────────────────────────────────────────────────────

function EmailPreview({
  copy,
  businessName,
  ctaUrl,
}: {
  copy: EmailCopy;
  businessName: string;
  ctaUrl: string;
}) {
  const paragraphs = copy.body.split(/\n\n+/).filter(Boolean);

  return (
    <div className="bg-gradient-to-b from-gray-100 to-gray-50 rounded-2xl overflow-hidden border border-border/40">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-100 border-b border-gray-200">
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-300" />
          <span className="w-3 h-3 rounded-full bg-yellow-300" />
          <span className="w-3 h-3 rounded-full bg-green-300" />
        </div>
        <div className="flex-1 mx-3 bg-card rounded-lg px-3 py-1 text-xs text-muted-foreground/60 border border-border/40 text-center truncate">
          Email Preview — {copy.subject || "Your Campaign"}
        </div>
      </div>

      {/* Email meta strip */}
      <div className="bg-card/90 border-b border-gray-100 px-6 py-3.5 space-y-1.5">
        <div className="flex items-start gap-3 text-xs">
          <span className="text-muted-foreground/60 w-16 shrink-0 font-medium pt-0.5">From</span>
          <span className="font-semibold text-gray-700">
            {businessName || "Your Business"}{" "}
            <span className="text-muted-foreground/60 font-normal">&lt;hello@yourbusiness.com&gt;</span>
          </span>
        </div>
        <div className="flex items-start gap-3 text-xs">
          <span className="text-muted-foreground/60 w-16 shrink-0 font-medium pt-0.5">Subject</span>
          <span className="font-bold text-gray-900">
            {copy.subject || <span className="text-muted-foreground/45 font-normal italic">Your subject line</span>}
          </span>
        </div>
        {copy.previewText && (
          <div className="flex items-start gap-3 text-xs">
            <span className="text-muted-foreground/60 w-16 shrink-0 font-medium pt-0.5">Preview</span>
            <span className="text-gray-500 italic">{copy.previewText}</span>
          </div>
        )}
      </div>

      {/* Email body */}
      <div className="p-6 flex justify-center">
        <div className="w-full max-w-[480px]">
          <div className="bg-card rounded-2xl overflow-hidden shadow-md border border-border/40">
            {/* Brand header */}
            <div
              className="px-8 py-5 text-center"
              style={{ background: "hsl(215, 75%, 9%)" }}
            >
              <p className="text-white font-extrabold tracking-wider text-sm uppercase">
                {businessName || "YOUR BUSINESS"}
              </p>
            </div>

            {/* Body content */}
            <div className="px-8 py-8 space-y-4">
              {copy.headline && (
                <h2 className="text-xl font-extrabold text-gray-900 leading-tight">
                  {copy.headline}
                </h2>
              )}

              {paragraphs.length > 0 ? (
                paragraphs.map((p, i) => (
                  <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                    {p}
                  </p>
                ))
              ) : (
                <p className="text-sm text-muted-foreground/45 italic">
                  Your email body will appear here…
                </p>
              )}

              {/* CTA */}
              <div className="pt-4">
                <a
                  href={ctaUrl || "#"}
                  onClick={(e) => e.preventDefault()}
                  className="inline-block px-8 py-3.5 rounded-full text-sm font-bold text-white text-center cursor-default shadow-md"
                  style={{
                    background: "hsl(213, 89%, 50%)",
                    boxShadow: "0 4px 14px hsl(213 89% 50% / 0.35)",
                  }}
                >
                  {copy.ctaText || "Book Your Free Estimate"}
                </a>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-muted/20 border-t border-gray-100 px-8 py-6 text-center space-y-2.5">
              <p className="text-xs font-bold text-gray-500">
                {businessName || "Your Business Name"}
              </p>
              <p className="text-[11px] text-muted-foreground/60">
                123 Main Street, Your City · (555) 000-0000
              </p>
              <div className="flex items-center justify-center gap-3">
                <a href="#" className="text-[11px] text-muted-foreground/60 hover:underline">
                  View in browser
                </a>
                <span className="text-muted-foreground/45 text-xs">·</span>
                <a href="#" className="text-[11px] text-muted-foreground/60 hover:underline">
                  Unsubscribe
                </a>
                <span className="text-muted-foreground/45 text-xs">·</span>
                <a href="#" className="text-[11px] text-muted-foreground/60 hover:underline">
                  Privacy
                </a>
              </div>
              <p className="text-[10px] text-muted-foreground/45 leading-relaxed">
                You're receiving this because you subscribed to updates from{" "}
                {businessName || "this business"}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Field Group ──────────────────────────────────────────────────────────────

function FieldGroup({
  label,
  hint,
  counter,
  children,
}: {
  label: string;
  hint?: string;
  counter?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-2">
        <label className="text-xs font-bold text-gray-700">{label}</label>
        {hint && <span className="text-xs text-muted-foreground/60">{hint}</span>}
        {counter && (
          <span className="ml-auto text-[11px] text-muted-foreground/60 tabular-nums">{counter}</span>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Main Builder ─────────────────────────────────────────────────────────────

export default function EmailCampaignBuilder() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const profile = loadProfile();

  const [step, setStep] = useState<WizardStep>(1);
  const [offer, setOffer] = useState("");
  const [prefillBanner, setPrefillBanner] = useState(false);
  const [segment, setSegment] = useState<
    | "subscribed"
    | "all_consented"
    | "subscribed_new_leads"
    | "subscribed_warm_leads"
    | "subscribed_past_customers"
  >("subscribed");
  const [stats, setStats] = useState<ContactStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [copy, setCopy] = useState<EmailCopy>({
    subject: "",
    subjectVariations: [],
    previewText: "",
    headline: "",
    headlineVariations: [],
    body: "",
    ctaText: "",
    ctaVariations: [],
  });
  const [ctaUrl, setCtaUrl] = useState("");
  const [generating, setGenerating] = useState(false);

  const [campaignName, setCampaignName] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [sendMode, setSendMode] = useState<"draft" | "schedule" | "now">("draft");
  const [saving, setSaving] = useState(false);

  const [testEmailOpen, setTestEmailOpen] = useState(false);
  const [testEmailAddr, setTestEmailAddr] = useState("");
  const [testSending, setTestSending] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);

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

  async function loadStats() {
    setStatsLoading(true);
    try {
      const res = await apiFetch("/contacts/stats");
      if (res.ok) setStats(await res.json());
    } finally {
      setStatsLoading(false);
    }
  }

  useEffect(() => {
    const raw = sessionStorage.getItem("lf_campaign_prefill");
    if (raw) {
      try {
        const prefill = JSON.parse(raw);
        if (prefill.offer) {
          setOffer(prefill.offer);
          setPrefillBanner(true);
        }
      } catch {}
      sessionStorage.removeItem("lf_campaign_prefill");
    }
  }, []);

  useEffect(() => {
    if (step === 2) loadStats();
  }, [step]);

  async function generateCopy() {
    if (!offer.trim()) {
      toast({ title: "Describe your offer first", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const res = await apiFetch("/generate/email-campaign", {
        method: "POST",
        body: JSON.stringify({
          offerDescription: offer,
          businessName: profile?.businessName ?? "",
          category: profile?.category ?? "",
          location: profile?.location ?? "",
          services: profile?.services ?? "",
          offer: profile?.offer ?? "",
          tone: profile?.tone ?? "professional",
        }),
      });
      if (res.status === 402) {
        const data = await res.json().catch(() => ({}));
        toast({
          title: "Not enough credits",
          description: `Email campaign generation costs 2 credits. You have ${data.current ?? 0} credits.`,
          variant: "destructive",
        });
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      setCopy({
        subject: data.subject ?? "",
        subjectVariations: data.subjectVariations ?? [],
        previewText: data.previewText ?? "",
        headline: data.headline ?? "",
        headlineVariations: data.headlineVariations ?? [],
        body: data.body ?? "",
        ctaText: data.ctaText ?? "",
        ctaVariations: data.ctaVariations ?? [],
      });
      setStep(3);
    } catch {
      toast({ title: "Generation failed — please try again", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }

  async function regenerate() {
    setGenerating(true);
    try {
      const res = await apiFetch("/generate/email-campaign", {
        method: "POST",
        body: JSON.stringify({
          offerDescription: offer,
          businessName: profile?.businessName ?? "",
          category: profile?.category ?? "",
          location: profile?.location ?? "",
          services: profile?.services ?? "",
          offer: profile?.offer ?? "",
          tone: profile?.tone ?? "professional",
        }),
      });
      if (res.status === 402) {
        const data = await res.json().catch(() => ({}));
        toast({
          title: "Not enough credits",
          description: `Email campaign generation costs 2 credits. You have ${data.current ?? 0} credits.`,
          variant: "destructive",
        });
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      setCopy({
        subject: data.subject ?? "",
        subjectVariations: data.subjectVariations ?? [],
        previewText: data.previewText ?? "",
        headline: data.headline ?? "",
        headlineVariations: data.headlineVariations ?? [],
        body: data.body ?? "",
        ctaText: data.ctaText ?? "",
        ctaVariations: data.ctaVariations ?? [],
      });
      toast({ title: "Email copy refreshed" });
    } catch {
      toast({ title: "Generation failed — please try again", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }

  async function saveCampaign(status: "draft" | "scheduled" | "sent") {
    if (!campaignName.trim()) {
      toast({ title: "Please name your campaign", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      let scheduledAt: string | undefined;
      if (status === "scheduled" && scheduleDate) {
        scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
      }

      const res = await apiFetch("/email-campaigns", {
        method: "POST",
        body: JSON.stringify({
          name: campaignName,
          status,
          subject: copy.subject,
          previewText: copy.previewText,
          headline: copy.headline,
          body: copy.body,
          ctaText: copy.ctaText,
          ctaUrl,
          offerContext: offer,
          segment,
          scheduledAt,
        }),
      });

      if (!res.ok) throw new Error();
      const created = await res.json();

      if (status === "sent") {
        await apiFetch(`/email-campaigns/${created.id}/send`, { method: "POST" });
      }

      toast({
        title:
          status === "sent"
            ? "Campaign sent!"
            : status === "scheduled"
            ? "Campaign scheduled"
            : "Draft saved",
      });

      navigate("/email-campaigns");
    } catch {
      toast({ title: "Failed to save campaign", variant: "destructive" });
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  }

  function handleSendClick() {
    if (!campaignName.trim()) {
      toast({ title: "Please name your campaign first", variant: "destructive" });
      return;
    }
    if (sendMode === "now") {
      setConfirmOpen(true);
    } else if (sendMode === "draft") {
      saveCampaign("draft");
    } else {
      saveCampaign("scheduled");
    }
  }

  async function sendTestEmail() {
    if (!testEmailAddr) return;
    setTestSending(true);
    await new Promise((r) => setTimeout(r, 1200));
    setTestSending(false);
    setTestEmailOpen(false);
    toast({ title: `Test email sent to ${testEmailAddr}` });
  }

  const eligibleCount =
    stats
      ? segment === "subscribed"
        ? stats.subscribed
        : segment === "all_consented"
        ? stats.all_consented
        : segment === "subscribed_new_leads"
        ? stats.subscribed_new_leads
        : segment === "subscribed_warm_leads"
        ? stats.subscribed_warm_leads
        : segment === "subscribed_past_customers"
        ? stats.subscribed_past_customers
        : 0
      : null;

  // ─── Segment Options ────────────────────────────────────────────────────────

  const segmentOptions = [
    {
      key: "subscribed" as const,
      label: "Subscribed Contacts",
      description: "Opted-in subscribers. Highest engagement, safest choice.",
      count: stats?.subscribed,
      badge: "Recommended",
      accentClass: "border-emerald-500 bg-emerald-50",
      badgeClass: "bg-emerald-100 text-emerald-700",
      countClass: "text-emerald-700",
      dotClass: "bg-emerald-500",
    },
    {
      key: "all_consented" as const,
      label: "All Marketing-Consented",
      description: "Subscribed + Transactional Only. Broader reach.",
      count: stats?.all_consented,
      badge: "Broader",
      accentClass: "border-[hsl(213,89%,50%)] bg-[hsl(213,89%,50%)]/5",
      badgeClass: "bg-blue-100 text-blue-700",
      countClass: "text-[hsl(213,89%,50%)]",
      dotClass: "bg-[hsl(213,89%,50%)]",
    },
    {
      key: "subscribed_new_leads" as const,
      label: "Subscribed New Leads",
      description: "First-touch contacts who opted in. Great for intro offers.",
      count: stats?.subscribed_new_leads,
      badge: "Targeted",
      accentClass: "border-blue-400 bg-blue-50/50",
      badgeClass: "bg-blue-50 text-blue-600",
      countClass: "text-blue-600",
      dotClass: "bg-blue-400",
    },
    {
      key: "subscribed_warm_leads" as const,
      label: "Subscribed Warm Leads",
      description: "Engaged contacts showing buying interest.",
      count: stats?.subscribed_warm_leads,
      badge: "High intent",
      accentClass: "border-amber-400 bg-amber-50/50",
      badgeClass: "bg-amber-100 text-amber-700",
      countClass: "text-amber-700",
      dotClass: "bg-amber-400",
    },
    {
      key: "subscribed_past_customers" as const,
      label: "Subscribed Past Customers",
      description: "Happy customers who can become repeat buyers.",
      count: stats?.subscribed_past_customers,
      badge: "High value",
      accentClass: "border-teal-400 bg-teal-50/50",
      badgeClass: "bg-teal-100 text-teal-700",
      countClass: "text-teal-700",
      dotClass: "bg-teal-500",
    },
  ];

  // ─── Shared nav footer ──────────────────────────────────────────────────────

  function NavFooter({
    onBack,
    onNext,
    nextLabel,
    nextDisabled,
    nextIcon: NextIcon,
  }: {
    onBack?: () => void;
    onNext?: () => void;
    nextLabel: string;
    nextDisabled?: boolean;
    nextIcon?: React.ElementType;
  }) {
    return (
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        {onBack ? (
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/40 text-sm font-semibold text-muted-foreground hover:bg-muted/20 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        ) : (
          <div />
        )}
        {onNext && (
          <button
            onClick={onNext}
            disabled={nextDisabled}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all ${
              nextDisabled
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-[hsl(213,89%,50%)] hover:bg-[hsl(213,89%,44%)] shadow-md shadow-[hsl(213,89%,50%)]/25"
            }`}
          >
            {nextLabel}
            {NextIcon && <NextIcon className="w-4 h-4" />}
          </button>
        )}
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/email-campaigns">
          <button className="w-9 h-9 rounded-xl flex items-center justify-center border border-border/40 hover:bg-muted/20 text-muted-foreground/60 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
            New Email Campaign
          </h1>
          <p className="text-xs text-muted-foreground/60 mt-0.5">
            Build and send a permission-based marketing email
          </p>
        </div>
      </div>

      {/* Step progress */}
      <div className="bg-card border border-border/40 rounded-2xl px-6 pt-5 pb-4 shadow-sm">
        <StepBar current={step} />
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Step 1: Offer ━━━ */}
      {step === 1 && (
        <div className="bg-card border border-border/40 rounded-2xl p-7 shadow-sm space-y-6">
          {prefillBanner && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[hsl(213,89%,50%)]/6 border border-[hsl(213,89%,50%)]/20">
              <div className="w-5 h-5 rounded-full bg-[hsl(213,89%,50%)]/15 flex items-center justify-center shrink-0">
                <Zap className="w-3 h-3 text-[hsl(213,89%,50%)]" />
              </div>
              <p className="text-sm font-semibold text-[hsl(213,89%,50%)] flex-1">
                Pre-filled from your Campaign Builder offer — review and adjust.
              </p>
              <button
                onClick={() => setPrefillBanner(false)}
                className="text-[hsl(213,89%,50%)]/40 hover:text-[hsl(213,89%,50%)] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div>
            <h2 className="text-lg font-extrabold text-gray-900 mb-1">
              What's your offer?
            </h2>
            <p className="text-sm text-gray-500">
              Describe what you're promoting — the more specific, the better the AI output.
            </p>
          </div>

          <div className="space-y-2">
            <Textarea
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
              placeholder='e.g. "15% off exterior house painting this spring — book before May 31st. Free colour consultation included."'
              className="resize-none h-36 text-sm leading-relaxed rounded-xl border-gray-200 focus:border-[hsl(213,89%,50%)] focus:ring-[hsl(213,89%,50%)]/20"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground/60">
              <span>{offer.length} characters</span>
              <span className={offer.length < 40 ? "text-amber-500" : "text-emerald-500"}>
                {offer.length < 40 ? "Aim for 40+ characters" : "Good length ✓"}
              </span>
            </div>
          </div>

          {profile?.offer && !offer && (
            <button
              onClick={() => setOffer(profile.offer)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[hsl(213,89%,50%)] hover:underline"
            >
              <Sparkles className="w-3 h-3" />
              Auto-fill from my profile offer
            </button>
          )}

          <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4">
            <p className="text-xs font-bold text-blue-700 mb-2">Tips for a great offer</p>
            <ul className="text-xs text-blue-600 space-y-1 list-disc list-inside leading-relaxed">
              <li>Include a specific discount, freebie, or deadline</li>
              <li>Mention the service type (e.g. "deck staining," "roof inspection")</li>
              <li>Say who it's for (e.g. "for homeowners in Austin")</li>
            </ul>
          </div>

          <NavFooter
            nextLabel="Choose Audience"
            onNext={() => setStep(2)}
            nextDisabled={offer.trim().length < 10}
            nextIcon={ArrowRight}
          />
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Step 2: Audience ━━━ */}
      {step === 2 && (
        <div className="bg-card border border-border/40 rounded-2xl p-7 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 mb-1">
              Who should receive this?
            </h2>
            <p className="text-sm text-gray-500">
              Select your audience. We only send to contacts who've given permission.
            </p>
          </div>

          <div className="space-y-3">
            {segmentOptions.map((opt) => {
              const active = segment === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setSegment(opt.key)}
                  className={`w-full text-left rounded-2xl border-2 p-4 transition-all duration-150 ${
                    active ? opt.accentClass : "border-gray-100 bg-card hover:border-gray-200"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Radio dot */}
                    <div
                      className={`w-5 h-5 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center transition-colors ${
                        active ? "border-current bg-current" : "border-gray-300 bg-white"
                      }`}
                      style={{ color: active ? opt.dotClass.replace("bg-", "") : undefined }}
                    >
                      {active && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`font-bold text-sm ${active ? "text-gray-900" : "text-gray-700"}`}>
                          {opt.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${opt.badgeClass}`}>
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">{opt.description}</p>
                    </div>

                    {/* Count */}
                    <div className="text-right shrink-0">
                      <p className={`text-2xl font-extrabold tabular-nums leading-none ${active ? opt.countClass : "text-muted-foreground/45"}`}>
                        {statsLoading ? "…" : opt.count ?? "—"}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5 font-medium">contacts</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {eligibleCount === 0 && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-700">No eligible contacts yet</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Add subscribed contacts before sending.{" "}
                  <Link href="/contacts" className="underline font-semibold">
                    Go to Contacts →
                  </Link>
                </p>
              </div>
            </div>
          )}

          <NavFooter
            onBack={() => setStep(1)}
            nextLabel={generating ? "Writing your email…" : "Generate Email Copy"}
            onNext={generateCopy}
            nextDisabled={generating}
            nextIcon={generating ? undefined : Sparkles}
          />
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Step 3: Compose ━━━ */}
      {step === 3 && (
        <div className="bg-card border border-border/40 rounded-2xl p-7 shadow-sm space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-gray-900 mb-1">
                Review &amp; refine your email
              </h2>
              <p className="text-sm text-gray-500">
                AI wrote this — edit any field to match your voice.
              </p>
            </div>
            <button
              onClick={regenerate}
              disabled={generating}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border/40 text-xs font-bold text-muted-foreground hover:bg-muted/20 transition-colors disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`} />
              Regenerate
            </button>
          </div>

          <div className="space-y-5">
            {/* Subject line */}
            <FieldGroup
              label="Subject Line"
              hint="shown in inbox"
              counter={`${copy.subject.length} / 60`}
            >
              <Input
                value={copy.subject}
                onChange={(e) => setCopy((c) => ({ ...c, subject: e.target.value }))}
                placeholder="Your compelling subject line…"
                className="text-sm rounded-xl"
              />
              <VariationPicker
                variations={copy.subjectVariations}
                current={copy.subject}
                onSelect={(v) => setCopy((c) => ({ ...c, subject: v }))}
                label="3 AI variations — click to use"
              />
            </FieldGroup>

            {/* Preview text */}
            <FieldGroup
              label="Preview Text"
              hint="shows after subject in inbox"
              counter={`${copy.previewText.length} / 90`}
            >
              <Input
                value={copy.previewText}
                onChange={(e) => setCopy((c) => ({ ...c, previewText: e.target.value }))}
                placeholder="Short preview shown in inbox before opening…"
                className="text-sm rounded-xl"
              />
            </FieldGroup>

            {/* Headline */}
            <FieldGroup label="Email Headline" hint="top of email body">
              <Input
                value={copy.headline}
                onChange={(e) => setCopy((c) => ({ ...c, headline: e.target.value }))}
                placeholder="Main headline inside the email…"
                className="text-sm rounded-xl"
              />
              <VariationPicker
                variations={copy.headlineVariations}
                current={copy.headline}
                onSelect={(v) => setCopy((c) => ({ ...c, headline: v }))}
                label="3 AI headline variations"
              />
            </FieldGroup>

            {/* Body */}
            <FieldGroup label="Email Body">
              <Textarea
                value={copy.body}
                onChange={(e) => setCopy((c) => ({ ...c, body: e.target.value }))}
                placeholder="Email body — separate paragraphs with a blank line…"
                className="text-sm resize-none h-44 leading-relaxed rounded-xl"
              />
            </FieldGroup>

            {/* CTA */}
            <div className="grid grid-cols-2 gap-3">
              <FieldGroup label="CTA Button Text">
                <Input
                  value={copy.ctaText}
                  onChange={(e) => setCopy((c) => ({ ...c, ctaText: e.target.value }))}
                  placeholder="Book Your Free Estimate"
                  className="text-sm rounded-xl"
                />
              </FieldGroup>
              <FieldGroup label="CTA Link URL">
                <Input
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  placeholder="https://yourbusiness.com/book"
                  className="text-sm rounded-xl"
                  type="url"
                />
              </FieldGroup>
            </div>
            <VariationPicker
              variations={copy.ctaVariations}
              current={copy.ctaText}
              onSelect={(v) => setCopy((c) => ({ ...c, ctaText: v }))}
              label="3 AI CTA button variations"
            />
          </div>

          <NavFooter
            onBack={() => setStep(2)}
            nextLabel="Preview Email"
            onNext={() => setStep(4)}
            nextDisabled={!copy.subject || !copy.body}
            nextIcon={Eye}
          />
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Step 4: Preview ━━━ */}
      {step === 4 && (
        <div className="space-y-4">
          {/* Preview header card */}
          <div className="bg-card border border-border/40 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-extrabold text-gray-900">Email Preview</h2>
                <p className="text-xs text-muted-foreground/60 mt-0.5">
                  Review before sending. Click "Edit" to go back and make changes.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTestEmailOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border/40 text-xs font-bold text-muted-foreground hover:bg-muted/20 transition-colors"
                >
                  <TestTube2 className="w-3.5 h-3.5" />
                  Send Test
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border/40 text-xs font-bold text-muted-foreground hover:bg-muted/20 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
              </div>
            </div>

            <EmailPreview
              copy={copy}
              businessName={profile?.businessName ?? ""}
              ctaUrl={ctaUrl}
            />
          </div>

          <NavFooter
            onBack={() => setStep(3)}
            nextLabel="Continue to Send"
            onNext={() => setStep(5)}
            nextIcon={ArrowRight}
          />
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Step 5: Send ━━━ */}
      {step === 5 && (
        <div className="bg-card border border-border/40 rounded-2xl p-7 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 mb-1">Ready to send?</h2>
            <p className="text-sm text-gray-500">
              Name your campaign and choose how you'd like to proceed.
            </p>
          </div>

          {/* Campaign name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700">
              Campaign Name <span className="text-red-400">*</span>
            </label>
            <Input
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder='e.g. "Spring Painting Offer — May 2025"'
              className="text-sm rounded-xl"
            />
            <p className="text-xs text-muted-foreground/60">For your reference only — not shown to recipients</p>
          </div>

          {/* Campaign summary card */}
          <div
            className="rounded-2xl p-5 space-y-3 border"
            style={{ background: "hsl(215, 75%, 9%)", borderColor: "hsl(215, 75%, 15%)" }}
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">
              Campaign Summary
            </p>
            {[
              {
                label: "Subject",
                value: copy.subject || "—",
                icon: Mail,
              },
              {
                label: "Audience",
                value:
                  segment === "subscribed"
                    ? "Subscribed Contacts"
                    : segment === "all_consented"
                    ? "All Marketing-Consented"
                    : segment === "subscribed_new_leads"
                    ? "Subscribed New Leads"
                    : segment === "subscribed_warm_leads"
                    ? "Subscribed Warm Leads"
                    : "Subscribed Past Customers",
                icon: Target,
              },
              {
                label: "Recipients",
                value:
                  eligibleCount != null
                    ? `${eligibleCount} eligible contact${eligibleCount !== 1 ? "s" : ""}`
                    : "—",
                icon: Users,
              },
            ].map((row) => {
              const Icon = row.icon;
              return (
                <div key={row.label} className="flex items-start gap-3">
                  <Icon className="w-4 h-4 text-white/30 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0 flex items-baseline gap-2">
                    <span className="text-xs text-white/40 shrink-0 w-20">{row.label}</span>
                    <span className="text-xs font-semibold text-white/80 truncate">
                      {row.value}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Send mode picker */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-700">Choose action</p>
            {[
              {
                key: "draft" as const,
                icon: FileText,
                title: "Save as Draft",
                description: "Save without sending — come back to finish later",
                activeClass: "border-gray-400 bg-muted/20",
                iconColor: "text-gray-500",
              },
              {
                key: "schedule" as const,
                icon: CalendarDays,
                title: "Schedule Send",
                description: "Choose a date and time to automatically send",
                activeClass: "border-amber-400 bg-amber-50/60",
                iconColor: "text-amber-600",
              },
              {
                key: "now" as const,
                icon: Send,
                title: "Send Now",
                description: `Send immediately to ${eligibleCount ?? "your"} eligible contact${(eligibleCount ?? 2) !== 1 ? "s" : ""}`,
                activeClass: "border-[hsl(213,89%,50%)] bg-[hsl(213,89%,50%)]/5",
                iconColor: "text-[hsl(213,89%,50%)]",
              },
            ].map((opt) => {
              const Icon = opt.icon;
              const active = sendMode === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setSendMode(opt.key)}
                  className={`w-full text-left rounded-2xl border-2 px-5 py-4 transition-all duration-150 ${
                    active ? opt.activeClass : "border-gray-100 bg-card hover:border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                        active
                          ? "border-[hsl(213,89%,50%)] bg-[hsl(213,89%,50%)]"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {active && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        active ? "bg-white/70" : "bg-gray-100"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? opt.iconColor : "text-muted-foreground/60"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{opt.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Schedule picker */}
          {sendMode === "schedule" && (
            <div className="grid grid-cols-2 gap-3 bg-amber-50 border border-amber-100 rounded-2xl p-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-amber-700">Send Date</label>
                <Input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="text-sm rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-amber-700">Send Time</label>
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="text-sm rounded-xl"
                />
              </div>
            </div>
          )}

          {/* Nav */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStep(4)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/40 text-sm font-semibold text-muted-foreground hover:bg-muted/20 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={() => setTestEmailOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/40 text-sm font-semibold text-muted-foreground hover:bg-muted/20 transition-colors"
              >
                <TestTube2 className="w-4 h-4" />
                Send Test
              </button>
            </div>

            <button
              onClick={handleSendClick}
              disabled={
                saving ||
                !campaignName.trim() ||
                (sendMode === "schedule" && !scheduleDate)
              }
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all min-w-[148px] justify-center ${
                saving || !campaignName.trim()
                  ? "bg-gray-300 cursor-not-allowed"
                  : sendMode === "now"
                  ? "bg-[hsl(213,89%,50%)] hover:bg-[hsl(213,89%,44%)] shadow-md shadow-[hsl(213,89%,50%)]/25"
                  : sendMode === "schedule"
                  ? "bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-500/25"
                  : "bg-gray-700 hover:bg-gray-800"
              }`}
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving…
                </>
              ) : sendMode === "now" ? (
                <>
                  <Send className="w-4 h-4" />
                  Send Campaign
                </>
              ) : sendMode === "schedule" ? (
                <>
                  <CalendarDays className="w-4 h-4" />
                  Schedule Send
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Save Draft
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━ Send Confirmation Modal ━━━ */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-base">
              <div className="w-8 h-8 rounded-xl bg-[hsl(213,89%,50%)]/10 flex items-center justify-center">
                <Send className="w-4 h-4 text-[hsl(213,89%,50%)]" />
              </div>
              Confirm Send
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 space-y-4">
            <p className="text-sm text-gray-500 leading-relaxed">
              You're about to send this campaign. This action{" "}
              <strong className="text-gray-800">cannot be undone</strong>.
            </p>

            {/* Summary */}
            <div className="bg-muted/20 border border-border/40 rounded-xl p-4 space-y-2.5">
              {[
                { label: "Campaign", value: campaignName },
                { label: "Subject", value: copy.subject },
                {
                  label: "To",
                  value: `${eligibleCount ?? "—"} eligible contact${(eligibleCount ?? 2) !== 1 ? "s" : ""}`,
                },
              ].map((r) => (
                <div key={r.label} className="flex items-baseline gap-2 text-sm">
                  <span className="text-muted-foreground/60 w-20 shrink-0 text-xs font-medium">{r.label}</span>
                  <span className="font-semibold text-gray-900 truncate">{r.value}</span>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <Mail className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-600 leading-relaxed">
                Each recipient will receive a personalized email with a mandatory unsubscribe link.
                Unsubscribers are automatically removed from future sends.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <button
              onClick={() => setConfirmOpen(false)}
              className="px-4 py-2 rounded-xl border border-border/40 text-sm font-semibold text-muted-foreground hover:bg-muted/20 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => saveCampaign("sent")}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[hsl(213,89%,50%)] hover:bg-[hsl(213,89%,44%)] text-white text-sm font-bold shadow-md shadow-[hsl(213,89%,50%)]/25 transition-all min-w-[120px] justify-center"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Confirm &amp; Send
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ━━━━━━━━━━━━━━━━━━ Test Email Dialog ━━━ */}
      <Dialog open={testEmailOpen} onOpenChange={setTestEmailOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-base">
              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                <TestTube2 className="w-4 h-4 text-muted-foreground" />
              </div>
              Send Test Email
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-gray-500">
              Send a preview to yourself to see how this email looks in a real inbox.
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Your email address</label>
              <Input
                value={testEmailAddr}
                onChange={(e) => setTestEmailAddr(e.target.value)}
                placeholder="you@yourbusiness.com"
                type="email"
                className="text-sm rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button
              onClick={() => setTestEmailOpen(false)}
              className="px-4 py-2 rounded-xl border border-border/40 text-sm font-semibold text-muted-foreground hover:bg-muted/20 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={sendTestEmail}
              disabled={!testEmailAddr || testSending}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[hsl(213,89%,50%)] hover:bg-[hsl(213,89%,44%)] text-white text-sm font-bold shadow-md shadow-[hsl(213,89%,50%)]/25 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {testSending ? "Sending…" : "Send Test"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
