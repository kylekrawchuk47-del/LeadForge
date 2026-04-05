import { and, eq, gte, lte, sql, desc } from "drizzle-orm";
import {
  db,
  analyticsEventsTable,
  businessAnalyticsDailyTable,
  campaignAnalyticsDailyTable,
} from "@workspace/db";
import type { InternalEventName, BusinessEventName, LeadSource } from "@workspace/db";

function todayString(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

// ─── Internal event tracking (platform funnel) ────────────────────────────────

export async function trackInternalEvent(params: {
  userId: string;
  projectId?: number | null;
  eventName: InternalEventName;
  source?: string;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(analyticsEventsTable).values({
    userId: params.userId,
    eventType: params.eventName,
    eventCategory: "internal",
    projectId: params.projectId ?? null,
    source: params.source ?? "app",
    metadata: params.metadata ?? {},
  });
}

// ─── Business event tracking (customer-facing lead funnel) ───────────────────

export async function trackBusinessEvent(params: {
  userId: string;
  projectId?: number | null;
  eventName: BusinessEventName;
  source?: LeadSource;
  metadata?: Record<string, unknown>;
  occurredOn?: string;
}) {
  const day = params.occurredOn ?? todayString();

  await db.insert(analyticsEventsTable).values({
    userId: params.userId,
    eventType: params.eventName,
    eventCategory: "business",
    projectId: params.projectId ?? null,
    source: params.source ?? "direct",
    metadata: params.metadata ?? {},
  });

  await upsertBusinessDaily(params.userId, day, params.eventName, params.source);

  if (params.projectId != null) {
    await upsertCampaignDaily(
      params.projectId,
      params.userId,
      day,
      params.eventName,
      params.source
    );
  }
}

// ─── Daily rollup upserts ─────────────────────────────────────────────────────

async function upsertBusinessDaily(
  userId: string,
  day: string,
  eventName: BusinessEventName,
  source?: LeadSource
) {
  await db
    .insert(businessAnalyticsDailyTable)
    .values({ userId, day })
    .onConflictDoNothing();

  const t = businessAnalyticsDailyTable;
  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (eventName === "landing_page_viewed") {
    updates.landingPageViews = sql`${t.landingPageViews} + 1`;
  }
  if (eventName === "form_started") {
    updates.formStarts = sql`${t.formStarts} + 1`;
  }
  if (eventName === "form_submitted") {
    updates.formSubmissions = sql`${t.formSubmissions} + 1`;
  }
  if (eventName === "lead_captured") {
    updates.leadsCaptured = sql`${t.leadsCaptured} + 1`;
    if (source === "facebook")  updates.facebookLeads  = sql`${t.facebookLeads}  + 1`;
    if (source === "instagram") updates.instagramLeads = sql`${t.instagramLeads} + 1`;
    if (source === "google")    updates.googleLeads    = sql`${t.googleLeads}    + 1`;
    if (source === "email")     updates.emailLeads     = sql`${t.emailLeads}     + 1`;
    if (source === "direct")    updates.directLeads    = sql`${t.directLeads}    + 1`;
    if (source === "referral")  updates.referralLeads  = sql`${t.referralLeads}  + 1`;
  }
  if (eventName === "email_sent")          updates.emailsSent    = sql`${t.emailsSent}    + 1`;
  if (eventName === "email_opened")        updates.emailOpens    = sql`${t.emailOpens}    + 1`;
  if (eventName === "email_clicked")       updates.emailClicks   = sql`${t.emailClicks}   + 1`;
  if (eventName === "unsubscribe_clicked") updates.unsubscribes  = sql`${t.unsubscribes}  + 1`;

  await db
    .update(t)
    .set(updates)
    .where(and(eq(t.userId, userId), eq(t.day, day)));
}

async function upsertCampaignDaily(
  projectId: number,
  userId: string,
  day: string,
  eventName: BusinessEventName,
  source?: LeadSource
) {
  await db
    .insert(campaignAnalyticsDailyTable)
    .values({ projectId, userId, day })
    .onConflictDoNothing();

  const t = campaignAnalyticsDailyTable;
  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (eventName === "landing_page_viewed") updates.visits = sql`${t.visits} + 1`;
  if (eventName === "lead_captured") {
    updates.leads = sql`${t.leads} + 1`;
    if (source === "facebook")  updates.sourceFacebook  = sql`${t.sourceFacebook}  + 1`;
    if (source === "instagram") updates.sourceInstagram = sql`${t.sourceInstagram} + 1`;
    if (source === "google")    updates.sourceGoogle    = sql`${t.sourceGoogle}    + 1`;
    if (source === "email")     updates.sourceEmail     = sql`${t.sourceEmail}     + 1`;
    if (source === "direct")    updates.sourceDirect    = sql`${t.sourceDirect}    + 1`;
    if (source === "referral")  updates.sourceReferral  = sql`${t.sourceReferral}  + 1`;
  }
  if (eventName === "email_sent")    updates.emailSent    = sql`${t.emailSent}    + 1`;
  if (eventName === "email_opened")  updates.emailOpened  = sql`${t.emailOpened}  + 1`;
  if (eventName === "email_clicked") updates.emailClicked = sql`${t.emailClicked} + 1`;

  await db
    .update(t)
    .set(updates)
    .where(and(eq(t.projectId, projectId), eq(t.day, day)));
}

// ─── Query helpers ────────────────────────────────────────────────────────────

export async function getBusinessAnalyticsOverview(params: {
  userId: string;
  from: string;
  to: string;
}) {
  const t = businessAnalyticsDailyTable;
  const rows = await db
    .select({
      day: t.day,
      landingPageViews: t.landingPageViews,
      formStarts: t.formStarts,
      formSubmissions: t.formSubmissions,
      leadsCaptured: t.leadsCaptured,
      emailsSent: t.emailsSent,
      emailOpens: t.emailOpens,
      emailClicks: t.emailClicks,
      unsubscribes: t.unsubscribes,
      facebookLeads: t.facebookLeads,
      instagramLeads: t.instagramLeads,
      googleLeads: t.googleLeads,
      emailLeads: t.emailLeads,
      directLeads: t.directLeads,
      referralLeads: t.referralLeads,
    })
    .from(t)
    .where(and(eq(t.userId, params.userId), gte(t.day, params.from), lte(t.day, params.to)))
    .orderBy(t.day);

  const zero = {
    landingPageViews: 0, formStarts: 0, formSubmissions: 0, leadsCaptured: 0,
    emailsSent: 0, emailOpens: 0, emailClicks: 0, unsubscribes: 0,
    facebookLeads: 0, instagramLeads: 0, googleLeads: 0,
    emailLeads: 0, directLeads: 0, referralLeads: 0,
  };

  const totals = rows.reduce((acc, row) => {
    for (const key of Object.keys(zero) as (keyof typeof zero)[]) {
      acc[key] += row[key];
    }
    return acc;
  }, { ...zero });

  const conversionRate = totals.landingPageViews > 0
    ? Number(((totals.leadsCaptured / totals.landingPageViews) * 100).toFixed(1))
    : 0;
  const emailOpenRate = totals.emailsSent > 0
    ? Number(((totals.emailOpens / totals.emailsSent) * 100).toFixed(1))
    : 0;
  const emailClickRate = totals.emailsSent > 0
    ? Number(((totals.emailClicks / totals.emailsSent) * 100).toFixed(1))
    : 0;

  return {
    totals: { ...totals, conversionRate, emailOpenRate, emailClickRate },
    timeseries: rows,
  };
}

export async function getCampaignAnalytics(params: {
  userId: string;
  from: string;
  to: string;
}) {
  const t = campaignAnalyticsDailyTable;
  return db
    .select({
      projectId: t.projectId,
      day: t.day,
      visits: t.visits,
      leads: t.leads,
      emailSent: t.emailSent,
      emailOpened: t.emailOpened,
      emailClicked: t.emailClicked,
      sourceFacebook: t.sourceFacebook,
      sourceInstagram: t.sourceInstagram,
      sourceGoogle: t.sourceGoogle,
      sourceEmail: t.sourceEmail,
      sourceDirect: t.sourceDirect,
      sourceReferral: t.sourceReferral,
    })
    .from(t)
    .where(and(eq(t.userId, params.userId), gte(t.day, params.from), lte(t.day, params.to)))
    .orderBy(desc(t.day));
}

export async function getInternalAnalyticsSummary(params: {
  from: Date;
  to: Date;
}) {
  const t = analyticsEventsTable;
  const rows = await db
    .select({ eventType: t.eventType, createdAt: t.createdAt })
    .from(t)
    .where(
      and(
        eq(t.eventCategory, "internal"),
        gte(t.createdAt, params.from),
        lte(t.createdAt, params.to)
      )
    );

  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.eventType] = (acc[row.eventType] ?? 0) + 1;
    return acc;
  }, {});

  return {
    totalSignups:         counts.signup_completed    ?? 0,
    checkoutStarts:       counts.checkout_started    ?? 0,
    activeSubscriptions:  counts.subscription_active ?? 0,
    campaignGenerations:  counts.campaign_generated  ?? 0,
    pricingViews:         counts.pricing_viewed      ?? 0,
    upgradeClicks:        counts.upgrade_clicked     ?? 0,
    rawCounts: counts,
  };
}
