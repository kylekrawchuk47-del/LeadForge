import { Router, type IRouter } from "express";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { openai, generateImageBuffer } from "@workspace/integrations-openai-ai-server";
import { requireAuth } from "../middlewares/requireAuth";
import { db } from "@workspace/db";
import {
  adProjectsTable,
  adCopiesTable,
  adGenerationsTable,
  adRefinementsTable,
} from "@workspace/db";
import { logger } from "../lib/logger";
import {
  checkImageGenAccess,
  checkRefinementAccess,
  incrementImageGenerations,
  incrementRefinements,
} from "../lib/plan-guards";

const router: IRouter = Router();

const VARIATION_STYLES = [
  {
    type: "clean_professional",
    label: "Clean Professional",
    suffix: "Style: clean, minimal, trustworthy, premium service advertisement. White space, professional typography, subtle color palette.",
  },
  {
    type: "bold_offer",
    label: "Bold Offer",
    suffix: "Style: high contrast, strong CTA, bold headline. Eye-catching but still professional. Strong offer visibility.",
  },
  {
    type: "luxury_premium",
    label: "Luxury Premium",
    suffix: "Style: elegant, refined, high-end brand look. Dark sophisticated palette, gold accents, upscale feel.",
  },
  {
    type: "social_ready",
    label: "Social Ready",
    suffix: "Style: modern, eye-catching, mobile optimized. Vibrant but clean. Perfect for Instagram and Facebook feeds.",
  },
];

function buildImagePrompt(
  copy: {
    headline: string;
    subheadline?: string | null;
    offerLine?: string | null;
    cta?: string | null;
    supportingBulletsJson?: string | null;
  },
  input: {
    businessName: string;
    service: string;
    format: string;
  },
  styleSuffix: string
): string {
  const bullets: string[] = (() => {
    try {
      return JSON.parse(copy.supportingBulletsJson ?? "[]");
    } catch {
      return [];
    }
  })();

  const bulletText = bullets.length > 0 ? bullets.slice(0, 3).join(", ") : "";

  return `Create a premium advertising flyer for a local business.

Business name: ${input.businessName}
Service: ${input.service}
Headline: ${copy.headline}${copy.subheadline ? `\nSubheadline: ${copy.subheadline}` : ""}${copy.offerLine ? `\nOffer: ${copy.offerLine}` : ""}${copy.cta ? `\nCall to action: ${copy.cta}` : ""}${bulletText ? `\nKey points: ${bulletText}` : ""}

Design requirements: clean premium layout, modern ad design, strong visual hierarchy, minimal clutter, high readability, professional marketing look, no mockups, no distorted text, flat finished graphic, ${input.format} format.

${styleSuffix}`.trim();
}

const REFINE_ACTION_PROMPTS: Record<string, string> = {
  "more-premium": "Make this ad more premium and sophisticated. Improve typography, add elegance, refine the color palette to feel luxury.",
  "more-bold": "Make this ad bolder and more impactful. Stronger contrast, bigger headline, more commanding visual presence.",
  "simplify": "Simplify this ad. Remove visual clutter, increase white space, keep only the most essential elements.",
  "improve-headline": "Redesign this ad with a stronger headline treatment. Make the headline the dominant visual element.",
  "add-urgency": "Add urgency to this ad. Include visual cues that suggest limited time or limited availability.",
  "change-colors": "Redesign this ad with a fresh, premium color scheme while keeping the same layout and content.",
  "resize": "Adapt this ad design for a different format while maintaining the premium quality and messaging.",
  "add-photo": "Redesign this ad to prominently feature a space for a professional photo, making it feel more personal and trustworthy.",
};

// ─── POST /api/ad-creator/generate ────────────────────────────────────────────

const GenerateSchema = z.object({
  businessName: z.string().min(1).max(100),
  service: z.string().min(1).max(100),
  location: z.string().max(100).optional().default(""),
  offer: z.string().max(200).optional().default(""),
  cta: z.string().min(1).max(100),
  tone: z.enum(["professional", "bold", "premium", "friendly"]),
  format: z.enum(["square", "story", "flyer", "poster"]),
  goal: z.string().min(1).max(100),
});

router.post("/ad-creator/generate", requireAuth, async (req, res): Promise<void> => {
  const parsed = GenerateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const input = parsed.data;
  const userId = req.userId!;

  const guard = await checkImageGenAccess(userId);
  if (!guard.allowed) {
    res.status(guard.statusCode).json({ error: guard.message, code: guard.code });
    return;
  }

  try {
    const [project] = await db
      .insert(adProjectsTable)
      .values({
        userId,
        businessName: input.businessName,
        service: input.service,
        location: input.location || null,
        offer: input.offer || null,
        cta: input.cta,
        tone: input.tone,
        format: input.format,
        goal: input.goal,
      })
      .returning();

    const systemPrompt = `You are an elite direct-response ad copywriter for local businesses. Write clean, high-converting flyer/poster copy. Rules: clear and simple, premium tone, no fluff, strong CTA, visually clean, do not explain. Return JSON only.`;

    const userPrompt = `Create flyer ad copy.

Business: ${input.businessName}
Service: ${input.service}
Location: ${input.location || "Not specified"}
Offer: ${input.offer || "Not specified"}
CTA: ${input.cta}
Tone: ${input.tone}
Goal: ${input.goal}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 1024,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let copyData: {
      headline: string;
      subheadline?: string;
      offer_line?: string;
      cta?: string;
      supporting_bullets?: string[];
      design_direction?: string;
      image_direction?: string;
    };

    try {
      copyData = JSON.parse(raw);
    } catch {
      copyData = { headline: input.businessName, cta: input.cta };
    }

    const bulletsJson = JSON.stringify(copyData.supporting_bullets ?? []);

    const [savedCopy] = await db
      .insert(adCopiesTable)
      .values({
        projectId: project.id,
        headline: copyData.headline ?? input.businessName,
        subheadline: copyData.subheadline ?? null,
        offerLine: copyData.offer_line ?? input.offer ?? null,
        cta: copyData.cta ?? input.cta,
        supportingBulletsJson: bulletsJson,
        designDirection: copyData.design_direction ?? null,
        imageDirection: copyData.image_direction ?? null,
      })
      .returning();

    const copyForPrompt = {
      headline: savedCopy.headline,
      subheadline: savedCopy.subheadline,
      offerLine: savedCopy.offerLine,
      cta: savedCopy.cta,
      supportingBulletsJson: savedCopy.supportingBulletsJson,
    };

    const imageResults = await Promise.allSettled(
      VARIATION_STYLES.map(async (style) => {
        const prompt = buildImagePrompt(copyForPrompt, input, style.suffix);
        const [gen] = await db
          .insert(adGenerationsTable)
          .values({ projectId: project.id, variationType: style.type, promptText: prompt, status: "pending" })
          .returning();

        try {
          const buf = await generateImageBuffer(prompt, "1024x1024");
          const dataUrl = `data:image/png;base64,${buf.toString("base64")}`;
          const [updated] = await db
            .update(adGenerationsTable)
            .set({ imageUrl: dataUrl, status: "complete" })
            .where(eq(adGenerationsTable.id, gen.id))
            .returning();
          return { ...updated, variationType: style.type, label: style.label };
        } catch (err) {
          logger.error({ err, style: style.type }, "Image generation failed");
          await db.update(adGenerationsTable).set({ status: "failed" }).where(eq(adGenerationsTable.id, gen.id));
          return { id: gen.id, projectId: project.id, variationType: style.type, imageUrl: null, status: "failed", label: style.label };
        }
      })
    );

    const generations = imageResults.map((r) =>
      r.status === "fulfilled" ? r.value : null
    ).filter(Boolean);

    await incrementImageGenerations(userId, guard.isTrial);

    res.json({
      projectId: project.id,
      copy: {
        headline: savedCopy.headline,
        subheadline: savedCopy.subheadline,
        offer_line: savedCopy.offerLine,
        cta: savedCopy.cta,
        supporting_bullets: JSON.parse(savedCopy.supportingBulletsJson ?? "[]"),
        design_direction: savedCopy.designDirection,
        image_direction: savedCopy.imageDirection,
      },
      generations,
    });
  } catch (err) {
    logger.error({ err }, "ad-creator generate error");
    res.status(500).json({ error: "Generation failed. Please try again." });
  }
});

// ─── POST /api/ad-creator/refine ──────────────────────────────────────────────

const RefineSchema = z.object({
  generationId: z.string().uuid(),
  action: z.enum([
    "more-premium", "more-bold", "simplify", "improve-headline",
    "add-urgency", "change-colors", "resize", "add-photo",
  ]),
});

router.post("/ad-creator/refine", requireAuth, async (req, res): Promise<void> => {
  const parsed = RefineSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const { generationId, action } = parsed.data;
  const userId = req.userId!;

  const [gen] = await db
    .select()
    .from(adGenerationsTable)
    .where(eq(adGenerationsTable.id, generationId));

  if (!gen) {
    res.status(404).json({ error: "Generation not found" });
    return;
  }

  const [proj] = await db
    .select({ userId: adProjectsTable.userId })
    .from(adProjectsTable)
    .where(eq(adProjectsTable.id, gen.projectId));

  if (!proj || proj.userId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const refineGuard = await checkRefinementAccess(userId);
  if (!refineGuard.allowed) {
    res.status(refineGuard.statusCode).json({ error: refineGuard.message, code: refineGuard.code });
    return;
  }

  try {
    const actionSuffix = REFINE_ACTION_PROMPTS[action] ?? "";
    const newPrompt = `${gen.promptText}\n\nRefinement instruction: ${actionSuffix}`;

    const buf = await generateImageBuffer(newPrompt, "1024x1024");
    const dataUrl = `data:image/png;base64,${buf.toString("base64")}`;

    await db.insert(adRefinementsTable).values({
      generationId,
      actionType: action,
      newPromptText: newPrompt,
      newImageUrl: dataUrl,
    });

    await db
      .update(adGenerationsTable)
      .set({ imageUrl: dataUrl, status: "complete" })
      .where(eq(adGenerationsTable.id, generationId));

    await incrementRefinements(userId);

    res.json({ imageUrl: dataUrl, generationId });
  } catch (err) {
    logger.error({ err }, "ad-creator refine error");
    res.status(500).json({ error: "Refinement failed. Please try again." });
  }
});

// ─── GET /api/ad-creator/projects ─────────────────────────────────────────────

router.get("/ad-creator/projects", requireAuth, async (req, res): Promise<void> => {
  try {
    const projects = await db
      .select()
      .from(adProjectsTable)
      .where(eq(adProjectsTable.userId, req.userId!))
      .orderBy(desc(adProjectsTable.createdAt))
      .limit(20);

    const withThumbnails = await Promise.all(
      projects.map(async (p) => {
        const [firstGen] = await db
          .select({ imageUrl: adGenerationsTable.imageUrl, status: adGenerationsTable.status })
          .from(adGenerationsTable)
          .where(and(eq(adGenerationsTable.projectId, p.id), eq(adGenerationsTable.status, "complete")))
          .limit(1);
        return { ...p, thumbnail: firstGen?.imageUrl ?? null };
      })
    );

    res.json({ projects: withThumbnails });
  } catch (err) {
    logger.error({ err }, "ad-creator list projects error");
    res.status(500).json({ error: "Failed to load projects" });
  }
});

// ─── GET /api/ad-creator/projects/:id ─────────────────────────────────────────

router.get("/ad-creator/projects/:id", requireAuth, async (req, res): Promise<void> => {
  try {
    const { id } = req.params;

    const [project] = await db
      .select()
      .from(adProjectsTable)
      .where(and(eq(adProjectsTable.id, id), eq(adProjectsTable.userId, req.userId!)));

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const [copy] = await db
      .select()
      .from(adCopiesTable)
      .where(eq(adCopiesTable.projectId, id));

    const generations = await db
      .select()
      .from(adGenerationsTable)
      .where(eq(adGenerationsTable.projectId, id))
      .orderBy(adGenerationsTable.createdAt);

    const LABELS: Record<string, string> = {
      clean_professional: "Clean Professional",
      bold_offer: "Bold Offer",
      luxury_premium: "Luxury Premium",
      social_ready: "Social Ready",
    };

    res.json({
      project,
      copy: copy
        ? {
            headline: copy.headline,
            subheadline: copy.subheadline,
            offer_line: copy.offerLine,
            cta: copy.cta,
            supporting_bullets: (() => {
              try { return JSON.parse(copy.supportingBulletsJson ?? "[]"); } catch { return []; }
            })(),
            design_direction: copy.designDirection,
            image_direction: copy.imageDirection,
          }
        : null,
      generations: generations.map((g) => ({ ...g, label: LABELS[g.variationType] ?? g.variationType })),
    });
  } catch (err) {
    logger.error({ err }, "ad-creator get project error");
    res.status(500).json({ error: "Failed to load project" });
  }
});

export default router;
