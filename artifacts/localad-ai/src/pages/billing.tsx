import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Zap,
  Shield,
  Star,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  Crown,
  Building2,
  Sparkles,
  Coins,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AppLayout from "@/components/layout/app-layout";
import { usePlan } from "@/hooks/use-plan";
import { Analytics } from "@/lib/analytics";

const API = "/api";

// Hardcoded Stripe price IDs — used when products API returns empty
const STRIPE_PRICE_IDS: Record<string, string> = {
  pro: "price_1TIPrT87xwLZFMFUABWYHxRh",
  agency: "price_1TIPrU87xwLZFMFUANXT0LKp",
  full_access: import.meta.env.VITE_FULL_ACCESS_STRIPE_PRICE_ID || "",
};

const PLAN_META: Record<string, { label: string; color: string; icon: React.ElementType; price: string; description: string }> = {
  free: {
    label: "Free",
    color: "text-slate-500",
    icon: Zap,
    price: "$0",
    description: "20 lifetime credits — 1 free AI image trial",
  },
  pro: {
    label: "Pro",
    color: "text-blue-600",
    icon: Star,
    price: "$29/mo",
    description: "200 credits/month — 40 AI images, 80 refinements",
  },
  agency: {
    label: "Agency",
    color: "text-violet-600",
    icon: Crown,
    price: "$69/mo",
    description: "700 credits/month — 120 AI images, 240 refinements",
  },
  full_access: {
    label: "Full Access",
    color: "text-amber-500",
    icon: Sparkles,
    price: "$99/mo",
    description: "1,000 credits/month — 300 AI images, 600 refinements",
  },
};

const UPGRADE_PLANS = [
  {
    planKey: "pro",
    name: "Pro Plan",
    price: "$29",
    period: "/month",
    description: "200 credits/month — 40 AI images, 80 refinements",
    features: [
      "200 campaign credits per month",
      "40 AI image generations/month",
      "80 refinements/month",
      "40 exports/month",
      "All platforms — Facebook, Google, Instagram",
      "3 business profiles, email campaigns & CRM",
    ],
    highlight: true,
    stripeName: "Pro Plan",
    accentClass: "border-[hsl(213,89%,50%)] shadow-blue-100",
    badgeClass: "bg-[hsl(213,89%,50%)]",
    btnClass: "bg-[hsl(213,89%,50%)] hover:bg-[hsl(213,89%,44%)] text-white shadow-md shadow-blue-200",
  },
  {
    planKey: "agency",
    name: "Agency Plan",
    price: "$69",
    period: "/month",
    description: "700 credits/month — 120 AI images, 240 refinements",
    features: [
      "700 campaign credits per month",
      "120 AI image generations/month",
      "240 refinements/month",
      "120 exports/month",
      "Everything in Pro",
      "Up to 10 client profiles, 3 team seats",
    ],
    highlight: false,
    stripeName: "Agency Plan",
    accentClass: "border-gray-200",
    badgeClass: "",
    btnClass: "",
  },
  {
    planKey: "full_access",
    name: "Full Access Plan",
    price: "$99",
    period: "/month",
    description: "1,000 credits/month — 300 AI images, 600 refinements",
    features: [
      "1,000 campaign credits per month",
      "300 AI image generations/month",
      "600 refinements/month",
      "300 exports/month",
      "Full access to all AI tools",
      "10 team seats, priority support",
    ],
    highlight: false,
    stripeName: "Full Access Plan",
    accentClass: "border-amber-400",
    badgeClass: "bg-amber-500",
    btnClass: "bg-amber-500 hover:bg-amber-600 text-white",
  },
];

function formatDate(unixTs: number | string | null | undefined) {
  if (!unixTs) return "—";
  const d = new Date(Number(unixTs) * 1000);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function formatAmount(unitAmount: number | null | undefined, currency: string | null | undefined) {
  if (!unitAmount) return "—";
  const amt = unitAmount / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency || "usd").toUpperCase(),
  }).format(amt);
}

async function apiPost(path: string, body?: object) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export default function BillingPage() {
  const { user, isLoaded } = useUser();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { credits, addonCredits, totalCredits } = usePlan();
  const [checkoutMessage, setCheckoutMessage] = useState<"success" | "credits-success" | "cancel" | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const co = params.get("checkout");
    if (co === "success") setCheckoutMessage("success");
    else if (co === "credits-success") setCheckoutMessage("credits-success");
    else if (co === "cancel") setCheckoutMessage("cancel");
    if (co) {
      window.history.replaceState({}, "", window.location.pathname);
      queryClient.invalidateQueries({ queryKey: ["billing-subscription"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    }
  }, [queryClient]);

  const { data: subData, isLoading: subLoading } = useQuery({
    queryKey: ["billing-subscription"],
    queryFn: async () => {
      const res = await fetch(`${API}/stripe/subscription`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch subscription");
      return res.json() as Promise<{
        subscription: {
          id: string;
          status: string;
          currentPeriodEnd: number;
          cancelAtPeriodEnd: boolean;
          priceId: string;
          unitAmount: number;
          currency: string;
          productName: string;
        } | null;
        plan: string;
        stripeNotConnected?: boolean;
      }>;
    },
    enabled: isLoaded && !!user,
  });

  const { data: productsData } = useQuery({
    queryKey: ["stripe-products"],
    queryFn: async () => {
      const res = await fetch(`${API}/stripe/products`);
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json() as Promise<{
        data: { id: string; name: string; prices: { id: string; unitAmount: number; currency: string }[] }[];
        stripeNotConnected?: boolean;
      }>;
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: (priceId: string) => apiPost("/stripe/checkout", { priceId }),
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
  });

  const portalMutation = useMutation({
    mutationFn: () => apiPost("/stripe/portal"),
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
  });

  const creditsMutation = useMutation({
    mutationFn: (pack: "100" | "300" | "1000") => apiPost("/stripe/credits-checkout", { pack }),
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
  });

  function handleUpgrade(planKey: string, planName: string) {
    // Try to resolve price from Stripe products API first, fall back to hardcoded IDs
    const products = productsData?.data || [];
    const match = products.find((p) => p.name === planName);
    const priceId =
      match?.prices.sort((a, b) => a.unitAmount - b.unitAmount)[0]?.id ||
      STRIPE_PRICE_IDS[planKey];
    if (!priceId) {
      alert("Plan not available yet. Please check back later.");
      return;
    }
    Analytics.upgradeClicked({ from_plan: plan, to_plan: planKey, location: "billing" });
    Analytics.checkoutStarted({ plan: planKey, price_id: priceId });
    checkoutMutation.mutate(priceId);
  }

  if (!isLoaded) return null;

  const plan = subData?.plan || "free";
  const sub = subData?.subscription;
  const planMeta = PLAN_META[plan] || PLAN_META.free;
  const PlanIcon = planMeta.icon;
  const stripeNotConnected = subData?.stripeNotConnected || productsData?.stripeNotConnected;

  return (
    <AppLayout>
      <div className="min-h-screen bg-[hsl(216,33%,97%)] p-6 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">

          {/* Page header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Billing & Subscription</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your LeadForge plan and payment details</p>
          </div>

          {/* Checkout feedback banner */}
          {checkoutMessage === "success" && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-semibold text-emerald-800">Subscription activated!</p>
                <p className="text-sm text-emerald-700">Your plan has been upgraded. Enjoy your new features.</p>
              </div>
            </div>
          )}
          {checkoutMessage === "credits-success" && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
              <Coins className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="font-semibold text-emerald-800">Credits added to your account!</p>
                <p className="text-sm text-emerald-700">Your balance will update shortly. Thank you for your purchase.</p>
              </div>
            </div>
          )}
          {checkoutMessage === "cancel" && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800">Checkout was cancelled. Your plan hasn't changed.</p>
            </div>
          )}

          {/* Stripe not connected notice */}
          {stripeNotConnected && (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
              <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
              <p className="text-sm text-blue-800">
                Stripe billing is being configured. Paid plans will be available shortly.
              </p>
            </div>
          )}

          {/* Current plan card */}
          <div className="bg-[hsl(215,75%,9%)] rounded-2xl p-6 md:p-8 text-white shadow-xl">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                  <PlanIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs text-white/60 uppercase tracking-widest font-semibold">Current Plan</p>
                    {sub?.status && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        sub.status === "active" ? "bg-emerald-500/20 text-emerald-300" :
                        sub.status === "trialing" ? "bg-blue-500/20 text-blue-300" :
                        "bg-amber-500/20 text-amber-300"
                      }`}>
                        {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                      </span>
                    )}
                  </div>
                  <h2 className="text-3xl font-bold">{planMeta.label}</h2>
                  <p className="text-white/60 text-sm mt-1">{planMeta.description}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{planMeta.price}</p>
                {plan !== "free" && <p className="text-white/50 text-xs mt-0.5">per month</p>}
              </div>
            </div>

            {sub && (
              <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Billing Amount</p>
                  <p className="font-semibold">{formatAmount(sub.unitAmount, sub.currency)}/mo</p>
                </div>
                <div>
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Renewal Date</p>
                  <p className="font-semibold">{formatDate(sub.currentPeriodEnd)}</p>
                </div>
                <div>
                  <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Status</p>
                  <p className="font-semibold">
                    {sub.cancelAtPeriodEnd ? "Cancels at period end" : "Auto-renews"}
                  </p>
                </div>
              </div>
            )}

            {totalCredits >= 0 && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-amber-300/70 uppercase tracking-wider font-semibold">Credits Balance</p>
                    <p className="font-bold text-amber-200 text-lg">{totalCredits.toLocaleString()} credits</p>
                    {addonCredits > 0 && (
                      <p className="text-xs text-amber-300/60 mt-0.5">{credits} plan + {addonCredits} add-on</p>
                    )}
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <p className="text-xs text-white/50 uppercase tracking-wider font-semibold mb-2">Credit Costs — All Plans</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    {[
                      { label: "Ad Campaign", cost: 5 },
                      { label: "Email Campaign", cost: 2 },
                      { label: "Landing Page", cost: 2 },
                      { label: "Headlines", cost: 2 },
                      { label: "CTAs", cost: 2 },
                      { label: "Follow-up Sequence", cost: 1 },
                    ].map(({ label, cost }) => (
                      <div key={label} className="flex justify-between items-center py-0.5">
                        <span className="text-white/70">{label}</span>
                        <span className="font-semibold text-amber-300">{cost} cr</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              {plan !== "free" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 gap-2"
                  onClick={() => portalMutation.mutate()}
                  disabled={portalMutation.isPending}
                >
                  {portalMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4" />
                  )}
                  Manage Subscription
                </Button>
              )}
              {plan === "free" && (
                <Button
                  size="sm"
                  className="bg-[hsl(213,89%,50%)] hover:bg-[hsl(213,89%,44%)] text-white gap-2"
                  onClick={() => setLocation("/pricing")}
                >
                  <Sparkles className="w-4 h-4" />
                  View Plans & Upgrade
                </Button>
              )}
            </div>
          </div>

          {/* Upgrade options — hidden only when already on Full Access */}
          {plan !== "full_access" && (() => {
            const visiblePlans = UPGRADE_PLANS.filter((p) => {
              if (plan === "free") return true;
              if (plan === "pro") return p.planKey === "agency" || p.planKey === "full_access";
              if (plan === "agency") return p.planKey === "full_access";
              return false;
            });
            const heading =
              plan === "free" ? "Upgrade Your Plan" :
              plan === "pro" ? "Upgrade for More Power" :
              "Upgrade to Full Access";
            const cols = visiblePlans.length === 1 ? "sm:grid-cols-1 max-w-sm" : visiblePlans.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3";
            return (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">{heading}</h2>
                <div className={`grid ${cols} gap-4`}>
                  {visiblePlans.map((upgradePlan) => (
                    <div
                      key={upgradePlan.planKey}
                      className={`rounded-2xl p-6 border-2 bg-white shadow-sm ${upgradePlan.accentClass}`}
                    >
                      {upgradePlan.highlight && (
                        <Badge className={`mb-3 text-white text-xs ${upgradePlan.badgeClass}`}>Most Popular</Badge>
                      )}
                      {upgradePlan.planKey === "full_access" && !upgradePlan.highlight && (
                        <Badge className={`mb-3 text-white text-xs ${upgradePlan.badgeClass}`}>Best Value</Badge>
                      )}
                      <div className="flex items-baseline gap-1 mb-1">
                        <span className="text-3xl font-black text-gray-900">{upgradePlan.price}</span>
                        <span className="text-gray-500 text-sm">{upgradePlan.period}</span>
                      </div>
                      <p className="font-bold text-gray-900 mb-1">{upgradePlan.name}</p>
                      <p className="text-sm text-gray-500 mb-4">{upgradePlan.description}</p>
                      <ul className="space-y-2 mb-6">
                        {upgradePlan.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                            <CheckCircle2 className="w-4 h-4 text-[hsl(213,89%,50%)] shrink-0 mt-0.5" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <Button
                        className={`w-full gap-2 h-11 ${upgradePlan.btnClass}`}
                        variant={upgradePlan.btnClass ? "default" : "outline"}
                        onClick={() => handleUpgrade(upgradePlan.planKey, upgradePlan.stripeName)}
                        disabled={checkoutMutation.isPending || (stripeNotConnected ?? false) || (upgradePlan.planKey === "full_access" && !STRIPE_PRICE_IDS.full_access)}
                      >
                        {checkoutMutation.isPending ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        {stripeNotConnected ? "Coming Soon" :
                         (upgradePlan.planKey === "full_access" && !STRIPE_PRICE_IDS.full_access) ? "Coming Soon" :
                         `Upgrade to ${upgradePlan.name}`}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Buy Credits */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-500" />
                  Buy Generation Credits
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  One-time purchase — credits never expire. Free plan users spend credits to generate content.
                </p>
              </div>
              {credits > 0 && (
                <div className="text-right">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Current balance</p>
                  <p className="text-xl font-black text-amber-500">{credits.toLocaleString()}</p>
                </div>
              )}
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {([
                {
                  pack: "100" as const,
                  credits: 100,
                  price: "$15",
                  label: "Starter",
                  description: "Perfect for occasional use",
                  icon: Zap,
                  perCredit: "$0.15",
                  highlight: false,
                },
                {
                  pack: "300" as const,
                  credits: 300,
                  price: "$39",
                  label: "Growth",
                  description: "Best value for regular users",
                  icon: Package,
                  perCredit: "$0.13",
                  highlight: true,
                },
                {
                  pack: "1000" as const,
                  credits: 1000,
                  price: "$99",
                  label: "Pro Pack",
                  description: "Maximum credits, lowest cost",
                  icon: Sparkles,
                  perCredit: "$0.10",
                  highlight: false,
                },
              ] as const).map((pack) => {
                const PackIcon = pack.icon;
                return (
                  <div
                    key={pack.pack}
                    className={`rounded-2xl p-5 border-2 transition-shadow ${
                      pack.highlight
                        ? "border-amber-400 bg-amber-50 shadow-lg shadow-amber-100"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    {pack.highlight && (
                      <Badge className="mb-3 bg-amber-500 text-white text-xs">Best Value</Badge>
                    )}
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        pack.highlight ? "bg-amber-500/20" : "bg-gray-100"
                      }`}>
                        <PackIcon className={`w-4 h-4 ${pack.highlight ? "text-amber-600" : "text-gray-500"}`} />
                      </div>
                      <span className="font-bold text-gray-900">{pack.label}</span>
                    </div>
                    <div className="flex items-baseline gap-1 mb-0.5">
                      <span className="text-3xl font-black text-gray-900">{pack.price}</span>
                    </div>
                    <p className="text-sm font-semibold text-amber-600 mb-1">{pack.credits.toLocaleString()} credits</p>
                    <p className="text-xs text-gray-400 mb-4">{pack.perCredit} per credit · {pack.description}</p>
                    <Button
                      className={`w-full gap-2 h-10 ${
                        pack.highlight
                          ? "bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-200"
                          : ""
                      }`}
                      variant={pack.highlight ? "default" : "outline"}
                      onClick={() => creditsMutation.mutate(pack.pack)}
                      disabled={creditsMutation.isPending || stripeNotConnected}
                    >
                      {creditsMutation.isPending ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Coins className="w-4 h-4" />
                      )}
                      {stripeNotConnected ? "Coming Soon" : `Buy ${pack.credits} Credits`}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* What's included card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-[hsl(213,89%,50%)]" />
              All plans include
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                "Cancel anytime, no lock-in",
                "Secure payment via Stripe",
                "Instant plan activation",
                "Regular feature updates",
                "Industry-specific templates",
                "Email & chat support",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[hsl(213,89%,50%)]" />
              Billing FAQ
            </h3>
            {[
              { q: "When will I be charged?", a: "You're charged immediately when you upgrade. After that, billing is monthly on the same date." },
              { q: "Can I cancel anytime?", a: "Yes. Cancel from the Manage Subscription portal and you'll keep access until your billing period ends." },
              { q: "What payment methods are accepted?", a: "All major credit and debit cards via Stripe. Apple Pay and Google Pay also supported." },
              { q: "Is there a free trial?", a: "The Free plan includes up to 140 campaigns per month — plenty to see the value before upgrading." },
            ].map((item) => (
              <div key={item.q} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                <p className="font-semibold text-gray-800 text-sm mb-1">{item.q}</p>
                <p className="text-sm text-gray-500">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
