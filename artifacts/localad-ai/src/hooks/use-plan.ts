import { useQuery, useMutation } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { useEffect } from "react";
import { PLAN_CONFIG, CREDIT_COSTS as CC, type PlanKey as CPlanKey, PLAN_ENTITLEMENTS, getPlanEntitlements } from "@workspace/credits";
import { identifyAnalyticsUser } from "@/lib/analytics";

const API = "/api";

export type PlanKey = CPlanKey;

export interface PlanLimits {
  campaigns: number;
  emailCampaigns: boolean;
  contacts: boolean;
  multiProfile: boolean;
  maxProfiles: number;
  fullExports: boolean;
}

const PLAN_LIMITS: Record<PlanKey, PlanLimits> = {
  free: {
    campaigns: 3,
    emailCampaigns: false,
    contacts: false,
    multiProfile: false,
    maxProfiles: 1,
    fullExports: false,
  },
  pro: {
    campaigns: Infinity,
    emailCampaigns: true,
    contacts: true,
    multiProfile: false,
    maxProfiles: 3,
    fullExports: true,
  },
  agency: {
    campaigns: Infinity,
    emailCampaigns: true,
    contacts: true,
    multiProfile: true,
    maxProfiles: 10,
    fullExports: true,
  },
  full_access: {
    campaigns: Infinity,
    emailCampaigns: true,
    contacts: true,
    multiProfile: true,
    maxProfiles: 25,
    fullExports: true,
  },
};

export const PLAN_CREDIT_LIMITS: Record<PlanKey, number> = {
  free: PLAN_CONFIG.FREE.monthlyCredits,
  pro: PLAN_CONFIG.PRO.monthlyCredits,
  agency: PLAN_CONFIG.AGENCY.monthlyCredits,
  full_access: PLAN_CONFIG.FULL_ACCESS.monthlyCredits,
};

export const CREDIT_COSTS = {
  campaign: CC.FULL_CAMPAIGN,
  ad: CC.AD_GENERATION,
  landingPage: CC.LANDING_PAGE,
  emailCampaign: CC.EMAIL_CAMPAIGN,
  followUp: CC.SMS_FOLLOWUP,
  headlines: CC.AD_GENERATION,
  ctas: CC.AD_GENERATION,
} as const;

export const PLAN_DISPLAY: Record<PlanKey, { label: string; price: string; color: string }> = {
  free: { label: "Free", price: "$0/mo", color: "text-slate-500" },
  pro: { label: "Pro", price: "$29/mo", color: "text-blue-600" },
  agency: { label: "Agency", price: "$69/mo", color: "text-violet-600" },
  full_access: { label: "Full Access", price: "$99/mo", color: "text-amber-500" },
};

async function apiPost(path: string, body?: object) {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || "Request failed");
  }
  return res.json();
}

export function usePlan() {
  const { isLoaded, isSignedIn } = useUser();

  const { data: subData, isLoading: subLoading } = useQuery({
    queryKey: ["billing-subscription"],
    queryFn: async () => {
      const res = await fetch(`${API}/stripe/subscription`, { credentials: "include" });
      if (!res.ok) return { plan: "free" as PlanKey };
      return res.json() as Promise<{
        plan: PlanKey;
        subscription: {
          id: string;
          status: string;
          currentPeriodEnd: number;
          cancelAtPeriodEnd: boolean;
          unitAmount: number;
          currency: string;
          productName: string;
          priceId: string;
        } | null;
        stripeNotConnected?: boolean;
      }>;
    },
    enabled: isLoaded && !!isSignedIn,
    staleTime: 5 * 60 * 1000,
  });

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const res = await fetch(`${API}/user/profile`, { credentials: "include" });
      if (!res.ok) return {
        projectsCount: 0,
        plan: "free" as PlanKey,
        credits: 0,
        addonCredits: 0,
        totalCredits: 0,
        planCreditLimit: 20,
        creditsResetAt: null as string | null,
        role: "user",
        imageGenerationsUsed: 0,
        refinementsUsed: 0,
        exportsUsed: 0,
        imageTrialUsed: false,
      };
      return res.json() as Promise<{
        projectsCount: number;
        plan: PlanKey;
        credits: number;
        addonCredits: number;
        totalCredits: number;
        planCreditLimit: number;
        creditsResetAt: string | null;
        role: string;
        imageGenerationsUsed: number;
        refinementsUsed: number;
        exportsUsed: number;
        imageTrialUsed: boolean;
      }>;
    },
    enabled: isLoaded && !!isSignedIn,
    staleTime: 60 * 1000,
  });

  const checkoutMutation = useMutation({
    mutationFn: (priceId: string) => apiPost("/stripe/checkout", { priceId }),
    onSuccess: (data: any) => {
      if (data.url) window.location.href = data.url;
    },
  });

  const portalMutation = useMutation({
    mutationFn: () => apiPost("/stripe/portal"),
    onSuccess: (data: any) => {
      if (data.url) window.location.href = data.url;
    },
  });

  const { user } = useUser();

  const plan: PlanKey = (subData?.plan || "free") as PlanKey;
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const entitlements = getPlanEntitlements(plan);
  const campaignCount = profileData?.projectsCount ?? 0;
  const isAtCampaignLimit = plan === "free" && campaignCount >= limits.campaigns;
  const credits = profileData?.credits ?? 0;
  const addonCredits = profileData?.addonCredits ?? 0;
  const totalCredits = profileData?.totalCredits ?? (credits + addonCredits);
  const planCreditLimit = profileData?.planCreditLimit ?? PLAN_CREDIT_LIMITS[plan];
  const creditsResetAt = profileData?.creditsResetAt ?? null;
  const isAdmin = profileData?.role === "admin";

  useEffect(() => {
    if (!user?.id || !profileData) return;
    identifyAnalyticsUser({
      id: user.id,
      email: user.primaryEmailAddress?.emailAddress,
      currentPlan: plan,
      creditsRemaining: profileData.credits + (profileData.addonCredits ?? 0),
      signupDate: user.createdAt ? new Date(user.createdAt).toISOString() : undefined,
      role: profileData.role,
    });
  }, [user?.id, plan, profileData?.credits]);

  const creditsUsedThisPeriod = Math.max(0, planCreditLimit - credits);
  const estimatedCampaignsLeft = Math.floor(totalCredits / CREDIT_COSTS.campaign);
  const lowCreditThreshold = Math.max(5, Math.floor(planCreditLimit * 0.2));
  const isLowCredits = totalCredits <= lowCreditThreshold && totalCredits > 0;
  const isOutOfCredits = totalCredits < CREDIT_COSTS.campaign;

  const imageGenerationsUsed = profileData?.imageGenerationsUsed ?? 0;
  const refinementsUsed = profileData?.refinementsUsed ?? 0;
  const exportsUsed = profileData?.exportsUsed ?? 0;
  const imageTrialUsed = profileData?.imageTrialUsed ?? false;

  return {
    plan,
    limits,
    entitlements,
    isPro: plan === "pro" || plan === "agency" || plan === "full_access",
    isAgency: plan === "agency" || plan === "full_access",
    isFullAccess: plan === "full_access",
    isFree: plan === "free",
    isAdmin,
    credits,
    addonCredits,
    totalCredits,
    planCreditLimit,
    creditsResetAt,
    creditsUsedThisPeriod,
    estimatedCampaignsLeft,
    isLowCredits,
    isOutOfCredits,
    campaignCount,
    isAtCampaignLimit,
    canCreateCampaign: !isAtCampaignLimit,
    canUseEmail: limits.emailCampaigns,
    canUseContacts: limits.contacts,
    canUseMultiProfile: limits.multiProfile,
    canUseAdCreator: entitlements.aiAdCreatorAccess || !imageTrialUsed,
    imageGenerationsUsed,
    refinementsUsed,
    exportsUsed,
    imageTrialUsed,
    subscription: subData?.subscription ?? null,
    stripeNotConnected: subData?.stripeNotConnected ?? false,
    isLoading: subLoading || profileLoading,
    openCheckout: (priceId: string) => checkoutMutation.mutate(priceId),
    openPortal: () => portalMutation.mutate(),
    checkoutPending: checkoutMutation.isPending,
    portalPending: portalMutation.isPending,
  };
}
