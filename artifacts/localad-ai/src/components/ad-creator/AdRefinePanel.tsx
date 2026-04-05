import React from "react";
import { X } from "lucide-react";
import type { Generation } from "./AdVariantCard";

const ACTIONS = [
  { id: "more-premium", emoji: "✨", label: "More Premium", description: "Elegant, sophisticated look" },
  { id: "more-bold", emoji: "⚡", label: "More Bold", description: "High contrast, impactful" },
  { id: "simplify", emoji: "🎯", label: "Simplify", description: "Cleaner, more minimal" },
  { id: "improve-headline", emoji: "✍️", label: "Improve Headline", description: "Stronger headline focus" },
  { id: "add-urgency", emoji: "🔥", label: "Add Urgency", description: "Time-sensitive feel" },
  { id: "change-colors", emoji: "🎨", label: "Change Colors", description: "Fresh color scheme" },
  { id: "resize", emoji: "📐", label: "Resize", description: "Adapt for different format" },
  { id: "add-photo", emoji: "📷", label: "Add My Photo", description: "Personal photo space" },
];

interface Props {
  generation: Generation;
  onAction: (generationId: string, action: string) => void;
  onClose: () => void;
  isRefining: boolean;
}

export function AdRefinePanel({ generation, onAction, onClose, isRefining }: Props) {
  const label = generation.label ?? generation.variationType.replace(/_/g, " ");

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4" style={{ background: "rgba(6,10,20,0.85)" }}>
      <div
        className="w-full max-w-lg rounded-3xl overflow-hidden"
        style={{ background: "#0C1528", border: "1px solid rgba(26,38,64,1)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4" style={{ borderBottom: "1px solid rgba(26,38,64,1)" }}>
          <div>
            <h3 className="text-lg font-bold text-white">Refine Your Ad</h3>
            <p className="text-sm mt-0.5" style={{ color: "#6B7A90" }}>{label} · 2 credits per tap</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "#1A2640", color: "#8899AA" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Image preview */}
        {generation.imageUrl && (
          <div className="px-6 py-4">
            <img
              src={generation.imageUrl}
              alt={label}
              className="w-full h-40 object-cover rounded-2xl"
            />
          </div>
        )}

        {/* Action buttons */}
        <div className="px-6 pb-6">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "#4A6080" }}>
            What would you like to change?
          </p>
          <div className="grid grid-cols-2 gap-2">
            {ACTIONS.map((action) => (
              <button
                key={action.id}
                onClick={() => !isRefining && onAction(generation.id, action.id)}
                disabled={isRefining}
                className="flex items-start gap-3 p-4 rounded-2xl text-left transition-all disabled:opacity-40"
                style={{ background: "#1A2640", border: "1px solid rgba(26,38,64,1)" }}
                onMouseEnter={(e) => {
                  if (!isRefining) {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(25,211,255,0.3)";
                    (e.currentTarget as HTMLElement).style.background = "#1E2D44";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,38,64,1)";
                  (e.currentTarget as HTMLElement).style.background = "#1A2640";
                }}
              >
                <span className="text-xl leading-none mt-0.5">{action.emoji}</span>
                <div>
                  <p className="text-sm font-semibold text-white">{action.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#6B7A90" }}>{action.description}</p>
                </div>
              </button>
            ))}
          </div>

          {isRefining && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm" style={{ background: "rgba(25,211,255,0.1)", color: "#19D3FF" }}>
                <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#19D3FF", borderTopColor: "transparent" }} />
                Refining your ad…
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
