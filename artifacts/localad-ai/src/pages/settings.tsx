import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@clerk/react";
import { useToast } from "@/hooks/use-toast";
import { usePlan, PLAN_DISPLAY } from "@/hooks/use-plan";
import {
  User, CreditCard, Building2, Palette, KeyRound, Bell,
  CheckCircle2, Zap, Edit, Trash2, Plus, CalendarDays,
  RefreshCw, Crown, ShieldCheck, AlertTriangle
} from "lucide-react";

const savedProfiles = [
  { id: 1, name: "Mike's Painting", category: "Painting & Coatings", city: "Austin, TX" },
  { id: 2, name: "GreenThumb Landscaping", category: "Landscaping", city: "Phoenix, AZ" },
];

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatAmount(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export default function Settings() {
  const { user } = useUser();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { plan, subscription, isFree, isPro, isAgency, isLoading, openPortal, openCheckout, portalPending, checkoutPending, stripeNotConnected } = usePlan();

  const [notifications, setNotifications] = useState({
    newFeatures: true,
    weeklySummary: false,
    campaignTips: true,
    promotions: false,
  });

  const handleSave = (section: string) => {
    toast({
      title: `${section} updated`,
      description: "Your changes have been saved successfully.",
    });
  };

  const planDisplay = PLAN_DISPLAY[plan] || PLAN_DISPLAY.free;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account, billing, and preferences.</p>
      </div>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="account" className="gap-1.5 text-xs">
            <User className="w-3.5 h-3.5" />
            Account
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-1.5 text-xs">
            <CreditCard className="w-3.5 h-3.5" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="profiles" className="gap-1.5 text-xs">
            <Building2 className="w-3.5 h-3.5" />
            Profiles
          </TabsTrigger>
          <TabsTrigger value="brand" className="gap-1.5 text-xs">
            <Palette className="w-3.5 h-3.5" />
            Brand
          </TabsTrigger>
          <TabsTrigger value="password" className="gap-1.5 text-xs">
            <KeyRound className="w-3.5 h-3.5" />
            Password
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5 text-xs">
            <Bell className="w-3.5 h-3.5" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account Information</CardTitle>
              <CardDescription>Update your personal details and profile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xl font-bold shrink-0">
                  {user?.firstName?.charAt(0) || "U"}
                </div>
                <div>
                  <p className="font-semibold">{user?.firstName} {user?.lastName}</p>
                  <p className="text-sm text-muted-foreground">{user?.emailAddresses[0]?.emailAddress}</p>
                  <Button variant="outline" size="sm" className="mt-2 text-xs h-7">
                    Change Avatar
                  </Button>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input defaultValue={user?.firstName || ""} placeholder="First name" />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input defaultValue={user?.lastName || ""} placeholder="Last name" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Email Address</Label>
                  <Input defaultValue={user?.emailAddresses[0]?.emailAddress || ""} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">Email changes are managed through your authentication provider.</p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => handleSave("Account info")} className="gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-5">

          {/* Current Plan Card */}
          <Card className="overflow-hidden">
            <div className="bg-[hsl(215,75%,9%)] px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {isAgency ? (
                      <Crown className="w-4 h-4 text-violet-400" />
                    ) : isPro ? (
                      <Zap className="w-4 h-4 text-[hsl(213,89%,60%)]" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-white font-bold text-lg">
                      {isLoading ? "Loading..." : planDisplay.label + " Plan"}
                    </span>
                    {subscription?.status === "active" && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                        Active
                      </Badge>
                    )}
                    {subscription?.status === "canceled" && (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                        Canceled
                      </Badge>
                    )}
                    {!subscription && !isLoading && (
                      <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs">
                        Free
                      </Badge>
                    )}
                  </div>
                  <p className="text-white/60 text-sm">
                    {subscription
                      ? `${formatAmount(subscription.unitAmount, subscription.currency)}/month`
                      : "$0/month — no credit card required"}
                  </p>
                </div>
                {subscription && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10 hover:text-white shrink-0 gap-1.5"
                    onClick={() => openPortal()}
                    disabled={portalPending}
                  >
                    {portalPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                    Manage Subscription
                  </Button>
                )}
              </div>
            </div>

            <CardContent className="p-6 space-y-5">
              {/* Subscription details */}
              {subscription && (
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="bg-muted/40 rounded-lg p-4 text-center">
                    <CalendarDays className="w-4 h-4 text-muted-foreground mx-auto mb-1.5" />
                    <div className="text-sm font-semibold">
                      {subscription.cancelAtPeriodEnd ? "Cancels" : "Renews"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(subscription.currentPeriodEnd)}
                    </div>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-4 text-center">
                    <CreditCard className="w-4 h-4 text-muted-foreground mx-auto mb-1.5" />
                    <div className="text-sm font-semibold">
                      {formatAmount(subscription.unitAmount, subscription.currency)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">per month</div>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-4 text-center">
                    <ShieldCheck className="w-4 h-4 text-muted-foreground mx-auto mb-1.5" />
                    <div className="text-sm font-semibold capitalize">{subscription.status}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Billing status</div>
                  </div>
                </div>
              )}

              {subscription?.cancelAtPeriodEnd && (
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Subscription canceling</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Your plan will downgrade to Free on {formatDate(subscription.currentPeriodEnd)}. You keep access until then.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 border-amber-300 text-amber-800 hover:bg-amber-100 text-xs h-7"
                      onClick={() => openPortal()}
                      disabled={portalPending}
                    >
                      Resume Subscription
                    </Button>
                  </div>
                </div>
              )}

              {/* What's included */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Your plan includes
                </p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {isFree ? (
                    <>
                      {["Up to 140 campaigns/mo", "Basic ad generation", "1 business profile", "Copy-to-clipboard export"].map(f => (
                        <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" /> {f}
                        </div>
                      ))}
                    </>
                  ) : isPro && !isAgency ? (
                    <>
                      {["Unlimited campaigns", "Email campaigns & automation", "Contact management (CRM)", "Lead capture forms", "Full exports (PDF, CSV)", "3 business profiles"].map(f => (
                        <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" /> {f}
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      {["Everything in Pro", "Up to 10 client profiles", "Advanced lead tracking", "Bulk campaign generation", "Priority performance analysis", "White-label exports"].map(f => (
                        <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="w-3.5 h-3.5 text-violet-500 shrink-0" /> {f}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upgrade options for free users */}
          {isFree && (
            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="font-bold text-sm">Pro — $29/month</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Unlimited campaigns, email marketing, contact CRM, lead capture forms, and full exports.
                  </p>
                  <Button
                    className="w-full gap-2 h-9 text-sm"
                    onClick={() => setLocation("/pricing")}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Upgrade to Pro
                  </Button>
                </CardContent>
              </Card>
              <Card className="border-violet-200 bg-violet-50/50">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-4 h-4 text-violet-600" />
                    <span className="font-bold text-sm">Agency — $79/month</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Up to 10 client profiles, advanced lead tracking, bulk generation, and white-label exports.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full gap-2 h-9 text-sm border-violet-300 text-violet-700 hover:bg-violet-50"
                    onClick={() => setLocation("/pricing")}
                  >
                    <Crown className="w-3.5 h-3.5" />
                    Upgrade to Agency
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Upgrade to Agency for Pro users */}
          {isPro && !isAgency && (
            <Card className="border-violet-200 bg-violet-50/50">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 bg-violet-100 rounded-lg flex items-center justify-center shrink-0">
                    <Crown className="w-4 h-4 text-violet-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-sm mb-1">Upgrade to Agency — $79/month</h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      Get up to 10 client profiles, advanced lead tracking, bulk generation, and white-label exports.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-violet-300 text-violet-700 hover:bg-violet-100 gap-1.5"
                      onClick={() => setLocation("/pricing")}
                    >
                      <Crown className="w-3.5 h-3.5" />
                      View Agency Plan
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Manage subscription for paid users */}
          {!isFree && subscription && (
            <Card>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-semibold text-sm">Manage your subscription</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Update payment method, download invoices, or cancel your plan via the Stripe billing portal.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openPortal()}
                    disabled={portalPending}
                    className="gap-1.5 shrink-0"
                  >
                    {portalPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
                    Open Billing Portal
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Business Profiles Tab */}
        <TabsContent value="profiles" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Business Profiles</CardTitle>
                  <CardDescription>Manage your saved business profiles</CardDescription>
                </div>
                <Button size="sm" className="gap-1.5 text-xs" disabled={isFree}>
                  <Plus className="w-3.5 h-3.5" />
                  Add Profile
                  {isFree && <Badge variant="secondary" className="text-xs ml-1">Pro</Badge>}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {savedProfiles.map(profile => (
                <div key={profile.id} className="flex items-center justify-between p-4 border rounded-lg hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{profile.name}</p>
                      <p className="text-xs text-muted-foreground">{profile.category} · {profile.city}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="gap-1 text-xs">
                      <Edit className="w-3.5 h-3.5" />
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-1 text-xs text-destructive hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground pt-2">
                Free plan includes 1 profile. Upgrade to Pro for 3 profiles or Agency for 10.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Brand Settings Tab */}
        <TabsContent value="brand" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Default Brand Settings</CardTitle>
              <CardDescription>Set global defaults that apply across all your ad generation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Default Tone</Label>
                <div className="flex flex-wrap gap-2">
                  {["Professional", "Friendly", "Urgent", "Educational", "Bold", "Local"].map(t => (
                    <button
                      key={t}
                      className={`px-3 py-1.5 rounded-full border text-sm transition-all ${
                        t === "Professional" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold">Default Platform</Label>
                <div className="flex flex-wrap gap-2">
                  {["Facebook", "Instagram", "Google", "Flyer", "Landing Page"].map(p => (
                    <button
                      key={p}
                      className={`px-3 py-1.5 rounded-full border text-sm transition-all ${
                        p === "Facebook" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave("Brand settings")} className="gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Save Defaults
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Password Tab */}
        <TabsContent value="password" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Change Password</CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input type="password" placeholder="Enter current password" />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" placeholder="Enter new password" />
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input type="password" placeholder="Confirm new password" />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => handleSave("Password")} className="gap-2">
                  <KeyRound className="w-4 h-4" />
                  Update Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notification Preferences</CardTitle>
              <CardDescription>Choose what emails and alerts you receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  key: "newFeatures" as const,
                  label: "New Features & Updates",
                  desc: "Be the first to know about new platforms, tools, and features"
                },
                {
                  key: "weeklySummary" as const,
                  label: "Weekly Summary",
                  desc: "A weekly recap of your campaign performance and activity"
                },
                {
                  key: "campaignTips" as const,
                  label: "Campaign Tips & Ideas",
                  desc: "Seasonal ad ideas and copywriting tips for your industry"
                },
                {
                  key: "promotions" as const,
                  label: "Promotions & Offers",
                  desc: "Special discounts and upgrade offers"
                },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="flex-1 mr-8">
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                  <Switch
                    checked={notifications[item.key]}
                    onCheckedChange={val => setNotifications(prev => ({ ...prev, [item.key]: val }))}
                  />
                </div>
              ))}
              <div className="flex justify-end pt-2">
                <Button onClick={() => handleSave("Notification preferences")} className="gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
