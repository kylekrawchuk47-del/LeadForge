import React, { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import NotFound from "@/pages/not-found";
import AppLayout from "@/components/layout/app-layout";
import { initAnalytics, initPlausibleAnalytics } from "@/lib/app-init";
import { Analytics } from "@/lib/analytics";

import LandingPage from "@/pages/landing";
import PricingPage from "@/pages/pricing";
import Dashboard from "@/pages/dashboard";
import BusinessProfile from "@/pages/business-profile";
import CampaignBuilder from "@/pages/ad-generator";
import SavedCampaigns from "@/pages/saved-campaigns";
import CampaignOutputs from "@/pages/exports";
import Settings from "@/pages/settings";
import Onboarding from "@/pages/onboarding";
import Contacts from "@/pages/contacts";
import EmailCampaigns from "@/pages/email-campaigns";
import EmailCampaignBuilder from "@/pages/email-campaign-builder";
import BillingPage from "@/pages/billing";
import CheckoutSuccess from "@/pages/checkout-success";
import CheckoutCancel from "@/pages/checkout-cancel";
import AdminPanel from "@/pages/admin";
import AnalyticsPage from "@/pages/analytics";
import AdPlatformsPage from "@/pages/ad-platforms";
import ShowcasePage from "@/pages/showcase";
import AiAdCreator from "@/pages/ai-ad-creator";

// Initialize analytics on module load
initAnalytics();
initPlausibleAnalytics();

const queryClient = new QueryClient();

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

function SignInPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  useEffect(() => {
    Analytics.signupStarted();
  }, []);
  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        afterSignUpUrl={`${basePath}/onboarding`}
      />
    </div>
  );
}

function OnboardingRoute() {
  return (
    <>
      <Show when="signed-in"><Onboarding /></Show>
      <Show when="signed-out"><Redirect to="/sign-in" /></Show>
    </>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in"><Redirect to="/dashboard" /></Show>
      <Show when="signed-out"><LandingPage /></Show>
    </>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <>
      <Show when="signed-in">
        <AppLayout>
          <Component />
        </AppLayout>
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route path="/onboarding" component={OnboardingRoute} />
          <Route path="/pricing" component={PricingPage} />
          <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
          <Route path="/business-profile" component={() => <ProtectedRoute component={BusinessProfile} />} />
          <Route path="/generate" component={() => <ProtectedRoute component={CampaignBuilder} />} />
          <Route path="/campaigns" component={() => <ProtectedRoute component={SavedCampaigns} />} />
          <Route path="/exports" component={() => <ProtectedRoute component={CampaignOutputs} />} />
          <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
          <Route path="/leads" component={() => <Redirect to="/contacts" />} />
          <Route path="/contacts" component={() => <ProtectedRoute component={Contacts} />} />
          <Route path="/email-campaigns/new" component={() => <ProtectedRoute component={EmailCampaignBuilder} />} />
          <Route path="/email-campaigns" component={() => <ProtectedRoute component={EmailCampaigns} />} />
          <Route path="/billing" component={() => <ProtectedRoute component={BillingPage} />} />
          <Route path="/admin" component={() => <ProtectedRoute component={AdminPanel} />} />
          <Route path="/analytics" component={() => <ProtectedRoute component={AnalyticsPage} />} />
          <Route path="/ad-platforms" component={() => <ProtectedRoute component={AdPlatformsPage} />} />
          <Route path="/showcase" component={() => <ProtectedRoute component={ShowcasePage} />} />
          <Route path="/ad-creator" component={() => <ProtectedRoute component={AiAdCreator} />} />
          <Route path="/checkout/success" component={CheckoutSuccess} />
          <Route path="/checkout/cancel" component={CheckoutCancel} />
          <Route component={NotFound} />
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
