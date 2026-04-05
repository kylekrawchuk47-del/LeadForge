import { useEffect } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

export default function CheckoutSuccess() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["billing-subscription"] });
    queryClient.invalidateQueries({ queryKey: ["user-profile"] });
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-[hsl(215,75%,9%)] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
        </div>

        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="w-8 h-8 bg-[hsl(213,89%,50%)] rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-xl text-white">LeadForge</span>
        </div>

        <h1 className="text-3xl font-bold text-white mb-3">You're all set!</h1>
        <p className="text-white/60 text-base mb-8">
          Your subscription is now active. Start generating unlimited ad campaigns and watch your leads grow.
        </p>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-8 text-left space-y-3">
          {[
            "Unlimited ad generations unlocked",
            "All platforms and tone options",
            "Campaign save & export suite",
            "Priority support enabled",
          ].map((item) => (
            <div key={item} className="flex items-center gap-3 text-sm text-white/80">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              {item}
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            className="flex-1 bg-[hsl(213,89%,50%)] hover:bg-[hsl(213,89%,44%)] text-white gap-2 h-11"
            onClick={() => setLocation("/generate")}
          >
            Start Generating
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            className="flex-1 border-white/20 text-white hover:bg-white/10 h-11"
            onClick={() => setLocation("/billing")}
          >
            View Billing
          </Button>
        </div>
      </div>
    </div>
  );
}
