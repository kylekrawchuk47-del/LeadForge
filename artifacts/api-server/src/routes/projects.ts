import { Router, type IRouter } from "express";
import { eq, and, sql, desc } from "drizzle-orm";
import { db, projectsTable, usersTable, analyticsEventsTable } from "@workspace/db";
import {
  CreateProjectBody,
  GetProjectParams,
  DeleteProjectParams,
  GenerateAdBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { generateAdContent } from "../lib/adGenerator";

const router: IRouter = Router();

router.get("/projects", requireAuth, async (req, res): Promise<void> => {
  const projects = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.userId, req.userId!))
    .orderBy(desc(projectsTable.createdAt));

  res.json(projects);
});

router.get("/projects/stats", requireAuth, async (req, res): Promise<void> => {
  const allProjects = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.userId, req.userId!));

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonth = allProjects.filter(
    (p) => new Date(p.createdAt) >= startOfMonth
  ).length;

  const businessTypes = [...new Set(allProjects.map((p) => p.businessType))];

  res.json({
    totalProjects: allProjects.length,
    thisMonth,
    businessTypes,
  });
});

router.post("/projects/generate", requireAuth, async (req, res): Promise<void> => {
  const parsed = GenerateAdBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // TODO: Replace mock generator with real AI services:
  // - OpenAI for script + headline: process.env.OPENAI_API_KEY
  // - ElevenLabs for voiceover: process.env.ELEVENLABS_API_KEY
  // - Image generation: process.env.IMAGE_GEN_API_KEY
  const output = generateAdContent(parsed.data);

  res.json(output);
});

router.post("/projects", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [project] = await db
    .insert(projectsTable)
    .values({
      ...parsed.data,
      userId: req.userId!,
    })
    .returning();

  // Fire analytics event: campaign generated (internal funnel event)
  db.insert(analyticsEventsTable).values({
    userId: req.userId!,
    eventType: "campaign_generated",
    eventCategory: "internal",
    projectId: project.id,
    metadata: {
      businessName: project.businessName,
      businessType: project.businessType,
      city: project.city,
    },
  }).catch(() => undefined);

  res.status(201).json(project);
});

router.get("/projects/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetProjectParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(
      and(
        eq(projectsTable.id, params.data.id),
        eq(projectsTable.userId, req.userId!)
      )
    );

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json(project);
});

router.delete("/projects/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteProjectParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  const [project] = await db
    .delete(projectsTable)
    .where(
      and(
        eq(projectsTable.id, params.data.id),
        eq(projectsTable.userId, req.userId!)
      )
    )
    .returning();

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
