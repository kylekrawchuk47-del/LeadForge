import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Analytics } from "@/lib/analytics";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveProfile } from "@/lib/profile";
import {
  Zap, ArrowRight, ArrowLeft, Check,
  Building2, MapPin, Tag, Sparkles, Gift,
} from "lucide-react";

// ─── Data ─────────────────────────────────────────────────────────────────────

const categories = [
  "Painting & Coatings",
  "Roofing & Storm Repair",
  "Landscaping & Lawn Care",
  "Home Cleaning",
  "HVAC & Cooling",
  "Plumbing",
  "Electrical",
  "Pressure Washing",
  "Pest Control",
  "Handyman Services",
  "Tree Service",
  "Other",
];

const quickOffers = [
  "Free Estimate",
  "Free Consultation",
  "10% Off First Job",
  "Same-Day Service",
  "Free Inspection",
  "No-Obligation Quote",
  "Satisfaction Guarantee",
];

const toneOptions = [
  {
    value: "professional",
    label: "Professional & Trustworthy",
    desc: "Credible, established, expert tone. Great for building long-term trust.",
    icon: "🎯",
  },
  {
    value: "friendly",
    label: "Friendly & Local",
    desc: "Warm, personal, community-driven. Works great for repeat business.",
    icon: "👋",
  },
  {
    value: "bold",
    label: "Bold & Direct",
    desc: "Confident, punchy, no-nonsense. Cuts through the noise fast.",
    icon: "⚡",
  },
  {
    value: "urgent",
    label: "Urgent & Action-Focused",
    desc: "Creates urgency and drives immediate responses from prospects.",
    icon: "🔥",
  },
];

const steps = [
  { number: 1, icon: Building2, label: "Business" },
  { number: 2, icon: MapPin, label: "Location" },
  { number: 3, icon: Tag, label: "Offer" },
  { number: 4, icon: Sparkles, label: "Style" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Onboarding() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);

  // Fire signup_completed once when user lands here from sign-up flow
  useEffect(() => {
    Analytics.signupCompleted();
  }, []);

  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [services, setServices] = useState("");
  const [offer, setOffer] = useState("");
  const [tone, setTone] = useState("");
  const [referralCode, setReferralCode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get("ref") ?? "").toUpperCase();
  });
  const [referralStatus, setReferralStatus] = useState<"idle" | "success" | "error">("idle");
  const [referralMsg, setReferralMsg] = useState("");

  const canNext1 = businessName.trim().length > 0 && category.length > 0;
  const canNext2 = location.trim().length > 0;
  const canNext3 = offer.trim().length > 0;
  const canFinish = tone.length > 0;

  function addQuickOffer(tag: string) {
    const existing = offer.trim();
    if (existing.toLowerCase().includes(tag.toLowerCase())) return;
    setOffer(existing ? `${existing}, ${tag}` : tag);
  }

  async function finish() {
    saveProfile({ businessName, category, location, services, offer, tone });
    Analytics.onboardingCompleted({ business_type: category, city: location });

    if (referralCode.trim()) {
      try {
        const res = await fetch("/api/referral/apply", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: referralCode.trim() }),
        });
        const json = await res.json();
        if (!res.ok) {
          setReferralStatus("error");
          setReferralMsg(json.error || "Invalid referral code");
          return;
        }
        setReferralStatus("success");
      } catch {
        // non-critical — continue regardless
      }
    }

    navigate("/generate");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Top bar */}
      <div className="h-[60px] bg-sidebar border-b border-border/50 flex items-center px-6 shrink-0 shadow-sm shadow-black/[0.02]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-primary rounded-[8px] flex items-center justify-center shadow-sm shadow-primary/25">
            <Zap className="w-[14px] h-[14px] text-white" strokeWidth={2.5} />
          </div>
          <span className="font-black text-[15px] tracking-tight text-foreground">LeadForge</span>
        </div>
        <div className="ml-auto text-[12px] font-semibold text-muted-foreground">
          Step {step} of 4
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-[3px] bg-border/40 shrink-0">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${(step / 4) * 100}%` }}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[520px]">

          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-10 justify-center">
            {steps.map((s, i) => {
              const done = s.number < step;
              const active = s.number === step;
              return (
                <div key={s.number} className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all duration-300 ${
                    done ? "bg-primary text-white"
                    : active ? "bg-primary/10 text-primary border border-primary/25"
                    : "bg-muted/60 text-muted-foreground/50"
                  }`}>
                    {done ? <Check className="w-3 h-3" /> : <span>{s.number}</span>}
                    <span className={active || done ? "" : "hidden sm:inline"}>{s.label}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`w-5 h-px transition-colors duration-300 ${done ? "bg-primary/40" : "bg-border/60"}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Step 1: Business ── */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
              <p className="text-[12px] font-black uppercase tracking-[0.14em] text-primary mb-3">Step 1 of 4</p>
              <h1 className="text-[32px] font-black tracking-tight text-foreground mb-2 leading-tight">
                Tell us about your business
              </h1>
              <p className="text-muted-foreground text-[15px] mb-9 font-medium leading-relaxed">
                This helps LeadForge write campaigns that sound exactly like you.
              </p>

              <div className="space-y-6">
                <div>
                  <label className="block text-[13px] font-bold text-foreground mb-2">
                    Business Name
                  </label>
                  <Input
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    placeholder="e.g. Mike's Painting, Green Lawn Co."
                    className="h-12 text-[15px] bg-background border-border/60 focus:border-primary rounded-xl px-4"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-bold text-foreground mb-3">
                    Business Category
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`px-4 py-2 rounded-full text-[13px] font-semibold border transition-all duration-150 ${
                          category === cat
                            ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                            : "bg-muted/20 text-muted-foreground border-border/50 hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Location & Services ── */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
              <p className="text-[12px] font-black uppercase tracking-[0.14em] text-primary mb-3">Step 2 of 4</p>
              <h1 className="text-[32px] font-black tracking-tight text-foreground mb-2 leading-tight">
                Where do you work?
              </h1>
              <p className="text-muted-foreground text-[15px] mb-9 font-medium leading-relaxed">
                Location and services make your campaigns feel local and specific.
              </p>

              <div className="space-y-6">
                <div>
                  <label className="block text-[13px] font-bold text-foreground mb-2">
                    Service Area
                  </label>
                  <Input
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. Austin, TX · Greater Dallas Area"
                    className="h-12 text-[15px] bg-background border-border/60 focus:border-primary rounded-xl px-4"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-bold text-foreground mb-1.5">
                    What services do you offer? <span className="text-muted-foreground font-medium">(optional)</span>
                  </label>
                  <p className="text-[12px] text-muted-foreground mb-2.5">List your main services, comma-separated</p>
                  <Textarea
                    value={services}
                    onChange={e => setServices(e.target.value)}
                    placeholder="e.g. Interior painting, exterior painting, cabinet refinishing, deck staining"
                    className="text-[14px] bg-background border-border/60 focus:border-primary rounded-xl px-4 py-3 min-h-[80px] resize-none"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Offer ── */}
          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
              <p className="text-[12px] font-black uppercase tracking-[0.14em] text-primary mb-3">Step 3 of 4</p>
              <h1 className="text-[32px] font-black tracking-tight text-foreground mb-2 leading-tight">
                What's your best offer?
              </h1>
              <p className="text-muted-foreground text-[15px] mb-9 font-medium leading-relaxed">
                A strong offer is the #1 driver of leads. Discounts, free services, and guarantees all work well.
              </p>

              <div className="space-y-5">
                <div>
                  <label className="block text-[13px] font-bold text-foreground mb-2">
                    Your Offer or Promotion
                  </label>
                  <Textarea
                    value={offer}
                    onChange={e => setOffer(e.target.value)}
                    placeholder="e.g. Free color consultation + 10% off any interior project over $1,000"
                    className="text-[14px] bg-background border-border/60 focus:border-primary rounded-xl px-4 py-3 min-h-[90px] resize-none"
                    rows={3}
                    autoFocus
                  />
                </div>

                <div>
                  <p className="text-[12px] font-bold text-muted-foreground mb-2.5 uppercase tracking-[0.1em]">
                    Quick add
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {quickOffers.map(tag => (
                      <button
                        key={tag}
                        onClick={() => addQuickOffer(tag)}
                        className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold bg-background border border-border/50 text-muted-foreground hover:border-primary/40 hover:text-primary transition-all duration-150"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 4: Tone ── */}
          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-300">
              <p className="text-[12px] font-black uppercase tracking-[0.14em] text-primary mb-3">Step 4 of 4</p>
              <h1 className="text-[32px] font-black tracking-tight text-foreground mb-2 leading-tight">
                How should your campaigns sound?
              </h1>
              <p className="text-muted-foreground text-[15px] mb-9 font-medium leading-relaxed">
                Choose a tone that matches your brand. You can change this anytime.
              </p>

              <div className="space-y-3">
                {toneOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setTone(opt.value)}
                    className={`w-full flex items-start gap-4 p-5 rounded-2xl border-2 text-left transition-all duration-150 ${
                      tone === opt.value
                        ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                        : "border-border/50 bg-card hover:border-primary/30 hover:bg-muted/20"
                    }`}
                  >
                    <span className="text-[22px] mt-0.5 shrink-0">{opt.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-[14px] mb-0.5 ${tone === opt.value ? "text-primary" : "text-foreground"}`}>
                        {opt.label}
                      </p>
                      <p className="text-[13px] text-muted-foreground leading-relaxed">{opt.desc}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      tone === opt.value ? "border-primary bg-primary" : "border-border"
                    }`}>
                      {tone === opt.value && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </button>
                ))}
              </div>

              {/* Referral code */}
              <div className="mt-8 pt-6 border-t border-border/40">
                <label className="flex items-center gap-1.5 text-[13px] font-bold text-foreground mb-2">
                  <Gift className="w-3.5 h-3.5" style={{ color: "#3DD13D" }} />
                  Have a referral code?
                  <span className="text-muted-foreground font-medium">(optional)</span>
                </label>
                <Input
                  value={referralCode}
                  onChange={e => {
                    setReferralCode(e.target.value.toUpperCase());
                    setReferralStatus("idle");
                  }}
                  placeholder="e.g. A1B2C3D4"
                  maxLength={16}
                  className={`h-11 text-[14px] font-mono tracking-widest bg-background border-border/60 focus:border-primary rounded-xl px-4 ${
                    referralStatus === "error" ? "border-red-500/60" : ""
                  }`}
                />
                {referralStatus === "error" && (
                  <p className="text-[12px] text-red-400 mt-1.5">{referralMsg}</p>
                )}
                {referralStatus === "success" && (
                  <p className="text-[12px] mt-1.5" style={{ color: "#3DD13D" }}>
                    ✓ Code applied — your friend earns $10 when you subscribe
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-10 pt-8 border-t border-border/40">
            {step > 1 ? (
              <Button
                variant="ghost"
                onClick={() => setStep(s => s - 1)}
                className="gap-2 text-muted-foreground hover:text-foreground font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <Button
                onClick={() => setStep(s => s + 1)}
                disabled={
                  (step === 1 && !canNext1) ||
                  (step === 2 && !canNext2) ||
                  (step === 3 && !canNext3)
                }
                className="gap-2 h-11 px-7 font-bold rounded-full shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={finish}
                disabled={!canFinish}
                className="gap-2 h-11 px-7 font-bold rounded-full shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all"
              >
                Launch Campaign Builder
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Skip */}
          {step === 1 && (
            <div className="text-center mt-5">
              <button
                onClick={() => navigate("/dashboard")}
                className="text-[13px] text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                Skip for now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
