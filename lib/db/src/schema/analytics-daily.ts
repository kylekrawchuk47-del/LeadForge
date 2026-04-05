import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  date,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const businessAnalyticsDailyTable = pgTable(
  "business_analytics_daily",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    day: date("day").notNull(),

    landingPageViews: integer("landing_page_views").notNull().default(0),
    formStarts: integer("form_starts").notNull().default(0),
    formSubmissions: integer("form_submissions").notNull().default(0),
    leadsCaptured: integer("leads_captured").notNull().default(0),

    emailsSent: integer("emails_sent").notNull().default(0),
    emailOpens: integer("email_opens").notNull().default(0),
    emailClicks: integer("email_clicks").notNull().default(0),
    unsubscribes: integer("unsubscribes").notNull().default(0),

    facebookLeads: integer("facebook_leads").notNull().default(0),
    instagramLeads: integer("instagram_leads").notNull().default(0),
    googleLeads: integer("google_leads").notNull().default(0),
    emailLeads: integer("email_leads").notNull().default(0),
    directLeads: integer("direct_leads").notNull().default(0),
    referralLeads: integer("referral_leads").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userDayUnique: uniqueIndex("business_analytics_daily_user_day_uidx").on(
      table.userId,
      table.day
    ),
    userDayIdx: index("business_analytics_daily_user_day_idx").on(table.userId, table.day),
  })
);

export const campaignAnalyticsDailyTable = pgTable(
  "campaign_analytics_daily",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id").notNull(),
    userId: text("user_id").notNull(),
    day: date("day").notNull(),

    visits: integer("visits").notNull().default(0),
    leads: integer("leads").notNull().default(0),

    emailSent: integer("email_sent").notNull().default(0),
    emailOpened: integer("email_opened").notNull().default(0),
    emailClicked: integer("email_clicked").notNull().default(0),

    sourceFacebook: integer("source_facebook").notNull().default(0),
    sourceInstagram: integer("source_instagram").notNull().default(0),
    sourceGoogle: integer("source_google").notNull().default(0),
    sourceEmail: integer("source_email").notNull().default(0),
    sourceDirect: integer("source_direct").notNull().default(0),
    sourceReferral: integer("source_referral").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    projectDayUnique: uniqueIndex("campaign_analytics_daily_project_day_uidx").on(
      table.projectId,
      table.day
    ),
    projectDayIdx: index("campaign_analytics_daily_project_day_idx").on(
      table.projectId,
      table.day
    ),
    userIdx: index("campaign_analytics_daily_user_idx").on(table.userId),
  })
);

export type BusinessAnalyticsDaily = typeof businessAnalyticsDailyTable.$inferSelect;
export type InsertBusinessAnalyticsDaily = typeof businessAnalyticsDailyTable.$inferInsert;

export type CampaignAnalyticsDaily = typeof campaignAnalyticsDailyTable.$inferSelect;
export type InsertCampaignAnalyticsDaily = typeof campaignAnalyticsDailyTable.$inferInsert;
