import { useState, useEffect, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import {
  ExternalLink, CheckCircle2, AlertCircle, AlertTriangle,
  RefreshCw, Unlink, BarChart2, TrendingUp, MousePointerClick,
  DollarSign, Target, Zap, ArrowUpRight, Info, PlusCircle,
  Loader2, X, ChevronRight, Link2, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { usePlan } from "@/hooks/use-plan";

const API = "/api";
const BG   = "#060A14";
const CARD = "#0C1528";
const CYAN  = "#19D3FF";
const BLUE  = "#2B85E4";
const GREEN = "#3DD13D";
const EMBER = "#FF7A1A";
const GOLD  = "#F59E0B";

type Platform = "meta" | "google";

interface Connection {
  id: number;
  platform: Platform;
  accountId: string | null;
  accountName: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface Account { id: string; name: string; }

interface ReportRow {
  campaignId: string;
  campaignName: string;
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  conversions: number;
  source: Platform;
}

interface CampaignInput {
  name: string;
  objective: string;
  dailyBudget: string;
  status: "ACTIVE" | "PAUSED";
  startTime: string;
  endTime: string;
  businessType: string;
  landingPageUrl: string;
  headlineText: string;
  descriptionText: string;
}

interface CreatedResult {
  platform: Platform;
  campaignId: string;
  adSetId?: string;
  adGroupId?: string;
  adId?: string;
  creativeId?: string;
}

// ─── Platform config ──────────────────────────────────────────────────────────
const PLATFORMS: Record<Platform, {
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  glow: string;
  logoBg: string;
  docs: string;
  docsLabel: string;
  icon: React.ReactNode;
  objectives: Array<{ value: string; label: string }>;
}> = {
  meta: {
    label: "Meta Ads",
    shortLabel: "Meta",
    description: "Facebook & Instagram advertising",
    color: "#1877F2",
    glow: "rgba(24,119,242,0.18)",
    logoBg: "rgba(24,119,242,0.12)",
    docs: "https://developers.facebook.com/docs/marketing-apis",
    docsLabel: "Meta for Developers",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="#1877F2">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    objectives: [
      { value: "OUTCOME_LEADS", label: "Lead Generation" },
      { value: "OUTCOME_AWARENESS", label: "Brand Awareness" },
      { value: "OUTCOME_TRAFFIC", label: "Traffic" },
      { value: "OUTCOME_ENGAGEMENT", label: "Engagement" },
      { value: "OUTCOME_SALES", label: "Sales" },
    ],
  },
  google: {
    label: "Google Ads",
    shortLabel: "Google",
    description: "Search, Display & YouTube campaigns",
    color: "#4285F4",
    glow: "rgba(66,133,244,0.18)",
    logoBg: "rgba(66,133,244,0.12)",
    docs: "https://developers.google.com/google-ads/api/docs/start",
    docsLabel: "Google Ads API Docs",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
    objectives: [
      { value: "SEARCH", label: "Search" },
      { value: "DISPLAY", label: "Display" },
      { value: "SHOPPING", label: "Shopping" },
      { value: "VIDEO", label: "YouTube Video" },
      { value: "LOCAL", label: "Local" },
    ],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}
function fmtMoney(n: number) { return `$${n.toFixed(2)}`; }
function today() { return new Date().toISOString().slice(0, 10); }
function nDaysAgo(n: number) { return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10); }

// Inline error banner
function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-xs border"
      style={{ background: "rgba(239,68,68,0.07)", borderColor: "rgba(239,68,68,0.25)", color: "#f87171" }}>
      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="shrink-0 hover:opacity-70 transition-opacity">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AdPlatformsPage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchStr = useSearch();
  const [, setLocation] = useLocation();
  const { isFree, isLoading: planLoading, openCheckout } = usePlan();

  const [activePlatform, setActivePlatform] = useState<Platform | null>(null);
  const [activeTab, setActiveTab] = useState<"report" | "builder">("report");
  const [reportFrom, setReportFrom] = useState(nDaysAgo(30));
  const [reportTo, setReportTo] = useState(today());
  const [createdResult, setCreatedResult] = useState<CreatedResult | null>(null);

  // Per-section error state
  const [reportError, setReportError] = useState<string | null>(null);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [builderError, setBuilderError] = useState<string | null>(null);

  const [campaignInput, setCampaignInput] = useState<CampaignInput>({
    name: "LeadForge Starter Campaign",
    objective: "OUTCOME_LEADS",
    dailyBudget: "25",
    status: "PAUSED",
    startTime: "",
    endTime: "",
    businessType: "",
    landingPageUrl: "",
    headlineText: "",
    descriptionText: "",
  });

  // Handle OAuth callback params
  useEffect(() => {
    const params = new URLSearchParams(searchStr);
    const connected = params.get("connected") as Platform | null;
    const error = params.get("error");
    if (connected && PLATFORMS[connected]) {
      toast({ title: `${PLATFORMS[connected].label} connected!`, description: "Your ad account has been linked to LeadForge." });
      queryClient.invalidateQueries({ queryKey: ["ad-connections"] });
      setActivePlatform(connected);
      setActiveTab("report");
      setLocation("/ad-platforms", { replace: true });
    }
    if (error) {
      toast({ title: "Connection failed", description: decodeURIComponent(error), variant: "destructive" });
      setLocation("/ad-platforms", { replace: true });
    }
  }, [searchStr]);

  async function apiFetch(path: string, options: RequestInit = {}) {
    const token = await getToken();
    return fetch(`${API}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    });
  }

  // Load connections
  const { data: connections = [], isLoading: connectionsLoading } = useQuery<Connection[]>({
    queryKey: ["ad-connections"],
    queryFn: async () => {
      const res = await apiFetch("/ads/connections");
      return res.ok ? res.json() : [];
    },
    staleTime: 60_000,
  });

  // Load accounts for active platform
  const {
    data: accountsData,
    isLoading: accountsLoading,
    isFetching: accountsFetching,
    refetch: refetchAccounts,
  } = useQuery<{ accounts: Account[] }>({
    queryKey: ["ad-accounts", activePlatform],
    queryFn: async () => {
      if (!activePlatform) return { accounts: [] };
      setAccountsError(null);
      const res = await apiFetch(`/ads/${activePlatform}/accounts`);
      const data = await res.json();
      if (!res.ok) {
        setAccountsError(data.error ?? "Failed to load accounts");
        return { accounts: [] };
      }
      return data;
    },
    enabled: !!activePlatform,
    staleTime: 5 * 60_000,
    retry: false,
  });

  // Load report
  const {
    data: reportData,
    isLoading: reportLoading,
    isFetching: reportFetching,
    refetch: refetchReport,
  } = useQuery<{ rows: ReportRow[]; from: string; to: string }>({
    queryKey: ["ad-report", activePlatform, reportFrom, reportTo],
    queryFn: async () => {
      if (!activePlatform) return { rows: [], from: reportFrom, to: reportTo };
      setReportError(null);
      const res = await apiFetch(`/ads/${activePlatform}/report?from=${reportFrom}&to=${reportTo}`);
      const data = await res.json();
      if (!res.ok) {
        setReportError(data.error ?? "Failed to load report");
        return { rows: [], from: reportFrom, to: reportTo };
      }
      return data;
    },
    enabled: !!activePlatform && activeTab === "report",
    staleTime: 5 * 60_000,
    retry: false,
  });

  const connectedSet = new Set(connections.map((c) => c.platform));
  const activeConn = connections.find((c) => c.platform === activePlatform);
  const accounts = accountsData?.accounts ?? [];
  const rows = reportData?.rows ?? [];

  const totals = useMemo(() =>
    rows.reduce((acc, r) => ({
      impressions: acc.impressions + r.impressions,
      clicks: acc.clicks + r.clicks,
      spend: acc.spend + r.spend,
      conversions: acc.conversions + r.conversions,
    }), { impressions: 0, clicks: 0, spend: 0, conversions: 0 }),
    [rows]
  );
  const avgCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;

  // Mutations
  const connectMutation = useMutation({
    mutationFn: async (platform: Platform) => {
      const res = await apiFetch(`/ads/${platform}/auth-url`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to get authorization URL");
      window.location.href = data.url;
    },
    onError: (err: Error) => toast({ title: "Connection failed", description: err.message, variant: "destructive" }),
  });

  const disconnectMutation = useMutation({
    mutationFn: async (platform: Platform) => {
      const res = await apiFetch(`/ads/${platform}/disconnect`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to disconnect");
    },
    onSuccess: (_, platform) => {
      queryClient.removeQueries({ queryKey: ["ad-accounts", platform] });
      queryClient.removeQueries({ queryKey: ["ad-report", platform] });
      queryClient.invalidateQueries({ queryKey: ["ad-connections"] });
      if (activePlatform === platform) setActivePlatform(null);
      toast({ title: "Platform disconnected" });
    },
    onError: () => toast({ title: "Failed to disconnect", variant: "destructive" }),
  });

  const setAccountMutation = useMutation({
    mutationFn: async ({ platform, account }: { platform: Platform; account: Account }) => {
      const res = await apiFetch(`/ads/${platform}/account`, {
        method: "PUT",
        body: JSON.stringify({ accountId: account.id, accountName: account.name }),
      });
      if (!res.ok) throw new Error("Failed to update account");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ad-connections"] });
      queryClient.invalidateQueries({ queryKey: ["ad-report", activePlatform] });
    },
    onError: (err: Error) => toast({ title: "Failed to save account", description: err.message, variant: "destructive" }),
  });

  const createCampaignMutation = useMutation({
    mutationFn: async () => {
      if (!activePlatform) throw new Error("No platform selected");
      const conn = connections.find((c) => c.platform === activePlatform);
      if (!conn?.accountId) throw new Error("Select an ad account above before creating a campaign");
      setBuilderError(null);
      const budget = parseFloat(campaignInput.dailyBudget);
      if (isNaN(budget) || budget <= 0) throw new Error("Enter a valid daily budget (minimum $1)");
      const res = await apiFetch(`/ads/${activePlatform}/campaigns`, {
        method: "POST",
        body: JSON.stringify({
          accountId: conn.accountId,
          input: {
            name: campaignInput.name,
            objective: campaignInput.objective,
            dailyBudget: budget,
            status: campaignInput.status,
            startTime: campaignInput.startTime ? `${campaignInput.startTime}T00:00:00Z` : undefined,
            endTime: campaignInput.endTime ? `${campaignInput.endTime}T23:59:59Z` : undefined,
            businessType: campaignInput.businessType || undefined,
            landingPageUrl: campaignInput.landingPageUrl || undefined,
            headlineText: campaignInput.headlineText || undefined,
            descriptionText: campaignInput.descriptionText || undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Campaign creation failed");
      return data.result as CreatedResult;
    },
    onSuccess: (result) => {
      setCreatedResult(result);
      toast({
        title: "Campaign created!",
        description: `${PLATFORMS[result.platform].label} campaign #${result.campaignId} is ready.`,
      });
    },
    onError: (err: Error) => {
      setBuilderError(err.message);
    },
  });

  function field(key: keyof CampaignInput, value: string) {
    setCampaignInput((p) => ({ ...p, [key]: value }));
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  // Free-plan gate — show upgrade CTA instead of ad platform content
  if (!planLoading && isFree) {
    return (
      <div className="space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(25,211,255,0.1)" }}>
              <Target className="w-4.5 h-4.5" style={{ color: "#19D3FF" }} />
            </div>
            Ad Platforms
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect Meta and Google Ads to launch campaigns and view live performance.
          </p>
        </div>

        <div className="rounded-2xl border p-8 text-center max-w-lg mx-auto" style={{ background: "#0C1528", borderColor: "rgba(245,158,11,0.25)" }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
            <Lock className="w-8 h-8" style={{ color: "#F59E0B" }} />
          </div>
          <h2 className="text-lg font-black text-foreground mb-2">Pro & Agency feature</h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6 leading-relaxed">
            Connecting Meta Ads and Google Ads, launching campaigns, and viewing live performance reports require a paid plan.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-6 text-left">
            {[
              "Meta Ads OAuth connection",
              "Google Ads OAuth connection",
              "Live performance reports",
              "Campaign creation in-app",
              "AES-256 token encryption",
              "Multi-account support",
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: "#3DD13D" }} />
                {feat}
              </div>
            ))}
          </div>
          <Button
            className="w-full gap-2 font-bold text-sm h-10"
            style={{ background: "linear-gradient(135deg, #2B85E4, #19D3FF)", color: "white" }}
            onClick={() => openCheckout("price_1TIPrT87xwLZFMFUABWYHxRh")}>
            <Zap className="w-4 h-4" />
            Upgrade to Pro — $29/mo
          </Button>
          <p className="text-[11px] text-muted-foreground mt-3">No commitment · Cancel anytime</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(25,211,255,0.1)" }}>
              <Target className="w-4.5 h-4.5" style={{ color: CYAN }} />
            </div>
            Ad Platforms
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect Meta and Google Ads to launch campaigns and view live performance — all from LeadForge.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
          <span>{connectedSet.size}/2 connected</span>
          <div className="flex gap-1">
            {(["meta", "google"] as Platform[]).map((p) => (
              <div key={p} className="w-2 h-2 rounded-full transition-colors"
                style={{ background: connectedSet.has(p) ? GREEN : "rgba(255,255,255,0.15)" }} />
            ))}
          </div>
        </div>
      </div>

      {/* Platform cards — side by side on md+ */}
      <div className="grid md:grid-cols-2 gap-4">
        {(["meta", "google"] as Platform[]).map((platform) => {
          const cfg = PLATFORMS[platform];
          const conn = connections.find((c) => c.platform === platform);
          const isConnected = connectedSet.has(platform);
          const isActive = activePlatform === platform;
          const isLoading = connectionsLoading;

          return (
            <div key={platform}
              className="rounded-2xl border transition-all duration-200 flex flex-col"
              style={{
                background: CARD,
                borderColor: isActive ? cfg.color : "rgba(255,255,255,0.07)",
                boxShadow: isActive ? `0 0 0 1px ${cfg.color}, 0 10px 32px ${cfg.glow}` : "0 2px 12px rgba(0,0,0,0.25)",
              }}>

              {/* Card header */}
              <div className="p-5">
                <div className="flex items-start justify-between mb-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: cfg.logoBg, border: `1px solid ${cfg.color}20` }}>
                      {cfg.icon}
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-[15px]">{cfg.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{cfg.description}</p>
                    </div>
                  </div>
                  {/* Status pill */}
                  <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ml-2"
                    style={isConnected
                      ? { background: "rgba(61,209,61,0.1)", color: GREEN, border: `1px solid rgba(61,209,61,0.2)` }
                      : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.07)" }
                    }>
                    {isConnected
                      ? <><CheckCircle2 className="w-3 h-3" /> Connected</>
                      : <><AlertCircle className="w-3 h-3" /> Not connected</>
                    }
                  </div>
                </div>

                {/* Account chip */}
                {conn?.accountName && (
                  <div className="rounded-xl px-3 py-2 mb-3.5 text-xs flex items-center gap-2"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <Link2 className="w-3 h-3 shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground truncate">
                      {conn.accountName}
                      {conn.accountId && <span className="opacity-40 ml-1">({conn.accountId})</span>}
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {isLoading ? (
                    <div className="h-8 flex-1 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />
                  ) : isConnected ? (
                    <>
                      <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs font-semibold h-8"
                        style={isActive
                          ? { borderColor: cfg.color, color: cfg.color, background: `${cfg.color}10` }
                          : {}}
                        onClick={() => {
                          setActivePlatform(isActive ? null : platform);
                          setActiveTab("report");
                          setReportError(null);
                          setBuilderError(null);
                        }}>
                        <BarChart2 className="w-3.5 h-3.5" />
                        {isActive ? "Collapse" : "Manage"}
                        {!isActive && <ChevronRight className="w-3 h-3 ml-auto" />}
                      </Button>
                      <Button size="sm" variant="ghost" className="gap-1 text-xs text-muted-foreground hover:text-red-400 h-8 px-2.5"
                        onClick={() => disconnectMutation.mutate(platform)}
                        disabled={disconnectMutation.isPending && disconnectMutation.variables === platform}>
                        {disconnectMutation.isPending && disconnectMutation.variables === platform
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Unlink className="w-3.5 h-3.5" />
                        }
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" className="flex-1 gap-1.5 text-xs font-bold h-8"
                        style={{ background: cfg.color, color: "white" }}
                        onClick={() => connectMutation.mutate(platform)}
                        disabled={connectMutation.isPending}>
                        {connectMutation.isPending
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <ExternalLink className="w-3.5 h-3.5" />
                        }
                        Connect {cfg.shortLabel}
                      </Button>
                      <a href={cfg.docs} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors h-8 px-1">
                        <Info className="w-3.5 h-3.5" /> Docs
                      </a>
                    </>
                  )}
                </div>
              </div>

              {/* ─── Expanded management panel ──────────────────────────── */}
              {isActive && (
                <div className="border-t flex flex-col gap-4 px-5 pb-5 pt-4"
                  style={{ borderColor: `${cfg.color}18` }}>

                  {/* Account picker */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Ad Account</p>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                        onClick={() => { setAccountsError(null); refetchAccounts(); }}
                        disabled={accountsFetching}>
                        <RefreshCw className={`w-3 h-3 ${accountsFetching ? "animate-spin" : ""}`} />
                        {accountsFetching ? "Loading…" : "Refresh"}
                      </Button>
                    </div>
                    {accountsError && <ErrorBanner message={accountsError} onDismiss={() => setAccountsError(null)} />}
                    {accountsLoading ? (
                      <div className="h-9 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />
                    ) : accounts.length > 0 ? (
                      <select
                        value={activeConn?.accountId ?? ""}
                        onChange={(e) => {
                          const acc = accounts.find((a) => a.id === e.target.value);
                          if (acc) setAccountMutation.mutate({ platform, account: acc });
                        }}
                        className="w-full rounded-xl px-3 py-2 text-sm text-foreground border appearance-none"
                        style={{ background: BG, borderColor: "rgba(255,255,255,0.1)", outline: "none" }}>
                        <option value="">Choose an account…</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>{a.name || a.id}</option>
                        ))}
                      </select>
                    ) : !accountsError ? (
                      <p className="text-xs text-muted-foreground px-1">
                        {activeConn?.accountId
                          ? <span>Using: <span className="text-foreground/60 font-medium">{activeConn.accountName || activeConn.accountId}</span></span>
                          : "Click Refresh to load your available ad accounts"}
                      </p>
                    ) : null}
                    {setAccountMutation.isPending && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Saving account…
                      </p>
                    )}
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-2 p-1 rounded-xl" style={{ background: "rgba(0,0,0,0.25)" }}>
                    {(["report", "builder"] as const).map((tab) => (
                      <button key={tab}
                        className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        style={{
                          background: activeTab === tab ? CARD : "transparent",
                          color: activeTab === tab ? "white" : "rgba(255,255,255,0.4)",
                          boxShadow: activeTab === tab ? "0 1px 4px rgba(0,0,0,0.4)" : "none",
                        }}
                        onClick={() => { setActiveTab(tab); setBuilderError(null); }}>
                        {tab === "report" ? "Performance" : "Create Campaign"}
                      </button>
                    ))}
                  </div>

                  {/* ── Performance Report ──────────────────────────────── */}
                  {activeTab === "report" && (
                    <div className="space-y-3.5">
                      {/* Date range + load */}
                      <div className="flex items-center gap-2">
                        <input type="date" value={reportFrom}
                          onChange={(e) => setReportFrom(e.target.value)}
                          className="flex-1 rounded-xl px-2.5 py-1.5 text-xs text-foreground border bg-transparent"
                          style={{ borderColor: "rgba(255,255,255,0.1)" }} />
                        <span className="text-muted-foreground text-xs">→</span>
                        <input type="date" value={reportTo}
                          onChange={(e) => setReportTo(e.target.value)}
                          className="flex-1 rounded-xl px-2.5 py-1.5 text-xs text-foreground border bg-transparent"
                          style={{ borderColor: "rgba(255,255,255,0.1)" }} />
                        <Button size="sm" variant="outline" className="shrink-0 gap-1 text-xs h-7 px-2.5"
                          onClick={() => { setReportError(null); refetchReport(); }}
                          disabled={reportFetching || !activeConn?.accountId}>
                          <RefreshCw className={`w-3 h-3 ${reportFetching ? "animate-spin" : ""}`} />
                          Load
                        </Button>
                      </div>

                      {!activeConn?.accountId && (
                        <div className="rounded-xl px-3 py-2.5 text-xs border flex items-center gap-2"
                          style={{ background: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.2)", color: GOLD }}>
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          Select an ad account above to load reports.
                        </div>
                      )}

                      {reportError && <ErrorBanner message={reportError} onDismiss={() => setReportError(null)} />}

                      {reportLoading ? (
                        <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground text-xs">
                          <Loader2 className="w-4 h-4 animate-spin" style={{ color: cfg.color }} />
                          Loading campaign data…
                        </div>
                      ) : rows.length > 0 ? (
                        <>
                          {/* Stat tiles */}
                          <div className="grid grid-cols-2 gap-2.5">
                            {[
                              { label: "Impressions", value: fmt(totals.impressions), color: CYAN, icon: TrendingUp },
                              { label: "Clicks", value: fmt(totals.clicks), color: BLUE, icon: MousePointerClick },
                              { label: "Total Spend", value: fmtMoney(totals.spend), color: EMBER, icon: DollarSign },
                              { label: "Conversions", value: fmt(totals.conversions), color: GREEN, icon: Zap },
                            ].map((s) => (
                              <div key={s.label} className="rounded-xl p-3 border border-border/25"
                                style={{ background: "rgba(0,0,0,0.3)" }}>
                                <s.icon className="w-3.5 h-3.5 mb-2" style={{ color: s.color }} />
                                <p className="text-xl font-black text-foreground tracking-tight">{s.value}</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
                              </div>
                            ))}
                          </div>

                          {/* CTR callout */}
                          <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 border"
                            style={{ background: "rgba(245,158,11,0.05)", borderColor: "rgba(245,158,11,0.15)" }}>
                            <ArrowUpRight className="w-4 h-4 shrink-0" style={{ color: GOLD }} />
                            <p className="text-xs text-muted-foreground">
                              Avg CTR: <span className="font-bold" style={{ color: GOLD }}>{avgCtr.toFixed(2)}%</span>
                              <span className="ml-1.5">
                                {avgCtr >= 5 ? "· Exceeding local service benchmark 🎯" : avgCtr >= 2 ? "· Within healthy range" : "· Refine your ad copy for better results"}
                              </span>
                            </p>
                          </div>

                          {/* Campaign table */}
                          <div className="rounded-xl border border-border/25 overflow-hidden">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-border/25">
                                  {["Campaign", "Impr.", "Clicks", "CTR", "Spend", "Conv."].map((h) => (
                                    <th key={h} className="px-3 py-2.5 text-left font-semibold text-muted-foreground"
                                      style={{ fontSize: "10px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {rows.map((r, i) => (
                                  <tr key={r.campaignId}
                                    className={`hover:bg-white/[0.02] transition-colors ${i < rows.length - 1 ? "border-b border-border/20" : ""}`}>
                                    <td className="px-3 py-2.5 font-medium text-foreground/90 max-w-[120px] truncate">{r.campaignName}</td>
                                    <td className="px-3 py-2.5 text-muted-foreground tabular-nums">{fmt(r.impressions)}</td>
                                    <td className="px-3 py-2.5 text-muted-foreground tabular-nums">{fmt(r.clicks)}</td>
                                    <td className="px-3 py-2.5">
                                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                                        style={r.ctr >= 5
                                          ? { background: "rgba(61,209,61,0.12)", color: GREEN }
                                          : r.ctr >= 2
                                          ? { background: "rgba(245,158,11,0.12)", color: GOLD }
                                          : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)" }}>
                                        {r.ctr.toFixed(2)}%
                                      </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-muted-foreground tabular-nums">{fmtMoney(r.spend)}</td>
                                    <td className="px-3 py-2.5 text-muted-foreground tabular-nums">{r.conversions}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      ) : !reportError && !reportLoading && activeConn?.accountId ? (
                        <div className="py-8 text-center text-xs text-muted-foreground">
                          No campaign data found for this date range.
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* ── Campaign Builder ────────────────────────────────── */}
                  {activeTab === "builder" && (
                    <div className="space-y-3.5">
                      {!activeConn?.accountId && (
                        <div className="rounded-xl px-3 py-2.5 text-xs border flex items-center gap-2"
                          style={{ background: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.2)", color: GOLD }}>
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          Select an ad account above before creating a campaign.
                        </div>
                      )}

                      {builderError && <ErrorBanner message={builderError} onDismiss={() => setBuilderError(null)} />}

                      {/* Success card */}
                      {createdResult && createdResult.platform === platform && (
                        <div className="rounded-xl border p-3.5 space-y-2.5"
                          style={{ background: "rgba(61,209,61,0.06)", borderColor: "rgba(61,209,61,0.2)" }}>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: GREEN }} />
                            <p className="text-xs font-bold text-foreground">Campaign created successfully!</p>
                            <button onClick={() => setCreatedResult(null)} className="ml-auto text-muted-foreground hover:text-foreground">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            {[
                              { label: "Campaign ID", value: createdResult.campaignId },
                              createdResult.adSetId && { label: "Ad Set ID", value: createdResult.adSetId },
                              createdResult.adGroupId && { label: "Ad Group ID", value: createdResult.adGroupId },
                              createdResult.creativeId && { label: "Creative ID", value: createdResult.creativeId },
                              createdResult.adId && { label: "Ad ID", value: createdResult.adId },
                            ].filter(Boolean).map((item: any) => (
                              <div key={item.label}>
                                <p className="text-[10px] text-muted-foreground">{item.label}</p>
                                <p className="text-xs font-mono text-foreground/80 truncate">{item.value}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Form */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="col-span-2 space-y-1">
                          <label className="text-[11px] font-medium text-muted-foreground">Campaign Name *</label>
                          <Input value={campaignInput.name} onChange={(e) => field("name", e.target.value)}
                            placeholder="LeadForge Starter Campaign"
                            className="h-8 text-xs bg-transparent border-border/40" />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-muted-foreground">Objective</label>
                          <select value={campaignInput.objective} onChange={(e) => field("objective", e.target.value)}
                            className="w-full h-8 rounded-xl px-2.5 text-xs text-foreground border appearance-none"
                            style={{ background: BG, borderColor: "rgba(255,255,255,0.1)" }}>
                            {cfg.objectives.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-muted-foreground">Status</label>
                          <select value={campaignInput.status} onChange={(e) => field("status", e.target.value as "ACTIVE" | "PAUSED")}
                            className="w-full h-8 rounded-xl px-2.5 text-xs text-foreground border appearance-none"
                            style={{ background: BG, borderColor: "rgba(255,255,255,0.1)" }}>
                            <option value="PAUSED">Start Paused</option>
                            <option value="ACTIVE">Start Active</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-muted-foreground">Daily Budget ($)</label>
                          <Input type="number" min="1" value={campaignInput.dailyBudget}
                            onChange={(e) => field("dailyBudget", e.target.value)}
                            placeholder="25"
                            className="h-8 text-xs bg-transparent border-border/40" />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-muted-foreground">Business Type</label>
                          <Input value={campaignInput.businessType} onChange={(e) => field("businessType", e.target.value)}
                            placeholder="e.g. Painting company"
                            className="h-8 text-xs bg-transparent border-border/40" />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-muted-foreground">Start Date</label>
                          <input type="date" value={campaignInput.startTime} onChange={(e) => field("startTime", e.target.value)}
                            className="w-full h-8 rounded-xl px-2.5 text-xs text-foreground border bg-transparent"
                            style={{ borderColor: "rgba(255,255,255,0.1)" }} />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-muted-foreground">End Date</label>
                          <input type="date" value={campaignInput.endTime} onChange={(e) => field("endTime", e.target.value)}
                            className="w-full h-8 rounded-xl px-2.5 text-xs text-foreground border bg-transparent"
                            style={{ borderColor: "rgba(255,255,255,0.1)" }} />
                        </div>

                        <div className="col-span-2 space-y-1">
                          <label className="text-[11px] font-medium text-muted-foreground">Ad Headline <span className="opacity-50">(max 30 chars)</span></label>
                          <Input value={campaignInput.headlineText} onChange={(e) => field("headlineText", e.target.value)}
                            maxLength={30} placeholder="Get a free quote today"
                            className="h-8 text-xs bg-transparent border-border/40" />
                        </div>

                        <div className="col-span-2 space-y-1">
                          <label className="text-[11px] font-medium text-muted-foreground">Ad Description <span className="opacity-50">(max 90 chars)</span></label>
                          <Input value={campaignInput.descriptionText} onChange={(e) => field("descriptionText", e.target.value)}
                            maxLength={90} placeholder="Trusted local service. Call us today."
                            className="h-8 text-xs bg-transparent border-border/40" />
                        </div>

                        <div className="col-span-2 space-y-1">
                          <label className="text-[11px] font-medium text-muted-foreground">Landing Page URL</label>
                          <Input value={campaignInput.landingPageUrl} onChange={(e) => field("landingPageUrl", e.target.value)}
                            placeholder="https://yourwebsite.com/get-a-quote"
                            className="h-8 text-xs bg-transparent border-border/40" />
                        </div>
                      </div>

                      {/* Submit */}
                      <Button
                        className="w-full gap-2 font-bold text-sm h-9"
                        style={{ background: activeConn?.accountId ? cfg.color : "rgba(255,255,255,0.08)", color: "white" }}
                        onClick={() => createCampaignMutation.mutate()}
                        disabled={createCampaignMutation.isPending || !activeConn?.accountId}>
                        {createCampaignMutation.isPending
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating campaign…</>
                          : <><PlusCircle className="w-4 h-4" /> Create on {cfg.label}</>
                        }
                      </Button>

                      <p className="text-[10px] text-muted-foreground text-center">
                        Creates campaign → ad set/group → creative → ad in {cfg.label}. Starts paused by default.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state — nothing connected */}
      {!connectionsLoading && connections.length === 0 && (
        <div className="rounded-2xl border border-border/40 p-8 text-center" style={{ background: CARD }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(25,211,255,0.07)", border: "1px solid rgba(25,211,255,0.15)" }}>
            <Target className="w-7 h-7" style={{ color: CYAN }} />
          </div>
          <h3 className="text-base font-bold text-foreground mb-2">Connect your first ad platform</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-5">
            Link Meta or Google Ads to pull live campaign performance and launch campaigns directly from LeadForge.
          </p>
          <p className="text-xs text-muted-foreground">
            You'll need API credentials configured first.{" "}
            <a href="https://developers.facebook.com/docs/marketing-apis" target="_blank" rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground transition-colors">Meta Ads docs</a>
            {" · "}
            <a href="https://developers.google.com/google-ads/api/docs/start" target="_blank" rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground transition-colors">Google Ads docs</a>
          </p>
        </div>
      )}
    </div>
  );
}
