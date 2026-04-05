import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  businessName: text("business_name").notNull(),
  businessType: text("business_type").notNull(),
  city: text("city").notNull(),
  serviceOffered: text("service_offered").notNull(),
  targetCustomer: text("target_customer").notNull(),
  adTone: text("ad_tone").notNull(),
  callToAction: text("call_to_action").notNull(),
  generatedOutput: jsonb("generated_output"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
