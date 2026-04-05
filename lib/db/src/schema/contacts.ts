import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const CONSENT_STATUSES = ["subscribed", "unsubscribed", "no_consent", "transactional_only"] as const;
export type ConsentStatus = (typeof CONSENT_STATUSES)[number];

export const LEAD_STATUSES = [
  "new_lead",
  "warm_lead",
  "quote_sent",
  "follow_up_needed",
  "won",
  "lost",
  "past_customer",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const CONTACT_SOURCES = [
  "website",
  "referral",
  "google_ads",
  "facebook_ads",
  "flyer",
  "previous_customer",
  "manual",
  "imported",
] as const;
export type ContactSource = (typeof CONTACT_SOURCES)[number];

export const contactsTable = pgTable("contacts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  company: text("company"),
  tags: text("tags"),
  leadStatus: text("lead_status").notNull().default("new_lead"),
  source: text("source"),
  consentStatus: text("consent_status").notNull().default("no_consent"),
  notes: text("notes"),
  dateAdded: timestamp("date_added", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertContactSchema = createInsertSchema(contactsTable).omit({
  id: true,
  userId: true,
  dateAdded: true,
  updatedAt: true,
});
export const selectContactSchema = createSelectSchema(contactsTable);

export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contactsTable.$inferSelect;
