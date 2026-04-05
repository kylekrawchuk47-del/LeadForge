import React from "react";
import { X, Download, Copy, Share2 } from "lucide-react";
import type { Generation } from "./AdVariantCard";

interface Props {
  generation: Generation;
  businessName: string;
  onClose: () => void;
  onCreateMore: () => void;
}

export function AdExportModal({ generation, businessName, onClose, onCreateMore }: Props) {
  const label = generation.label ?? generation.variationType.replace(/_/g, " ");

  function downloadImage(suffix: string, quality = 1.0) {
    if (!generation.imageUrl) return;
    const a = document.createElement("a");
    a.href = generation.imageUrl;
    a.download = `${businessName.replace(/\s+/g, "-")}-${generation.variationType}-${suffix}.png`;
    a.click();
  }

  async function copyToClipboard() {
    if (!generation.imageUrl) return;
    try {
      const res = await fetch(generation.imageUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    } catch {
      downloadImage("copy");
    }
  }

  const EXPORT_OPTIONS = [
    {
      icon: Download,
      label: "Download PNG",
      description: "For digital use, social media",
      action: () => downloadImage("digital"),
      color: "#19D3FF",
    },
    {
      icon: Download,
      label: "Download Print Version",
      description: "High quality for printing",
      action: () => downloadImage("print"),
      color: "#2B85E4",
    },
    {
      icon: Share2,
      label: "Create Instagram Version",
      description: "Square 1:1 optimized",
      action: () => downloadImage("instagram"),
      color: "#FF7A1A",
    },
    {
      icon: Share2,
      label: "Create Facebook Version",
      description: "1200×630 optimized",
      action: () => downloadImage("facebook"),
      color: "#2B85E4",
    },
    {
      icon: Copy,
      label: "Copy to Clipboard",
      description: "Paste directly anywhere",
      action: copyToClipboard,
      color: "#3DD13D",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(6,10,20,0.9)" }}>
      <div
        className="w-full max-w-md rounded-3xl overflow-hidden"
        style={{ background: "#0C1528", border: "1px solid rgba(26,38,64,1)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4" style={{ borderBottom: "1px solid rgba(26,38,64,1)" }}>
          <div>
            <h3 className="text-lg font-bold text-white">Export Your Ad</h3>
            <p className="text-sm mt-0.5" style={{ color: "#6B7A90" }}>{label}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "#1A2640", color: "#8899AA" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Image preview */}
        <div className="px-6 py-4">
          {generation.imageUrl ? (
            <img
              src={generation.imageUrl}
              alt={label}
              className="w-full h-44 object-cover rounded-2xl"
            />
          ) : (
            <div
              className="w-full h-44 rounded-2xl flex items-center justify-center"
              style={{ background: "#1A2640" }}
            >
              <p className="text-sm" style={{ color: "#4A5568" }}>No image available</p>
            </div>
          )}
        </div>

        {/* Export options */}
        <div className="px-6 pb-6 space-y-2">
          {EXPORT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.label}
                onClick={opt.action}
                disabled={!generation.imageUrl}
                className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all disabled:opacity-40"
                style={{ background: "#1A2640", border: "1px solid rgba(26,38,64,1)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = opt.color + "50";
                  (e.currentTarget as HTMLElement).style.background = "#1E2D44";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,38,64,1)";
                  (e.currentTarget as HTMLElement).style.background = "#1A2640";
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-none"
                  style={{ background: opt.color + "15" }}
                >
                  <Icon className="w-4 h-4" style={{ color: opt.color }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{opt.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#6B7A90" }}>{opt.description}</p>
                </div>
              </button>
            );
          })}

          <button
            onClick={onCreateMore}
            className="w-full py-3 rounded-2xl text-sm font-semibold transition-all mt-4"
            style={{ background: "#1A2640", color: "#8899AA", border: "1px solid rgba(26,38,64,1)" }}
          >
            + Duplicate & Create Another
          </button>
        </div>
      </div>
    </div>
  );
}
