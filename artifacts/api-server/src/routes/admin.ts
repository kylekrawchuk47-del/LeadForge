import { Router, type IRouter } from "express";
import { eq, count, desc } from "drizzle-orm";
import { clerkClient } from "@clerk/express";
import { db, usersTable, projectsTable, creditTransactionsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

async function requireAdmin(req: any, res: any, next: any): Promise<void> {
  const [user] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, req.userId));

  if (!user || user.role !== "admin") {
    logger.warn({ clerkUserId: req.userId }, "Non-admin attempted to access admin route");
    res.status(403).json({ error: "Forbidden — admin access required" });
    return;
  }
  next();
}

router.get("/admin/stats", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const allUsers = await db.select().from(usersTable);
  const allProjects = await db.select().from(projectsTable);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const projectsThisMonth = allProjects.filter(
    (p) => new Date(p.createdAt) >= startOfMonth
  ).length;
  const projectsToday = allProjects.filter(
    (p) => new Date(p.createdAt) >= startOfDay
  ).length;

  const freeUsers = allUsers.filter((u) => u.plan === "free").length;
  const proUsers = allUsers.filter((u) => u.plan === "pro").length;

  const typeCounts: Record<string, number> = {};
  for (const p of allProjects) {
    typeCounts[p.businessType] = (typeCounts[p.businessType] || 0) + 1;
  }
  const topBusinessTypes = Object.entries(typeCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  res.json({
    totalUsers: allUsers.length,
    totalProjects: allProjects.length,
    projectsThisMonth,
    projectsToday,
    freeUsers,
    proUsers,
    agencyUsers: allUsers.filter((u) => u.plan === "agency").length,
    adminUsers: allUsers.filter((u) => u.role === "admin").length,
    topBusinessTypes,
  });
});

router.get("/admin/users", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));

  const projectCounts = await db
    .select({ userId: projectsTable.userId, count: count() })
    .from(projectsTable)
    .groupBy(projectsTable.userId);

  const countMap = new Map(projectCounts.map((r) => [r.userId, Number(r.count)]));

  const usersWithEmails = await Promise.all(
    users.map(async (u) => {
      let email = "";
      try {
        const clerkUser = await clerkClient.users.getUser(u.clerkUserId);
        email = clerkUser.primaryEmailAddress?.emailAddress ?? "";
      } catch {
        email = "";
      }
      return {
        id: u.id,
        clerkUserId: u.clerkUserId,
        email,
        plan: u.plan,
        role: u.role,
        credits: u.credits,
        projectsCount: countMap.get(u.clerkUserId) ?? 0,
        createdAt: u.createdAt.toISOString(),
      };
    })
  );

  res.json(usersWithEmails);
});

router.patch("/admin/users/:userId", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const userId = parseInt(req.params.userId, 10);
  if (isNaN(userId)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const { plan, role, credits, creditsAdjustment } = req.body as {
    plan?: string;
    role?: string;
    credits?: number;
    creditsAdjustment?: number;
  };

  const updates: Record<string, any> = {};

  if (plan !== undefined && ["free", "pro", "agency"].includes(plan)) {
    updates.plan = plan;
  }
  if (role !== undefined && ["user", "admin"].includes(role)) {
    if (target.clerkUserId === req.userId && role !== "admin") {
      res.status(400).json({ error: "You cannot demote yourself — assign another admin first." });
      return;
    }
    updates.role = role;
  }
  if (credits !== undefined && typeof credits === "number") {
    updates.credits = Math.max(0, credits);
  } else if (creditsAdjustment !== undefined && typeof creditsAdjustment === "number") {
    updates.credits = Math.max(0, target.credits + creditsAdjustment);
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, userId))
    .returning();

  // Log a credit transaction if credits were changed
  if (credits !== undefined || creditsAdjustment !== undefined) {
    const newAmount = updates.credits as number;
    const delta = newAmount - target.credits;
    if (delta !== 0) {
      await db.insert(creditTransactionsTable).values({
        clerkUserId: target.clerkUserId,
        amount: delta,
        type: "ADJUSTMENT",
        description: `Admin adjusted credits: ${delta > 0 ? "+" : ""}${delta} (new total: ${newAmount})`,
      });
    }
  }

  logger.info({ userId, updates }, "Admin updated user");

  res.json({
    id: updated.id,
    plan: updated.plan,
    role: updated.role,
    credits: updated.credits,
  });
});

router.delete("/admin/users/:userId", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const userId = parseInt(req.params.userId, 10);
  if (isNaN(userId)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (target.role === "admin") {
    res.status(400).json({ error: "Cannot delete an admin user" });
    return;
  }

  await db.delete(projectsTable).where(eq(projectsTable.userId, target.clerkUserId));
  await db.delete(usersTable).where(eq(usersTable.id, userId));

  logger.info({ userId, clerkUserId: target.clerkUserId }, "Admin deleted user and their projects");
  res.status(204).end();
});

router.get("/admin/projects", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const projects = await db
    .select()
    .from(projectsTable)
    .orderBy(desc(projectsTable.createdAt));

  res.json(
    projects.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }))
  );
});

router.delete("/admin/projects/:projectId", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.projectId, 10);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, projectId));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  await db.delete(projectsTable).where(eq(projectsTable.id, projectId));
  logger.info({ projectId }, "Admin deleted project");
  res.status(204).end();
});

// GET /admin/users/:userId/credit-transactions — full transaction history for a user
router.get("/admin/users/:userId/credit-transactions", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const userId = parseInt(req.params.userId, 10);
  if (isNaN(userId)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const [target] = await db.select({ clerkUserId: usersTable.clerkUserId }).from(usersTable).where(eq(usersTable.id, userId));
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const transactions = await db
    .select()
    .from(creditTransactionsTable)
    .where(eq(creditTransactionsTable.clerkUserId, target.clerkUserId))
    .orderBy(desc(creditTransactionsTable.createdAt))
    .limit(100);

  res.json({ transactions });
});

export default router;
