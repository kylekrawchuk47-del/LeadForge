import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, socialConnectionsTable, showcasePostsTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { encryptToken, decryptToken } from "../lib/token-crypto";
import { logger } from "../lib/logger";

const router: IRouter = Router();

type SocialPlatform = "facebook" | "instagram";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEnv(name: string) { return process.env[name]; }

function requireEnv(...names: string[]) {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length) throw new Error(`Missing configuration: ${missing.join(", ")}`);
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
    const msg = json?.error?.message ?? json?.error ?? `HTTP ${res.status} ${res.statusText}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return json as T;
}

const META_V = () => getEnv("META_API_VERSION") ?? "v25.0";

function buildSocialAuthUrl(state: string): string {
  requireEnv("META_APP_ID", "META_SOCIAL_REDIRECT_URI");
  return `https://www.facebook.com/${META_V()}/dialog/oauth?${qs({
    client_id: getEnv("META_APP_ID"),
    redirect_uri: getEnv("META_SOCIAL_REDIRECT_URI"),
    state,
    response_type: "code",
    scope: "pages_show_list,instagram_basic,instagram_manage_insights,business_management,pages_read_engagement",
  })}`;
}

async function exchangeCodeForToken(code: string): Promise<string> {
  requireEnv("META_APP_ID", "META_APP_SECRET", "META_SOCIAL_REDIRECT_URI");
  const json = await httpJson<any>(
    `https://graph.facebook.com/${META_V()}/oauth/access_token?${qs({
      client_id: getEnv("META_APP_ID"),
      client_secret: getEnv("META_APP_SECRET"),
      redirect_uri: getEnv("META_SOCIAL_REDIRECT_URI"),
      code,
    })}`
  );
  return String(json.access_token);
}

async function listFacebookPages(accessToken: string) {
  return httpJson<any>(
    `https://graph.facebook.com/${META_V()}/me/accounts?${qs({
      access_token: accessToken,
      fields: "id,name,access_token,instagram_business_account{id,username,name}",
    })}`
  );
}

async function fetchInstagramMedia(instagramBusinessId: string, pageAccessToken: string) {
  return httpJson<any>(
    `https://graph.facebook.com/${META_V()}/${instagramBusinessId}/media?${qs({
      fields: "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp",
      access_token: pageAccessToken,
      limit: "50",
    })}`
  );
}

async function getDbUser(clerkUserId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId));
  return user ?? null;
}

async function getSocialConn(userId: string, platform: SocialPlatform) {
  const [conn] = await db
    .select()
    .from(socialConnectionsTable)
    .where(and(eq(socialConnectionsTable.userId, userId), eq(socialConnectionsTable.platform, platform)));
  return conn ?? null;
}

const FRONTEND_PATH = "/localad-ai/showcase";

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/social/connections — list all social connections for this user
router.get("/social/connections", requireAuth, async (req, res): Promise<void> => {
  const conns = await db
    .select({
      id: socialConnectionsTable.id,
      platform: socialConnectionsTable.platform,
      accountId: socialConnectionsTable.accountId,
      username: socialConnectionsTable.username,
      displayName: socialConnectionsTable.displayName,
      createdAt: socialConnectionsTable.createdAt,
    })
    .from(socialConnectionsTable)
    .where(eq(socialConnectionsTable.userId, req.userId!))
    .orderBy(desc(socialConnectionsTable.createdAt));
  res.json(conns);
});

// GET /api/social/meta/auth-url — start Instagram/Facebook OAuth
router.get("/social/meta/auth-url", requireAuth, (req, res): void => {
  try {
    const state = `${req.userId}:${Date.now()}`;
    const url = buildSocialAuthUrl(state);
    res.json({ url });
  } catch (err: any) {
    logger.warn({ err }, "social auth-url error");
    res.status(400).json({ error: err.message });
  }
});

// GET /api/social/meta/callback — OAuth callback (no auth middleware; userId from state)
router.get("/social/meta/callback", async (req, res): Promise<void> => {
  try {
    const code = String(req.query.code ?? "");
    const state = String(req.query.state ?? "");
    const errorParam = req.query.error as string | undefined;

    if (errorParam) {
      const desc = (req.query.error_description as string) ?? errorParam;
      res.redirect(`${FRONTEND_PATH}?error=${encodeURIComponent(desc)}`);
      return;
    }

    if (!code || !state) {
      res.redirect(`${FRONTEND_PATH}?error=${encodeURIComponent("Missing authorization code")}`);
      return;
    }

    const userId = state.split(":")[0];
    if (!userId) {
      res.redirect(`${FRONTEND_PATH}?error=${encodeURIComponent("Invalid state")}`);
      return;
    }

    const userToken = await exchangeCodeForToken(code);

    const pages = await listFacebookPages(userToken);
    const firstPage = Array.isArray(pages?.data) ? pages.data[0] : null;
    if (!firstPage) {
      res.redirect(`${FRONTEND_PATH}?error=${encodeURIComponent("No Facebook Page found — link a Facebook Page first")}`);
      return;
    }

    const instagramBusiness = firstPage.instagram_business_account ?? null;
    const platform: SocialPlatform = instagramBusiness ? "instagram" : "facebook";
    const accountId = String(instagramBusiness?.id ?? firstPage.id);
    const username: string | null = instagramBusiness?.username ?? null;
    const displayName: string | null = instagramBusiness?.name ?? firstPage.name ?? null;
    const pageAccessToken = String(firstPage.access_token ?? userToken);

    // Upsert social connection
    const existing = await getSocialConn(userId, platform);
    if (existing) {
      await db.update(socialConnectionsTable)
        .set({ accountId, username, displayName, accessToken: encryptToken(pageAccessToken) })
        .where(eq(socialConnectionsTable.id, existing.id));
    } else {
      await db.insert(socialConnectionsTable).values({
        userId,
        platform,
        accountId,
        username,
        displayName,
        accessToken: encryptToken(pageAccessToken),
      });
    }

    logger.info({ userId, platform }, "social platform connected");
    res.redirect(`${FRONTEND_PATH}?social_connected=${platform}`);
  } catch (err: any) {
    logger.error({ err }, "social callback error");
    res.redirect(`${FRONTEND_PATH}?error=${encodeURIComponent(err.message ?? "Connection failed")}`);
  }
});

// POST /api/social/disconnect — disconnect a social platform
router.post("/social/disconnect", requireAuth, async (req, res): Promise<void> => {
  try {
    const platform = String(req.body.platform ?? "") as SocialPlatform;
    if (platform !== "facebook" && platform !== "instagram") {
      res.status(400).json({ error: "Platform must be facebook or instagram" });
      return;
    }
    await db.delete(socialConnectionsTable)
      .where(and(eq(socialConnectionsTable.userId, req.userId!), eq(socialConnectionsTable.platform, platform)));
    // Also delete cached posts
    await db.delete(showcasePostsTable)
      .where(and(eq(showcasePostsTable.userId, req.userId!), eq(showcasePostsTable.platform, platform)));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/social/sync — fetch & cache Instagram posts
router.post("/social/sync", requireAuth, async (req, res): Promise<void> => {
  try {
    const platform = (String(req.body.platform ?? "instagram")) as SocialPlatform;
    const conn = await getSocialConn(req.userId!, platform);
    if (!conn) {
      res.status(404).json({ error: `No ${platform} connection found — connect it first` });
      return;
    }

    const accessToken = decryptToken(conn.accessToken);

    let posts: any[] = [];
    if (platform === "instagram") {
      const media = await fetchInstagramMedia(conn.accountId, accessToken);
      posts = Array.isArray(media?.data) ? media.data : [];
    }

    // Replace cached posts
    await db.delete(showcasePostsTable)
      .where(and(eq(showcasePostsTable.userId, req.userId!), eq(showcasePostsTable.platform, platform)));

    if (posts.length > 0) {
      await db.insert(showcasePostsTable).values(
        posts.map((m: any) => ({
          userId: req.userId!,
          platform,
          socialConnectionId: String(conn.id),
          externalPostId: String(m.id),
          caption: m.caption ?? null,
          mediaType: m.media_type ?? null,
          mediaUrl: m.media_url ?? null,
          permalink: m.permalink ?? null,
          thumbnailUrl: m.thumbnail_url ?? null,
          postTimestamp: m.timestamp ? new Date(m.timestamp) : null,
        }))
      );
    }

    res.json({ ok: true, synced: posts.length });
  } catch (err: any) {
    logger.error({ err }, "social sync error");
    res.status(400).json({ error: err.message });
  }
});

// GET /api/showcase — list cached showcase posts (no auth required — public showcase)
router.get("/showcase", requireAuth, async (req, res): Promise<void> => {
  try {
    const dbUser = await getDbUser(req.userId!);
    const posts = await db
      .select()
      .from(showcasePostsTable)
      .where(eq(showcasePostsTable.userId, req.userId!))
      .orderBy(desc(showcasePostsTable.postTimestamp));

    const conns = await db
      .select({
        platform: socialConnectionsTable.platform,
        username: socialConnectionsTable.username,
        displayName: socialConnectionsTable.displayName,
      })
      .from(socialConnectionsTable)
      .where(eq(socialConnectionsTable.userId, req.userId!));

    res.json({ posts, connections: conns, plan: dbUser?.plan ?? "free" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
