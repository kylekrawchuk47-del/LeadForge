// ─── Plan Types ───────────────────────────────────────────────────────────────

export type UserPlan = "free" | "pro" | "agency" | "full_access";
export type PlanKey = UserPlan;

// ─── Plan Prices ──────────────────────────────────────────────────────────────

export const PLAN_PRICES = {
  free: 0,
  pro: 29,
  agency: 69,
  full_access: 99,
} as const;

// ─── Plan Entitlements ────────────────────────────────────────────────────────

export type PlanEntitlements = {
  aiImageTrialGenerations: number;
  aiAdCreatorAccess: boolean;
  aiFlyerAccess: boolean;
  logoGeneratorAccess: boolean;
  socialPostGeneratorAccess: boolean;
  premiumTemplates: boolean;
  monthlyImageGenerations: number;
  monthlyRefinements: number;
  exportsPerMonth: number;
  adPlatformIntegrations: boolean;
  teamSeats?: number;
  allToolsAccess?: boolean;
  priorityAccess?: boolean;
};

export const PLAN_ENTITLEMENTS: Record<UserPlan, PlanEntitlements> = {
  free: {
    aiImageTrialGenerations: 1,
    aiAdCreatorAccess: false,
    aiFlyerAccess: false,
    logoGeneratorAccess: false,
    socialPostGeneratorAccess: false,
    premiumTemplates: false,
    monthlyImageGenerations: 0,
    monthlyRefinements: 0,
    exportsPerMonth: 3,
    adPlatformIntegrations: false,
  },
  pro: {
    aiImageTrialGenerations: 0,
    aiAdCreatorAccess: true,
    aiFlyerAccess: true,
    logoGeneratorAccess: true,
    socialPostGeneratorAccess: true,
    premiumTemplates: false,
    monthlyImageGenerations: 40,
    monthlyRefinements: 80,
    exportsPerMonth: 40,
    adPlatformIntegrations: false,
  },
  agency: {
    aiImageTrialGenerations: 0,
    aiAdCreatorAccess: true,
    aiFlyerAccess: true,
    logoGeneratorAccess: true,
    socialPostGeneratorAccess: true,
    premiumTemplates: true,
    monthlyImageGenerations: 120,
    monthlyRefinements: 240,
    exportsPerMonth: 120,
    adPlatformIntegrations: true,
    teamSeats: 3,
  },
  full_access: {
    aiImageTrialGenerations: 0,
    aiAdCreatorAccess: true,
    aiFlyerAccess: true,
    logoGeneratorAccess: true,
    socialPostGeneratorAccess: true,
    premiumTemplates: true,
    monthlyImageGenerations: 300,
    monthlyRefinements: 600,
    exportsPerMonth: 300,
    adPlatformIntegrations: true,
    teamSeats: 10,
    allToolsAccess: true,
    priorityAccess: true,
  },
};

// ─── Legacy Credits Config (Campaign Builder) ─────────────────────────────────

export const PLAN_CONFIG = {
  FREE: {
    name: "Free",
    monthlyCredits: 20,
    monthlyPrice: PLAN_PRICES.free,
    estimatedCampaigns: 4,
  },
  PRO: {
    name: "Pro",
    monthlyCredits: 200,
    monthlyPrice: PLAN_PRICES.pro,
    estimatedCampaigns: 40,
  },
  AGENCY: {
    name: "Agency",
    monthlyCredits: 700,
    monthlyPrice: PLAN_PRICES.agency,
    estimatedCampaigns: 140,
  },
  FULL_ACCESS: {
    name: "Full Access",
    monthlyCredits: 1000,
    monthlyPrice: PLAN_PRICES.full_access,
    estimatedCampaigns: 200,
  },
} as const;

export const CREDIT_COSTS = {
  FULL_CAMPAIGN: 5,
  AD_GENERATION: 2,
  LANDING_PAGE: 2,
  EMAIL_CAMPAIGN: 2,
  SMS_FOLLOWUP: 1,
} as const;

export const TOPUP_CREDITS = {
  TOPUP_100: 100,
  TOPUP_300: 300,
  TOPUP_1000: 1000,
} as const;

export const PLAN_CONFIG_BY_KEY: Record<
  PlanKey,
  { name: string; monthlyCredits: number; monthlyPrice: number; estimatedCampaigns: number }
> = {
  free: PLAN_CONFIG.FREE,
  pro: PLAN_CONFIG.PRO,
  agency: PLAN_CONFIG.AGENCY,
  full_access: PLAN_CONFIG.FULL_ACCESS,
};

export function getPlanCreditLimit(plan: string): number {
  return PLAN_CONFIG_BY_KEY[plan as PlanKey]?.monthlyCredits ?? PLAN_CONFIG.FREE.monthlyCredits;
}

export function getPlanEntitlements(plan: string): PlanEntitlements {
  return PLAN_ENTITLEMENTS[plan as UserPlan] ?? PLAN_ENTITLEMENTS.free;
}
