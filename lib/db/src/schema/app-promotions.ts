import { pgTable, text, boolean, integer, timestamp, uuid } from "drizzle-orm/pg-core";

export const appPromotionsTable = pgTable("app_promotions", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  buttonText: text("button_text"),
  buttonUrl: text("button_url"),
  promoType: text("promo_type").notNull().default("announcement"),
  audience: text("audience").notNull().default("all"),
  placement: text("placement").notNull().default("dashboard_banner"),
  planTarget: text("plan_target").default("all"),
  isActive: boolean("is_active").notNull().default(true),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  priority: integer("priority").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type AppPromotion = typeof appPromotionsTable.$inferSelect;
export type NewAppPromotion = typeof appPromotionsTable.$inferInsert;
