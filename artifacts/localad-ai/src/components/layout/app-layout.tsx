import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import {
  LayoutDashboard,
  Megaphone,
  FileText,
  ClipboardList,
  Building2,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  DollarSign,
  Zap,
  BookmarkCheck,
  Download,
  Users,
  Mail,
  CreditCard,
  ShieldCheck,
  Coins,
  BarChart2,
  Target,
  Camera,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlan } from "@/hooks/use-plan";
import { Logo } from "@/components/brand/Logo";
import { AIHelpWidget } from "@/components/AIHelpWidget";

interface AppLayoutProps {
  children: React.ReactNode;
}

type NavSection = {
  heading?: string;
  items: { href: string; label: string; icon: React.ElementType }[];
};

const navSections: NavSection[] = [
  {
    heading: "Ads & Campaigns",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/generate", label: "Campaign Builder", icon: Megaphone },
      { href: "/ad-creator", label: "AI Ad Creator", icon: Wand2 },
      { href: "/campaigns", label: "Saved Campaigns", icon: BookmarkCheck },
      { href: "/exports", label: "Campaign Outputs", icon: Download },
      { href: "/contacts", label: "Leads & Contacts", icon: ClipboardList },
      { href: "/analytics", label: "Analytics", icon: BarChart2 },
      { href: "/ad-platforms", label: "Ad Platforms", icon: Target },
      { href: "/showcase", label: "Showcase", icon: Camera },
    ],
  },
  {
    heading: "Email Marketing",
    items: [
      { href: "/contacts", label: "Contacts", icon: Users },
      { href: "/email-campaigns", label: "Email Campaigns", icon: Mail },
    ],
  },
  {
    heading: "Account",
    items: [
      { href: "/business-profile", label: "Business Profile", icon: Building2 },
      { href: "/billing", label: "Billing", icon: CreditCard },
      { href: "/pricing", label: "Upgrade", icon: DollarSign },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAdmin, credits, plan, totalCredits, campaignCount } = usePlan();

  const closeMenu = () => setIsMobileMenuOpen(false);

  const allNavSections: NavSection[] = [
    ...navSections,
    ...(isAdmin
      ? [{
          heading: "Administration",
          items: [{ href: "/admin", label: "Admin Panel", icon: ShieldCheck }],
        }]
      : []),
  ];

  return (
    <div className="flex h-screen bg-background">

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4 z-50">
        <Link href="/dashboard">
          <Logo />
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="text-white/60 hover:text-white hover:bg-white/10"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-[220px] bg-sidebar flex flex-col transform transition-transform duration-200 ease-in-out
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
        lg:relative lg:translate-x-0
      `}>

        {/* Logo — ember glow anchors the logo like the forge fire anchors the anvil */}
        <div className="relative h-[62px] flex items-center justify-between px-4 border-b border-white/5 shrink-0 overflow-hidden">
          {/* Forge ember glow underneath logo */}
          <div className="pointer-events-none absolute -bottom-6 -left-4 w-40 h-20 rounded-full opacity-60"
            style={{ background: "radial-gradient(ellipse, rgba(255,122,26,0.22) 0%, transparent 70%)" }} />
          {/* Forge cyan bloom top-right */}
          <div className="pointer-events-none absolute -top-4 -right-2 w-24 h-16 rounded-full opacity-40"
            style={{ background: "radial-gradient(ellipse, rgba(25,211,255,0.18) 0%, transparent 70%)" }} />
          <Link href="/dashboard" onClick={closeMenu} className="relative z-10">
            <Logo />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-white/50 hover:text-white hover:bg-white/10 relative z-10"
            onClick={closeMenu}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-4">
          {allNavSections.map((section) => (
            <div key={section.heading}>
              {section.heading && (
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/25 px-3 mb-1.5">
                  {section.heading}
                </p>
              )}
              <nav className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    location === item.href || location.startsWith(item.href + "/");
                  return (
                    <Link key={item.href} href={item.href} onClick={closeMenu}>
                      <div
                        className={`
                          flex items-center gap-3 px-3 py-[9px] rounded-lg transition-all duration-150 cursor-pointer text-[13px] font-medium
                          ${isActive
                            ? "text-white"
                            : "text-white/45 hover:bg-white/6 hover:text-white/80"
                          }
                        `}
                        style={isActive ? {
                          background: "linear-gradient(90deg, rgba(25,211,255,0.13) 0%, rgba(43,133,228,0.05) 100%)",
                          borderLeft: "2px solid #19D3FF",
                          paddingLeft: "10px",
                          boxShadow: "inset 0 0 20px rgba(25,211,255,0.04)",
                        } : undefined}
                      >
                        <Icon
                          className={`w-4 h-4 shrink-0 ${isActive ? "text-[#19D3FF]" : "text-white/35"}`}
                        />
                        <span className="flex-1">{item.label}</span>
                        {isActive && (
                          <div className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: "linear-gradient(135deg, #2B85E4, #19D3FF)" }} />
                        )}
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* User footer */}
        <div className="px-3 pb-4 border-t border-white/5 pt-4 shrink-0">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-sidebar-primary/25 flex items-center justify-center text-sidebar-primary font-bold text-[13px] shrink-0 border border-sidebar-primary/30">
              {user?.firstName?.charAt(0) || user?.emailAddresses[0]?.emailAddress?.charAt(0) || <User className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white truncate">
                {user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "User"}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-[11px] text-white/35 truncate">
                  {user?.emailAddresses[0]?.emailAddress}
                </p>
              </div>
            </div>
          </div>
          {credits > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-2"
              style={{ background: "rgba(255,122,26,0.10)", border: "1px solid rgba(255,122,26,0.22)" }}>
              <Coins className="w-3.5 h-3.5 shrink-0" style={{ color: "#FF7A1A" }} />
              <span className="text-[12px] font-semibold" style={{ color: "#FF9A4A" }}>{credits.toLocaleString()} credits</span>
            </div>
          )}
          <button
            className="w-full flex items-center gap-3 px-3 py-[9px] rounded-lg text-[13px] font-medium text-white/35 hover:text-white/70 hover:bg-white/6 transition-all cursor-pointer"
            onClick={() => signOut()}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden pt-14 lg:pt-0">
        <main className="flex-1 overflow-y-auto p-5 md:p-7 lg:p-9">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={closeMenu}
        />
      )}

      {/* AI Help Widget */}
      <AIHelpWidget
        userName={user?.firstName ?? undefined}
        hasProjects={campaignCount > 0}
        plan={plan as "free" | "pro" | "agency"}
        credits={totalCredits}
      />
    </div>
  );
}
