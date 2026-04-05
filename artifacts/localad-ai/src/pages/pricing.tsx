import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { Logo } from "@/components/brand/Logo";
import { Analytics } from "@/lib/analytics";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Zap,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  X,
  Building2,
  Mail,
  Users,
  Download,
  Target,
  BarChart3,
  Crown,
  ImageIcon,
} from "lucide-react";

const API = "/api";

const STRIPE_PRICE_IDS: Record<string, string> = {
  pro: "price_1TIPrT87xwLZFMFUABWYHxRh",
  agency: "price_1TIPrU87xwLZFMFUANXT0LKp",
  full_access: import.meta.env.VITE_FULL_ACCESS_STRIPE_PRICE_ID ?? "",
};

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    desc: "Try AI image generation once — no credit card required.",
    badge: null as string | null,
    color: "border-border",
    headerBg: "bg-muted/20",
    darkHeader: false,
    icon: null as React.ReactNode,
    features: [
      { text: "1 free AI image generation trial", available: true },
      { text: "20 campaign credits (lifetime)", available: true },
      { text: "Up to 4 full campaigns with credits", available: true },
      { text: "Facebook & Google ads", available: true },
      { text: "1 business profile", available: true },
      { text: "3 exports/month", available: true },
      { text: "AI Ad Creator (full access)", available: false },
      { text: "Email campaigns", available: false },
      { text: "Lead capture & contacts", available: false },
    ],
    cta: "Get Started Free",
    ctaStyle: "border-2 border-border/40 bg-card text-foreground hover:bg-muted/20 w-full h-12 font-semibold",
    highlight: false,
    stripeName: null as string | null,
    planKey: "free",
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    desc: "40 AI image generations per month. Perfect for active local businesses.",
    badge: "Most Popular" as string | null,
    color: "border-[#2B85E4]/60",
    headerBg: "bg-[hsl(220,75%,8%)]",
    darkHeader: true,
    icon: <Zap className="w-4 h-4" /> as React.ReactNode,
    features: [
      { text: "200 campaign credits/month", available: true },
      { text: "40 AI image generations/month", available: true },
      { text: "80 refinements/month", available: true },
      { text: "40 exports/month", available: true },
      { text: "AI Ad Creator, Flyer & Logo Generator", available: true },
      { text: "All ad platforms (Facebook, Google, Instagram)", available: true },
      { text: "3 business profiles", available: true },
      { text: "Email campaigns & automation", available: true },
      { text: "Lead capture forms & CRM", available: true },
    ],
    cta: "Upgrade to Pro",
    ctaStyle: "btn-forge w-full h-12 rounded-none",
    highlight: true,
    stripeName: "Pro Plan" as string | null,
    planKey: "pro",
  },
  {
    name: "Agency",
    price: "$69",
    period: "/month",
    desc: "120 AI image generations per month. Built for agencies managing multiple clients.",
    badge: null as string | null,
    color: "border-violet-400/40",
    headerBg: "bg-violet-950",
    darkHeader: true,
    icon: <Building2 className="w-4 h-4" /> as React.ReactNode,
    features: [
      { text: "700 campaign credits/month", available: true },
      { text: "120 AI image generations/month", available: true },
      { text: "240 refinements/month", available: true },
      { text: "120 exports/month", available: true },
      { text: "Everything in Pro", available: true },
      { text: "Premium templates", available: true },
      { text: "3 team seats", available: true },
      { text: "Ad platform integrations (Meta + Google)", available: true },
      { text: "Up to 10 client profiles", available: true },
    ],
    cta: "Upgrade to Agency",
    ctaStyle: "bg-violet-950 hover:bg-violet-900 text-white w-full h-12 font-semibold",
    highlight: false,
    stripeName: "Agency Plan" as string | null,
    planKey: "agency",
  },
  {
    name: "Full Access",
    price: "$99",
    period: "/month",
    desc: "Full access to all tools with high monthly usage included. For serious businesses.",
    badge: "Best Value" as string | null,
    color: "border-[#F59E0B]/50",
    headerBg: "bg-[hsl(38,70%,5%)]",
    darkHeader: true,
    icon: <Crown className="w-4 h-4" /> as React.ReactNode,
    features: [
      { text: "1,000 campaign credits/month", available: true },
      { text: "300 AI image generations/month", available: true },
      { text: "600 refinements/month", available: true },
      { text: "300 exports/month", available: true },
      { text: "Full access to all AI tools", available: true },
      { text: "Premium templates", available: true },
      { text: "10 team seats", available: true },
      { text: "Ad platform integrations (Meta + Google)", available: true },
      { text: "Priority support", available: true },
    ],
    cta: "Upgrade to Full Access",
    ctaStyle: "",
    highlight: false,
    stripeName: "Full Access Plan" as string | null,
    planKey: "full_access",
  },
];

const PLAN_ORDER = ["free", "pro", "agency", "full_access"];

const proofPoints = [
  { icon: <Target className="w-5 h-5" style={{ color: "#19D3FF" }} />, stat: "3x", label: "More leads vs. DIY ads" },
  { icon: <Zap className="w-5 h-5" style={{ color: "#FF7A1A" }} />, stat: "90 sec", label: "Average campaign build time" },
  { icon: <BarChart3 className="w-5 h-5" style={{ color: "#3DD13D" }} />, stat: "$2,400", label: "Average agency savings per year" },
  { icon: <Users className="w-5 h-5" style={{ color: "#2B85E4" }} />, stat: "1,200+", label: "Local businesses using LeadForge" },
];

async function apiPost(path: string, body?: object) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || "Request failed");
  }
  return res.json();
}

export default function PricingPage() {
  const { isSignedIn } = useUser();
  const [, setLocation] = useLocation();
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);

  useEffect(() => { Analytics.pricingViewed(); }, []);

  const { data: subData } = useQuery({
    queryKey: ["billing-subscription"],
    queryFn: async () => {
      const res = await fetch(`${API}/stripe/subscription`, { credentials: "include" });
      if (!res.ok) return { plan: "free" };
      return res.json() as Promise<{ plan: string }>;
    },
    enabled: !!isSignedIn,
  });

  const { data: productsData } = useQuery({
    queryKey: ["stripe-products"],
    queryFn: async () => {
      const res = await fetch(`${API}/stripe/products`);
      if (!res.ok) return { data: [] };
      return res.json() as Promise<{
        data: { id: string; name: string; prices: { id: string; unitAmount: number }[] }[];
      }>;
    },
    enabled: !!isSignedIn,
  });

  const checkoutMutation = useMutation({
    mutationFn: ({ priceId }: { priceId: string }) => apiPost("/stripe/checkout", { priceId }),
    onSuccess: (data: any) => {
      if (data.url) window.location.href = data.url;
    },
    onSettled: () => setUpgradingPlan(null),
  });

  const currentPlan = subData?.plan || "free";
  const currentPlanIndex = PLAN_ORDER.indexOf(currentPlan);

  function handleUpgrade(plan: (typeof plans)[0]) {
    if (!plan.stripeName || plan.planKey === "free") return;
    if (!isSignedIn) {
      setLocation("/sign-up");
      return;
    }
    const products = productsData?.data || [];
    const match = products.find((p) => p.name === plan.stripeName);
    const priceId =
      (match?.prices.sort((a, b) => a.unitAmount - b.unitAmount)[0]?.id) ||
      STRIPE_PRICE_IDS[plan.planKey];
    if (!priceId) {
      alert("This plan isn't available yet. Please check back shortly.");
      return;
    }
    Analytics.upgradeClicked({ from_plan: currentPlan, to_plan: plan.planKey, location: "pricing" });
    Analytics.checkoutStarted({ plan: plan.planKey, price_id: priceId });
    setUpgradingPlan(plan.planKey);
    checkoutMutation.mutate({ priceId });
  }

  return (
    <div className="min-h-screen bg-background">
      {!isSignedIn && (
        <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-md shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/">
              <Logo />
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/sign-in">
                <Button variant="ghost" className="font-semibold text-muted-foreground hover:text-foreground">Sign In</Button>
              </Link>
              <Link href="/sign-up">
                <button className="btn-forge px-5 h-9 rounded-full text-[13px] font-bold inline-flex items-center gap-1.5">
                  Get Started <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </Link>
            </div>
          </div>
        </header>
      )}

      <div className="py-16 px-4 animate-in fade-in duration-500">
        <div className="max-w-7xl mx-auto">
          {isSignedIn && (
            <button
              onClick={() => setLocation("/dashboard")}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-foreground mb-8 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
          )}

          {/* Hero */}
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-[hsl(213,89%,50%)]/10 text-[hsl(213,89%,50%)] rounded-full px-4 py-1.5 text-sm font-semibold mb-5">
              <Zap className="w-3.5 h-3.5" />
              Simple, transparent pricing
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground mb-4">
              Stop paying agencies.<br className="hidden sm:block" />
              <span className="text-[#19D3FF]"> Start generating leads.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              LeadForge replaces expensive ad agencies with AI that generates professional campaigns in seconds — and keeps every dollar in your pocket.
            </p>
          </div>

          {/* Proof points */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14">
            {proofPoints.map((p, i) => (
              <div key={i} className="bg-card rounded-2xl border border-border/30 p-5 text-center shadow-sm hover:border-primary/20 transition-colors">
                <div className="flex justify-center mb-2">{p.icon}</div>
                <div className="text-2xl font-black text-foreground">{p.stat}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{p.label}</div>
              </div>
            ))}
          </div>

          {/* Pricing Cards — 4 columns on xl, 2 on sm */}
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-14">
            {plans.map((plan, i) => {
              const isCurrent = isSignedIn && currentPlan === plan.planKey;
              const planIndex = PLAN_ORDER.indexOf(plan.planKey);
              const isLower = isSignedIn && planIndex < currentPlanIndex;
              const isFullAccess = plan.planKey === "full_access";

              return (
                <div
                  key={i}
                  className={`relative bg-card rounded-2xl border-2 flex flex-col overflow-hidden shadow-sm transition-all hover:shadow-md ${plan.color}`}
                  style={
                    isCurrent
                      ? { boxShadow: "0 0 0 2px rgba(61,209,61,0.45), 0 0 24px rgba(61,209,61,0.12)" }
                      : isFullAccess
                      ? { boxShadow: "0 0 0 1px rgba(245,158,11,0.2), 0 4px 24px rgba(245,158,11,0.08)" }
                      : undefined
                  }
                >
                  {/* Badge */}
                  {plan.badge && !isCurrent && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                      <Badge
                        className="px-4 py-1 text-xs font-bold shadow text-white"
                        style={
                          isFullAccess
                            ? { background: "linear-gradient(135deg, #F59E0B, #FF7A1A)" }
                            : { background: "linear-gradient(135deg, #2B85E4, #19D3FF)" }
                        }
                      >
                        {plan.badge}
                      </Badge>
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                      <Badge
                        className="px-4 py-1 text-xs font-bold shadow"
                        style={{ background: "rgba(61,209,61,0.15)", border: "1px solid rgba(61,209,61,0.35)", color: "#3DD13D" }}
                      >
                        ✓ Current Plan
                      </Badge>
                    </div>
                  )}

                  {/* Plan header */}
                  <div className={`${plan.headerBg} px-6 pt-8 pb-6`}>
                    <div className={`text-sm font-bold mb-1 flex items-center gap-1.5 ${plan.darkHeader ? "text-white/60" : "text-muted-foreground/60"}`}>
                      {plan.icon}
                      {plan.name}
                    </div>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className={`text-5xl font-black ${plan.darkHeader ? "text-white" : "text-foreground"}`}>
                        {plan.price}
                      </span>
                      <span className={`text-base font-medium ${plan.darkHeader ? "text-white/50" : "text-muted-foreground/60"}`}>
                        {plan.period}
                      </span>
                    </div>
                    <p className={`text-sm ${plan.darkHeader ? "text-white/70" : "text-muted-foreground"}`}>
                      {plan.desc}
                    </p>
                  </div>

                  {/* Features */}
                  <div className="flex-1 px-6 py-5">
                    <ul className="space-y-2.5">
                      {plan.features.map((feature, j) => (
                        <li key={j} className="flex items-start gap-2.5">
                          {feature.available ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: isFullAccess ? "#F59E0B" : "#2B85E4" }} />
                          ) : (
                            <X className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                          )}
                          <span className={`text-sm ${feature.available ? "text-foreground" : "text-muted-foreground/50"}`}>
                            {feature.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA */}
                  <div className="px-6 pb-6">
                    {isSignedIn ? (
                      isCurrent ? (
                        <button
                          className="w-full h-12 rounded-xl font-semibold cursor-default"
                          style={{ border: "2px solid rgba(61,209,61,0.35)", color: "#3DD13D", background: "rgba(61,209,61,0.08)" }}
                          disabled
                        >
                          ✓ Current Plan
                        </button>
                      ) : isLower ? (
                        <button
                          className="w-full h-12 rounded-xl border-2 border-border/40 text-muted-foreground/50 font-semibold cursor-not-allowed"
                          disabled
                        >
                          Downgrade via Billing
                        </button>
                      ) : plan.planKey === "free" ? (
                        <button
                          className="w-full h-12 rounded-xl border-2 border-border/40 text-muted-foreground/50 font-semibold cursor-not-allowed"
                          disabled
                        >
                          Free Plan
                        </button>
                      ) : (
                        <button
                          className={`${isFullAccess ? "w-full h-12 font-bold rounded-xl flex items-center justify-center gap-2 transition-all" : `${plan.ctaStyle} rounded-xl flex items-center justify-center gap-2 transition-all`}`}
                          style={isFullAccess ? { background: "linear-gradient(135deg, #F59E0B, #FF7A1A)", color: "#060A14" } : undefined}
                          onClick={() => handleUpgrade(plan)}
                          disabled={checkoutMutation.isPending}
                        >
                          {upgradingPlan === plan.planKey && checkoutMutation.isPending ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : isFullAccess ? (
                            <Crown className="w-4 h-4" />
                          ) : (
                            <Zap className="w-4 h-4" />
                          )}
                          {plan.cta}
                        </button>
                      )
                    ) : (
                      <Link href="/sign-up" className="block">
                        <button
                          className={`${isFullAccess ? "w-full h-12 font-bold rounded-xl flex items-center justify-center gap-2" : `${plan.ctaStyle} rounded-xl flex items-center justify-center gap-2`}`}
                          style={isFullAccess ? { background: "linear-gradient(135deg, #F59E0B, #FF7A1A)", color: "#060A14" } : undefined}
                        >
                          {isFullAccess ? <Crown className="w-4 h-4" /> : plan.planKey !== "free" ? <Zap className="w-4 h-4" /> : null}
                          {plan.cta}
                        </button>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Feature callouts */}
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {[
              {
                icon: <ImageIcon className="w-5 h-5" style={{ color: "#FF7A1A" }} />,
                title: "AI Image Generation",
                desc: "1 free trial for Free users. Monthly quotas for paid plans — no overages, no surprises.",
              },
              {
                icon: <Mail className="w-5 h-5" style={{ color: "#2B85E4" }} />,
                title: "Email Campaigns",
                desc: "Send automated follow-up campaigns to your captured leads. Pro plan and above.",
              },
              {
                icon: <Users className="w-5 h-5" style={{ color: "#3DD13D" }} />,
                title: "Contact Management",
                desc: "Full CRM to track leads, manage status, and send targeted outreach. Pro plan and above.",
              },
              {
                icon: <Download className="w-5 h-5" style={{ color: "#19D3FF" }} />,
                title: "Full Exports",
                desc: "Download campaigns as PDF, export contacts as CSV, and get AI image prompts. Pro plan and above.",
              },
            ].map((f, i) => (
              <div key={i} className="bg-card border border-border/40 rounded-2xl p-5 card-hover-forge">
                <div className="flex items-center gap-3 mb-2">
                  {f.icon}
                  <span className="font-semibold text-sm text-foreground">{f.title}</span>
                </div>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Footer note */}
          <div
            className="bg-card border border-border/40 rounded-2xl p-8 text-center"
            style={{ boxShadow: "0 0 0 1px rgba(25,211,255,0.06), 0 4px 24px rgba(0,0,0,0.20)" }}
          >
            <h3 className="font-bold text-lg text-foreground mb-4">All plans include:</h3>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
              {[
                "No credit card for Free plan",
                "Cancel anytime — no lock-in",
                "Industry-specific templates",
                "Regular platform updates",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm justify-center sm:justify-start">
                  <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "#3DD13D" }} />
                  <span className="text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {!isSignedIn && (
        <footer className="border-t bg-sidebar py-8 px-4 text-center text-sm text-muted-foreground/60">
          <p>&copy; {new Date().getFullYear()} LeadForge. All rights reserved.</p>
        </footer>
      )}
    </div>
  );
}
