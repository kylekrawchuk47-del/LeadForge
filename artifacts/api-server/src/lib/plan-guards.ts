import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { getPlanEntitlements } from "@workspace/credits";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

async function getUser(clerkUserId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId));
  return user ?? null;
}

async function resetMonthlyUsageIfNeeded(clerkUserId: string): Promise<void> {
  const user = await getUser(clerkUserId);
  if (!user || user.plan === "free") return;

  const lastReset = user.creditsResetAt ? new Date(user.creditsResetAt) : null;
  const needsReset = !lastReset || Date.now() - lastReset.getTime() > THIRTY_DAYS_MS;

  if (needsReset) {
    await db
      .update(usersTable)
      .set({ imageGenerationsUsed: 0, refinementsUsed: 0, exportsUsed: 0, creditsResetAt: new Date() })
      .where(eq(usersTable.clerkUserId, clerkUserId));
  }
}

export type GuardResult =
  | { allowed: true; isTrial: boolean }
  | { allowed: false; code: string; message: string; statusCode: number };

export async function checkImageGenAccess(clerkUserId: string): Promise<GuardResult> {
  const user = await getUser(clerkUserId);
  if (!user) {
    return { allowed: false, code: "USER_NOT_FOUND", message: "User not found.", statusCode: 404 };
  }

  const ent = getPlanEntitlements(user.plan);

  if (!ent.aiAdCreatorAccess) {
    if (user.imageTrialUsed) {
      return {
        allowed: false,
        code: "TRIAL_USED",
        message:
          "Your free image generation trial has been used. Upgrade to Pro to keep creating ads.",
        statusCode: 403,
      };
    }
    return { allowed: true, isTrial: true };
  }

  await resetMonthlyUsageIfNeeded(clerkUserId);
  const fresh = await getUser(clerkUserId);
  const used = fresh?.imageGenerationsUsed ?? 0;
  const limit = ent.monthlyImageGenerations;

  if (used >= limit) {
    return {
      allowed: false,
      code: "QUOTA_EXCEEDED",
      message: `You've reached your monthly image generation limit (${limit}). Upgrade your plan for more.`,
      statusCode: 429,
    };
  }

  return { allowed: true, isTrial: false };
}

export async function checkRefinementAccess(clerkUserId: string): Promise<GuardResult> {
  const user = await getUser(clerkUserId);
  if (!user) {
    return { allowed: false, code: "USER_NOT_FOUND", message: "User not found.", statusCode: 404 };
  }

  const ent = getPlanEntitlements(user.plan);

  if (!ent.aiAdCreatorAccess) {
    return {
      allowed: false,
      code: "FEATURE_GATED",
      message: "Refining ads requires a Pro plan or higher.",
      statusCode: 403,
    };
  }

  await resetMonthlyUsageIfNeeded(clerkUserId);
  const fresh = await getUser(clerkUserId);
  const used = fresh?.refinementsUsed ?? 0;
  const limit = ent.monthlyRefinements;

  if (used >= limit) {
    return {
      allowed: false,
      code: "QUOTA_EXCEEDED",
      message: `You've reached your monthly refinement limit (${limit}). Upgrade your plan for more.`,
      statusCode: 429,
    };
  }

  return { allowed: true, isTrial: false };
}

export async function incrementImageGenerations(
  clerkUserId: string,
  isTrial: boolean
): Promise<void> {
  if (isTrial) {
    await db
      .update(usersTable)
      .set({ imageTrialUsed: true })
      .where(eq(usersTable.clerkUserId, clerkUserId));
  } else {
    await db
      .update(usersTable)
      .set({ imageGenerationsUsed: sql`${usersTable.imageGenerationsUsed} + 1` })
      .where(eq(usersTable.clerkUserId, clerkUserId));
  }
}

export async function incrementRefinements(clerkUserId: string): Promise<void> {
  await db
    .update(usersTable)
    .set({ refinementsUsed: sql`${usersTable.refinementsUsed} + 1` })
    .where(eq(usersTable.clerkUserId, clerkUserId));
}

export async function resetPlanUsage(clerkUserId: string): Promise<void> {
  await db
    .update(usersTable)
    .set({ imageGenerationsUsed: 0, refinementsUsed: 0, exportsUsed: 0 })
    .where(eq(usersTable.clerkUserId, clerkUserId));
}
