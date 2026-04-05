import React from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { AdVariantCard, type Generation } from "./AdVariantCard";
import { Button } from "@/components/ui/button";

interface AdCopy {
  headline: string;
  subheadline?: string | null;
  offer_line?: string | null;
  cta?: string | null;
  supporting_bullets?: string[];
}

interface Props {
  generations: Generation[];
  copy: AdCopy | null;
  onBack: () => void;
  onUse: (gen: Generation) => void;
  onRefine: (gen: Generation) => void;
  onRegenerate: (gen: Generation) => void;
  onCreateMore: () => void;
  onDownload: (gen: Generation) => void;
  onPublishMeta: (gen: Generation) => void;
  onPublishGoogle: (gen: Generation) => void;
  refiningId: string | null;
  publishingId: string | null;
  publishingPlatform: "meta" | "google" | null;
}

export function AdResultsGrid({
  generations,
  copy,
  onBack,
  onUse,
  onRefine,
  onRegenerate,
  onCreateMore,
  onDownload,
  onPublishMeta,
  onPublishGoogle,
  refiningId,
  publishingId,
  publishingPlatform,
}: Props) {
  return (
    <div className="min-h-full" style={{ background: "#060A14" }}>
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm transition-opacity hover:opacity-80"
            style={{ color: "#8899AA" }}
          >
            <ArrowLeft className="w-4 h-4" />
            Edit Inputs
          </button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCreateMore}
              className="gap-2"
              style={{ color: "#8899AA" }}
            >
              <Plus className="w-4 h-4" />
              Create More
            </Button>
          </div>
        </div>

        {/* Copy preview */}
        {copy && (
          <div
            className="rounded-2xl p-5 mb-8"
            style={{ background: "#0C1528", border: "1px solid rgba(26,38,64,1)" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#4A6080" }}>Generated Copy</p>
                <h2 className="text-xl font-bold text-white leading-tight">{copy.headline}</h2>
                {copy.subheadline && (
                  <p className="text-sm mt-1" style={{ color: "#8899AA" }}>{copy.subheadline}</p>
                )}
                {(copy.offer_line || copy.cta) && (
                  <div className="flex flex-wrap gap-3 mt-3">
                    {copy.offer_line && (
                      <span
                        className="px-3 py-1 rounded-lg text-xs font-medium"
                        style={{ background: "rgba(255,122,26,0.1)", color: "#FF7A1A", border: "1px solid rgba(255,122,26,0.2)" }}
                      >
                        {copy.offer_line}
                      </span>
                    )}
                    {copy.cta && (
                      <span
                        className="px-3 py-1 rounded-lg text-xs font-medium"
                        style={{ background: "rgba(25,211,255,0.1)", color: "#19D3FF", border: "1px solid rgba(25,211,255,0.2)" }}
                      >
                        {copy.cta}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Heading */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-white">Your 4 Ad Variations</h1>
            <p className="text-sm mt-0.5" style={{ color: "#6B7A90" }}>Pick one to use, refine any design, or publish straight to Meta or Google</p>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {generations.map((gen) => (
            <AdVariantCard
              key={gen.id}
              generation={gen}
              onUse={onUse}
              onRefine={onRefine}
              onRegenerate={() => onRegenerate(gen)}
              onPublishMeta={onPublishMeta}
              onPublishGoogle={onPublishGoogle}
              isRefining={refiningId === gen.id}
              publishingId={publishingId}
              publishingPlatform={publishingPlatform}
            />
          ))}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "#4A6080" }}>
          Refining uses <span className="font-semibold text-white">2 credits</span> per variation
        </p>
      </div>
    </div>
  );
}
