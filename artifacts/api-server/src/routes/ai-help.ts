import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

type ServerChatMessage = { role: "user" | "assistant"; content: string };

type ServerContext = {
  page: string;
  userName?: string;
  hasProjects: boolean;
  plan: string;
  credits?: number;
  recentActions?: string[];
  industry?: string;
};

type ToolAction =
  | { type: "navigate"; page: string }
  | { type: "open_upgrade" }
  | { type: "open_analytics" }
  | { type: "show_lead_tips" }
  | { type: "explain_current_page" }
  | { type: "build_ad" }
  | { type: "suggest_next_step"; payload?: { step?: string } };

type AIResponse = { reply: string; actions?: ToolAction[] };

function buildSystemPrompt(ctx: ServerContext): string {
  return `You are the LeadForge AI assistant — a friendly, expert helper embedded inside the LeadForge app.

LeadForge is an AI-powered lead generation platform for contractors and local service businesses. It helps them:
- Generate AI-powered Facebook/Instagram/Google ads, flyers, and landing pages using the Campaign Builder
- Manage leads and contacts in their CRM
- Send email campaigns to their contact list
- Track performance on the Analytics page
- Manage their subscription on the Billing page

Pages in the app:
- /dashboard — overview of credits, campaigns, and recent activity
- /generate — AI Campaign Builder to create ad copy and landing pages
- /campaigns — Saved Campaigns — view all generated campaigns
- /contacts — CRM to manage leads and contacts
- /email-campaigns — Email marketing — create and send campaigns
- /analytics — Performance analytics for leads, email, and campaigns
- /billing — Subscription management and credit top-ups
- /settings — Account settings
- /pricing — Upgrade plans

Plans:
- Free: 20 credits/mo, up to 3 campaigns, no email or contacts
- Pro ($29/mo): 100 credits/mo, unlimited campaigns, email, contacts, exports
- Agency ($79/mo): 300 credits/mo, everything in Pro + multi-profile + priority support

Each campaign generation costs 5 credits.

Current user context:
- Page: ${ctx.page}
- Name: ${ctx.userName ?? "there"}
- Plan: ${ctx.plan}
- Credits remaining: ${ctx.credits ?? "unknown"}
- Has projects: ${ctx.hasProjects}
- Industry: ${ctx.industry ?? "general contractor"}

Instructions:
1. Be concise, friendly, and practical. Keep replies under 4 sentences unless the user asks for more detail.
2. Always answer in the context of LeadForge — don't give generic business advice unless asked.
3. You MUST respond with a JSON object with this exact shape:
   { "reply": "your response text", "actions": [] }
4. The "actions" array is optional but use it when helpful. Available action types:
   - { "type": "navigate", "page": "/path" } — navigate to a page
   - { "type": "open_upgrade" } — open the billing/upgrade page
   - { "type": "open_analytics" } — navigate to analytics
   - { "type": "build_ad" } — navigate to the campaign builder
   - { "type": "explain_current_page" } — user wants a page explanation (just reply with text, no action needed)
   - { "type": "suggest_next_step", "payload": { "step": "description" } } — suggest what to do next
5. Never make up features that don't exist in LeadForge.
6. If the user is on the Free plan and asks about features locked to Pro/Agency, mention the upgrade path.
7. Respond ONLY with valid JSON matching the shape above. No markdown, no code blocks, just raw JSON.`;
}

// POST /api/ai-help
router.post("/ai-help", requireAuth, async (req, res): Promise<void> => {
  const messages: ServerChatMessage[] = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const context: ServerContext = req.body?.context ?? {};

  if (messages.length === 0) {
    res.status(400).json({ error: "No messages provided" });
    return;
  }

  // Only send the last 12 messages to keep context window reasonable
  const trimmedMessages = messages.slice(-12);

  const completion = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 512,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildSystemPrompt(context) },
      ...trimmedMessages,
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? '{"reply":"Sorry, I could not generate a response. Please try again.","actions":[]}';

  let parsed: AIResponse;
  try {
    parsed = JSON.parse(raw);
    if (typeof parsed.reply !== "string") throw new Error("Invalid reply field");
  } catch {
    parsed = { reply: raw, actions: [] };
  }

  res.json(parsed);
});

export default router;
