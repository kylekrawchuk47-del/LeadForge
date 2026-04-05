import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { useLocation } from "wouter";
import { usePlan } from "@/hooks/use-plan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  LayoutDashboard,
  Coins,
  Search,
  Trash2,
  RefreshCw,
  ShieldCheck,
  Crown,
  Zap,
  Plus,
  Minus,
  Check,
  X,
  Shield,
  TrendingUp,
  Mail,
  MousePointerClick,
  Activity,
  BarChart2,
  CreditCard,
} from "lucide-react";

const API = "/api";

type AdminUser = {
  id: number;
  clerkUserId: string;
  email: string;
  plan: string;
  role: string;
  credits: number;
  projectsCount: number;
  createdAt: string;
};

type AdminStats = {
  totalUsers: number;
  totalProjects: number;
  projectsThisMonth: number;
  projectsToday: number;
  freeUsers: number;
  proUsers: number;
  agencyUsers: number;
  adminUsers: number;
};

type InternalSummary = {
  totalSignups: number;
  checkoutStarts: number;
  activeSubscriptions: number;
  campaignGenerations: number;
  pricingViews: number;
  upgradeClicks: number;
  rawCounts: Record<string, number>;
};

const PLAN_COLORS: Record<string, string> = {
  free: "bg-gray-100 text-gray-600",
  pro: "bg-blue-100 text-blue-700",
  agency: "bg-violet-100 text-violet-700",
};

const ROLE_COLORS: Record<string, string> = {
  user: "bg-slate-100 text-slate-600",
  admin: "bg-red-100 text-red-700",
};

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <div className="bg-card border border-border/30 rounded-2xl p-5 shadow-sm">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-black ${color || "text-[hsl(215,75%,9%)]"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function CreditsEditor({ userId, current, onUpdate }: { userId: number; current: number; onUpdate: (id: number, credits: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(current));

  if (!editing) {
    return (
      <button
        onClick={() => { setVal(String(current)); setEditing(true); }}
        className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 hover:text-blue-600 transition-colors group"
      >
        <Coins className="w-3.5 h-3.5 text-amber-500" />
        {current.toLocaleString()}
        <span className="text-xs text-gray-400 group-hover:text-blue-500">(edit)</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        value={val}
        onChange={e => setVal(e.target.value)}
        className="w-24 h-7 text-sm px-2"
        min={0}
        autoFocus
      />
      <button
        className="p-1 text-green-600 hover:bg-green-50 rounded"
        onClick={() => {
          const n = parseInt(val);
          if (!isNaN(n) && n >= 0) { onUpdate(userId, n); setEditing(false); }
        }}
      >
        <Check className="w-4 h-4" />
      </button>
      <button
        className="p-1 text-gray-400 hover:bg-gray-100 rounded"
        onClick={() => setEditing(false)}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function AdminPanel() {
  const { isAdmin, isLoading: planLoading } = usePlan();
  const { getToken, userId: currentClerkId } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");

  async function apiFetch(path: string, options: RequestInit = {}) {
    const token = await getToken();
    return fetch(`${API}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
  }

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await apiFetch("/admin/stats");
      if (!res.ok) throw new Error("Failed to load stats");
      return res.json();
    },
    enabled: isAdmin,
  });

  const { data: analyticsData } = useQuery<InternalSummary>({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const res = await apiFetch("/analytics/internal-summary");
      if (!res.ok) throw new Error("Failed to load analytics");
      return res.json();
    },
    enabled: isAdmin,
    staleTime: 2 * 60 * 1000,
  });

  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await apiFetch("/admin/users");
      if (!res.ok) throw new Error("Failed to load users");
      return res.json();
    },
    enabled: isAdmin,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: number; updates: Record<string, any> }) => {
      const res = await apiFetch(`/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast({ title: "User updated" });
    },
    onError: () => toast({ title: "Failed to update user", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiFetch(`/admin/users/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete user");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      toast({ title: "User deleted" });
    },
    onError: () => toast({ title: "Failed to delete user", variant: "destructive" }),
  });

  if (!planLoading && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Shield className="w-12 h-12 text-red-400 mb-4" />
        <h2 className="text-xl font-bold mb-2">Admin Access Only</h2>
        <p className="text-gray-500 mb-6">You don't have permission to view this page.</p>
        <Button onClick={() => setLocation("/dashboard")}>Back to Dashboard</Button>
      </div>
    );
  }

  const filtered = users.filter(u => {
    const matchesSearch = !search || u.email.toLowerCase().includes(search.toLowerCase());
    const matchesPlan = planFilter === "all" || u.plan === planFilter;
    return matchesSearch && matchesPlan;
  });

  return (
    <div className="space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-red-500" />
            Admin Panel
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage users, credits, and plans across LeadForge.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
            queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
          }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={stats.totalUsers} sub={`${stats.adminUsers} admin`} />
          <StatCard label="Total Campaigns" value={stats.totalProjects} sub={`${stats.projectsToday} today`} />
          <StatCard label="Pro Users" value={stats.proUsers} color="text-blue-600" />
          <StatCard label="Agency Users" value={stats.agencyUsers} color="text-violet-600" />
        </div>
      )}

      {/* Plan breakdown */}
      {stats && (
        <div className="bg-card border border-border/30 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Plan Distribution</p>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="h-2.5 rounded-full bg-gray-300" style={{ width: `${Math.max((stats.freeUsers / stats.totalUsers) * 200, 8)}px` }} />
              <span className="text-sm text-gray-600">{stats.freeUsers} Free</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 rounded-full bg-blue-500" style={{ width: `${Math.max((stats.proUsers / stats.totalUsers) * 200, 8)}px` }} />
              <span className="text-sm text-blue-700">{stats.proUsers} Pro</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 rounded-full bg-violet-500" style={{ width: `${Math.max((stats.agencyUsers / stats.totalUsers) * 200, 8)}px` }} />
              <span className="text-sm text-violet-700">{stats.agencyUsers} Agency</span>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Funnel */}
      {analyticsData && (
        <div className="bg-card border border-border/30 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-blue-500" />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Product Analytics (Last 30 Days)</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { label: "Pricing Views", value: analyticsData.pricingViews, icon: Activity, color: "text-cyan-500" },
              { label: "Upgrade Clicks", value: analyticsData.upgradeClicks, icon: MousePointerClick, color: "text-blue-500" },
              { label: "Checkout Starts", value: analyticsData.checkoutStarts, icon: CreditCard, color: "text-amber-500" },
              { label: "New Signups", value: analyticsData.totalSignups, icon: Users, color: "text-green-500" },
              { label: "Active Subs", value: analyticsData.activeSubscriptions, icon: TrendingUp, color: "text-violet-500" },
              { label: "Campaigns Gen.", value: analyticsData.campaignGenerations, icon: Zap, color: "text-orange-500" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-border/30 p-3 text-center">
                <item.icon className={`w-4 h-4 mx-auto mb-1.5 ${item.color}`} />
                <p className="text-xl font-black text-foreground">{item.value.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground font-medium leading-tight mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
          {analyticsData.totalSignups > 0 && analyticsData.checkoutStarts > 0 && (
            <div className="mt-4 pt-4 border-t border-border/20 flex gap-6 text-xs text-muted-foreground">
              <span>
                Pricing → Checkout:{" "}
                <strong className="text-foreground">
                  {analyticsData.pricingViews > 0
                    ? `${Math.round((analyticsData.checkoutStarts / analyticsData.pricingViews) * 100)}%`
                    : "—"}
                </strong>
              </span>
              <span>
                Checkout → Active:{" "}
                <strong className="text-foreground">
                  {analyticsData.checkoutStarts > 0
                    ? `${Math.round((analyticsData.activeSubscriptions / analyticsData.checkoutStarts) * 100)}%`
                    : "—"}
                </strong>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Users table */}
      <div className="bg-card border border-border/30 rounded-2xl shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-100 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              placeholder="Search by email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="h-8 text-sm w-32">
              <SelectValue placeholder="All plans" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All plans</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="agency">Agency</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-gray-400">{filtered.length} users</span>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            Loading users...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No users found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Credits</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Campaigns</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Joined</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors group">
                    {/* Email */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[hsl(215,75%,9%)] flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {u.email?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <span className="font-medium text-gray-800 text-sm">{u.email || <span className="text-gray-400 italic">No email</span>}</span>
                      </div>
                    </td>

                    {/* Plan */}
                    <td className="px-4 py-3.5">
                      <Select
                        value={u.plan}
                        onValueChange={val => updateMutation.mutate({ userId: u.id, updates: { plan: val } })}
                      >
                        <SelectTrigger className="h-7 text-xs border-0 bg-transparent p-0 w-auto gap-1 focus:ring-0">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${PLAN_COLORS[u.plan] || "bg-gray-100 text-gray-600"}`}>
                            {u.plan}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                          <SelectItem value="agency">Agency</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3.5">
                      {u.clerkUserId === currentClerkId ? (
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[u.role] || "bg-gray-100 text-gray-600"}`}>
                            {u.role}
                          </span>
                          <span className="text-xs text-gray-400 italic">(you)</span>
                        </div>
                      ) : (
                        <Select
                          value={u.role}
                          onValueChange={val => updateMutation.mutate({ userId: u.id, updates: { role: val } })}
                        >
                          <SelectTrigger className="h-7 text-xs border-0 bg-transparent p-0 w-auto gap-1 focus:ring-0">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[u.role] || "bg-gray-100 text-gray-600"}`}>
                              {u.role}
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">user</SelectItem>
                            <SelectItem value="admin">admin</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </td>

                    {/* Credits */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <CreditsEditor
                          userId={u.id}
                          current={u.credits}
                          onUpdate={(id, credits) => updateMutation.mutate({ userId: id, updates: { credits } })}
                        />
                        <button
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-green-500 hover:bg-green-50 rounded transition-all"
                          title="Add 100 credits"
                          onClick={() => updateMutation.mutate({ userId: u.id, updates: { creditsAdjustment: 100 } })}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-red-400 hover:bg-red-50 rounded transition-all"
                          title="Subtract 100 credits"
                          onClick={() => updateMutation.mutate({ userId: u.id, updates: { creditsAdjustment: -100 } })}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Campaigns */}
                    <td className="px-4 py-3.5 text-gray-600">{u.projectsCount}</td>

                    {/* Joined */}
                    <td className="px-4 py-3.5 text-gray-400 text-xs">
                      {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>

                    {/* Delete */}
                    <td className="px-4 py-3.5 text-right">
                      {u.role !== "admin" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete user?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete <strong>{u.email}</strong> and all their campaigns. This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => deleteMutation.mutate(u.id)}
                              >
                                Delete User
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
