import React, { useEffect, useState } from "react";
import { Check } from "lucide-react";

const STEPS = [
  { label: "Writing your ad copy…", duration: 4000 },
  { label: "Designing your ad concepts…", duration: 5000 },
  { label: "Creating premium layouts…", duration: 999999 },
];

interface Props {
  onTimeout?: () => void;
}

export function AdLoadingState({ onTimeout }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  useEffect(() => {
    let step = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    function advance() {
      if (step < STEPS.length - 1) {
        const delay = STEPS[step].duration;
        const t = setTimeout(() => {
          setCompletedSteps((prev) => [...prev, step]);
          step++;
          setCurrentStep(step);
          advance();
        }, delay);
        timers.push(t);
      }
    }

    advance();
    return () => timers.forEach(clearTimeout);
  }, []);

  const progress = ((completedSteps.length) / STEPS.length) * 100 + (currentStep < STEPS.length - 1 ? 15 : 30);

  return (
    <div className="min-h-full flex items-center justify-center" style={{ background: "#060A14" }}>
      <div className="w-full max-w-sm px-6 py-16 text-center">

        {/* Animated logo/icon */}
        <div className="relative mx-auto mb-10 w-20 h-20">
          <div
            className="absolute inset-0 rounded-full opacity-20 animate-ping"
            style={{ background: "#19D3FF" }}
          />
          <div
            className="absolute inset-2 rounded-full opacity-30 animate-pulse"
            style={{ background: "#2B85E4" }}
          />
          <div
            className="relative w-full h-full rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#19D3FF,#2B85E4)" }}
          >
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
        </div>

        <h2 className="text-xl font-bold text-white mb-2">Creating Your Ads</h2>
        <p className="text-sm mb-10" style={{ color: "#8899AA" }}>AI is crafting 4 unique variations for you</p>

        {/* Progress bar */}
        <div className="w-full rounded-full h-1.5 mb-8 overflow-hidden" style={{ background: "#1A2640" }}>
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${Math.min(progress, 90)}%`,
              background: "linear-gradient(90deg,#2B85E4,#19D3FF)",
            }}
          />
        </div>

        {/* Steps */}
        <div className="space-y-4 text-left">
          {STEPS.map((step, idx) => {
            const isDone = completedSteps.includes(idx);
            const isActive = currentStep === idx;
            return (
              <div key={idx} className="flex items-center gap-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-none transition-all duration-500"
                  style={
                    isDone
                      ? { background: "#3DD13D" }
                      : isActive
                      ? { background: "rgba(25,211,255,0.15)", border: "2px solid #19D3FF" }
                      : { background: "#1A2640", border: "2px solid #1A2640" }
                  }
                >
                  {isDone ? (
                    <Check className="w-3.5 h-3.5 text-white" />
                  ) : isActive ? (
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#19D3FF" }} />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#2A3550" }} />
                  )}
                </div>
                <span
                  className="text-sm font-medium transition-colors duration-300"
                  style={isDone ? { color: "#3DD13D" } : isActive ? { color: "white" } : { color: "#4A5568" }}
                >
                  {step.label}
                </span>
                {isActive && (
                  <div className="flex gap-0.5 ml-auto">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1 h-1 rounded-full animate-bounce"
                        style={{ background: "#19D3FF", animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
