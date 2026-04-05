import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  adConnectionsTable,
  analyticsEventsTable,
  usersTable,
  adGenerationsTable,
  adCopiesTable,
  adProjectsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { logger } from "../lib/logger";
import { encryptToken, decryptToken } from "../lib/token-crypto";
import type { Request, Response, NextFunction } from "express";

const router: IRouter = Router();

// ─── Plan gating ──────────────────────────────────────────────────────────────

async function requirePaidPlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [user] = await db.select({ plan: usersTable.plan })
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, (req as any).userId));
    if (!user || user.plan === "free") {
      res.status(403).json({
        error: "Ad platform connections and campaign creation require a Pro or Agency plan.",
        code: "PLAN_UPGRADE_REQUIRED",
        upgradeTarget: "pro",
      });
      return;
    }
    next();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Platform = "meta" | "google";

type OAuthTokenSet = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
};

type UnifiedCampaignInput = {
  name: string;
  objective: string;
  dailyBudget?: number;
  totalBudget?: number;
  startTime?: string;
  endTime?: string;
  status?: "ACTIVE" | "PAUSED";
  geoTargets?: string[];
  businessType?: string;
  landingPageUrl?: string;
  headlineText?: string;
  descriptionText?: string;
};

type UnifiedReportRow = {
  campaignId: string;
  campaignName: string;
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  conversions: number;
  source: Platform;
};

type CreatedCampaign = {
  platform: Platform;
  campaignId: string;
  adSetId?: string;
  adGroupId?: string;
  adId?: string;
  creativeId?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEnv(name: string) { return process.env[name]; }

function requireEnv(...names: string[]) {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length) throw new Error(`Missing configuration: ${missing.join(", ")}. Please configure these in your environment settings.`);
}

function qs(params: Record<string, string | number | undefined>): string {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) out.set(k, String(v));
  }
  return out.toString();
}

async function httpJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  if (!res.ok) {
    // Extract the most useful error message from platform responses
    const msg =
      json?.error?.message ??        // Meta error format
      json?.error?.details?.[0]?.message ?? // Google error format
      json?.error ??
      `HTTP ${res.status} ${res.statusText}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return json as T;
}

// ─── Meta connector ───────────────────────────────────────────────────────────

const META_V = () => getEnv("META_API_VERSION") ?? "v25.0";

function metaAuthUrl(state: string): string {
  requireEnv("META_APP_ID", "META_REDIRECT_URI");
  return `https://www.facebook.com/${META_V()}/dialog/oauth?${qs({
    client_id: getEnv("META_APP_ID"),
    redirect_uri: getEnv("META_REDIRECT_URI"),
    state,
    scope: "ads_management,ads_read,business_management,pages_read_engagement",
    response_type: "code",
  })}`;
}

async function metaExchangeCode(code: string): Promise<OAuthTokenSet> {
  requireEnv("META_APP_ID", "META_APP_SECRET", "META_REDIRECT_URI");
  const token = await httpJson<any>(
    `https://graph.facebook.com/${META_V()}/oauth/access_token?${qs({
      client_id: getEnv("META_APP_ID"),
      client_secret: getEnv("META_APP_SECRET"),
      redirect_uri: getEnv("META_REDIRECT_URI"),
      code,
    })}`
  );
  return { accessToken: token.access_token, tokenType: token.token_type, expiresIn: token.expires_in };
}

async function metaGetAdAccounts(accessToken: string): Promise<Array<{ id: string; name: string }>> {
  const data = await httpJson<any>(
    `https://graph.facebook.com/${META_V()}/me/adaccounts?${qs({
      fields: "id,name,account_status,currency,timezone_name",
      access_token: accessToken,
    })}`
  );
  return (data?.data ?? []).map((a: any) => ({ id: a.id, name: a.name }));
}

async function metaFetchReport(accountId: string, accessToken: string, from: string, to: string): Promise<UnifiedReportRow[]> {
  const actId = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
  const data = await httpJson<any>(
    `https://graph.facebook.com/${META_V()}/${actId}/insights?${qs({
      level: "campaign",
      fields: "campaign_id,campaign_name,impressions,clicks,spend,ctr,actions",
      time_range: JSON.stringify({ since: from, until: to }),
      access_token: accessToken,
    })}`
  );
  return (data?.data ?? []).map((r: any) => ({
    campaignId: r.campaign_id,
    campaignName: r.campaign_name,
    impressions: Number(r.impressions || 0),
    clicks: Number(r.clicks || 0),
    spend: Number(r.spend || 0),
    ctr: Number(r.ctr || 0),
    conversions: Array.isArray(r.actions)
      ? r.actions.filter((a: any) => a.action_type === "lead" || a.action_type === "onsite_conversion.lead_grouped")
          .reduce((s: number, a: any) => s + Number(a.value || 0), 0)
      : 0,
    source: "meta" as Platform,
  }));
}

/**
 * Upload a base64 image to Meta's ad image library for the given ad account.
 * Accepts a data URL (data:image/png;base64,...) or raw base64 string.
 * Returns the image_hash which can be embedded in ad creatives.
 */
async function metaUploadImage(accountId: string, accessToken: string, imageDataUrl: string): Promise<string> {
  const actId = accountId.startsWith("act_") ? accountId : `act_${accountId}`;

  // Strip data URL prefix if present
  const base64 = imageDataUrl.includes(",") ? imageDataUrl.split(",")[1] : imageDataUrl;
  if (!base64) throw new Error("Image data is empty — cannot upload to Meta");
  const imageBuffer = Buffer.from(base64, "base64");

  const form = new FormData();
  form.append("access_token", accessToken);
  form.append("filename", new Blob([imageBuffer], { type: "image/png" }), "ad_image.png");

  const res = await fetch(`https://graph.facebook.com/${META_V()}/${actId}/adimages`, {
    method: "POST",
    body: form,
  });

  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }

  if (!res.ok) {
    const msg = json?.error?.message ?? `HTTP ${res.status} ${res.statusText}`;
    throw new Error(`Meta image upload failed: ${msg}`);
  }

  // Response shape: { images: { "ad_image.png": { hash: "...", url: "..." } } }
  const images: Record<string, { hash?: string; url?: string }> = json?.images ?? {};
  const firstKey = Object.keys(images)[0];
  const imageHash = firstKey ? images[firstKey]?.hash : undefined;
  if (!imageHash) throw new Error("Meta image upload succeeded but no image_hash was returned");

  logger.info({ actId, imageHash }, "Meta ad image uploaded");
  return imageHash;
}

/**
 * Full Meta campaign creation: Campaign → Ad Set → Ad Creative → Ad
 * Pass imageHash (from metaUploadImage) to include a real image in the creative.
 */
async function metaCreateCampaign(accountId: string, accessToken: string, input: UnifiedCampaignInput, imageHash?: string): Promise<CreatedCampaign> {
  const actId = accountId.startsWith("act_") ? accountId : `act_${accountId}`;
  const tok = `access_token=${encodeURIComponent(accessToken)}`;

  // 1. Campaign
  const campaign = await httpJson<any>(`https://graph.facebook.com/${META_V()}/${actId}/campaigns`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      name: input.name,
      objective: input.objective || "OUTCOME_LEADS",
      status: input.status || "PAUSED",
      special_ad_categories: "[]",
      access_token: accessToken,
    }),
  });
  const campaignId = String(campaign.id);

  // 2. Ad Set
  const adSetParams: Record<string, string> = {
    campaign_id: campaignId,
    name: `${input.name} — Ad Set`,
    daily_budget: String(Math.round((input.dailyBudget ?? 20) * 100)), // in cents
    billing_event: "IMPRESSIONS",
    optimization_goal: "LEAD_GENERATION",
    status: input.status || "PAUSED",
    access_token: accessToken,
  };
  if (input.startTime) adSetParams.start_time = input.startTime;
  if (input.endTime) adSetParams.end_time = input.endTime;

  const adSet = await httpJson<any>(`https://graph.facebook.com/${META_V()}/${actId}/adsets`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(adSetParams),
  });
  const adSetId = String(adSet.id);

  // 3. Ad Creative — include image_hash when available (from metaUploadImage)
  const headline = input.headlineText || input.name;
  const description = input.descriptionText || (input.businessType ? `${input.businessType} — ${input.objective}` : "Get more leads today");
  const linkUrl = input.landingPageUrl || "https://example.com";

  const linkData: Record<string, unknown> = {
    link: linkUrl,
    message: description,
    name: headline,
    call_to_action: { type: "LEARN_MORE" },
  };
  if (imageHash) linkData.image_hash = imageHash;

  const creative = await httpJson<any>(`https://graph.facebook.com/${META_V()}/${actId}/adcreatives`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `${input.name} — Creative`,
      object_story_spec: { link_data: linkData },
      access_token: accessToken,
    }),
  });
  const creativeId = String(creative.id);

  // 4. Ad
  const ad = await httpJson<any>(`https://graph.facebook.com/${META_V()}/${actId}/ads`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      name: `${input.name} — Ad`,
      adset_id: adSetId,
      creative: JSON.stringify({ creative_id: creativeId }),
      status: input.status || "PAUSED",
      access_token: accessToken,
    }),
  });
  const adId = String(ad.id);

  return { platform: "meta", campaignId, adSetId, adId, creativeId };
}

// ─── Google connector ─────────────────────────────────────────────────────────

const GOOGLE_V = () => getEnv("GOOGLE_ADS_API_VERSION") ?? "v19";

function googleAuthUrl(state: string): string {
  requireEnv("GOOGLE_CLIENT_ID", "GOOGLE_REDIRECT_URI");
  return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
    client_id: getEnv("GOOGLE_CLIENT_ID")!,
    redirect_uri: getEnv("GOOGLE_REDIRECT_URI")!,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: "https://www.googleapis.com/auth/adwords",
    state,
  })}`;
}

async function googleExchangeCode(code: string): Promise<OAuthTokenSet> {
  requireEnv("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI");
  const json = await httpJson<any>("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: getEnv("GOOGLE_CLIENT_ID")!,
      client_secret: getEnv("GOOGLE_CLIENT_SECRET")!,
      redirect_uri: getEnv("GOOGLE_REDIRECT_URI")!,
      grant_type: "authorization_code",
    }),
  });
  return { accessToken: json.access_token, refreshToken: json.refresh_token, expiresIn: json.expires_in, tokenType: json.token_type };
}

async function googleRefreshAccessToken(refreshToken: string): Promise<string> {
  requireEnv("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET");
  const json = await httpJson<any>("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: getEnv("GOOGLE_CLIENT_ID")!,
      client_secret: getEnv("GOOGLE_CLIENT_SECRET")!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  return json.access_token;
}

function googleHeaders(accessToken: string): Record<string, string> {
  const developerToken = getEnv("GOOGLE_ADS_DEVELOPER_TOKEN");
  if (!developerToken) throw new Error("GOOGLE_ADS_DEVELOPER_TOKEN is required. Find it in Google Ads Manager → Tools → API Center.");
  const h: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": developerToken,
    "Content-Type": "application/json",
  };
  const loginId = getEnv("GOOGLE_ADS_LOGIN_CUSTOMER_ID");
  if (loginId) h["login-customer-id"] = loginId;
  return h;
}

async function googleListAccounts(accessToken: string): Promise<Array<{ id: string; name: string }>> {
  const data = await httpJson<any>(
    `https://googleads.googleapis.com/${GOOGLE_V()}/customers:listAccessibleCustomers`,
    { method: "GET", headers: googleHeaders(accessToken) }
  );
  return ((data?.resourceNames ?? []) as string[]).map((rn) => {
    const id = rn.split("/").pop() ?? rn;
    return { id, name: `Google Ads Account ${id}` };
  });
}

async function googleFetchReport(accountId: string, accessToken: string, from: string, to: string): Promise<UnifiedReportRow[]> {
  const customerId = accountId.replace(/-/g, "");
  const url = `https://googleads.googleapis.com/${GOOGLE_V()}/customers/${customerId}/googleAds:searchStream`;
  const query = `SELECT campaign.id, campaign.name, metrics.impressions, metrics.clicks, metrics.ctr, metrics.cost_micros, metrics.conversions FROM campaign WHERE segments.date BETWEEN '${from}' AND '${to}'`;
  const stream = await httpJson<any>(url, {
    method: "POST",
    headers: googleHeaders(accessToken),
    body: JSON.stringify({ query }),
  });
  const results = (Array.isArray(stream) ? stream : [stream]).flatMap((chunk: any) => chunk?.results ?? []);
  return results.map((r: any) => ({
    campaignId: String(r.campaign?.id ?? ""),
    campaignName: r.campaign?.name ?? "",
    impressions: Number(r.metrics?.impressions || 0),
    clicks: Number(r.metrics?.clicks || 0),
    ctr: Number(r.metrics?.ctr || 0),
    spend: Number(r.metrics?.costMicros || 0) / 1_000_000,
    conversions: Number(r.metrics?.conversions || 0),
    source: "google" as Platform,
  }));
}

/**
 * Full Google campaign creation: Budget → Campaign → Ad Group → Responsive Search Ad
 */
async function googleCreateCampaign(accountId: string, accessToken: string, input: UnifiedCampaignInput): Promise<CreatedCampaign> {
  const customerId = accountId.replace(/-/g, "");
  const base = `https://googleads.googleapis.com/${GOOGLE_V()}/customers/${customerId}`;
  const hdrs = googleHeaders(accessToken);
  const status = input.status === "ACTIVE" ? "ENABLED" : "PAUSED";

  // 1. Campaign Budget
  const budgetResult = await httpJson<any>(`${base}/campaignBudgets:mutate`, {
    method: "POST",
    headers: hdrs,
    body: JSON.stringify({
      operations: [{
        create: {
          name: `${input.name} Budget`,
          amountMicros: String(Math.round((input.dailyBudget ?? 20) * 1_000_000)),
          deliveryMethod: "STANDARD",
        },
      }],
    }),
  });
  const budgetResourceName = budgetResult?.results?.[0]?.resourceName ?? "";

  // 2. Campaign
  const campaignPayload: any = {
    name: input.name,
    status,
    advertisingChannelType: "SEARCH",
    campaignBudget: budgetResourceName,
    manualCpc: { enhancedCpcEnabled: false },
    networkSettings: {
      targetGoogleSearch: true,
      targetSearchNetwork: true,
      targetContentNetwork: false,
    },
  };
  if (input.startTime) campaignPayload.startDate = input.startTime.slice(0, 10).replace(/-/g, "");
  if (input.endTime) campaignPayload.endDate = input.endTime.slice(0, 10).replace(/-/g, "");

  const campaignResult = await httpJson<any>(`${base}/campaigns:mutate`, {
    method: "POST",
    headers: hdrs,
    body: JSON.stringify({ operations: [{ create: campaignPayload }] }),
  });
  const campaignResourceName = campaignResult?.results?.[0]?.resourceName ?? "";
  const campaignId = campaignResourceName.split("/").pop() ?? campaignResourceName;

  // 3. Ad Group
  const adGroupResult = await httpJson<any>(`${base}/adGroups:mutate`, {
    method: "POST",
    headers: hdrs,
    body: JSON.stringify({
      operations: [{
        create: {
          name: `${input.name} — Ad Group`,
          campaign: campaignResourceName,
          status,
          type: "SEARCH_STANDARD",
          cpcBidMicros: "1000000", // $1 default CPC
        },
      }],
    }),
  });
  const adGroupResourceName = adGroupResult?.results?.[0]?.resourceName ?? "";
  const adGroupId = adGroupResourceName.split("/").pop() ?? adGroupResourceName;

  // 4. Responsive Search Ad
  const headline = input.headlineText || input.name;
  const description = input.descriptionText || (input.businessType ? `${input.businessType} services` : "Get a free quote today");
  const finalUrl = input.landingPageUrl || "https://example.com";

  const adResult = await httpJson<any>(`${base}/adGroupAds:mutate`, {
    method: "POST",
    headers: hdrs,
    body: JSON.stringify({
      operations: [{
        create: {
          adGroup: adGroupResourceName,
          status,
          ad: {
            finalUrls: [finalUrl],
            responsiveSearchAd: {
              headlines: [
                { text: headline.slice(0, 30) },
                { text: (input.businessType || "Local Service").slice(0, 30) },
                { text: "Call Us Today" },
              ],
              descriptions: [
                { text: description.slice(0, 90) },
                { text: "Trusted local service. Get your free quote now." },
              ],
            },
          },
        },
      }],
    }),
  });
  const adResourceName = adResult?.results?.[0]?.resourceName ?? "";
  const adId = adResourceName.split("/").pop() ?? adResourceName;

  return { platform: "google", campaignId, adGroupId, adId };
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

async function getConnection(userId: string, platform: Platform) {
  const [conn] = await db
    .select()
    .from(adConnectionsTable)
    .where(and(eq(adConnectionsTable.userId, userId), eq(adConnectionsTable.platform, platform)));
  return conn ?? null;
}

/** Returns a live access token, refreshing Google tokens if needed. */
async function resolveAccessToken(conn: NonNullable<Awaited<ReturnType<typeof getConnection>>>): Promise<string> {
  const rawToken = conn.accessToken ? decryptToken(conn.accessToken) : null;

  // Check if token has expired (with 5 min buffer)
  const isExpired = conn.expiresAt && new Date(conn.expiresAt).getTime() < Date.now() + 5 * 60_000;

  if (rawToken && !isExpired) return rawToken;

  // Attempt refresh for Google
  if (conn.refreshToken && conn.platform === "google") {
    const rawRefresh = decryptToken(conn.refreshToken);
    logger.info({ platform: conn.platform, userId: conn.userId }, "refreshing Google access token");
    const newToken = await googleRefreshAccessToken(rawRefresh);
    const newExpiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour
    await db.update(adConnectionsTable)
      .set({ accessToken: encryptToken(newToken), expiresAt: newExpiresAt })
      .where(eq(adConnectionsTable.id, conn.id));
    return newToken;
  }

  if (!rawToken) throw new Error("No access token found — please reconnect your account");
  return rawToken; // expired but no refresh available (Meta long-lived tokens)
}

async function upsertConnection(
  userId: string,
  platform: Platform,
  tokens: OAuthTokenSet,
  accountId?: string,
  accountName?: string
) {
  const existing = await getConnection(userId, platform);
  const expiresAt = tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : undefined;

  const values = {
    accessToken: encryptToken(tokens.accessToken),
    refreshToken: tokens.refreshToken ? encryptToken(tokens.refreshToken) : undefined,
    expiresAt,
    accountId: accountId ?? existing?.accountId ?? undefined,
    accountName: accountName ?? existing?.accountName ?? undefined,
  };

  if (existing) {
    await db.update(adConnectionsTable)
      .set({ ...values, refreshToken: values.refreshToken ?? existing.refreshToken ?? null })
      .where(eq(adConnectionsTable.id, existing.id));
  } else {
    await db.insert(adConnectionsTable).values({
      userId,
      platform,
      ...values,
      refreshToken: values.refreshToken ?? null,
    });
  }
}

async function recordAnalyticsEvent(userId: string, eventType: string, metadata: Record<string, unknown>) {
  try {
    await db.insert(analyticsEventsTable).values({
      userId,
      eventType,
      eventCategory: "internal",
      metadata,
    });
  } catch (err) {
    logger.warn({ err }, "failed to record analytics event for ad platform");
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/ads/connections
router.get("/ads/connections", requireAuth, async (req, res): Promise<void> => {
  const connections = await db
    .select({
      id: adConnectionsTable.id,
      platform: adConnectionsTable.platform,
      accountId: adConnectionsTable.accountId,
      accountName: adConnectionsTable.accountName,
      expiresAt: adConnectionsTable.expiresAt,
      createdAt: adConnectionsTable.createdAt,
    })
    .from(adConnectionsTable)
    .where(eq(adConnectionsTable.userId, req.userId!))
    .orderBy(desc(adConnectionsTable.createdAt));

  res.json(connections);
});

// GET /api/ads/:platform/auth-url
router.get("/ads/:platform/auth-url", requireAuth, requirePaidPlan, (req, res): void => {
  try {
    const platform = req.params.platform as Platform;
    if (platform !== "meta" && platform !== "google") {
      res.status(400).json({ error: "Unsupported platform. Use 'meta' or 'google'." });
      return;
    }
    const state = `${req.userId}:${Date.now()}`;
    const url = platform === "meta" ? metaAuthUrl(state) : googleAuthUrl(state);
    res.json({ url });
  } catch (err: any) {
    logger.warn({ err }, "ads auth-url error");
    res.status(400).json({ error: err.message });
  }
});

// GET /api/ads/:platform/callback — OAuth redirect handler
router.get("/ads/:platform/callback", async (req, res): Promise<void> => {
  const platform = req.params.platform as Platform;
  const frontendPath = `/localad-ai/ad-platforms`;

  try {
    const code = String(req.query.code ?? "");
    const state = String(req.query.state ?? "");
    const errorParam = req.query.error as string | undefined;

    if (errorParam) {
      const desc = req.query.error_description as string ?? errorParam;
      res.redirect(`${frontendPath}?error=${encodeURIComponent(desc)}`);
      return;
    }

    if (!code || !state) {
      res.redirect(`${frontendPath}?error=${encodeURIComponent("Missing authorization code — please try again")}`);
      return;
    }

    const userId = state.split(":")[0];
    if (!userId) {
      res.redirect(`${frontendPath}?error=${encodeURIComponent("Invalid OAuth state — please try again")}`);
      return;
    }

    const tokens = platform === "meta"
      ? await metaExchangeCode(code)
      : await googleExchangeCode(code);

    // Auto-discover and pre-fill first ad account
    let accountId: string | undefined;
    let accountName: string | undefined;
    try {
      const accounts = platform === "meta"
        ? await metaGetAdAccounts(tokens.accessToken)
        : await googleListAccounts(tokens.accessToken);
      if (accounts.length > 0) {
        accountId = accounts[0].id;
        accountName = accounts[0].name;
      }
    } catch (accountErr) {
      logger.warn({ accountErr }, "could not pre-fetch ad accounts after OAuth");
    }

    await upsertConnection(userId, platform, tokens, accountId, accountName);

    logger.info({ userId, platform }, "ad platform connected");
    res.redirect(`${frontendPath}?connected=${platform}`);
  } catch (err: any) {
    logger.error({ err, platform }, "ads callback error");
    res.redirect(`/localad-ai/ad-platforms?error=${encodeURIComponent(err.message ?? "Connection failed")}`);
  }
});

// POST /api/ads/:platform/disconnect
router.post("/ads/:platform/disconnect", requireAuth, async (req, res): Promise<void> => {
  const platform = req.params.platform as Platform;
  await db.delete(adConnectionsTable)
    .where(and(eq(adConnectionsTable.userId, req.userId!), eq(adConnectionsTable.platform, platform)));
  logger.info({ userId: req.userId, platform }, "ad platform disconnected");
  res.json({ ok: true });
});

// PUT /api/ads/:platform/account — update selected ad account
router.put("/ads/:platform/account", requireAuth, async (req, res): Promise<void> => {
  try {
    const platform = req.params.platform as Platform;
    const { accountId, accountName } = z.object({
      accountId: z.string().min(1),
      accountName: z.string().optional(),
    }).parse(req.body);
    await db.update(adConnectionsTable)
      .set({ accountId, accountName: accountName ?? null })
      .where(and(eq(adConnectionsTable.userId, req.userId!), eq(adConnectionsTable.platform, platform)));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/ads/:platform/accounts — list accessible ad accounts
router.get("/ads/:platform/accounts", requireAuth, async (req, res): Promise<void> => {
  try {
    const platform = req.params.platform as Platform;
    const conn = await getConnection(req.userId!, platform);
    if (!conn) {
      res.status(404).json({ error: `${platform === "meta" ? "Meta" : "Google"} Ads is not connected. Please connect it first.` });
      return;
    }
    const accessToken = await resolveAccessToken(conn);
    const accounts = platform === "meta"
      ? await metaGetAdAccounts(accessToken)
      : await googleListAccounts(accessToken);
    res.json({ accounts });
  } catch (err: any) {
    logger.error({ err }, "ads accounts error");
    res.status(400).json({ error: err.message });
  }
});

// POST /api/ads/:platform/campaigns — create campaign + ad set/group + creative/ad
router.post("/ads/:platform/campaigns", requireAuth, requirePaidPlan, async (req, res): Promise<void> => {
  try {
    const platform = req.params.platform as Platform;
    const schema = z.object({
      accountId: z.string().min(1, "accountId is required"),
      input: z.object({
        name: z.string().min(1, "Campaign name is required"),
        objective: z.string().default("OUTCOME_LEADS"),
        dailyBudget: z.number().positive().optional(),
        totalBudget: z.number().positive().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        status: z.enum(["ACTIVE", "PAUSED"]).default("PAUSED"),
        geoTargets: z.array(z.string()).optional(),
        businessType: z.string().optional(),
        landingPageUrl: z.string().url().optional().or(z.literal("")),
        headlineText: z.string().max(30).optional(),
        descriptionText: z.string().max(90).optional(),
      }),
    });

    const { accountId, input } = schema.parse(req.body);

    const conn = await getConnection(req.userId!, platform);
    if (!conn) {
      res.status(404).json({ error: `${platform === "meta" ? "Meta" : "Google"} Ads is not connected.` });
      return;
    }

    const accessToken = await resolveAccessToken(conn);

    const result = platform === "meta"
      ? await metaCreateCampaign(accountId, accessToken, input)
      : await googleCreateCampaign(accountId, accessToken, input);

    // Save account if not set
    if (!conn.accountId) {
      await db.update(adConnectionsTable)
        .set({ accountId })
        .where(eq(adConnectionsTable.id, conn.id));
    }

    // Write to analytics
    await recordAnalyticsEvent(req.userId!, "campaign_generated", {
      platform,
      campaignId: result.campaignId,
      campaignName: input.name,
      objective: input.objective,
      dailyBudget: input.dailyBudget,
      accountId,
    });

    res.json({ ok: true, result });
  } catch (err: any) {
    logger.error({ err }, "ads create campaign error");
    res.status(400).json({ error: err.message });
  }
});

// GET /api/ads/:platform/report — fetch live performance data
router.get("/ads/:platform/report", requireAuth, async (req, res): Promise<void> => {
  try {
    const platform = req.params.platform as Platform;
    const from = String(req.query.from ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
    const to = String(req.query.to ?? new Date().toISOString().slice(0, 10));

    const conn = await getConnection(req.userId!, platform);
    if (!conn) {
      res.status(404).json({ error: `${platform === "meta" ? "Meta" : "Google"} Ads is not connected. Please connect it first.` });
      return;
    }
    if (!conn.accountId) {
      res.status(400).json({ error: "No ad account selected. Use the account picker to choose one." });
      return;
    }

    const accessToken = await resolveAccessToken(conn);
    const rows = platform === "meta"
      ? await metaFetchReport(conn.accountId, accessToken, from, to)
      : await googleFetchReport(conn.accountId, accessToken, from, to);

    res.json({ rows, from, to, accountId: conn.accountId, accountName: conn.accountName });
  } catch (err: any) {
    logger.error({ err }, "ads report error");
    res.status(400).json({ error: err.message });
  }
});

// ─── POST /api/ads/publish-from-ai ────────────────────────────────────────────
// Bridge: take an AI-generated ad (from the Ad Creator) and publish it to Meta
// or Google Ads. Fetches copy + image from the DB, uploads the image (Meta only),
// then creates the full campaign pipeline on the chosen platform.

const PublishFromAiSchema = z.object({
  generationId: z.string().uuid("generationId must be a valid UUID"),
  platform: z.enum(["meta", "google"]).default("meta"),
  // Optional overrides — sensible defaults are derived from the AI project data
  accountId: z.string().optional(),           // override the saved ad account
  campaignName: z.string().optional(),        // defaults to "{businessName} — {service}"
  dailyBudget: z.number().positive().optional().default(20),
  status: z.enum(["ACTIVE", "PAUSED"]).optional().default("PAUSED"),
  landingPageUrl: z.union([z.string().url(), z.literal("")]).optional(),
});

router.post("/ads/publish-from-ai", requireAuth, requirePaidPlan, async (req, res): Promise<void> => {
  const parsed = PublishFromAiSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }

  const { generationId, platform, accountId: overrideAccountId, campaignName, dailyBudget, status, landingPageUrl } = parsed.data;
  const userId = req.userId!;

  try {
    // ── 1. Fetch the AI generation ───────────────────────────────────────────
    const [generation] = await db
      .select()
      .from(adGenerationsTable)
      .where(eq(adGenerationsTable.id, generationId));

    if (!generation) {
      res.status(404).json({ error: "Ad generation not found" });
      return;
    }
    if (generation.status !== "complete") {
      res.status(400).json({ error: "Ad generation is not complete — wait for the image to finish generating" });
      return;
    }
    if (!generation.imageUrl) {
      res.status(400).json({ error: "No image found on this generation — cannot publish without an image" });
      return;
    }

    // ── 2. Verify ownership via the parent project ───────────────────────────
    const [project] = await db
      .select()
      .from(adProjectsTable)
      .where(eq(adProjectsTable.id, generation.projectId));

    if (!project || project.userId !== userId) {
      res.status(403).json({ error: "You do not have permission to publish this ad" });
      return;
    }

    // ── 3. Fetch the AI-generated copy for this project ──────────────────────
    const [copy] = await db
      .select()
      .from(adCopiesTable)
      .where(eq(adCopiesTable.projectId, project.id));

    // ── 4. Resolve the ad platform connection ────────────────────────────────
    const platformLabel = platform === "meta" ? "Meta Ads" : "Google Ads";
    const conn = await getConnection(userId, platform);
    if (!conn) {
      res.status(404).json({
        error: `${platformLabel} is not connected. Go to Ad Platforms and connect your ${platformLabel} account first.`,
        code: `${platform.toUpperCase()}_NOT_CONNECTED`,
      });
      return;
    }

    const resolvedAccountId = overrideAccountId ?? conn.accountId ?? undefined;
    if (!resolvedAccountId) {
      res.status(400).json({
        error: `No ad account selected. Go to Ad Platforms and select an ad account for ${platformLabel}.`,
        code: "NO_AD_ACCOUNT",
      });
      return;
    }

    const accessToken = await resolveAccessToken(conn);

    // ── 5. Build unified campaign inputs from AI copy + project data ─────────
    const derivedName = campaignName ?? `${project.businessName} — ${project.service}`;

    const headline = copy?.headline ?? project.businessName;
    // Meta link ad "name" field: 25-char limit. Google RSA headline: 30-char limit.
    const headlineText = headline.slice(0, platform === "meta" ? 25 : 30);

    const description = [copy?.offerLine, copy?.subheadline]
      .filter(Boolean)
      .join(" — ")
      || `${project.service}${project.offer ? ` — ${project.offer}` : ""}`;
    // Both platforms cap description/body at 90 chars
    const descriptionText = description.slice(0, 90);

    const input: UnifiedCampaignInput = {
      name: derivedName,
      objective: "OUTCOME_LEADS",
      dailyBudget,
      status: status ?? "PAUSED",
      businessType: project.service,
      landingPageUrl: landingPageUrl || undefined,
      headlineText,
      descriptionText,
    };

    // ── 6. Publish to the chosen platform ────────────────────────────────────
    let result: CreatedCampaign;
    let imageHash: string | undefined;

    if (platform === "meta") {
      // Upload image to Meta's ad image library first
      logger.info({ userId, generationId, resolvedAccountId }, "uploading AI image to Meta");
      imageHash = await metaUploadImage(resolvedAccountId, accessToken, generation.imageUrl);
      logger.info({ userId, input, imageHash }, "creating Meta campaign from AI ad");
      result = await metaCreateCampaign(resolvedAccountId, accessToken, input, imageHash);
    } else {
      // Google RSA — text-based, no image upload required
      logger.info({ userId, input }, "creating Google campaign from AI ad");
      result = await googleCreateCampaign(resolvedAccountId, accessToken, input);
    }

    // ── 7. Record analytics + update ad account if newly discovered ───────────
    if (!conn.accountId) {
      await db.update(adConnectionsTable)
        .set({ accountId: resolvedAccountId })
        .where(eq(adConnectionsTable.id, conn.id));
    }

    await recordAnalyticsEvent(userId, "ai_ad_published", {
      platform,
      generationId,
      projectId: project.id,
      campaignId: result.campaignId,
      adSetId: result.adSetId,
      adId: result.adId,
      creativeId: result.creativeId,
      ...(imageHash ? { imageHash } : {}),
    });

    logger.info({ userId, platform, campaignId: result.campaignId }, "AI ad published successfully");

    res.json({
      ok: true,
      platform,
      campaignId: result.campaignId,
      adSetId: result.adSetId,
      adId: result.adId,
      creativeId: result.creativeId,
      campaignName: derivedName,
      status: status ?? "PAUSED",
      ...(imageHash ? { imageHash } : {}),
    });
  } catch (err: any) {
    logger.error({ err, generationId }, "publish-from-ai error");
    res.status(400).json({ error: err.message ?? "Failed to publish ad" });
  }
});

export default router;
