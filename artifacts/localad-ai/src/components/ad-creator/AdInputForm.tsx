import React from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export type AdInput = {
  businessName: string;
  service: string;
  location: string;
  offer: string;
  cta: string;
  tone: string;
  format: string;
  goal: string;
};

const TONES = [
  { id: "professional", label: "Clean Professional" },
  { id: "bold", label: "Bold" },
  { id: "premium", label: "Premium" },
  { id: "friendly", label: "Friendly" },
];

const FORMATS = [
  { id: "square", label: "Square Post", sub: "1:1" },
  { id: "story", label: "Story", sub: "9:16" },
  { id: "flyer", label: "Flyer", sub: "Portrait" },
  { id: "poster", label: "Poster", sub: "Large" },
];

const GOAL_LABELS: Record<string, string> = {
  "promote-service": "Promote a Service",
  "seasonal-offer": "Seasonal Offer",
  "before-after": "Before & After",
  "local-awareness": "Local Awareness",
  "hiring": "Hiring",
};

interface Props {
  input: AdInput;
  onChange: (input: AdInput) => void;
  onBack: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export function AdInputForm({ input, onChange, onBack, onGenerate, isGenerating }: Props) {
  const set = (key: keyof AdInput, value: string) => onChange({ ...input, [key]: value });

  const isValid = input.businessName.trim() && input.service.trim() && input.cta.trim();

  return (
    <div className="min-h-full" style={{ background: "#060A14" }}>
      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Header */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm mb-8 transition-opacity hover:opacity-80"
          style={{ color: "#8899AA" }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="mb-8">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-3"
            style={{ background: "rgba(25,211,255,0.1)", color: "#19D3FF", border: "1px solid rgba(25,211,255,0.2)" }}
          >
            {GOAL_LABELS[input.goal] ?? "New Ad"}
          </div>
          <h1 className="text-2xl font-bold text-white">Tell us about your business</h1>
          <p className="text-sm mt-1" style={{ color: "#8899AA" }}>We'll use this to create ads that speak directly to your customers.</p>
        </div>

        <div className="space-y-6">

          {/* Business Name */}
          <div className="space-y-2">
            <Label className="text-white font-medium">Business Name <span style={{ color: "#FF7A1A" }}>*</span></Label>
            <Input
              value={input.businessName}
              onChange={(e) => set("businessName", e.target.value)}
              placeholder="e.g. KJ Painting Co."
              className="h-11 text-white"
              style={{ background: "#0C1528", border: "1px solid rgba(26,38,64,1)", color: "white" }}
            />
          </div>

          {/* Service */}
          <div className="space-y-2">
            <Label className="text-white font-medium">Service <span style={{ color: "#FF7A1A" }}>*</span></Label>
            <Input
              value={input.service}
              onChange={(e) => set("service", e.target.value)}
              placeholder="e.g. Interior & Exterior Painting"
              className="h-11"
              style={{ background: "#0C1528", border: "1px solid rgba(26,38,64,1)", color: "white" }}
            />
          </div>

          {/* Location + Offer (2 cols) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white font-medium">
                Location <span className="text-xs font-normal" style={{ color: "#6B7A90" }}>(optional)</span>
              </Label>
              <Input
                value={input.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="e.g. Toronto, ON"
                className="h-11"
                style={{ background: "#0C1528", border: "1px solid rgba(26,38,64,1)", color: "white" }}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white font-medium">
                Offer / Promo <span className="text-xs font-normal" style={{ color: "#6B7A90" }}>(optional)</span>
              </Label>
              <Input
                value={input.offer}
                onChange={(e) => set("offer", e.target.value)}
                placeholder="e.g. 10% off this month"
                className="h-11"
                style={{ background: "#0C1528", border: "1px solid rgba(26,38,64,1)", color: "white" }}
              />
            </div>
          </div>

          {/* CTA */}
          <div className="space-y-2">
            <Label className="text-white font-medium">Phone / CTA <span style={{ color: "#FF7A1A" }}>*</span></Label>
            <Input
              value={input.cta}
              onChange={(e) => set("cta", e.target.value)}
              placeholder="e.g. Call (416) 555-0123 for a free quote"
              className="h-11"
              style={{ background: "#0C1528", border: "1px solid rgba(26,38,64,1)", color: "white" }}
            />
          </div>

          {/* Tone */}
          <div className="space-y-3">
            <Label className="text-white font-medium">Tone</Label>
            <div className="flex flex-wrap gap-2">
              {TONES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => set("tone", t.id)}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  style={
                    input.tone === t.id
                      ? { background: "#19D3FF", color: "#060A14" }
                      : { background: "#0C1528", border: "1px solid rgba(26,38,64,1)", color: "#8899AA" }
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div className="space-y-3">
            <Label className="text-white font-medium">Ad Format</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => set("format", f.id)}
                  className="py-3 px-3 rounded-xl text-left transition-all"
                  style={
                    input.format === f.id
                      ? { background: "rgba(25,211,255,0.1)", border: "1px solid rgba(25,211,255,0.5)", color: "white" }
                      : { background: "#0C1528", border: "1px solid rgba(26,38,64,1)", color: "#8899AA" }
                  }
                >
                  <p className="text-xs font-semibold" style={input.format === f.id ? { color: "#19D3FF" } : {}}>{f.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#4A6080" }}>{f.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={onBack}
              className="flex-none"
              style={{ color: "#8899AA" }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={onGenerate}
              disabled={!isValid || isGenerating}
              className="flex-1 h-12 text-base font-semibold"
              style={{
                background: isValid && !isGenerating ? "linear-gradient(135deg,#19D3FF,#2B85E4)" : "#1A2640",
                color: isValid && !isGenerating ? "#060A14" : "#4A6080",
                border: "none",
              }}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              {isGenerating ? "Generating…" : "Generate Ads"}
            </Button>
          </div>

          <p className="text-center text-xs" style={{ color: "#4A6080" }}>
            Uses <span className="font-semibold text-white">5 credits</span> · Generates 4 unique variations
          </p>
        </div>
      </div>
    </div>
  );
}
