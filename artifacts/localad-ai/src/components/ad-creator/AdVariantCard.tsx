import React from "react";
import { Wand2, RotateCw, ImageIcon, Loader2 } from "lucide-react";

export type Generation = {
  id: string;
  variationType: string;
  label?: string;
  imageUrl: string | null;
  status: string;
};

const STYLE_COLORS: Record<string, string> = {
  clean_professional: "#2B85E4",
  bold_offer: "#FF7A1A",
  luxury_premium: "#F59E0B",
  social_ready: "#3DD13D",
};

interface Props {
  generation: Generation;
  onUse: (gen: Generation) => void;
  onRefine: (gen: Generation) => void;
  onRegenerate: (gen: Generation) => void;
  onPublishMeta: (gen: Generation) => void;
  onPublishGoogle: (gen: Generation) => void;
  isRefining: boolean;
  publishingId: string | null;
  publishingPlatform: "meta" | "google" | null;
}

export function AdVariantCard({
  generation,
  onUse,
  onRefine,
  onRegenerate,
  onPublishMeta,
  onPublishGoogle,
  isRefining,
  publishingId,
  publishingPlatform,
}: Props) {
  const color = STYLE_COLORS[generation.variationType] ?? "#19D3FF";
  const label = generation.label ?? generation.variationType.replace(/_/g, " ");

  const isPublishingThis = publishingId === generation.id;
  const isReady = generation.status === "complete" && !!generation.imageUrl;

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{ background: "#0C1528", border: "1px solid rgba(26,38,64,1)" }}
    >
      {/* Image */}
      <div className="relative" style={{ aspectRatio: "1/1", background: "#1A2640" }}>
        {generation.imageUrl && generation.status === "complete" ? (
          <img
            src={generation.imageUrl}
            alt={label}
            className="w-full h-full object-cover"
          />
        ) : generation.status === "failed" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <ImageIcon className="w-8 h-8" style={{ color: "#4A5568" }} />
            <p className="text-xs" style={{ color: "#4A5568" }}>Generation failed</p>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#19D3FF", borderTopColor: "transparent" }} />
          </div>
        )}

        {/* Label badge */}
        <div
          className="absolute top-2 left-2 px-2 py-1 rounded-lg text-xs font-semibold"
          style={{ background: "rgba(6,10,20,0.85)", color }}
        >
          {label}
        </div>

        {isRefining && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(6,10,20,0.7)" }}>
            <div className="text-center">
              <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-2" style={{ borderColor: "#19D3FF", borderTopColor: "transparent" }} />
              <p className="text-xs text-white">Refining…</p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-3 space-y-2">
        <button
          onClick={() => onUse(generation)}
          disabled={!generation.imageUrl}
          className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
          style={{ background: "linear-gradient(135deg,#19D3FF,#2B85E4)", color: "#060A14" }}
        >
          Use This
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onRefine(generation)}
            disabled={isRefining}
            className="py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
            style={{ background: "#1A2640", color: "#8899AA", border: "1px solid rgba(26,38,64,1)" }}
          >
            <Wand2 className="w-3 h-3" />
            Refine
          </button>
          <button
            onClick={() => onRegenerate(generation)}
            disabled={isRefining}
            className="py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
            style={{ background: "#1A2640", color: "#8899AA", border: "1px solid rgba(26,38,64,1)" }}
          >
            <RotateCw className="w-3 h-3" />
            Redo
          </button>
        </div>

        {/* Publish buttons */}
        <div className="pt-1.5" style={{ borderTop: "1px solid rgba(26,38,64,0.9)" }}>
          <p className="text-center text-xs mb-2" style={{ color: "#4A6080" }}>Publish directly to</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onPublishMeta(generation)}
              disabled={!isReady || (isPublishingThis && publishingPlatform === "meta")}
              className="py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
              style={{ background: "rgba(24,119,242,0.12)", color: "#4A90F7", border: "1px solid rgba(24,119,242,0.3)" }}
            >
              {isPublishingThis && publishingPlatform === "meta" ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              )}
              Meta
            </button>
            <button
              onClick={() => onPublishGoogle(generation)}
              disabled={!isReady || (isPublishingThis && publishingPlatform === "google")}
              className="py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40"
              style={{ background: "rgba(234,67,53,0.12)", color: "#EA4335", border: "1px solid rgba(234,67,53,0.3)" }}
            >
              {isPublishingThis && publishingPlatform === "google" ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
