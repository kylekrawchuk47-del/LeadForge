import { Router, type IRouter } from "express";
import { eq, count, desc } from "drizzle-orm";
import { clerkClient } from "@clerk/express";
import { db, usersTable, projectsTable, creditTransactionsTable } from "@workspace/db";
import { UpdateUserProfileBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.toLowerCase().trim();

async function getOrCreateUser(clerkUserId: string) {
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId));

  if (ADMIN_EMAIL) {
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    const userEmail = clerkUser.primaryEmailAddress?.emailAddress?.toLowerCase().trim();

    if (existing) {
      if (userEmail === ADMIN_EMAIL && existing.role !== "admin") {
        logger.info({ clerkUserId }, "Auto-promoting user to admin by email match");
        const [updated] = await db
          .update(usersTable)
          .set({ role: "admin" })
          .where(eq(usersTable.clerkUserId, clerkUserId))
          .returning();
        return updated;
      }
      return existing;
    }

    const role = userEmail === ADMIN_EMAIL ? "admin" : "user";
    logger.info({ clerkUserId, role }, "Creating new user");
    const [created] = await db
      .insert(usersTable)
      .values({ clerkUserId, plan: "free", role, credits: 20 })
      .returning();
    return created;
  }

  if (existing) return existing;

  const [created] = await db
    .insert(usersTable)
    .values({ clerkUserId, plan: "free", role: "user", credits: 20 })
    .returning();
  return created;
}

router.get("/user/profile", requireAuth, async (req, res): Promise<void> => {
  const user = await getOrCreateUser(req.userId!);

  const [result] = await db
    .select({ count: count() })
    .from(projectsTable)
    .where(eq(projectsTable.userId, req.userId!));

  const PLAN_CREDIT_LIMITS: Record<string, number> = { free: 20, pro: 200, agency: 700, full_access: 1000 };
  const planCreditLimit = PLAN_CREDIT_LIMITS[user.plan] ?? 20;
  const addonCredits = user.addonCredits ?? 0;
  const totalCredits = user.credits + addonCredits;

  res.json({
    id: user.id,
    clerkUserId: user.clerkUserId,
    plan: user.plan,
    role: user.role,
    credits: user.credits,
    addonCredits,
    totalCredits,
    planCreditLimit,
    creditsResetAt: user.creditsResetAt,
    projectsCount: result?.count ?? 0,
    createdAt: user.createdAt,
    imageGenerationsUsed: user.imageGenerationsUsed ?? 0,
    refinementsUsed: user.refinementsUsed ?? 0,
    exportsUsed: user.exportsUsed ?? 0,
    imageTrialUsed: user.imageTrialUsed ?? false,
  });
});

router.patch("/user/profile", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateUserProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const user = await getOrCreateUser(req.userId!);

  const [updated] = await db
    .update(usersTable)
    .set({ plan: parsed.data.plan ?? user.plan })
    .where(eq(usersTable.clerkUserId, req.userId!))
    .returning();

  const [result] = await db
    .select({ count: count() })
    .from(projectsTable)
    .where(eq(projectsTable.userId, req.userId!));

  res.json({
    id: updated.id,
    clerkUserId: updated.clerkUserId,
    plan: updated.plan,
    role: updated.role,
    credits: updated.credits,
    projectsCount: result?.count ?? 0,
    createdAt: updated.createdAt,
  });
});

// GET /user/credit-transactions — last 50 transactions for the current user
router.get("/user/credit-transactions", requireAuth, async (req, res): Promise<void> => {
  const transactions = await db
    .select()
    .from(creditTransactionsTable)
    .where(eq(creditTransactionsTable.clerkUserId, req.userId!))
    .orderBy(desc(creditTransactionsTable.createdAt))
    .limit(50);

  res.json({ transactions });
});

export { getOrCreateUser };
export default router;
