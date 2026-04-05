import { useLocation } from "wouter";
import { XCircle, Zap, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CheckoutCancel() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[hsl(215,75%,9%)] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-amber-400" />
        </div>

        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="w-8 h-8 bg-[hsl(213,89%,50%)] rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-xl text-white">LeadForge</span>
        </div>

        <h1 className="text-3xl font-bold text-white mb-3">No worries!</h1>
        <p className="text-white/60 text-base mb-8">
          Your checkout was cancelled and nothing was charged. Your current plan is still active.
        </p>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-8 text-left">
          <p className="text-sm text-white/60 mb-3">Want to upgrade later? You can always:</p>
          <ul className="space-y-2 text-sm text-white/80">
            <li className="flex items-center gap-2">→ Visit <span className="font-semibold text-white">Settings → Billing</span></li>
            <li className="flex items-center gap-2">→ Or go to the <span className="font-semibold text-white">Pricing page</span></li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            className="flex-1 bg-[hsl(213,89%,50%)] hover:bg-[hsl(213,89%,44%)] text-white gap-2 h-11"
            onClick={() => setLocation("/billing")}
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
          <Button
            variant="outline"
            className="flex-1 border-white/20 text-white hover:bg-white/10 h-11 gap-2"
            onClick={() => setLocation("/dashboard")}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
