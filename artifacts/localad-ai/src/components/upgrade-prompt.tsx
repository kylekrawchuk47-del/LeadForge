import { useLocation } from "wouter";
import { Lock, Zap, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UpgradePromptProps {
  feature: string;
  description: string;
  highlights?: string[];
  planRequired?: "pro" | "agency";
  compact?: boolean;
}

export function UpgradePrompt({
  feature,
  description,
  highlights = [],
  planRequired = "pro",
  compact = false,
}: UpgradePromptProps) {
  const [, setLocation] = useLocation();

  const planLabel = planRequired === "agency" ? "Agency" : "Pro";
  const planPrice = planRequired === "agency" ? "$79/mo" : "$29/mo";

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-[hsl(215,75%,9%)] to-[hsl(215,60%,15%)] rounded-xl px-5 py-4 text-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[hsl(213,89%,50%)]/20 rounded-lg flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4 text-[hsl(213,89%,60%)]" />
          </div>
          <div>
            <p className="font-semibold text-sm">{feature} requires {planLabel}</p>
            <p className="text-xs text-white/60">{description}</p>
          </div>
        </div>
        <Button
          size="sm"
          className="bg-[hsl(213,89%,50%)] hover:bg-[hsl(213,89%,44%)] text-white shrink-0 gap-1.5"
          onClick={() => setLocation("/billing")}
        >
          <Zap className="w-3.5 h-3.5" />
          Upgrade
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 py-16 text-center animate-in fade-in duration-500">
      <div className="w-16 h-16 bg-[hsl(215,75%,9%)] rounded-2xl flex items-center justify-center mb-6 shadow-xl">
        <Lock className="w-8 h-8 text-[hsl(213,89%,60%)]" />
      </div>

      <div className="inline-flex items-center gap-2 bg-[hsl(213,89%,50%)]/10 text-[hsl(213,89%,50%)] rounded-full px-3 py-1 text-xs font-semibold mb-4">
        <Zap className="w-3 h-3" />
        {planLabel} Plan Required
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-3">{feature}</h2>
      <p className="text-gray-500 max-w-md mb-8">{description}</p>

      {highlights.length > 0 && (
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 mb-8 text-left w-full max-w-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            What you unlock with {planLabel}
          </p>
          <ul className="space-y-2">
            {highlights.map((h) => (
              <li key={h} className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle2 className="w-4 h-4 text-[hsl(213,89%,50%)] shrink-0 mt-0.5" />
                {h}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Button
          className="bg-[hsl(215,75%,9%)] hover:bg-[hsl(215,65%,14%)] text-white gap-2 h-11 px-6 shadow-lg"
          onClick={() => setLocation("/billing")}
        >
          <Zap className="w-4 h-4" />
          Upgrade to {planLabel} — {planPrice}
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          className="text-gray-500 h-11"
          onClick={() => setLocation("/pricing")}
        >
          View all plans
        </Button>
      </div>
    </div>
  );
}

interface CampaignLimitBannerProps {
  used: number;
  limit: number;
}

export function CampaignLimitBanner({ used, limit }: CampaignLimitBannerProps) {
  const [, setLocation] = useLocation();
  const pct = Math.min((used / limit) * 100, 100);
  const isAtLimit = used >= limit;

  return (
    <div className={`rounded-xl border px-5 py-4 ${isAtLimit
      ? "bg-amber-50 border-amber-200"
      : "bg-blue-50 border-blue-100"
    }`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {isAtLimit ? (
              <span className="text-sm font-semibold text-amber-800">
                Campaign limit reached — {used}/{limit} used
              </span>
            ) : (
              <span className="text-sm font-semibold text-blue-800">
                Free plan: {used}/{limit} campaigns used
              </span>
            )}
          </div>
          <div className="w-full max-w-xs h-2 bg-white/60 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isAtLimit ? "bg-amber-500" : "bg-blue-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {isAtLimit && (
            <p className="text-xs text-amber-700 mt-1.5">
              Upgrade to Pro for unlimited campaigns
            </p>
          )}
        </div>
        {isAtLimit && (
          <Button
            size="sm"
            className="bg-[hsl(215,75%,9%)] hover:bg-[hsl(215,65%,14%)] text-white gap-1.5 shrink-0"
            onClick={() => setLocation("/billing")}
          >
            <Zap className="w-3.5 h-3.5" />
            Upgrade to Pro
          </Button>
        )}
      </div>
    </div>
  );
}
