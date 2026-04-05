import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { db, emailCampaignsTable, contactsTable, analyticsEventsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

const CampaignBody = z.object({
  name: z.string().min(1),
  status: z.enum(["draft", "scheduled", "sent"]).optional().default("draft"),
  subject: z.string().optional().default(""),
  previewText: z.string().optional().default(""),
  headline: z.string().optional().default(""),
  body: z.string().optional().default(""),
  ctaText: z.string().optional().default(""),
  ctaUrl: z.string().optional().default(""),
  offerContext: z.string().optional().default(""),
  segment: z.enum(["subscribed", "all_consented"]).optional().default("subscribed"),
  scheduledAt: z.string().optional(),
});

// GET /api/email-campaigns — list all campaigns
router.get("/email-campaigns", requireAuth, async (req, res): Promise<void> => {
  const campaigns = await db
    .select()
    .from(emailCampaignsTable)
    .where(eq(emailCampaignsTable.userId, req.userId!))
    .orderBy(desc(emailCampaignsTable.createdAt));

  res.json(campaigns);
});

// GET /api/email-campaigns/:id — campaign detail
router.get("/email-campaigns/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid campaign ID" });
    return;
  }

  const [campaign] = await db
    .select()
    .from(emailCampaignsTable)
    .where(and(eq(emailCampaignsTable.id, id), eq(emailCampaignsTable.userId, req.userId!)));

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  res.json(campaign);
});

// POST /api/email-campaigns — create campaign
router.post("/email-campaigns", requireAuth, async (req, res): Promise<void> => {
  const parsed = CampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const { scheduledAt, ...rest } = parsed.data;

  const [campaign] = await db
    .insert(emailCampaignsTable)
    .values({
      ...rest,
      userId: req.userId!,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    })
    .returning();

  // Fire analytics event: email campaign created (internal event)
  db.insert(analyticsEventsTable).values({
    userId: req.userId!,
    eventType: "email_campaign_created",
    eventCategory: "internal",
    metadata: { campaignId: campaign.id, campaignName: campaign.name, status: campaign.status },
  }).catch(() => undefined);

  res.status(201).json(campaign);
});

// PUT /api/email-campaigns/:id — update campaign
router.put("/email-campaigns/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid campaign ID" });
    return;
  }

  const parsed = CampaignBody.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const { scheduledAt, ...rest } = parsed.data;

  const [campaign] = await db
    .update(emailCampaignsTable)
    .set({
      ...rest,
      ...(scheduledAt !== undefined ? { scheduledAt: scheduledAt ? new Date(scheduledAt) : null } : {}),
    })
    .where(and(eq(emailCampaignsTable.id, id), eq(emailCampaignsTable.userId, req.userId!)))
    .returning();

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  res.json(campaign);
});

// POST /api/email-campaigns/:id/send — mark campaign as sent
router.post("/email-campaigns/:id/send", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid campaign ID" });
    return;
  }

  // Count eligible recipients based on segment
  const [campaign] = await db
    .select()
    .from(emailCampaignsTable)
    .where(and(eq(emailCampaignsTable.id, id), eq(emailCampaignsTable.userId, req.userId!)));

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  const allContacts = await db
    .select()
    .from(contactsTable)
    .where(eq(contactsTable.userId, req.userId!));

  const eligibleContacts = allContacts.filter(c => {
    if (campaign.segment === "subscribed") return c.consentStatus === "subscribed";
    return c.consentStatus === "subscribed" || c.consentStatus === "transactional_only";
  });

  const [updated] = await db
    .update(emailCampaignsTable)
    .set({
      status: "sent",
      sentAt: new Date(),
      recipientCount: eligibleContacts.length,
      deliveredCount: eligibleContacts.length,
    })
    .where(and(eq(emailCampaignsTable.id, id), eq(emailCampaignsTable.userId, req.userId!)))
    .returning();

  // Fire analytics event: email sent (business event)
  db.insert(analyticsEventsTable).values({
    userId: req.userId!,
    eventType: "email_sent",
    eventCategory: "business",
    metadata: {
      emailCampaignId: id,
      campaignName: campaign.name,
      recipientCount: eligibleContacts.length,
      segment: campaign.segment,
    },
  }).catch(() => undefined);

  res.json(updated);
});

// DELETE /api/email-campaigns/:id — delete campaign
router.delete("/email-campaigns/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid campaign ID" });
    return;
  }

  const [campaign] = await db
    .delete(emailCampaignsTable)
    .where(and(eq(emailCampaignsTable.id, id), eq(emailCampaignsTable.userId, req.userId!)))
    .returning();

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
