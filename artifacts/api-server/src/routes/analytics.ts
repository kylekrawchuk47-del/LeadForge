import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { eq, count, sum, gte, lte, and, sql, desc, lt } from "drizzle-orm";
import {
  db,
  contactsTable,
  emailCampaignsTable,
  projectsTable,
  analyticsEventsTable,
  creditTransactionsTable,
  usersTable,
  EVENT_CATEGORY_MAP,
  type AnalyticsEventType,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { logger } from "../lib/logger";
import {
  trackInternalEvent as svcTrackInternal,
  trackBusinessEvent as svcTrackBusiness,
  getBusinessAnalyticsOverview,
  getCampaignAnalytics,
  getInternalAnalyticsSummary,
} from "../lib/analytics-service";

async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const [user] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, req.userId!));
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Forbidden — admin access required" });
    return;
  }
  next();
}

const router: IRouter = Router();

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function startOfLastMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}
function endOfLastMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 0, 23, 59, 59, 999);
}
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

// GET /api/analytics/overview — summary cards
router.get("/analytics/overview", requireAuth, async (req, res): Promise<void> => {
  try {
    const userId = req.userId!;
    const now = new Date();
    const som = startOfMonth(now);
    const solm = startOfLastMonth(now);
    const eolm = endOfLastMonth(now);

    const [[leadsThisMonth], [leadsLastMonth], [totalContacts], emailStats, [totalCampaigns], [pageViews], [creditsUsed]] =
      await Promise.all([
        db.select({ count: count() }).from(contactsTable)
          .where(and(eq(contactsTable.userId, userId), gte(contactsTable.dateAdded, som))),
        db.select({ count: count() }).from(contactsTable)
          .where(and(eq(contactsTable.userId, userId), gte(contactsTable.dateAdded, solm), lte(contactsTable.dateAdded, eolm))),
        db.select({ count: count() }).from(contactsTable)
          .where(eq(contactsTable.userId, userId)),
        db.select({
          emailsSent: sum(emailCampaignsTable.recipientCount),
          emailsOpened: sum(emailCampaignsTable.openedCount),
          emailsClicked: sum(emailCampaignsTable.clickedCount),
        }).from(emailCampaignsTable)
          .where(and(eq(emailCampaignsTable.userId, userId), gte(emailCampaignsTable.sentAt, som))),
        db.select({ count: count() }).from(projectsTable)
          .where(eq(projectsTable.userId, userId)),
        db.select({ count: count() }).from(analyticsEventsTable)
          .where(and(
            eq(analyticsEventsTable.userId, userId),
            eq(analyticsEventsTable.eventType, "landing_page_viewed"),
            gte(analyticsEventsTable.createdAt, som),
          )),
        db.select({ total: sum(creditTransactionsTable.amount) })
          .from(creditTransactionsTable)
          .where(and(
            eq(creditTransactionsTable.clerkUserId, userId),
            lt(creditTransactionsTable.amount, 0),
            gte(creditTransactionsTable.createdAt, som),
          )),
      ]);

    const emailsSentThisMonth = Number(emailStats[0]?.emailsSent ?? 0);
    const emailsOpenedThisMonth = Number(emailStats[0]?.emailsOpened ?? 0);
    const openRate = emailsSentThisMonth > 0
      ? Math.round((emailsOpenedThisMonth / emailsSentThisMonth) * 100)
      : 0;

    const conversionRate = pageViews.count > 0
      ? Math.round((leadsThisMonth.count / pageViews.count) * 1000) / 10
      : 0;

    res.json({
      leadsThisMonth: leadsThisMonth.count,
      leadsLastMonth: leadsLastMonth.count,
      pageVisitsThisMonth: pageViews.count,
      conversionRate,
      emailsSentThisMonth,
      emailsOpenedThisMonth,
      openRate,
      totalContacts: totalContacts.count,
      totalCampaigns: totalCampaigns.count,
      creditsUsedThisMonth: Math.abs(Number(creditsUsed?.total ?? 0)),
    });
  } catch (err) {
    logger.error({ err }, "Error fetching analytics overview");
    res.status(500).json({ error: "Failed to fetch overview" });
  }
});

// GET /api/analytics/timeline — leads + page views per day (last 30 days)
router.get("/analytics/timeline", requireAuth, async (req, res): Promise<void> => {
  try {
    const userId = req.userId!;
    const since = daysAgo(29);

    const [leadRows, viewRows] = await Promise.all([
      db.execute(sql`
        SELECT DATE(date_added AT TIME ZONE 'UTC') AS day, COUNT(*)::int AS leads
        FROM contacts
        WHERE user_id = ${userId} AND date_added >= ${since}
        GROUP BY day
        ORDER BY day ASC
      `),
      db.execute(sql`
        SELECT DATE(created_at AT TIME ZONE 'UTC') AS day, COUNT(*)::int AS views
        FROM analytics_events
        WHERE user_id = ${userId}
          AND event_type = 'landing_page_viewed'
          AND created_at >= ${since}
        GROUP BY day
        ORDER BY day ASC
      `),
    ]);

    // Build a map for the last 30 days
    const dayMap: Record<string, { date: string; leads: number; views: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dayMap[key] = { date: key, leads: 0, views: 0 };
    }

    for (const row of leadRows.rows as { day: string; leads: number }[]) {
      const key = String(row.day).slice(0, 10);
      if (dayMap[key]) dayMap[key].leads = row.leads;
    }
    for (const row of viewRows.rows as { day: string; views: number }[]) {
      const key = String(row.day).slice(0, 10);
      if (dayMap[key]) dayMap[key].views = row.views;
    }

    res.json({ timeline: Object.values(dayMap) });
  } catch (err) {
    logger.error({ err }, "Error fetching analytics timeline");
    res.status(500).json({ error: "Failed to fetch timeline" });
  }
});

// GET /api/analytics/lead-sources — contacts grouped by source
router.get("/analytics/lead-sources", requireAuth, async (req, res): Promise<void> => {
  try {
    const userId = req.userId!;
    const rows = await db.execute(sql`
      SELECT
        COALESCE(source, 'manual') AS source,
        COUNT(*)::int AS count
      FROM contacts
      WHERE user_id = ${userId}
      GROUP BY source
      ORDER BY count DESC
    `);

    res.json({ sources: rows.rows });
  } catch (err) {
    logger.error({ err }, "Error fetching lead sources");
    res.status(500).json({ error: "Failed to fetch lead sources" });
  }
});

// GET /api/analytics/email-performance — email campaigns with metrics
router.get("/analytics/email-performance", requireAuth, async (req, res): Promise<void> => {
  try {
    const userId = req.userId!;
    const campaigns = await db
      .select({
        id: emailCampaignsTable.id,
        name: emailCampaignsTable.name,
        status: emailCampaignsTable.status,
        sentAt: emailCampaignsTable.sentAt,
        recipientCount: emailCampaignsTable.recipientCount,
        deliveredCount: emailCampaignsTable.deliveredCount,
        openedCount: emailCampaignsTable.openedCount,
        clickedCount: emailCampaignsTable.clickedCount,
        unsubscribedCount: emailCampaignsTable.unsubscribedCount,
      })
      .from(emailCampaignsTable)
      .where(eq(emailCampaignsTable.userId, userId))
      .orderBy(desc(emailCampaignsTable.createdAt))
      .limit(20);

    const formatted = campaigns.map((c) => ({
      ...c,
      openRate: c.recipientCount > 0
        ? Math.round((c.openedCount / c.recipientCount) * 1000) / 10
        : 0,
      clickRate: c.recipientCount > 0
        ? Math.round((c.clickedCount / c.recipientCount) * 1000) / 10
        : 0,
    }));

    res.json({ campaigns: formatted });
  } catch (err) {
    logger.error({ err }, "Error fetching email performance");
    res.status(500).json({ error: "Failed to fetch email performance" });
  }
});

// GET /api/analytics/campaigns — campaign/project list with per-project analytics
router.get("/analytics/campaigns", requireAuth, async (req, res): Promise<void> => {
  try {
    const userId = req.userId!;

    const [projects, eventRows] = await Promise.all([
      db.select({
        id: projectsTable.id,
        businessName: projectsTable.businessName,
        businessType: projectsTable.businessType,
        serviceOffered: projectsTable.serviceOffered,
        city: projectsTable.city,
        createdAt: projectsTable.createdAt,
      }).from(projectsTable)
        .where(eq(projectsTable.userId, userId))
        .orderBy(desc(projectsTable.createdAt))
        .limit(20),
      db.execute(sql`
        SELECT project_id, event_type, COUNT(*)::int AS cnt
        FROM analytics_events
        WHERE user_id = ${userId}
          AND project_id IS NOT NULL
        GROUP BY project_id, event_type
      `),
    ]);

    type EventRow = { project_id: number; event_type: string; cnt: number };
    const eventMap = new Map<number, Record<string, number>>();
    for (const row of eventRows.rows as EventRow[]) {
      if (!eventMap.has(row.project_id)) eventMap.set(row.project_id, {});
      eventMap.get(row.project_id)![row.event_type] = row.cnt;
    }

    const result = projects.map((p) => {
      const events = eventMap.get(p.id) ?? {};
      return {
        ...p,
        pageViews: events["landing_page_viewed"] ?? 0,
        ctaClicks: events["campaign_cta_clicked"] ?? 0,
        formSubmissions: events["form_submitted"] ?? 0,
      };
    });

    res.json({ campaigns: result });
  } catch (err) {
    logger.error({ err }, "Error fetching campaign analytics");
    res.status(500).json({ error: "Failed to fetch campaign analytics" });
  }
});

// GET /api/analytics/funnel — conversion funnel (views → lead_captured → form_submitted)
router.get("/analytics/funnel", requireAuth, async (req, res): Promise<void> => {
  try {
    const userId = req.userId!;
    const since = daysAgo(29);

    const rows = await db.execute(sql`
      SELECT
        event_type,
        COUNT(*)::int AS cnt
      FROM analytics_events
      WHERE user_id = ${userId}
        AND created_at >= ${since}
        AND event_type IN ('landing_page_viewed','campaign_generated','lead_captured','form_submitted','campaign_cta_clicked')
      GROUP BY event_type
    `);

    const map: Record<string, number> = {};
    for (const row of rows.rows as { event_type: string; cnt: number }[]) {
      map[row.event_type] = row.cnt;
    }

    res.json({
      pageViews: map["landing_page_viewed"] ?? 0,
      campaignViews: map["campaign_generated"] ?? 0,
      ctaClicks: map["campaign_cta_clicked"] ?? 0,
      leadsCaputred: map["lead_captured"] ?? 0,
      formSubmissions: map["form_submitted"] ?? 0,
    });
  } catch (err) {
    logger.error({ err }, "Error fetching funnel");
    res.status(500).json({ error: "Failed to fetch funnel" });
  }
});

// GET /api/analytics/credits — credit usage over time (last 30 days)
router.get("/analytics/credits", requireAuth, async (req, res): Promise<void> => {
  try {
    const userId = req.userId!;
    const since = daysAgo(29);

    const [usageRows, [totalUsed], [totalAdded]] = await Promise.all([
      db.execute(sql`
        SELECT DATE(created_at AT TIME ZONE 'UTC') AS day, SUM(ABS(amount))::int AS used
        FROM credit_transactions
        WHERE clerk_user_id = ${userId}
          AND amount < 0
          AND type = 'USAGE'
          AND created_at >= ${since}
        GROUP BY day
        ORDER BY day ASC
      `),
      db.select({ total: sum(creditTransactionsTable.amount) })
        .from(creditTransactionsTable)
        .where(and(
          eq(creditTransactionsTable.clerkUserId, userId),
          lt(creditTransactionsTable.amount, 0),
          gte(creditTransactionsTable.createdAt, daysAgo(29)),
        )),
      db.select({ total: sum(creditTransactionsTable.amount) })
        .from(creditTransactionsTable)
        .where(and(
          eq(creditTransactionsTable.clerkUserId, userId),
          gte(creditTransactionsTable.amount, 0),
          gte(creditTransactionsTable.createdAt, daysAgo(29)),
        )),
    ]);

    // Build 30-day map
    const dayMap: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dayMap[d.toISOString().slice(0, 10)] = 0;
    }
    for (const row of usageRows.rows as { day: string; used: number }[]) {
      const key = String(row.day).slice(0, 10);
      if (dayMap[key] !== undefined) dayMap[key] = row.used;
    }

    res.json({
      timeline: Object.entries(dayMap).map(([date, used]) => ({ date, used })),
      totalUsedThisMonth: Math.abs(Number(totalUsed?.total ?? 0)),
      totalAddedThisMonth: Number(totalAdded?.total ?? 0),
    });
  } catch (err) {
    logger.error({ err }, "Error fetching credit analytics");
    res.status(500).json({ error: "Failed to fetch credit analytics" });
  }
});

// GET /api/analytics/activity — recent event feed (last 20 events)
router.get("/analytics/activity", requireAuth, async (req, res): Promise<void> => {
  try {
    const userId = req.userId!;

    const events = await db
      .select({
        id: analyticsEventsTable.id,
        eventType: analyticsEventsTable.eventType,
        source: analyticsEventsTable.source,
        projectId: analyticsEventsTable.projectId,
        metadata: analyticsEventsTable.metadata,
        createdAt: analyticsEventsTable.createdAt,
      })
      .from(analyticsEventsTable)
      .where(eq(analyticsEventsTable.userId, userId))
      .orderBy(desc(analyticsEventsTable.createdAt))
      .limit(20);

    res.json({ events });
  } catch (err) {
    logger.error({ err }, "Error fetching activity feed");
    res.status(500).json({ error: "Failed to fetch activity" });
  }
});

// POST /api/analytics/track — public endpoint for tracking custom events
// (used by embedded landing page snippets or other client-side tracking)
router.post("/analytics/track", requireAuth, async (req, res): Promise<void> => {
  try {
    const { eventType, projectId, sessionId, source, medium, campaign, referrer, metadata } = req.body as {
      eventType: string;
      projectId?: number;
      sessionId?: string;
      source?: string;
      medium?: string;
      campaign?: string;
      referrer?: string;
      metadata?: Record<string, unknown>;
    };

    if (!eventType) {
      res.status(400).json({ error: "eventType is required" });
      return;
    }

    const eventCategory = EVENT_CATEGORY_MAP[eventType as AnalyticsEventType] ?? null;

    await db.insert(analyticsEventsTable).values({
      userId: req.userId!,
      eventType,
      eventCategory,
      projectId: projectId ?? null,
      sessionId: sessionId ?? null,
      source: source ?? null,
      medium: medium ?? null,
      campaign: campaign ?? null,
      referrer: referrer ?? null,
      metadata: metadata ?? null,
    });

    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Error tracking analytics event");
    res.status(500).json({ error: "Failed to track event" });
  }
});

// POST /api/analytics/track-internal — structured internal funnel event via analytics-service
// (also writes to analytics_events with eventCategory set automatically)
router.post("/analytics/track-internal", requireAuth, async (req, res): Promise<void> => {
  try {
    const { eventName, projectId, metadata, source } = req.body as {
      eventName: string;
      projectId?: number;
      source?: string;
      metadata?: Record<string, unknown>;
    };

    if (!eventName) {
      res.status(400).json({ error: "eventName is required" });
      return;
    }

    await svcTrackInternal({
      userId: req.userId!,
      projectId: projectId ?? null,
      eventName: eventName as Parameters<typeof svcTrackInternal>[0]["eventName"],
      source: source ?? "app",
      metadata,
    });

    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Error tracking internal event");
    res.status(500).json({ error: "Failed to track event" });
  }
});

// POST /api/analytics/track-business — public endpoint for landing page / embed tracking
// (no auth required — userId is optional, passed from the embed snippet)
router.post("/analytics/track-business", async (req, res): Promise<void> => {
  try {
    const { userId, projectId, eventName, source, metadata, occurredOn } = req.body as {
      userId?: string;
      projectId?: number;
      eventName: string;
      source?: string;
      metadata?: Record<string, unknown>;
      occurredOn?: string;
    };

    if (!eventName) {
      res.status(400).json({ error: "eventName is required" });
      return;
    }
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    await svcTrackBusiness({
      userId,
      projectId: projectId ?? null,
      eventName: eventName as Parameters<typeof svcTrackBusiness>[0]["eventName"],
      source: source as Parameters<typeof svcTrackBusiness>[0]["source"],
      metadata,
      occurredOn,
    });

    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Error tracking business event");
    res.status(500).json({ error: "Failed to track event" });
  }
});

// GET /api/analytics/business-summary — aggregated business analytics from daily rollup tables
router.get("/analytics/business-summary", requireAuth, async (req, res): Promise<void> => {
  try {
    const userId = req.userId!;
    const from = String(req.query.from ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
    const to   = String(req.query.to   ?? new Date().toISOString().slice(0, 10));

    const [overview, campaigns] = await Promise.all([
      getBusinessAnalyticsOverview({ userId, from, to }),
      getCampaignAnalytics({ userId, from, to }),
    ]);

    res.json({ overview, campaigns });
  } catch (err) {
    logger.error({ err }, "Error fetching business analytics summary");
    res.status(500).json({ error: "Failed to fetch business analytics" });
  }
});

// GET /api/analytics/internal-summary — admin-only platform funnel summary
router.get("/analytics/internal-summary", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  try {
    const from = new Date(String(req.query.from ?? new Date(Date.now() - 30 * 86400000).toISOString()));
    const to   = new Date(String(req.query.to   ?? new Date().toISOString()));

    const summary = await getInternalAnalyticsSummary({ from, to });
    res.json(summary);
  } catch (err) {
    logger.error({ err }, "Error fetching internal analytics summary");
    res.status(500).json({ error: "Failed to fetch internal summary" });
  }
});

export default router;
