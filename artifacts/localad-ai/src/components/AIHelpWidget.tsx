import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { Bot, X, Send, Sparkles, Loader2, ChevronDown } from "lucide-react";

// ─── Brand ───────────────────────────────────────────────────────────────────
const CYAN = "#19D3FF";
const BLUE = "#2B85E4";
const BG   = "#060A14";
const CARD = "#0C1528";
const BORDER = "rgba(255,255,255,0.07)";

// ─── Types ────────────────────────────────────────────────────────────────────
type ChatRole = "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };

type ToolAction =
  | { type: "navigate"; page: string }
  | { type: "open_upgrade" }
  | { type: "open_analytics" }
  | { type: "build_ad" }
  | { type: "explain_current_page" }
  | { type: "suggest_next_step"; payload?: { step?: string } };

type AIResponse = { reply: string; actions?: ToolAction[] };

// ─── Quick actions ────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  "How do I get more leads?",
  "What does this page do?",
  "How do credits work?",
  "Help me write an ad",
  "How do I upgrade?",
];

function mapPathToPage(path: string): string {
  const p = path.toLowerCase();
  if (p.includes("dashboard"))       return "dashboard";
  if (p.includes("generate"))        return "campaign builder";
  if (p.includes("campaigns"))       return "saved campaigns";
  if (p.includes("contacts"))        return "contacts / CRM";
  if (p.includes("email-campaigns")) return "email campaigns";
  if (p.includes("analytics"))       return "analytics";
  if (p.includes("billing"))         return "billing";
  if (p.includes("settings"))        return "settings";
  if (p.includes("pricing"))         return "pricing";
  return "unknown";
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface AIHelpWidgetProps {
  userName?: string;
  hasProjects?: boolean;
  plan?: "free" | "pro" | "agency";
  credits?: number;
  industry?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function AIHelpWidget({
  userName,
  hasProjects = false,
  plan = "free",
  credits,
  industry,
}: AIHelpWidgetProps) {
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [input, setInput]     = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `Hi ${userName ?? "there"}! I'm your LeadForge AI assistant. I can help you build campaigns, understand your analytics, get more leads, or navigate the app. What do you need?`,
    },
  ]);

  const [, setLocation] = useLocation();
  const [location]      = useLocation();
  const { getToken }    = useAuth();
  const bodyRef         = useRef<HTMLDivElement>(null);
  const inputRef        = useRef<HTMLInputElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  // Handle action objects returned by the AI
  function runAction(action: ToolAction) {
    switch (action.type) {
      case "navigate":
        setLocation(action.page);
        break;
      case "open_upgrade":
        setLocation("/billing");
        break;
      case "open_analytics":
        setLocation("/analytics");
        break;
      case "build_ad":
        setLocation("/generate");
        break;
      case "explain_current_page":
      case "suggest_next_step":
        // Purely text-based — the reply handles it
        break;
    }
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const token = await getToken();
      const res = await fetch("/api/ai-help", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: nextMessages,
          context: {
            page: mapPathToPage(location),
            userName: userName ?? "there",
            hasProjects,
            plan,
            credits,
            industry: industry ?? "general contractor",
          },
        }),
      });

      if (!res.ok) throw new Error("Request failed");

      const data: AIResponse = await res.json();

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);

      if (data.actions?.length) {
        // Small delay so the user sees the reply first
        setTimeout(() => {
          for (const action of data.actions!) {
            runAction(action);
          }
        }, 600);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I hit a snag — please try again in a moment." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* ── Floating trigger button ──────────────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="AI Help"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "11px 18px",
          borderRadius: 9999,
          border: "1px solid rgba(25,211,255,0.35)",
          background: `linear-gradient(135deg, ${BLUE} 0%, #1a6fd4 100%)`,
          boxShadow: "0 8px 32px rgba(25,211,255,0.25), 0 4px 12px rgba(0,0,0,0.4)",
          cursor: "pointer",
          color: "white",
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: "-0.01em",
          transition: "transform 0.15s, box-shadow 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 12px 40px rgba(25,211,255,0.35), 0 4px 16px rgba(0,0,0,0.4)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 32px rgba(25,211,255,0.25), 0 4px 12px rgba(0,0,0,0.4)";
        }}
      >
        {open
          ? <ChevronDown style={{ width: 16, height: 16 }} />
          : <Bot style={{ width: 16, height: 16 }} />
        }
        AI Help
      </button>

      {/* ── Chat panel ───────────────────────────────────────────────────── */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 84,
            right: 24,
            width: 380,
            maxWidth: "calc(100vw - 32px)",
            height: 540,
            background: CARD,
            borderRadius: 20,
            boxShadow: "0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.07)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 9998,
            border: `1px solid ${BORDER}`,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 16px",
              borderBottom: `1px solid ${BORDER}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: BG,
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: `linear-gradient(135deg, ${CYAN}22 0%, ${BLUE}33 100%)`,
                  border: `1px solid ${CYAN}33`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Sparkles style={{ width: 16, height: 16, color: CYAN }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "white", lineHeight: 1 }}>
                  LeadForge AI
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>
                  Ask me anything about the app
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "none",
                borderRadius: 8,
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "rgba(255,255,255,0.5)",
                transition: "background 0.1s, color 0.1s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.12)";
                (e.currentTarget as HTMLButtonElement).style.color = "white";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
                (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)";
              }}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>

          {/* Quick action chips */}
          <div
            style={{
              padding: "10px 12px",
              borderBottom: `1px solid ${BORDER}`,
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              flexShrink: 0,
              background: "rgba(255,255,255,0.015)",
            }}
          >
            {QUICK_ACTIONS.map((label) => (
              <button
                key={label}
                onClick={() => sendMessage(label)}
                disabled={loading}
                style={{
                  padding: "5px 10px",
                  borderRadius: 9999,
                  border: `1px solid rgba(43,133,228,0.3)`,
                  background: "rgba(43,133,228,0.08)",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.65)",
                  transition: "all 0.15s",
                  opacity: loading ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(43,133,228,0.18)";
                    (e.currentTarget as HTMLButtonElement).style.color = "white";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = `rgba(43,133,228,0.6)`;
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(43,133,228,0.08)";
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.65)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(43,133,228,0.3)";
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div
            ref={bodyRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px 12px 4px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {messages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "87%",
                  padding: "10px 13px",
                  borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  background: m.role === "user"
                    ? `linear-gradient(135deg, ${BLUE} 0%, #1a6fd4 100%)`
                    : "rgba(255,255,255,0.05)",
                  border: m.role === "assistant" ? `1px solid ${BORDER}` : "none",
                  color: "rgba(255,255,255,0.92)",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.5,
                  fontSize: 13,
                  boxShadow: m.role === "user"
                    ? "0 2px 12px rgba(43,133,228,0.3)"
                    : "none",
                }}
              >
                {m.content}
              </div>
            ))}

            {loading && (
              <div
                style={{
                  alignSelf: "flex-start",
                  padding: "10px 14px",
                  borderRadius: "14px 14px 14px 4px",
                  background: "rgba(255,255,255,0.05)",
                  border: `1px solid ${BORDER}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Loader2 style={{ width: 14, height: 14, color: CYAN, animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>Thinking…</span>
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
            style={{
              padding: "10px 12px 12px",
              borderTop: `1px solid ${BORDER}`,
              display: "flex",
              gap: 8,
              flexShrink: 0,
              background: BG,
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask how to use the app…"
              disabled={loading}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 12,
                border: `1px solid rgba(255,255,255,0.1)`,
                background: "rgba(255,255,255,0.05)",
                outline: "none",
                color: "white",
                fontSize: 13,
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => {
                (e.target as HTMLInputElement).style.borderColor = `rgba(25,211,255,0.4)`;
              }}
              onBlur={(e) => {
                (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.1)";
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send"
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                border: "none",
                background: input.trim() && !loading
                  ? `linear-gradient(135deg, ${CYAN} 0%, ${BLUE} 100%)`
                  : "rgba(255,255,255,0.07)",
                cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "background 0.15s",
              }}
            >
              <Send style={{ width: 15, height: 15, color: input.trim() && !loading ? "white" : "rgba(255,255,255,0.25)" }} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
