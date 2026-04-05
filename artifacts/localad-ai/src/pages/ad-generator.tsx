import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { usePlan } from "@/hooks/use-plan";
import { CampaignLimitBanner } from "@/components/upgrade-prompt";
import {
  Sparkles,
  Copy,
  BookmarkPlus,
  Check,
  Image,
  Loader2,
  AlertCircle,
  RefreshCw,
  Mail,
  MessageSquare,
  ArrowRight,
  X,
  Lock,
  Coins,
  CreditCard,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { loadProfile } from "@/lib/profile";
import { Analytics } from "@/lib/analytics";

const API = "/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Variation {
  angle: string;
  headline: string;
  primaryText: string;
  cta: string;
  offerHighlight: string;
  imagePrompt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const platforms = [
  { value: "facebook", label: "Facebook Ad" },
  { value: "instagram", label: "Instagram Ad" },
  { value: "google", label: "Google Ad" },
  { value: "flyer", label: "Print Flyer" },
  { value: "landing", label: "Landing Page" },
  { value: "nextdoor", label: "Nextdoor Post" },
  { value: "email", label: "Email Campaign" },
];

const goals = [
  { value: "leads", label: "Generate Leads" },
  { value: "calls", label: "Drive Phone Calls" },
  { value: "bookings", label: "Get Bookings" },
  { value: "awareness", label: "Brand Awareness" },
  { value: "promo", label: "Promote an Offer" },
  { value: "reviews", label: "Get More Reviews" },
  { value: "referrals", label: "Drive Referrals" },
];

const tones = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "urgent", label: "Urgent" },
  { value: "educational", label: "Educational" },
  { value: "bold", label: "Bold & Direct" },
  { value: "local", label: "Local & Personal" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied to clipboard!" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function CopyIconButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
        copied
          ? "border-green-200 bg-green-50 text-green-600"
          : "border-border/40 bg-card text-muted-foreground hover:bg-card/80"
      }`}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ─── Next-Steps Action Card ───────────────────────────────────────────────────

function NextStepsCard({
  offer,
  variations,
  onSave,
  saved,
  onEmailCampaign,
  onSMSFollowUp,
  smsLoading,
  limitReached,
}: {
  offer: string;
  variations: Variation[];
  onSave: () => void;
  saved: boolean;
  onEmailCampaign: () => void;
  onSMSFollowUp: () => void;
  smsLoading: boolean;
  limitReached?: boolean;
}) {
  const best = variations[0];

  return (
    <div
      className="rounded-2xl overflow-hidden border border-[hsl(213,89%,50%)]/20 shadow-lg"
      style={{ background: "linear-gradient(135deg, hsl(215,75%,9%) 0%, hsl(220,60%,15%) 100%)" }}
    >
      {/* Top bar */}
      <div className="px-6 pt-6 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-full bg-[hsl(213,89%,50%)]/20 border border-[hsl(213,89%,50%)]/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[hsl(213,89%,50%)]" />
          </div>
          <h3 className="text-white font-bold text-base">Turn this offer into a campaign</h3>
        </div>
        <p className="text-white/50 text-sm ml-11">
          Your offer is ready. Take it further with email or SMS.
        </p>
      </div>

      {/* Offer preview */}
      {best && (
        <div className="px-6 py-4 border-b border-white/10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">
            Your best variation
          </p>
          <p className="text-white font-semibold text-sm leading-snug mb-1">
            {best.headline}
          </p>
          <p className="text-white/40 text-xs truncate">{best.offerHighlight}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="px-6 py-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Primary: Email Campaign */}
        <button
          onClick={onEmailCampaign}
          className="flex-1 flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-[hsl(213,89%,50%)] hover:bg-[hsl(213,89%,44%)] text-white font-semibold text-sm transition-all shadow-lg shadow-[hsl(213,89%,50%)]/30 group"
        >
          <Mail className="w-4 h-4" />
          <span>Create Email Campaign</span>
          <span className="ml-auto flex items-center gap-1 text-white/60 text-[11px] font-normal">
            <Coins className="w-3 h-3" />2
          </span>
          <ArrowRight className="w-4 h-4 opacity-60 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* Secondary: SMS */}
        <button
          onClick={onSMSFollowUp}
          disabled={smsLoading}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/8 hover:bg-white/14 border border-white/15 text-white/80 hover:text-white font-medium text-sm transition-all min-w-[180px]"
        >
          {smsLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <MessageSquare className="w-4 h-4" />
          )}
          {smsLoading ? "Generating…" : "SMS Follow-Up"}
          {!smsLoading && (
            <span className="ml-auto flex items-center gap-0.5 text-white/40 text-[11px]">
              <Coins className="w-3 h-3" />1
            </span>
          )}
        </button>

        {/* Tertiary: Save (disabled when campaign limit reached) */}
        {limitReached ? (
          <button
            disabled
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-amber-400/30 bg-amber-400/10 text-amber-300 font-medium text-sm cursor-not-allowed"
            title="Campaign limit reached — upgrade to save"
          >
            <Lock className="w-4 h-4" />
            Limit Reached
          </button>
        ) : (
          <button
            onClick={onSave}
            disabled={saved}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border font-medium text-sm transition-all ${
              saved
                ? "border-green-400/30 bg-green-400/10 text-green-300 cursor-default"
                : "border-white/20 bg-transparent text-white/60 hover:text-white hover:border-white/30"
            }`}
          >
            {saved ? (
              <><Check className="w-4 h-4" />Saved!</>
            ) : (
              <><BookmarkPlus className="w-4 h-4" />Save Offer</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── SMS Modal ────────────────────────────────────────────────────────────────

function SmsModal({
  open,
  onClose,
  template,
}: {
  open: boolean;
  onClose: () => void;
  template: string;
}) {
  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-green-500" />
            SMS Follow-Up Template
          </DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-4">
          <p className="text-sm text-gray-500">
            Copy this message and paste it into your SMS app to follow up with leads.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                Message
              </p>
              <CopyIconButton text={template} />
            </div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {template}
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
            <p className="text-xs text-amber-700">
              <strong>Tip:</strong> Personalize with the customer's first name before sending. Keep it under 160 characters for best deliverability.
            </p>
          </div>
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <span className="font-semibold">{template.length}</span> characters
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="text-sm">Close</Button>
          <CopyIconButton text={template} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const CREDIT_COSTS = {
  campaign: 5,
  landingPage: 2,
  emailCampaign: 2,
  followUp: 1,
  headlines: 2,
  ctas: 2,
} as const;

export default function CampaignBuilder() {
  const { toast } = useToast();
  const { getToken } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { isFree, isPro, isAtCampaignLimit, campaignCount, limits, credits } = usePlan();

  const [platform, setPlatform] = useState("facebook");
  const [goal, setGoal] = useState("leads");
  const [tone, setTone] = useState("professional");
  const [offer, setOffer] = useState("");
  const [generating, setGenerating] = useState(false);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [savedAll, setSavedAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileBanner, setProfileBanner] = useState<string | null>(null);
  const [profile, setProfile] = useState<ReturnType<typeof loadProfile>>(null);

  const [smsOpen, setSmsOpen] = useState(false);
  const [smsTemplate, setSmsTemplate] = useState("");
  const [smsLoading, setSmsLoading] = useState(false);

  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
    if (p) {
      if (p.offer) setOffer(p.offer);
      if (p.tone) setTone(p.tone);
      const parts = [p.businessName, p.location].filter(Boolean);
      if (parts.length > 0) {
        setProfileBanner(`Pre-filled from your profile: ${parts.join(" · ")}`);
      }
    }
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setVariations([]);
    setSavedAll(false);
    setError(null);

    try {
      const token = await getToken();
      const body = {
        platform,
        goal,
        tone,
        offer,
        businessName: profile?.businessName ?? "",
        category: profile?.category ?? "",
        location: profile?.location ?? "",
        services: profile?.services ?? "",
      };

      const res = await fetch(`${API}/generate/campaign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (res.status === 402) {
        const data = await res.json().catch(() => ({}));
        const needed = data.required ?? CREDIT_COSTS.campaign;
        const have = data.current ?? 0;
        throw new Error(`Not enough credits. This action costs ${needed} credits but you only have ${have}.`);
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `Request failed: ${res.status}`);
      }

      const data = await res.json();
      const vars: Variation[] = Array.isArray(data?.variations) ? data.variations : [];

      if (vars.length === 0) {
        throw new Error("No variations returned. Please try again.");
      }

      setVariations(vars);
      Analytics.campaignGenerated({ platform, goal, tone, credits_remaining: credits - 5 });
      if (platform === "landing") Analytics.landingPageGenerated({ credits_remaining: credits - 5 });
      if (credits - 5 <= 5) Analytics.creditsLow({ credits_remaining: credits - 5 });
      // Refresh credit balance
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      toast({ title: "Generation failed", description: msg, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = () => {
    setSavedAll(true);
    toast({
      title: "Campaign saved!",
      description: "Your campaign variations have been saved to Saved Campaigns.",
    });
  };

  const handleEmailCampaign = () => {
    const best = variations[0];
    const prefill = {
      offer: [
        offer,
        best?.offerHighlight ? `Offer highlight: ${best.offerHighlight}` : "",
        best?.headline ? `Key headline: ${best.headline}` : "",
        best?.cta ? `CTA: ${best.cta}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      headline: best?.headline ?? "",
      cta: best?.cta ?? "",
    };
    sessionStorage.setItem("lf_campaign_prefill", JSON.stringify(prefill));
    navigate("/email-campaigns/new");
  };

  const handleSMSFollowUp = async () => {
    setSmsLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/generate/follow-up`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          channel: "sms",
          count: 1,
          businessName: profile?.businessName ?? "",
          category: profile?.category ?? "",
          location: profile?.location ?? "",
          services: profile?.services ?? "",
          offer: offer || variations[0]?.offerHighlight || "",
          tone: tone ?? "friendly",
        }),
      });

      if (res.status === 402) {
        const data = await res.json().catch(() => ({}));
        toast({
          title: "Not enough credits",
          description: `SMS generation costs ${CREDIT_COSTS.followUp} credit. You have ${data.current ?? 0} credits.`,
          variant: "destructive",
        });
        setSmsLoading(false);
        return;
      }

      if (!res.ok) throw new Error();
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      const msg = data.messages?.[0];

      if (msg?.body) {
        setSmsTemplate(msg.body);
      } else {
        const best = variations[0];
        setSmsTemplate(
          `Hi [Name], it's ${profile?.businessName ?? "us"}! ` +
          `${offer || best?.offerHighlight || "We have a special offer for you."}` +
          ` Reply "BOOK" or call us to get started. ${best?.cta ?? "Book now!"}`
        );
      }
      setSmsOpen(true);
    } catch {
      const best = variations[0];
      setSmsTemplate(
        `Hi [Name], ${profile?.businessName ?? "we"} have a great offer for you! ` +
        `${offer || best?.offerHighlight || "Check out our latest deal."}` +
        ` ${best?.cta ?? "Book now!"} — reply to this message or give us a call.`
      );
      setSmsOpen(true);
    } finally {
      setSmsLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          Campaign Builder
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Choose your platform, goal, and tone — then create professional lead-generating campaigns in seconds.
        </p>
      </div>

      {profileBanner && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/6 border border-primary/20 text-sm">
          <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <Check className="w-3 h-3 text-primary" />
          </div>
          <p className="text-primary font-medium">{profileBanner}</p>
          <span className="ml-auto text-primary/60 text-xs font-medium">Offer & tone pre-filled</span>
        </div>
      )}

      {isFree && (
        <CampaignLimitBanner
          used={campaignCount}
          limit={limits.campaigns}
        />
      )}

      {/* Generator Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configure Your Campaign</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Platform */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Platform</Label>
            <div className="flex flex-wrap gap-2">
              {platforms.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPlatform(p.value)}
                  className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    platform === p.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/30 text-muted-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Goal */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Campaign Goal</Label>
            <div className="flex flex-wrap gap-2">
              {goals.map(g => (
                <button
                  key={g.value}
                  onClick={() => setGoal(g.value)}
                  className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    goal === g.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/30 text-muted-foreground"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tone */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Tone</Label>
            <div className="flex flex-wrap gap-2">
              {tones.map(t => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    tone === t.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/30 text-muted-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Offer */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Your Offer (optional)</Label>
            <Input
              value={offer}
              onChange={e => setOffer(e.target.value)}
              placeholder="e.g. Free estimate, 15% off first job, same-day service..."
            />
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Button onClick={handleGenerate} disabled={generating || isAtCampaignLimit} className="gap-2" size="lg">
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Create Campaign
                  </>
                )}
              </Button>
              {!isPro && (
                <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg font-semibold">
                  <Coins className="w-3.5 h-3.5" />
                  {CREDIT_COSTS.campaign} credits
                </div>
              )}
            </div>
            {isFree && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-semibold text-amber-600">{credits}</span>
                <span>credits remaining</span>
              </div>
            )}
            {variations.length > 0 && !generating && (
              <p className="text-sm text-muted-foreground">
                {variations.length} variations generated
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {generating && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground px-1">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>GPT is writing 4 campaign variations for you...</span>
          </div>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-xl border border-border/60 overflow-hidden">
              <div className="h-12 bg-muted/60 animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-3 bg-muted rounded animate-pulse w-3/4" style={{ animationDelay: `${i * 100}ms` }} />
                <div className="h-3 bg-muted rounded animate-pulse w-full" style={{ animationDelay: `${i * 150}ms` }} />
                <div className="h-3 bg-muted rounded animate-pulse w-5/6" style={{ animationDelay: `${i * 200}ms` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !generating && (
        <div className={`flex items-start gap-3 p-4 rounded-xl border ${
          error.includes("Not enough credits")
            ? "bg-amber-50 border-amber-200"
            : "bg-destructive/6 border-destructive/20"
        }`}>
          {error.includes("Not enough credits") ? (
            <Coins className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${error.includes("Not enough credits") ? "text-amber-700" : "text-destructive"}`}>
              {error.includes("Not enough credits") ? "Not enough credits" : "Generation failed"}
            </p>
            <p className={`text-sm mt-0.5 ${error.includes("Not enough credits") ? "text-amber-600" : "text-destructive/80"}`}>
              {error}
            </p>
            {error.includes("Not enough credits") && (
              <p className="text-xs text-amber-500 mt-1">
                Contact your admin to get more credits, or upgrade your plan.
              </p>
            )}
          </div>
          {!error.includes("Not enough credits") && (
            <Button variant="ghost" size="sm" onClick={handleGenerate} className="gap-1.5 text-destructive hover:text-destructive">
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </Button>
          )}
        </div>
      )}

      {/* Generated Variations */}
      {variations.length > 0 && !generating && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {variations.length} Campaign Variations Generated
            </h2>
          </div>

          {variations.map((v, i) => (
            <Card key={i} className="border-2 hover:border-primary/30 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10 text-xs font-semibold">
                      Variation {i + 1}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">{v.angle}</Badge>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {platforms.find(p => p.value === platform)?.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Headline */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Headline</span>
                    <CopyButton text={v.headline} />
                  </div>
                  <p className="font-bold text-sm leading-snug">{v.headline}</p>
                </div>

                {/* Primary Text */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Primary Text</span>
                    <CopyButton text={v.primaryText} />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{v.primaryText}</p>
                </div>

                {/* CTA + Offer */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Call to Action</span>
                      <CopyButton text={v.cta} />
                    </div>
                    <p className="font-semibold text-sm text-primary">{v.cta}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Offer Highlight</span>
                      <CopyButton text={v.offerHighlight} />
                    </div>
                    <p className="text-sm">{v.offerHighlight}</p>
                  </div>
                </div>

                {/* Image Prompt */}
                {v.imagePrompt && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Image className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-semibold text-primary uppercase tracking-wide">Image Prompt</span>
                      </div>
                      <CopyButton text={v.imagePrompt} />
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed italic">{v.imagePrompt}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* ── Next Steps Action Card ──────────────────────────────────────── */}
          <NextStepsCard
            offer={offer}
            variations={variations}
            onSave={handleSave}
            saved={savedAll}
            onEmailCampaign={handleEmailCampaign}
            onSMSFollowUp={handleSMSFollowUp}
            smsLoading={smsLoading}
            limitReached={isAtCampaignLimit}
          />
        </div>
      )}

      {/* Empty State */}
      {variations.length === 0 && !generating && !error && (
        <div className="border-2 border-dashed rounded-xl p-16 text-center">
          <Sparkles className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">Ready to generate</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            Select your platform, goal, and tone above — then click "Create Campaign" to get 4 AI-written lead-generating variations in seconds.
          </p>
        </div>
      )}

      {/* SMS Modal */}
      <SmsModal
        open={smsOpen}
        onClose={() => setSmsOpen(false)}
        template={smsTemplate}
      />
    </div>
  );
}
