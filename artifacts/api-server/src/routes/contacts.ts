import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { db, contactsTable, analyticsEventsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

const ContactBody = z.object({
  email: z.string().email(),
  firstName: z.string().optional().default(""),
  lastName: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  company: z.string().optional().default(""),
  tags: z.string().optional().default(""),
  leadStatus: z.enum([
    "new_lead",
    "warm_lead",
    "quote_sent",
    "follow_up_needed",
    "won",
    "lost",
    "past_customer",
  ]).default("new_lead"),
  source: z.string().optional().default("manual"),
  consentStatus: z.enum(["subscribed", "unsubscribed", "no_consent", "transactional_only"]).default("no_consent"),
  notes: z.string().optional().default(""),
});

// GET /api/contacts — list all contacts
router.get("/contacts", requireAuth, async (req, res): Promise<void> => {
  const contacts = await db
    .select()
    .from(contactsTable)
    .where(eq(contactsTable.userId, req.userId!))
    .orderBy(desc(contactsTable.dateAdded));

  res.json(contacts);
});

// GET /api/contacts/stats — counts by lead status
router.get("/contacts/stats", requireAuth, async (req, res): Promise<void> => {
  const all = await db
    .select()
    .from(contactsTable)
    .where(eq(contactsTable.userId, req.userId!));

  const subscribed = all.filter(c => c.consentStatus === "subscribed");
  const stats = {
    total: all.length,
    new_lead: all.filter(c => c.leadStatus === "new_lead").length,
    warm_lead: all.filter(c => c.leadStatus === "warm_lead").length,
    quote_sent: all.filter(c => c.leadStatus === "quote_sent").length,
    follow_up_needed: all.filter(c => c.leadStatus === "follow_up_needed").length,
    won: all.filter(c => c.leadStatus === "won").length,
    lost: all.filter(c => c.leadStatus === "lost").length,
    past_customer: all.filter(c => c.leadStatus === "past_customer").length,
    subscribed: subscribed.length,
    eligible: subscribed.length,
    all_consented: all.filter(c =>
      c.consentStatus === "subscribed" || c.consentStatus === "transactional_only"
    ).length,
    subscribed_new_leads: subscribed.filter(c => c.leadStatus === "new_lead").length,
    subscribed_warm_leads: subscribed.filter(c => c.leadStatus === "warm_lead").length,
    subscribed_past_customers: subscribed.filter(c => c.leadStatus === "past_customer").length,
  };

  res.json(stats);
});

// POST /api/contacts — create contact
router.post("/contacts", requireAuth, async (req, res): Promise<void> => {
  const parsed = ContactBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const [contact] = await db
    .insert(contactsTable)
    .values({ ...parsed.data, userId: req.userId! })
    .returning();

  // Fire analytics event: lead captured (business event)
  db.insert(analyticsEventsTable).values({
    userId: req.userId!,
    eventType: "lead_captured",
    eventCategory: "business",
    source: contact.source ?? "manual",
    metadata: { contactId: contact.id, leadStatus: contact.leadStatus },
  }).catch(() => undefined);

  res.status(201).json(contact);
});

// POST /api/contacts/bulk — bulk import contacts (CSV)
router.post("/contacts/bulk", requireAuth, async (req, res): Promise<void> => {
  const BulkBody = z.object({
    contacts: z.array(ContactBody.partial().extend({ email: z.string().email() })).max(500),
  });

  const parsed = BulkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const rows = parsed.data.contacts.map(c => ({
    email: c.email,
    firstName: c.firstName ?? "",
    lastName: c.lastName ?? "",
    phone: c.phone ?? "",
    company: c.company ?? "",
    tags: c.tags ?? "",
    leadStatus: c.leadStatus ?? "new_lead",
    source: c.source ?? "imported",
    consentStatus: c.consentStatus ?? "no_consent",
    notes: c.notes ?? "",
    userId: req.userId!,
  }));

  const inserted = await db
    .insert(contactsTable)
    .values(rows)
    .returning();

  // Fire analytics events for bulk-imported leads (fire-and-forget)
  if (inserted.length > 0) {
    const events = inserted.map(c => ({
      userId: req.userId!,
      eventType: "lead_captured",
      eventCategory: "business",
      source: c.source ?? "imported",
      metadata: { contactId: c.id, leadStatus: c.leadStatus, bulk: true },
    }));
    db.insert(analyticsEventsTable).values(events).catch(() => undefined);
  }

  res.status(201).json({ imported: inserted.length, contacts: inserted });
});

// PUT /api/contacts/:id — update contact
router.put("/contacts/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid contact ID" });
    return;
  }

  const parsed = ContactBody.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const [contact] = await db
    .update(contactsTable)
    .set(parsed.data)
    .where(and(eq(contactsTable.id, id), eq(contactsTable.userId, req.userId!)))
    .returning();

  if (!contact) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }

  res.json(contact);
});

// DELETE /api/contacts/:id — delete contact
router.delete("/contacts/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid contact ID" });
    return;
  }

  const [contact] = await db
    .delete(contactsTable)
    .where(and(eq(contactsTable.id, id), eq(contactsTable.userId, req.userId!)))
    .returning();

  if (!contact) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
