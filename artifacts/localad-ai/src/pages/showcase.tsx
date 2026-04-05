import { useState, useEffect } from "react";
import { useSearch, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import {
  Instagram, Link2, RefreshCw, Unlink, ExternalLink,
  ImageOff, Loader2, AlertTriangle, X, CheckCircle2,
  Camera, Grid3X3, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const API = "/api";
const BG   = "#060A14";
const CARD = "#0C1528";
const CYAN  = "#19D3FF";
const GREEN = "#3DD13D";
const EMBER = "#FF7A1A";

type SocialPlatform = "facebook" | "instagram";

interface SocialConn {
  id: number;
  platform: SocialPlatform;
  username: string | null;
  displayName: string | null;
  createdAt: string;
}

interface Post {
  id: number;
  platform: SocialPlatform;
  externalPostId: string;
  caption: string | null;
  mediaType: string | null;
  mediaUrl: string | null;
  permalink: string | null;
  thumbnailUrl: string | null;
  postTimestamp: string | null;
}

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-xs border"
      style={{ background: "rgba(239,68,68,0.07)", borderColor: "rgba(239,68,68,0.25)", color: "#f87171" }}>
      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="shrink-0 hover:opacity-70 transition-opacity">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export default function ShowcasePage() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const searchStr = useSearch();
  const [, setLocation] = useLocation();
  const [connectError, setConnectError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(searchStr);
    const connected = params.get("social_connected") as SocialPlatform | null;
    const error = params.get("error");
    if (connected) {
      toast({ title: `${connected === "instagram" ? "Instagram" : "Facebook"} connected!`, description: "Sync your posts to populate your showcase." });
      qc.invalidateQueries({ queryKey: ["social-connections"] });
      qc.invalidateQueries({ queryKey: ["showcase"] });
      setLocation("/showcase", { replace: true });
    }
    if (error) {
      setConnectError(decodeURIComponent(error));
      setLocation("/showcase", { replace: true });
    }
  }, [searchStr]);

  async function apiFetch(path: string, options: RequestInit = {}) {
    const token = await getToken();
    return fetch(`${API}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    });
  }

  // Connections
  const { data: connections = [], isLoading: connsLoading } = useQuery<SocialConn[]>({
    queryKey: ["social-connections"],
    queryFn: async () => {
      const res = await apiFetch("/social/connections");
      return res.ok ? res.json() : [];
    },
    staleTime: 60_000,
  });

  // Showcase posts
  const { data: showcaseData, isLoading: postsLoading } = useQuery<{ posts: Post[]; connections: SocialConn[] }>({
    queryKey: ["showcase"],
    queryFn: async () => {
      const res = await apiFetch("/showcase");
      if (!res.ok) return { posts: [], connections: [] };
      return res.json();
    },
    staleTime: 5 * 60_000,
  });

  const posts = showcaseData?.posts ?? [];
  const igConn = connections.find((c) => c.platform === "instagram");
  const fbConn = connections.find((c) => c.platform === "facebook");
  const anyConn = igConn ?? fbConn;

  // Connect mutation
  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/social/meta/auth-url");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to get authorization URL");
      window.location.href = data.url;
    },
    onError: (err: Error) => setConnectError(err.message),
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async (platform: SocialPlatform) => {
      const res = await apiFetch("/social/disconnect", {
        method: "POST",
        body: JSON.stringify({ platform }),
      });
      if (!res.ok) throw new Error("Failed to disconnect");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social-connections"] });
      qc.invalidateQueries({ queryKey: ["showcase"] });
      toast({ title: "Disconnected" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      setSyncError(null);
      const platform = igConn ? "instagram" : "facebook";
      const res = await apiFetch("/social/sync", {
        method: "POST",
        body: JSON.stringify({ platform }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      return data as { ok: boolean; synced: number };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["showcase"] });
      toast({ title: `Synced ${data.synced} posts`, description: "Your showcase has been updated." });
    },
    onError: (err: Error) => setSyncError(err.message),
  });

  return (
    <div className="space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(25,211,255,0.1)" }}>
              <Camera className="w-4.5 h-4.5" style={{ color: CYAN }} />
            </div>
            Showcase
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your Instagram or Facebook Page and sync your best work into a portfolio gallery.
          </p>
        </div>

        {/* Connect / Sync actions */}
        <div className="flex items-center gap-2 shrink-0">
          {anyConn && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}>
              <RefreshCw className={`w-3.5 h-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
              {syncMutation.isPending ? "Syncing…" : "Sync Posts"}
            </Button>
          )}
          {!anyConn && (
            <Button size="sm" className="gap-1.5 text-xs font-bold h-8"
              style={{ background: "linear-gradient(135deg, #E1306C, #833AB4)", color: "white" }}
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending}>
              {connectMutation.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Instagram className="w-3.5 h-3.5" />
              }
              Connect Instagram
            </Button>
          )}
        </div>
      </div>

      {/* Error banners */}
      {connectError && <ErrorBanner message={connectError} onDismiss={() => setConnectError(null)} />}
      {syncError && <ErrorBanner message={syncError} onDismiss={() => setSyncError(null)} />}

      {/* Connection cards */}
      <div className="grid sm:grid-cols-2 gap-3">
        {/* Instagram */}
        {(() => {
          const conn = igConn;
          const isConnected = !!conn;
          return (
            <div className="rounded-2xl border p-4 flex items-center gap-3"
              style={{
                background: CARD,
                borderColor: isConnected ? "rgba(225,48,108,0.3)" : "rgba(255,255,255,0.07)",
              }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: isConnected ? "rgba(225,48,108,0.12)" : "rgba(255,255,255,0.05)" }}>
                <Instagram className="w-5 h-5" style={{ color: isConnected ? "#E1306C" : "rgba(255,255,255,0.3)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">Instagram</p>
                {conn
                  ? <p className="text-xs text-muted-foreground truncate">@{conn.username ?? conn.displayName ?? conn.id}</p>
                  : <p className="text-xs text-muted-foreground">Not connected</p>
                }
              </div>
              {isConnected ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-full"
                    style={{ background: "rgba(61,209,61,0.1)", color: GREEN, border: "1px solid rgba(61,209,61,0.2)" }}>
                    <CheckCircle2 className="w-3 h-3" /> Connected
                  </div>
                  <button
                    className="text-muted-foreground hover:text-red-400 transition-colors p-1"
                    onClick={() => disconnectMutation.mutate("instagram")}
                    title="Disconnect">
                    <Unlink className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="text-xs h-7 px-3 gap-1"
                  onClick={() => connectMutation.mutate()}
                  disabled={connectMutation.isPending}>
                  {connectMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
                  Connect
                </Button>
              )}
            </div>
          );
        })()}

        {/* Facebook */}
        {(() => {
          const conn = fbConn;
          const isConnected = !!conn;
          return (
            <div className="rounded-2xl border p-4 flex items-center gap-3"
              style={{
                background: CARD,
                borderColor: isConnected ? "rgba(24,119,242,0.3)" : "rgba(255,255,255,0.07)",
              }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: isConnected ? "rgba(24,119,242,0.12)" : "rgba(255,255,255,0.05)" }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill={isConnected ? "#1877F2" : "rgba(255,255,255,0.3)"}>
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">Facebook Page</p>
                {conn
                  ? <p className="text-xs text-muted-foreground truncate">{conn.displayName ?? conn.id}</p>
                  : <p className="text-xs text-muted-foreground">Connected via Instagram link</p>
                }
              </div>
              {isConnected ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-full"
                    style={{ background: "rgba(61,209,61,0.1)", color: GREEN, border: "1px solid rgba(61,209,61,0.2)" }}>
                    <CheckCircle2 className="w-3 h-3" /> Connected
                  </div>
                  <button
                    className="text-muted-foreground hover:text-red-400 transition-colors p-1"
                    onClick={() => disconnectMutation.mutate("facebook")}
                    title="Disconnect">
                    <Unlink className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">Auto-linked</p>
              )}
            </div>
          );
        })()}
      </div>

      {/* Posts grid */}
      {postsLoading || connsLoading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: CYAN }} />
          Loading showcase…
        </div>
      ) : posts.length > 0 ? (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Grid3X3 className="w-4 h-4" style={{ color: CYAN }} />
            <span className="text-sm font-bold text-foreground">{posts.length} posts</span>
            <span className="text-xs text-muted-foreground">· click any post to view on {anyConn?.platform}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {posts.map((post) => {
              const thumb = post.thumbnailUrl ?? post.mediaUrl;
              return (
                <a key={post.id}
                  href={post.permalink ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-2xl border overflow-hidden transition-all duration-200 hover:border-[#19D3FF]/30 hover:shadow-lg block"
                  style={{
                    background: CARD,
                    borderColor: "rgba(255,255,255,0.07)",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
                  }}>
                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden"
                    style={{ background: "rgba(0,0,0,0.4)" }}>
                    {thumb ? (
                      <img src={thumb} alt={post.caption ?? "Showcase post"}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageOff className="w-8 h-8 text-muted-foreground opacity-40" />
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center">
                      <ExternalLink className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    </div>
                    {/* Media type badge */}
                    {post.mediaType && post.mediaType !== "IMAGE" && (
                      <div className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: "rgba(0,0,0,0.6)", color: "rgba(255,255,255,0.8)" }}>
                        {post.mediaType === "VIDEO" ? "▶" : post.mediaType === "CAROUSEL_ALBUM" ? "◫" : post.mediaType}
                      </div>
                    )}
                  </div>
                  {/* Caption */}
                  {post.caption && (
                    <div className="px-3 py-2.5">
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {post.caption}
                      </p>
                    </div>
                  )}
                </a>
              );
            })}
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="rounded-2xl border border-border/40 p-10 text-center" style={{ background: CARD }}>
          {anyConn ? (
            <>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(25,211,255,0.07)", border: "1px solid rgba(25,211,255,0.15)" }}>
                <RefreshCw className="w-7 h-7" style={{ color: CYAN }} />
              </div>
              <h3 className="text-base font-bold text-foreground mb-2">No posts synced yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-5">
                Your {igConn ? "Instagram" : "Facebook"} account is connected. Click "Sync Posts" to pull your latest content.
              </p>
              <Button size="sm" className="gap-2 font-bold"
                style={{ background: EMBER, color: "white" }}
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}>
                {syncMutation.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Syncing…</>
                  : <><RefreshCw className="w-4 h-4" /> Sync Posts Now</>
                }
              </Button>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(225,48,108,0.08)", border: "1px solid rgba(225,48,108,0.18)" }}>
                <Instagram className="w-7 h-7" style={{ color: "#E1306C" }} />
              </div>
              <h3 className="text-base font-bold text-foreground mb-2">Showcase your work</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-5">
                Connect your Instagram or Facebook Page to pull your photos and videos into a portfolio that impresses leads.
              </p>
              <Button size="sm" className="gap-2 font-bold"
                style={{ background: "linear-gradient(135deg, #E1306C, #833AB4)", color: "white" }}
                onClick={() => connectMutation.mutate()}
                disabled={connectMutation.isPending}>
                {connectMutation.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Instagram className="w-4 h-4" />
                }
                Connect Instagram
              </Button>
              <div className="flex items-center gap-1.5 justify-center mt-4 text-[11px] text-muted-foreground">
                <Info className="w-3 h-3 shrink-0" />
                Requires a Facebook Page linked to your Instagram Business account.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
