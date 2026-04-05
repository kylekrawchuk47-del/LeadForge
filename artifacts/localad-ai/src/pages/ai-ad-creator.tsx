import React, { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/layout/app-layout";
import { AdCreatorHome } from "@/components/ad-creator/AdCreatorHome";
import { AdInputForm, type AdInput } from "@/components/ad-creator/AdInputForm";
import { AdLoadingState } from "@/components/ad-creator/AdLoadingState";
import { AdResultsGrid } from "@/components/ad-creator/AdResultsGrid";
import { AdRefinePanel } from "@/components/ad-creator/AdRefinePanel";
import { AdExportModal } from "@/components/ad-creator/AdExportModal";
import { type Generation } from "@/components/ad-creator/AdVariantCard";
import { useToast } from "@/hooks/use-toast";

type Step = "home" | "form" | "loading" | "results";

interface AdCopy {
  headline: string;
  subheadline?: string | null;
  offer_line?: string | null;
  cta?: string | null;
  supporting_bullets?: string[];
}

interface AdResult {
  projectId: string;
  copy: AdCopy;
  generations: Generation[];
}

const DEFAULT_INPUT: AdInput = {
  businessName: "",
  service: "",
  location: "",
  offer: "",
  cta: "",
  tone: "professional",
  format: "square",
  goal: "promote-service",
};

export default function AiAdCreator() {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("home");
  const [input, setInput] = useState<AdInput>(DEFAULT_INPUT);
  const [result, setResult] = useState<AdResult | null>(null);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [refiningId, setRefiningId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishingPlatform, setPublishingPlatform] = useState<"meta" | "google" | null>(null);
  const [refineTarget, setRefineTarget] = useState<Generation | null>(null);
  const [exportTarget, setExportTarget] = useState<Generation | null>(null);
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  const loadRecentProjects = useCallback(async () => {
    setIsLoadingProjects(true);
    try {
      const res = await fetch("/api/ad-creator/projects", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setRecentProjects(data.projects ?? []);
      }
    } catch (_err) {
    } finally {
      setIsLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    loadRecentProjects();
  }, [loadRecentProjects]);

  function handleSelectGoal(goal: string) {
    setInput((prev) => ({ ...prev, goal }));
    setStep("form");
  }

  async function handleOpenProject(id: string) {
    try {
      const res = await fetch(`/api/ad-creator/projects/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load project");
      const data = await res.json();
      setResult({ projectId: data.project.id, copy: data.copy, generations: data.generations });
      setGenerations(data.generations ?? []);
      setInput({
        businessName: data.project.businessName,
        service: data.project.service,
        location: data.project.location ?? "",
        offer: data.project.offer ?? "",
        cta: data.project.cta,
        tone: data.project.tone,
        format: data.project.format,
        goal: data.project.goal,
      });
      setStep("results");
    } catch (_err) {
      toast({ title: "Failed to load project", variant: "destructive" });
    }
  }

  async function handleGenerate() {
    setStep("loading");
    try {
      const res = await fetch("/api/ad-creator/generate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "INSUFFICIENT_CREDITS") {
          toast({ title: "Not enough credits", description: "You need at least 5 credits to generate ads.", variant: "destructive" });
        } else {
          toast({ title: "Generation failed", description: data.error ?? "Please try again.", variant: "destructive" });
        }
        setStep("form");
        return;
      }

      setResult(data);
      setGenerations(data.generations ?? []);
      await loadRecentProjects();
      setStep("results");
    } catch (_err) {
      toast({ title: "Something went wrong", description: "Please check your connection and try again.", variant: "destructive" });
      setStep("form");
    }
  }

  async function handleRefineAction(generationId: string, action: string) {
    setRefiningId(generationId);
    try {
      const res = await fetch("/api/ad-creator/refine", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generationId, action }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "INSUFFICIENT_CREDITS") {
          toast({ title: "Not enough credits", description: "You need at least 2 credits to refine an ad.", variant: "destructive" });
        } else {
          toast({ title: "Refinement failed", description: data.error ?? "Please try again.", variant: "destructive" });
        }
        return;
      }

      setGenerations((prev) =>
        prev.map((g) =>
          g.id === generationId ? { ...g, imageUrl: data.imageUrl, status: "complete" } : g
        )
      );

      if (refineTarget?.id === generationId) {
        setRefineTarget((prev) => prev ? { ...prev, imageUrl: data.imageUrl, status: "complete" } : prev);
      }

      toast({ title: "Ad refined!", description: "Your updated design is ready." });
    } catch (_err) {
      toast({ title: "Refinement failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setRefiningId(null);
    }
  }

  async function handleRegenerate(gen: Generation) {
    await handleRefineAction(gen.id, "change-colors");
  }

  function handleUse(gen: Generation) {
    setExportTarget(gen);
  }

  function handleRefineOpen(gen: Generation) {
    setRefineTarget(gen);
  }

  async function handlePublish(gen: Generation, platform: "meta" | "google") {
    if (!gen.imageUrl || gen.status !== "complete") return;
    setPublishingId(gen.id);
    setPublishingPlatform(platform);
    try {
      const res = await fetch("/api/ads/publish-from-ai", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generationId: gen.id, platform }),
      });
      const data = await res.json();
      if (!res.ok) {
        const isNotConnected = data.code?.endsWith("_NOT_CONNECTED");
        toast({
          title: isNotConnected
            ? `${platform === "meta" ? "Meta" : "Google"} Ads not connected`
            : "Publish failed",
          description: isNotConnected
            ? "Go to Ad Platforms in settings to connect your account first."
            : (data.error ?? "Please try again."),
          variant: "destructive",
        });
        return;
      }
      const platformLabel = platform === "meta" ? "Meta Ads" : "Google Ads";
      toast({
        title: `Published to ${platformLabel}!`,
        description: `Campaign "${data.campaignName}" created and set to ${data.status}.`,
      });
    } catch (_err) {
      toast({ title: "Publish failed", description: "Please check your connection and try again.", variant: "destructive" });
    } finally {
      setPublishingId(null);
      setPublishingPlatform(null);
    }
  }

  function handleCreateMore() {
    setStep("form");
    setResult(null);
    setGenerations([]);
  }

  return (
    <AppLayout>
      <div className="flex-1 overflow-y-auto h-full" style={{ background: "#060A14" }}>
        {step === "home" && (
          <AdCreatorHome
            onSelectGoal={handleSelectGoal}
            onOpenProject={handleOpenProject}
            recentProjects={recentProjects}
            isLoading={isLoadingProjects}
          />
        )}

        {step === "form" && (
          <AdInputForm
            input={input}
            onChange={setInput}
            onBack={() => setStep("home")}
            onGenerate={handleGenerate}
            isGenerating={false}
          />
        )}

        {step === "loading" && (
          <AdLoadingState />
        )}

        {step === "results" && result && (
          <AdResultsGrid
            generations={generations}
            copy={result.copy}
            onBack={() => setStep("form")}
            onUse={handleUse}
            onRefine={handleRefineOpen}
            onRegenerate={handleRegenerate}
            onCreateMore={handleCreateMore}
            onDownload={handleUse}
            onPublishMeta={(gen) => handlePublish(gen, "meta")}
            onPublishGoogle={(gen) => handlePublish(gen, "google")}
            refiningId={refiningId}
            publishingId={publishingId}
            publishingPlatform={publishingPlatform}
          />
        )}

        {/* Refine panel overlay */}
        {refineTarget && (
          <AdRefinePanel
            generation={refineTarget}
            onAction={handleRefineAction}
            onClose={() => setRefineTarget(null)}
            isRefining={refiningId === refineTarget.id}
          />
        )}

        {/* Export modal */}
        {exportTarget && (
          <AdExportModal
            generation={exportTarget}
            businessName={input.businessName || "Ad"}
            onClose={() => setExportTarget(null)}
            onCreateMore={() => {
              setExportTarget(null);
              handleCreateMore();
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
