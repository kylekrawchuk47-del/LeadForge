import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Download, Copy, Image, Check, FileText, Sparkles } from "lucide-react";

const exportCampaigns = [
  {
    id: 1,
    name: "Spring Exterior Painting Promo",
    platform: "Facebook",
    date: "Apr 2, 2025",
    variations: [
      {
        angle: "Trust & Longevity",
        headline: "Austin's Most Trusted Painters — 12 Years, 500+ Happy Homeowners",
        primaryText: "When you invite someone into your home, you deserve a crew that shows up on time, works clean, and delivers what they promised. Mike's Painting has been doing exactly that in Austin since 2012.",
        cta: "Get Your Free Estimate Today",
        imagePrompt: "Professional painter in branded uniform painting a bright living room wall, warm natural light, before/after split image",
      },
      {
        angle: "Offer & Urgency",
        headline: "Spring Painting Special — 10% Off Any Interior Project This Month",
        primaryText: "Your walls have been through a long winter. Spring is the perfect time to freshen up your home's interior — and right now, Mike's Painting is offering 10% off.",
        cta: "Book Before Spots Fill Up",
        imagePrompt: "Bright, freshly painted living room in a modern home, warm spring light through windows, color palette chips nearby",
      },
    ],
  },
  {
    id: 2,
    name: "Free Roof Inspection April",
    platform: "Google",
    date: "Mar 28, 2025",
    variations: [
      {
        angle: "Problem & Solution",
        headline: "Storm Damage? We'll Inspect Your Roof FREE",
        primaryText: "Don't let a small leak turn into a $10,000 nightmare. Reliable Roofing serves Dallas with same-week service and certified installers.",
        cta: "Schedule Free Inspection",
        imagePrompt: "Roofing contractor inspecting shingles on a sunny day, professional safety gear, suburban home exterior",
      },
    ],
  },
];

function CopyField({ label, text }: { label: string; text: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied!", description: `${label} copied to clipboard.` });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group bg-muted/40 hover:bg-muted/70 rounded-lg p-3 transition-colors">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
        <button
          onClick={copy}
          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <p className="text-sm text-foreground leading-relaxed">{text}</p>
    </div>
  );
}

export default function CampaignOutputs() {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState<number | null>(null);

  const handleDownload = async (campaignId: number, name: string) => {
    setDownloading(campaignId);
    await new Promise(r => setTimeout(r, 1500));

    const campaign = exportCampaigns.find(c => c.id === campaignId);
    if (!campaign) return;

    const content = campaign.variations.map((v, i) => `
=== VARIATION ${i + 1}: ${v.angle} ===

HEADLINE:
${v.headline}

PRIMARY TEXT:
${v.primaryText}

CALL TO ACTION:
${v.cta}

IMAGE PROMPT:
${v.imagePrompt}

---
    `).join("\n");

    const blob = new Blob([`Campaign: ${name}\nPlatform: ${campaign.platform}\nDate: ${campaign.date}\n\n${content}`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/\s+/g, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    setDownloading(null);
    toast({ title: "Downloaded!", description: `${name} has been exported as a text file.` });
  };

  const handleCopyAll = async (campaign: typeof exportCampaigns[0]) => {
    const content = campaign.variations.map((v, i) => `
Variation ${i + 1} — ${v.angle}

Headline: ${v.headline}
Primary Text: ${v.primaryText}
CTA: ${v.cta}
Image Prompt: ${v.imagePrompt}
    `).join("\n---\n");

    await navigator.clipboard.writeText(content);
    toast({ title: "All variations copied!", description: "The full campaign has been copied to your clipboard." });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Download className="w-6 h-6 text-primary" />
          Campaign Outputs
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Copy individual fields or download complete campaign packages as text files.
        </p>
      </div>

      {/* Export Tips */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">How to use your exports</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Copy headlines and primary text into Facebook Ads Manager or Google Ads. Use image prompts with DALL-E, Midjourney, or Canva to create matching visuals. Download the full file to share with a team member or virtual assistant.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-8">
        {exportCampaigns.map(campaign => (
          <div key={campaign.id}>
            {/* Campaign Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="font-semibold text-base">{campaign.name}</h2>
                  <Badge variant="secondary" className="text-xs">{campaign.platform}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{campaign.date} · {campaign.variations.length} variations</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => handleCopyAll(campaign)}
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => handleDownload(campaign.id, campaign.name)}
                  disabled={downloading === campaign.id}
                >
                  {downloading === campaign.id ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      Download .txt
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Variations */}
            <div className="space-y-4">
              {campaign.variations.map((v, i) => (
                <Card key={i} className="border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10 text-xs">
                        Variation {i + 1}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{v.angle}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <CopyField label="Headline" text={v.headline} />
                    <CopyField label="Primary Text" text={v.primaryText} />
                    <CopyField label="Call to Action" text={v.cta} />
                    <div className="group bg-primary/5 border border-primary/15 hover:bg-primary/10 rounded-lg p-3 transition-colors">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Image className="w-3 h-3 text-primary" />
                          <span className="text-xs font-semibold text-primary uppercase tracking-wide">Image Prompt</span>
                        </div>
                        <button
                          onClick={async () => {
                            await navigator.clipboard.writeText(v.imagePrompt);
                            toast({ title: "Image prompt copied!" });
                          }}
                          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                          Copy
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground italic leading-relaxed">{v.imagePrompt}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
