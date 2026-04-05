import { useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Analytics } from "@/lib/analytics";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Logo } from "@/components/brand/Logo";
import {
  Zap, ArrowRight, Star, Target, Layout, TrendingUp, Clock, Shield,
  ChevronRight, Check, Megaphone, FileText, Users, BarChart2,
  UserCheck, Rocket, ClipboardList, Bell, MousePointerClick,
} from "lucide-react";

// ─── Data ─────────────────────────────────────────────────────────────────────

const results = [
  {
    icon: Megaphone,
    title: "Generate high-converting campaigns in seconds",
    desc: "Stop writing ad copy from scratch. LeadForge creates compelling campaigns for Facebook, Google, and more — instantly.",
  },
  {
    icon: MousePointerClick,
    title: "Turn clicks into real leads with landing pages",
    desc: "Every campaign gets its own high-converting landing page designed to capture contact info and generate real inquiries.",
  },
  {
    icon: ClipboardList,
    title: "Capture and manage leads in one place",
    desc: "All your leads flow into a simple dashboard. No spreadsheets, no chaos — just a clean list ready to follow up.",
  },
  {
    icon: Bell,
    title: "Follow up faster and close more jobs",
    desc: "Get notified the moment a lead comes in and respond while they're still hot. Speed wins more jobs.",
  },
];

const steps = [
  { number: "1", icon: UserCheck, title: "Enter your business details", desc: "Tell us your trade, service area, and what makes you different. Takes 3 minutes." },
  { number: "2", icon: Megaphone, title: "Build your campaign", desc: "LeadForge writes your ad copy, offer angles, and CTAs — ready to publish." },
  { number: "3", icon: Rocket, title: "Launch and capture leads", desc: "Post your ads and let your LeadForge landing page capture every click." },
  { number: "4", icon: ClipboardList, title: "Manage and grow", desc: "Watch leads arrive in your dashboard and follow up immediately." },
];

const features = [
  { icon: Zap, title: "AI-powered campaign creation", desc: "Professional ad copy for any platform, written in seconds by AI trained on real local service campaigns." },
  { icon: Target, title: "Multi-platform campaigns", desc: "One click generates campaigns optimized for Facebook, Instagram, Google, and more." },
  { icon: FileText, title: "Landing page generator", desc: "Every campaign gets a dedicated landing page built to convert visitors into leads." },
  { icon: MousePointerClick, title: "Lead capture forms", desc: "Embedded forms collect name, phone, and job details — no third-party tools needed." },
  { icon: ClipboardList, title: "Simple lead management", desc: "All your leads in one clean inbox. Mark them, track them, and never lose a job again." },
  { icon: BarChart2, title: "Campaign performance tracking", desc: "See which campaigns drive the most leads and double down on what's working." },
];

const testimonials = [
  {
    name: "Mike R.",
    business: "Painting Contractor",
    location: "Austin, TX",
    quote: "LeadForge helped me get more estimates in 2 weeks than I did all last month. The landing pages are the key — people actually fill out the form.",
    rating: 5,
  },
  {
    name: "Sandra K.",
    business: "Landscaping & Lawn Care",
    location: "Phoenix, AZ",
    quote: "I had zero marketing budget and zero time. Now I run campaigns that actually work. It took me 15 minutes to set up my first one.",
    rating: 5,
  },
  {
    name: "Derek T.",
    business: "Roofing & Storm Repair",
    location: "Dallas, TX",
    quote: "The AI writes better copy than I ever could. My phone started ringing within 48 hours of my first campaign. Incredible tool.",
    rating: 5,
  },
];

const faqs = [
  {
    q: "Do I need marketing experience to use LeadForge?",
    a: "Not at all. If you can describe your business and your ideal customer, LeadForge handles the rest. Most users launch their first campaign within 15 minutes.",
  },
  {
    q: "What trades and service businesses is this built for?",
    a: "LeadForge is designed for painters, roofers, landscapers, cleaners, HVAC, plumbers, electricians, pressure washers, pest control, tree services, and more.",
  },
  {
    q: "What does the landing page look like?",
    a: "Each campaign generates a clean, mobile-optimized landing page with your business info, a compelling offer, and a lead capture form. No coding required.",
  },
  {
    q: "How does lead capture work?",
    a: "When someone fills out your landing page form, the lead is instantly added to your LeadForge dashboard and you receive a notification so you can follow up immediately.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. No contracts, no commitments. Cancel anytime from your account settings and your plan stays active through the end of the billing period.",
  },
];

const platforms = ["Facebook Ads", "Instagram Ads", "Google Ads", "Print Flyers", "Landing Pages", "Nextdoor", "Email"];

// ─── Sub-components ────────────────────────────────────────────────────────────

function NavLogo() {
  return <Logo size="default" />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full mb-5"
      style={{
        background: "linear-gradient(135deg, rgba(43,133,228,0.10) 0%, rgba(25,211,255,0.07) 100%)",
        border: "1px solid rgba(25,211,255,0.18)",
      }}>
      <span className="w-1 h-1 rounded-full" style={{ background: "linear-gradient(135deg, #2B85E4, #19D3FF)" }} />
      <span className="text-[11px] font-black uppercase tracking-[0.14em] text-forge">{children}</span>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  useEffect(() => { Analytics.homepageViewed(); }, []);
  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-2xl border-b border-border/40 shadow-sm shadow-black/30">
        <div className="max-w-6xl mx-auto px-6 h-[64px] flex items-center justify-between gap-8">
          <NavLogo />
          <nav className="hidden md:flex items-center gap-0.5">
            {[
              { label: "Features", href: "#features" },
              { label: "How It Works", href: "#how-it-works" },
              { label: "Examples", href: "#examples" },
              { label: "Pricing", href: "/pricing", internal: true },
            ].map((item) =>
              item.internal ? (
                <Link key={item.label} href={item.href}>
                  <span className="px-4 py-2 text-[14px] font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-white/5 transition-all duration-200 cursor-pointer">
                    {item.label}
                  </span>
                </Link>
              ) : (
                <a key={item.label} href={item.href}
                  className="px-4 py-2 text-[14px] font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-white/5 transition-all duration-200">
                  {item.label}
                </a>
              )
            )}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm" className="hidden sm:flex font-semibold text-[13px] text-muted-foreground hover:text-foreground hover:bg-white/8 px-4">
                Sign In
              </Button>
            </Link>
            <Link href="/sign-up">
              <button className="btn-forge font-bold text-[13px] px-5 h-9 rounded-full inline-flex items-center gap-1.5">
                Start Free <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-28 pb-36 px-6">
        {/* Background layers — mirrors the logo's atmospheric lighting */}
        <div className="absolute inset-0 -z-10">
          {/* Main forge bloom — cyan burst from upper-center, like light from above the anvil */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[1400px] h-[800px]"
            style={{ background: "radial-gradient(ellipse at top, rgba(43,133,228,0.16) 0%, rgba(25,211,255,0.10) 30%, transparent 65%)" }} />
          {/* Forge blue left bloom */}
          <div className="absolute top-16 -left-60 w-[700px] h-[560px]"
            style={{ background: "radial-gradient(circle, rgba(43,133,228,0.09) 0%, transparent 65%)" }} />
          {/* Forge cyan right echo */}
          <div className="absolute top-16 -right-60 w-[700px] h-[560px]"
            style={{ background: "radial-gradient(circle, rgba(25,211,255,0.06) 0%, transparent 65%)" }} />
          {/* Ember glow — forge fire at the anvil base, bottom-left */}
          <div className="absolute -bottom-10 -left-20 w-[600px] h-[400px]"
            style={{ background: "radial-gradient(ellipse, rgba(255,122,26,0.11) 0%, transparent 65%)" }} />
          {/* Growth arrow echo — faint green right side */}
          <div className="absolute bottom-20 right-0 w-[400px] h-[300px]"
            style={{ background: "radial-gradient(circle, rgba(61,209,61,0.04) 0%, transparent 65%)" }} />
          {/* Subtle dot grid */}
          <div className="absolute inset-0 opacity-[0.035]"
            style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        </div>

        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-10"
            style={{
              background: "linear-gradient(135deg, rgba(43,133,228,0.10) 0%, rgba(25,211,255,0.08) 100%)",
              border: "1px solid rgba(25,211,255,0.18)",
              boxShadow: "0 0 16px rgba(25,211,255,0.08)",
            }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#19D3FF] animate-pulse" />
            <span className="text-[12px] font-bold tracking-wide text-forge">Built for Contractors & Local Trades</span>
          </div>

          {/* Headline */}
          <h1 className="text-[60px] sm:text-[74px] lg:text-[88px] font-black tracking-[-0.035em] leading-[0.94] mb-8 text-foreground">
            Forge better ads.<br />
            <span className="text-forge">Capture more leads.</span><br />
            Grow your business.
          </h1>

          {/* Subheadline */}
          <p className="text-[18px] sm:text-[20px] text-muted-foreground max-w-[560px] mx-auto leading-[1.65] mb-12 font-medium">
            LeadForge helps contractors get more leads, faster, using AI-powered marketing, automated ads, and performance-driven tools.
          </p>

          {/* CTAs — primary uses the Forge wordmark gradient */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            <Link href="/sign-up">
              <button
                className="btn-forge h-[52px] px-10 text-[15px] rounded-full w-full sm:w-auto inline-flex items-center gap-2">
                Start Free — It's Free
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <a href="#how-it-works">
              <Button size="lg" variant="outline"
                className="h-[52px] px-9 text-[15px] font-semibold rounded-full border-border/70 hover:border-primary/40 hover:bg-primary/6 w-full sm:w-auto transition-all duration-200">
                See How It Works
              </Button>
            </a>
          </div>

          {/* Trust line */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-muted-foreground font-medium">
            {["No credit card required", "Free plan available", "Cancel anytime"].map((item, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-growth" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Platform Strip ── */}
      <section className="py-8 border-y border-border/30 bg-card">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-center text-[11px] font-bold text-muted-foreground/50 uppercase tracking-[0.18em] mb-6">
            Works across every platform
          </p>
          <div className="flex flex-wrap justify-center gap-2.5">
            {platforms.map((p) => (
              <span key={p}
                className="px-4 py-1.5 rounded-full bg-background border border-border/50 text-[13px] font-semibold text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all duration-200 cursor-default">
                {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Results ── */}
      <section className="py-32 px-6 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <SectionLabel>Results</SectionLabel>
            <h2 className="text-[40px] sm:text-[52px] font-black tracking-[-0.02em] mb-5 text-foreground leading-tight">
              More leads. Less guesswork.
            </h2>
            <p className="text-muted-foreground text-[18px] max-w-xl mx-auto leading-relaxed font-medium">
              AI-powered marketing and automated ads built for contractors — so you can stay on the job and still fill your pipeline.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {results.map((r, i) => {
              const Icon = r.icon;
              return (
                <div key={i}
                  className="group flex gap-6 bg-card border border-border/40 rounded-2xl p-8 transition-premium shadow-premium cursor-default card-hover-forge">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 mt-0.5 group-hover:scale-105"
                    style={{
                      background: "linear-gradient(135deg, rgba(43,133,228,0.15) 0%, rgba(25,211,255,0.10) 100%)",
                      color: "#19D3FF",
                      boxShadow: "0 0 16px rgba(25,211,255,0.12)",
                    }}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[17px] mb-2.5 text-foreground leading-snug">{r.title}</h3>
                    <p className="text-muted-foreground text-[14px] leading-relaxed">{r.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How It Works — deepest dark ── */}
      <section id="how-it-works" className="py-32 px-6 bg-sidebar relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-5%,hsl(191_100%_55%/0.15),transparent)]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <SectionLabel>How It Works</SectionLabel>
            <h2 className="text-[40px] sm:text-[52px] font-black tracking-[-0.02em] mb-5 text-white leading-tight">
              Simple. Fast. Built for real results.
            </h2>
            <p className="text-white/50 text-[18px] max-w-xl mx-auto font-medium">
              Go from zero to a running lead campaign in under 15 minutes — no tech skills required.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i}
                  className="relative bg-white/[0.04] border border-white/[0.07] rounded-2xl p-7 hover:bg-white/[0.07] hover:border-white/[0.12] transition-all duration-300 group">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-full bg-primary/25 border border-primary/40 flex items-center justify-center shrink-0">
                      <span className="text-primary text-[11px] font-black">{s.number}</span>
                    </div>
                    <div className="w-8 h-8 bg-white/8 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300">
                      <Icon className="w-4 h-4 text-white/50 group-hover:text-primary transition-colors duration-300" />
                    </div>
                  </div>
                  <h3 className="font-bold text-[15px] mb-2.5 text-white leading-snug">{s.title}</h3>
                  <p className="text-white/40 text-[13px] leading-relaxed">{s.desc}</p>
                  {i < steps.length - 1 && (
                    <div className="hidden lg:flex absolute top-1/2 -right-3 -translate-y-1/2 z-20">
                      <ChevronRight className="w-5 h-5 text-white/15" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Example Campaign ── */}
      <section id="examples" className="py-32 px-6 bg-card">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <SectionLabel>Example</SectionLabel>
            <h2 className="text-[40px] sm:text-[52px] font-black tracking-[-0.02em] mb-5 text-foreground leading-tight">
              See what LeadForge creates for you
            </h2>
            <p className="text-muted-foreground text-[18px] max-w-xl mx-auto leading-relaxed font-medium">
              A real campaign for a painting company — ad copy and landing page, ready to launch.
            </p>
          </div>

          <div className="bg-background border border-border/40 rounded-3xl shadow-premium overflow-hidden">
            {/* Campaign header */}
            <div className="px-8 py-5 border-b border-border/40 flex items-center justify-between bg-card/50">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Megaphone className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-[14px] text-foreground">Painting Company Campaign</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Generated by LeadForge · Facebook Ad + Landing Page</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wide"
                style={{ background: "rgba(61,209,61,0.10)", border: "1px solid rgba(61,209,61,0.28)", color: "#3DD13D" }}>
                Ready to Launch
              </span>
            </div>

            {/* Split: Ad + Landing Page */}
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/30">
              {/* Ad side */}
              <div className="p-9">
                <span className="inline-flex px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold uppercase tracking-wide mb-7">
                  Facebook Ad
                </span>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground/40 mb-2.5">Ad Headline</p>
                <h3 className="text-[22px] font-black text-foreground leading-snug mb-6">
                  "Freshen Your Home This Spring – Free Estimates Available"
                </h3>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground/40 mb-2.5">Ad Text</p>
                <p className="text-[14px] text-muted-foreground leading-relaxed mb-7">
                  Professional interior and exterior painting with clean finishes and reliable service. Book your free estimate today.
                </p>
                <div className="border-t border-border/30 pt-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground/40 mb-3">Call to Action</p>
                  <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-bold shadow-md shadow-primary/25">
                    Book Your Free Estimate
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* Landing page side */}
              <div className="p-9 bg-card/30">
                <span className="inline-flex px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide mb-7"
                  style={{ background: "rgba(255,122,26,0.10)", border: "1px solid rgba(255,122,26,0.25)", color: "#FF7A1A" }}>
                  Landing Page
                </span>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground/40 mb-2.5">Page Headline</p>
                <h3 className="text-[22px] font-black text-foreground leading-snug mb-6">
                  "Get a Professional Paint Job Without the Stress"
                </h3>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground/40 mb-3">Lead Capture Form</p>
                <div className="bg-card border border-border/40 rounded-xl p-4 space-y-2.5 mb-5 shadow-sm">
                  {["Your Name", "Phone Number", "Email Address", "Tell us about your project"].map((field, i) => (
                    <div key={i} className={`${i === 3 ? "h-14" : "h-10"} rounded-lg bg-background/60 border border-border/40 flex items-start px-3 pt-3`}>
                      <span className="text-[11px] text-muted-foreground/40 font-medium">{field}</span>
                    </div>
                  ))}
                </div>
                <div className="w-full py-3.5 rounded-xl bg-primary flex items-center justify-center gap-2 text-primary-foreground text-[14px] font-bold shadow-md shadow-primary/25">
                  Request Your Free Quote Today
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link href="/sign-up">
              <button className="btn-forge h-[52px] px-10 text-[15px] rounded-full inline-flex items-center gap-2">
                Build My First Campaign
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-32 px-6 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <SectionLabel>Features</SectionLabel>
            <h2 className="text-[40px] sm:text-[52px] font-black tracking-[-0.02em] mb-5 text-foreground leading-tight">
              Performance-driven tools for every contractor
            </h2>
            <p className="text-muted-foreground text-[18px] max-w-xl mx-auto leading-relaxed font-medium">
              One tool. The entire funnel. Built for contractors who want to grow fast without the agency price tag.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i}
                  className="group bg-card border border-border/40 rounded-2xl p-8 transition-premium shadow-premium cursor-default card-hover-forge">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-6 transition-all duration-300"
                    style={{
                      background: "linear-gradient(135deg, rgba(43,133,228,0.15) 0%, rgba(25,211,255,0.10) 100%)",
                      color: "#19D3FF",
                      boxShadow: "0 0 12px rgba(25,211,255,0.10)",
                    }}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-[16px] mb-2.5 text-foreground leading-snug">{f.title}</h3>
                  <p className="text-muted-foreground text-[14px] leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-32 px-6 bg-card">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <SectionLabel>Testimonials</SectionLabel>
            <h2 className="text-[40px] sm:text-[52px] font-black tracking-[-0.02em] mb-5 text-foreground leading-tight">
              Local businesses trust LeadForge
            </h2>
            <p className="text-muted-foreground text-[18px] font-medium">Real results from real service businesses.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <div key={i}
                className="bg-background border border-border/40 rounded-2xl p-8 flex flex-col hover:border-primary/25 hover:shadow-premium-hover transition-premium shadow-premium cursor-default">
                <div className="flex gap-0.5 mb-5">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4" style={{ fill: "#3DD13D", color: "#3DD13D" }} />
                  ))}
                </div>
                <p className="text-[15px] text-foreground/60 leading-[1.75] mb-7 flex-1 italic">
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-3.5 pt-6 border-t border-border/30">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-[14px] shrink-0 border border-primary/20">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-[14px] text-foreground">{t.name}</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">{t.business} · {t.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing Preview ── */}
      <section className="py-32 px-6 bg-background">
        <div className="max-w-3xl mx-auto text-center">
          <SectionLabel>Pricing</SectionLabel>
          <h2 className="text-[40px] sm:text-[52px] font-black tracking-[-0.02em] mb-5 text-foreground leading-tight">
            Simple pricing, no surprises
          </h2>
          <p className="text-muted-foreground text-[18px] mb-14 leading-relaxed font-medium">
            Start free. Upgrade when you're ready. Cancel anytime.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 mb-12 text-left">
            {[
              { name: "Free", price: "$0", period: "", features: ["Up to 140 campaigns/mo", "3 platforms", "1 business profile"], highlight: false },
              { name: "Pro", price: "$29", period: "/mo", features: ["Unlimited campaigns", "All 7 platforms", "Landing pages + lead capture", "3 business profiles"], highlight: true },
              { name: "Agency", price: "$79", period: "/mo", features: ["Everything in Pro", "10 client profiles", "White-label exports", "Dedicated support"], highlight: false },
            ].map((plan, i) => (
              <div key={i}
                className={`rounded-2xl p-7 relative transition-premium ${
                  plan.highlight ? "shadow-xl" : "bg-card border border-border/40 shadow-premium card-hover-forge"
                }`}
                style={plan.highlight ? {
                  background: "linear-gradient(145deg, #2B85E4 0%, #19D3FF 100%)",
                  border: "2px solid rgba(25,211,255,0.50)",
                  boxShadow: "0 0 0 1px rgba(25,211,255,0.20), 0 8px 48px rgba(25,211,255,0.28), 0 20px 80px rgba(43,133,228,0.20)",
                } : undefined}>
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-[#060A14] text-[#19D3FF] text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-sm border border-[#19D3FF]/30">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className={`text-[12px] font-black uppercase tracking-widest mb-4 ${plan.highlight ? "text-white/70" : "text-muted-foreground"}`}>
                  {plan.name}
                </div>
                <div className={`font-black tracking-tight leading-none mb-5 ${plan.highlight ? "text-white" : "text-foreground"}`}>
                  <span className="text-[42px]">{plan.price}</span>
                  <span className={`text-[14px] font-semibold ml-1 ${plan.highlight ? "text-white/55" : "text-muted-foreground"}`}>{plan.period}</span>
                </div>
                <ul className="space-y-2.5">
                  {plan.features.map((f, j) => (
                    <li key={j} className={`flex items-start gap-2.5 text-[13px] font-medium ${plan.highlight ? "text-white/85" : "text-muted-foreground"}`}>
                      <Check className={`w-4 h-4 shrink-0 mt-0.5 ${plan.highlight ? "text-white" : "text-[#3DD13D]"}`} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Link href="/pricing">
            <button className="h-[48px] px-9 text-[14px] font-semibold rounded-full inline-flex items-center gap-2 transition-all duration-200"
              style={{ border: "1px solid rgba(25,211,255,0.25)", color: "#19D3FF", background: "rgba(25,211,255,0.05)" }}>
              See Full Pricing Details
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-32 px-6 bg-card">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-16">
            <SectionLabel>FAQ</SectionLabel>
            <h2 className="text-[40px] sm:text-[48px] font-black tracking-[-0.02em] text-foreground leading-tight">
              Frequently asked questions
            </h2>
          </div>
          <Accordion type="single" collapsible className="space-y-2.5">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}
                className="bg-background border border-border/40 rounded-xl px-6 shadow-premium hover:border-primary/25 transition-premium">
                <AccordionTrigger className="text-left font-bold text-[15px] py-5 hover:no-underline text-foreground">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-[14px] leading-relaxed pb-5 font-medium">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ── Final CTA — forge atmosphere: cyan from above, ember from below ── */}
      <section className="py-36 px-6 bg-sidebar relative overflow-hidden">
        {/* Cyan arc from above — the "Forge" light */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 90% 70% at 50% -10%, rgba(43,133,228,0.20) 0%, rgba(25,211,255,0.12) 35%, transparent 65%)" }} />
        {/* Ember core — forge fire from bottom-left */}
        <div className="absolute -bottom-20 -left-20 w-[700px] h-[500px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(255,122,26,0.18) 0%, rgba(255,122,26,0.06) 40%, transparent 70%)" }} />
        {/* Growth echo — bottom-right green */}
        <div className="absolute -bottom-10 -right-10 w-[400px] h-[300px] pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(61,209,61,0.07) 0%, transparent 65%)" }} />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
        <div className="absolute inset-0 opacity-[0.015]"
          style={{ backgroundImage: "radial-gradient(white 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8"
            style={{
              background: "linear-gradient(135deg, rgba(43,133,228,0.12) 0%, rgba(25,211,255,0.08) 100%)",
              border: "1px solid rgba(25,211,255,0.20)",
            }}>
            <Zap className="w-3.5 h-3.5 text-[#19D3FF]" />
            <span className="text-[12px] font-bold text-forge tracking-wide">Start in under 15 minutes</span>
          </div>
          <h2 className="text-[44px] sm:text-[58px] font-black tracking-[-0.03em] mb-6 text-white leading-tight">
            Start generating more<br /><span className="text-forge">leads today</span>
          </h2>
          <p className="text-[18px] text-white/45 mb-12 leading-relaxed max-w-lg mx-auto font-medium">
            Join local businesses using LeadForge to win more jobs, every week.
          </p>
          <Link href="/sign-up">
            <button className="btn-forge h-[56px] px-12 text-[16px] rounded-full inline-flex items-center gap-2.5 hover:scale-[1.02]">
              Start Free
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
          <p className="mt-8 text-white/25 text-[13px] font-medium">No credit card required · Cancel anytime</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 bg-sidebar py-14 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="sm:col-span-1">
              <div className="mb-5">
                <Logo size="sm" />
              </div>
              <p className="text-white/30 text-[13px] leading-relaxed font-medium">
                AI-powered lead generation for local service businesses.
              </p>
            </div>

            {/* Product */}
            <div>
              <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.14em] mb-5">Product</p>
              <ul className="space-y-3">
                {[
                  { label: "Features", href: "#features" },
                  { label: "How It Works", href: "#how-it-works" },
                  { label: "Pricing", href: "/pricing", internal: true },
                  { label: "Examples", href: "#examples" },
                ].map((item) =>
                  item.internal ? (
                    <li key={item.label}>
                      <Link href={item.href}>
                        <span className="text-white/35 hover:text-white/75 text-[13px] font-medium transition-colors duration-150 cursor-pointer">{item.label}</span>
                      </Link>
                    </li>
                  ) : (
                    <li key={item.label}>
                      <a href={item.href} className="text-white/35 hover:text-white/75 text-[13px] font-medium transition-colors duration-150">{item.label}</a>
                    </li>
                  )
                )}
              </ul>
            </div>

            {/* Account */}
            <div>
              <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.14em] mb-5">Account</p>
              <ul className="space-y-3">
                {[
                  { label: "Sign In", href: "/sign-in" },
                  { label: "Get Started", href: "/sign-up" },
                  { label: "Dashboard", href: "/dashboard" },
                ].map((item) => (
                  <li key={item.label}>
                    <Link href={item.href}>
                      <span className="text-white/35 hover:text-white/75 text-[13px] font-medium transition-colors duration-150 cursor-pointer">{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.14em] mb-5">Contact</p>
              <ul className="space-y-3">
                <li>
                  <a href="mailto:hello@leadforge.io" className="text-white/35 hover:text-white/75 text-[13px] font-medium transition-colors duration-150">
                    hello@leadforge.io
                  </a>
                </li>
                <li><a href="#" className="text-white/35 hover:text-white/75 text-[13px] font-medium transition-colors duration-150">Privacy Policy</a></li>
                <li><a href="#" className="text-white/35 hover:text-white/75 text-[13px] font-medium transition-colors duration-150">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[13px] text-white/20 font-medium">
              &copy; {new Date().getFullYear()} LeadForge. All rights reserved.
            </p>
            <div className="flex items-center gap-5 text-[12px] text-white/20">
              <a href="#" className="hover:text-white/45 transition-colors duration-150">Privacy</a>
              <a href="#" className="hover:text-white/45 transition-colors duration-150">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
