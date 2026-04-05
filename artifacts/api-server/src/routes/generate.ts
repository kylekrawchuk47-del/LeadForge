import { Router, type IRouter } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth } from "../middlewares/requireAuth";
import { db, usersTable, creditTransactionsTable } from "@workspace/db";
import { CREDIT_COSTS as CC, getPlanCreditLimit } from "@workspace/credits";

const router: IRouter = Router();

// ─── Credit Costs ─────────────────────────────────────────────────────────────

const CREDIT_COSTS = {
  campaign: CC.FULL_CAMPAIGN,
  landingPage: CC.LANDING_PAGE,
  emailCampaign: CC.EMAIL_CAMPAIGN,
  followUp: CC.SMS_FOLLOWUP,
  headlines: CC.AD_GENERATION,
  ctas: CC.AD_GENERATION,
} as const;

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Deduct credits from a user. All plans use credits.
// Paid plans: lazy monthly reset. Free: 20 lifetime, no reset.
// Drains plan credits first, then addon credits.
async function deductCredits(
  clerkUserId: string,
  cost: number
): Promise<{ allowed: boolean; creditsRemaining: number; addonCredits: number; plan: string }> {
  const [user] = await db
    .select({
      credits: usersTable.credits,
      addonCredits: usersTable.addonCredits,
      plan: usersTable.plan,
      creditsResetAt: usersTable.creditsResetAt,
    })
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId));

  if (!user) return { allowed: false, creditsRemaining: 0, addonCredits: 0, plan: "free" };

  let currentCredits = user.credits;
  const currentAddon = user.addonCredits ?? 0;

  // Monthly reset for paid plans (lazy evaluation)
  if (user.plan !== "free") {
    const planLimit = getPlanCreditLimit(user.plan);
    const now = new Date();
    const lastReset = user.creditsResetAt ? new Date(user.creditsResetAt) : null;
    const needsReset = !lastReset || (now.getTime() - lastReset.getTime()) > THIRTY_DAYS_MS;

    if (needsReset) {
      currentCredits = planLimit;
      await db
        .update(usersTable)
        .set({ credits: planLimit, creditsResetAt: now })
        .where(eq(usersTable.clerkUserId, clerkUserId));
      await db.insert(creditTransactionsTable).values({
        clerkUserId,
        amount: planLimit,
        type: "MONTHLY_RESET",
        description: `Monthly credit reset — ${user.plan} plan (${planLimit} credits)`,
      });
    }
  }

  const total = currentCredits + currentAddon;

  if (total < cost) {
    return { allowed: false, creditsRemaining: total, addonCredits: currentAddon, plan: user.plan };
  }

  // Deduct from plan credits first, then addon credits
  let newPlanCredits: number;
  let newAddonCredits: number;

  if (currentCredits >= cost) {
    newPlanCredits = currentCredits - cost;
    newAddonCredits = currentAddon;
  } else {
    newPlanCredits = 0;
    newAddonCredits = currentAddon - (cost - currentCredits);
  }

  const [updated] = await db
    .update(usersTable)
    .set({ credits: newPlanCredits, addonCredits: newAddonCredits })
    .where(eq(usersTable.clerkUserId, clerkUserId))
    .returning({ credits: usersTable.credits, addonCredits: usersTable.addonCredits });

  await db.insert(creditTransactionsTable).values({
    clerkUserId,
    amount: -cost,
    type: "USAGE",
    description: `Used ${cost} credit${cost !== 1 ? "s" : ""} for generation`,
  });

  return {
    allowed: true,
    creditsRemaining: (updated.credits ?? 0) + (updated.addonCredits ?? 0),
    addonCredits: updated.addonCredits ?? 0,
    plan: user.plan,
  };
}

// ─── Request Schemas ──────────────────────────────────────────────────────────

const BusinessContext = z.object({
  businessName: z.string().optional().default(""),
  category: z.string().optional().default(""),
  location: z.string().optional().default(""),
  services: z.string().optional().default(""),
  offer: z.string().optional().default(""),
  tone: z.string().optional().default("professional"),
  platform: z.string().optional().default("facebook"),
  goal: z.string().optional().default("leads"),
});

const CampaignRequest = BusinessContext;

const LandingPageRequest = BusinessContext;

const HeadlinesRequest = BusinessContext.extend({
  count: z.number().int().min(1).max(10).optional().default(5),
});

const CTAsRequest = BusinessContext.extend({
  count: z.number().int().min(1).max(10).optional().default(5),
});

const FollowUpRequest = BusinessContext.extend({
  channel: z.enum(["email", "sms", "both"]).optional().default("both"),
  count: z.number().int().min(1).max(5).optional().default(3),
});

// ─── Helper ───────────────────────────────────────────────────────────────────

function buildBusinessContext(data: z.infer<typeof BusinessContext>): string {
  const parts: string[] = [];
  if (data.businessName) parts.push(`Business Name: ${data.businessName}`);
  if (data.category) parts.push(`Category: ${data.category}`);
  if (data.location) parts.push(`Location: ${data.location}`);
  if (data.services) parts.push(`Services: ${data.services}`);
  if (data.offer) parts.push(`Current Offer: ${data.offer}`);
  if (data.tone) parts.push(`Desired Tone: ${data.tone}`);
  if (data.platform) parts.push(`Platform: ${data.platform}`);
  if (data.goal) parts.push(`Campaign Goal: ${data.goal}`);
  return parts.join("\n");
}

// ─── POST /generate/campaign ─────────────────────────────────────────────────
// Returns 4 complete ad copy variations (headline, body, CTA, image prompt)

router.post("/generate/campaign", requireAuth, async (req, res): Promise<void> => {
  const parsed = CampaignRequest.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const creditCheck = await deductCredits(req.userId!, CREDIT_COSTS.campaign);
  if (!creditCheck.allowed) {
    res.status(402).json({
      error: "Insufficient credits",
      required: CREDIT_COSTS.campaign,
      current: creditCheck.creditsRemaining,
    });
    return;
  }

  const ctx = buildBusinessContext(parsed.data);

  const systemPrompt = `You are an expert direct-response copywriter specializing in local service businesses (painting, roofing, landscaping, cleaning, HVAC, etc.). 
You write high-converting ad copy that generates real leads for contractors and home service companies.
Always return valid JSON only. No markdown, no explanation.`;

  const userPrompt = `Generate 4 distinct ${parsed.data.platform} ad copy variations for this local service business:

${ctx}

Each variation must use a completely different angle and approach. Return this exact JSON structure:
{
  "variations": [
    {
      "angle": "short name for this approach (e.g. 'Trust & Longevity', 'Urgency & Offer', 'Problem & Solution', 'Social Proof')",
      "headline": "punchy headline under 10 words",
      "primaryText": "persuasive ad body copy, 150-250 words, specific to this platform and goal, includes a clear value proposition and the offer naturally woven in",
      "cta": "call-to-action button text (2-5 words)",
      "offerHighlight": "the specific offer or hook in 1 sentence",
      "imagePrompt": "detailed prompt for an AI image generator describing the ideal photo/visual for this ad, 2-3 sentences"
    }
  ]
}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 8192,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const result = JSON.parse(raw);

  res.json(result);
});

// ─── POST /generate/landing-page ─────────────────────────────────────────────
// Returns complete landing page copy sections

router.post("/generate/landing-page", requireAuth, async (req, res): Promise<void> => {
  const parsed = LandingPageRequest.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const creditCheck = await deductCredits(req.userId!, CREDIT_COSTS.landingPage);
  if (!creditCheck.allowed) {
    res.status(402).json({
      error: "Insufficient credits",
      required: CREDIT_COSTS.landingPage,
      current: creditCheck.creditsRemaining,
    });
    return;
  }

  const ctx = buildBusinessContext(parsed.data);

  const userPrompt = `Write complete landing page copy for this local service business:

${ctx}

Return this exact JSON structure:
{
  "hero": {
    "headline": "main headline, bold and specific, under 12 words",
    "subheadline": "supporting line that reinforces the offer, 1-2 sentences",
    "cta": "primary CTA button text"
  },
  "trustBar": {
    "items": ["3-5 short trust signals, e.g. '500+ 5-Star Reviews', 'Licensed & Insured', 'Same-Day Service'"]
  },
  "problem": {
    "heading": "heading that names the customer's pain point",
    "body": "2-3 sentences describing the problem the customer is facing"
  },
  "solution": {
    "heading": "heading positioning this business as the answer",
    "body": "2-3 sentences explaining how this business solves the problem",
    "bullets": ["4-5 specific benefit bullet points"]
  },
  "offer": {
    "heading": "headline for the offer section",
    "description": "2-3 sentences describing the offer in detail",
    "urgency": "1 sentence creating urgency or scarcity"
  },
  "testimonials": [
    {
      "quote": "realistic-sounding customer testimonial, 1-2 sentences",
      "name": "first name + last initial",
      "context": "e.g. 'Austin Homeowner' or 'Referred by neighbor'"
    }
  ],
  "faq": [
    {
      "question": "common question customers ask",
      "answer": "concise, reassuring answer"
    }
  ],
  "finalCta": {
    "heading": "closing section headline",
    "body": "1-2 sentences of final persuasion",
    "cta": "final CTA button text"
  }
}

Generate 3 testimonials and 4 FAQ items.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 8192,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You are an expert landing page copywriter for local service businesses. Return valid JSON only.",
      },
      { role: "user", content: userPrompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const result = JSON.parse(raw);

  res.json(result);
});

// ─── POST /generate/headlines ─────────────────────────────────────────────────
// Returns N compelling headlines

router.post("/generate/headlines", requireAuth, async (req, res): Promise<void> => {
  const parsed = HeadlinesRequest.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const creditCheck = await deductCredits(req.userId!, CREDIT_COSTS.headlines);
  if (!creditCheck.allowed) {
    res.status(402).json({
      error: "Insufficient credits",
      required: CREDIT_COSTS.headlines,
      current: creditCheck.creditsRemaining,
    });
    return;
  }

  const ctx = buildBusinessContext(parsed.data);

  const userPrompt = `Generate ${parsed.data.count} high-converting ad headlines for this local service business:

${ctx}

Use a variety of proven headline formulas (curiosity, specificity, benefit, urgency, social proof, question, etc.).
Each headline should be under 10 words and work well on ${parsed.data.platform}.

Return this exact JSON:
{
  "headlines": [
    {
      "text": "the headline",
      "formula": "name of the formula used (e.g. Specificity, Urgency, Benefit-led, Social Proof, Question)"
    }
  ]
}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 2048,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You are a direct-response copywriter expert. Return valid JSON only.",
      },
      { role: "user", content: userPrompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const result = JSON.parse(raw);

  res.json(result);
});

// ─── POST /generate/ctas ─────────────────────────────────────────────────────
// Returns N call-to-action variations

router.post("/generate/ctas", requireAuth, async (req, res): Promise<void> => {
  const parsed = CTAsRequest.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const creditCheck = await deductCredits(req.userId!, CREDIT_COSTS.ctas);
  if (!creditCheck.allowed) {
    res.status(402).json({
      error: "Insufficient credits",
      required: CREDIT_COSTS.ctas,
      current: creditCheck.creditsRemaining,
    });
    return;
  }

  const ctx = buildBusinessContext(parsed.data);

  const userPrompt = `Generate ${parsed.data.count} compelling call-to-action (CTA) button texts for this local service business:

${ctx}

CTAs should be action-oriented, specific, and create a sense of low friction or value. 
Avoid generic CTAs like "Click Here" or "Learn More".

Return this exact JSON:
{
  "ctas": [
    {
      "text": "CTA button text (2-6 words)",
      "intent": "what this CTA triggers (e.g. 'Book a free estimate', 'Claim the discount', 'Get a callback')"
    }
  ]
}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 1024,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You are a conversion optimization expert. Return valid JSON only.",
      },
      { role: "user", content: userPrompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const result = JSON.parse(raw);

  res.json(result);
});

// ─── POST /generate/follow-up ─────────────────────────────────────────────────
// Returns follow-up message templates (email and/or SMS)

router.post("/generate/follow-up", requireAuth, async (req, res): Promise<void> => {
  const parsed = FollowUpRequest.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const creditCheck = await deductCredits(req.userId!, CREDIT_COSTS.followUp);
  if (!creditCheck.allowed) {
    res.status(402).json({
      error: "Insufficient credits",
      required: CREDIT_COSTS.followUp,
      current: creditCheck.creditsRemaining,
    });
    return;
  }

  const ctx = buildBusinessContext(parsed.data);
  const channel = parsed.data.channel;
  const count = parsed.data.count;

  const channelInstructions =
    channel === "sms"
      ? "SMS messages only (under 160 characters each)"
      : channel === "email"
        ? "email messages only (subject line + short body)"
        : "both email and SMS messages";

  const userPrompt = `Generate ${count} follow-up message templates (${channelInstructions}) for leads who have shown interest in this local service business:

${ctx}

These messages are sent after someone fills out a lead form or requests a quote. 
Sequence them across different timing (e.g. immediate, 24h later, 72h later).

Return this exact JSON:
{
  "messages": [
    {
      "timing": "when to send this (e.g. 'Immediately', '24 hours later', '3 days later')",
      "channel": "email or sms",
      "subject": "email subject line (only for email messages, omit for SMS)",
      "body": "the message body. For SMS keep under 160 characters. For email write 3-5 short paragraphs.",
      "purpose": "what this message is designed to do (e.g. confirm interest, add urgency, offer alternative)"
    }
  ]
}

${channel === "both" ? `Generate ${Math.ceil(count / 2)} email and ${Math.floor(count / 2)} SMS messages, alternating.` : ""}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a sales follow-up specialist for home service businesses. Write messages that are personal, not salesy. Return valid JSON only.",
      },
      { role: "user", content: userPrompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const result = JSON.parse(raw);

  res.json(result);
});

// ─── POST /generate/email-campaign ───────────────────────────────────────────
// Returns complete marketing email copy from an offer

const EmailCampaignRequest = BusinessContext.extend({
  offerDescription: z.string().min(1),
});

router.post("/generate/email-campaign", requireAuth, async (req, res): Promise<void> => {
  const parsed = EmailCampaignRequest.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const creditCheck = await deductCredits(req.userId!, CREDIT_COSTS.emailCampaign);
  if (!creditCheck.allowed) {
    res.status(402).json({
      error: "Insufficient credits",
      required: CREDIT_COSTS.emailCampaign,
      current: creditCheck.creditsRemaining,
    });
    return;
  }

  const ctx = buildBusinessContext(parsed.data);

  const userPrompt = `Write a complete permission-based marketing email for this local service business:

${ctx}

Offer / Campaign Context:
${parsed.data.offerDescription}

This email will be sent to opted-in subscribers who requested to hear from this business.
Write in a warm, professional tone appropriate for a local service business owner reaching out to past or interested customers.
The copy should feel personal, not automated or spammy.

Return this exact JSON structure:
{
  "subject": "best subject line, under 60 characters",
  "subjectVariations": ["variation 1 - curiosity angle", "variation 2 - urgency/deadline angle", "variation 3 - benefit-first angle"],
  "previewText": "preview/preheader text shown after subject in inbox, under 90 characters, different from subject",
  "headline": "best email body headline, punchy and benefit-focused, under 12 words",
  "headlineVariations": ["variation 1", "variation 2", "variation 3"],
  "body": "full email body text, 3-4 short paragraphs, conversational and specific to the offer, naturally leads to the CTA. Each paragraph separated by \\n\\n. No HTML tags.",
  "ctaText": "best CTA button text, 2-5 words, action-oriented",
  "ctaVariations": ["variation 1", "variation 2", "variation 3"]
}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 2048,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are an email marketing specialist for local home service businesses. You write permission-based marketing emails that feel personal and drive real action. Return valid JSON only.",
      },
      { role: "user", content: userPrompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const result = JSON.parse(raw);

  res.json(result);
});

export default router;
