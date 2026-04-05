# LeadForge — AI Ad Generation SaaS (Monorepo)

## Overview

This monorepo contains two separate SaaS products:

**AdCraft** — A full-stack SaaS web app for generating AI-powered ad video concepts for local service businesses. Users fill in business details and get a structured 15–30 second video concept: headline, voiceover script, scene breakdown, and on-screen text.

**LocalAd AI** — A full-stack SaaS web app that helps local service businesses (painters, roofers, landscapers, cleaners, etc.) generate professional AI-powered ad copy for Facebook, Instagram, Google, flyers, and landing pages. Uses GPT-5.2 via Replit AI Integrations for all generation.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/adcraft)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM (lib/db)
- **Authentication**: Clerk (email signup/login, session cookies)
- **Validation**: Zod (zod/v4), drizzle-zod
- **API codegen**: Orval (from OpenAPI spec in lib/api-spec)
- **UI**: shadcn/ui + Tailwind CSS

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/adcraft run dev` — run frontend locally

## Architecture

```
artifacts/
  adcraft/          # React + Vite frontend (previewPath: /)
  api-server/       # Express 5 backend (previewPath: /api)
  localad-ai/       # React + Vite frontend (previewPath: /localad-ai/)
lib/
  api-spec/         # OpenAPI spec + Orval codegen config
  api-client-react/ # Generated React Query hooks
  api-zod/          # Generated Zod validation schemas
  db/               # Drizzle ORM schema + DB client
  integrations-openai-ai-server/  # OpenAI client via Replit AI Integrations
  integrations-openai-ai-react/   # React hooks for voice/audio
```

## AI Generation (LocalAd AI)

All AI generation is handled securely on the backend via `artifacts/api-server/src/routes/generate.ts`.
Uses GPT-5.2 through Replit AI Integrations (env vars: `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY`).

Available endpoints (all require Clerk auth):
- `POST /api/generate/campaign` — 4 ad copy variations (headline, primaryText, CTA, offer, imagePrompt)
- `POST /api/generate/landing-page` — full landing page copy (hero, trustBar, problem, solution, offer, testimonials, FAQ)
- `POST /api/generate/headlines` — N headline variations with formula labels
- `POST /api/generate/ctas` — N call-to-action variations
- `POST /api/generate/follow-up` — email/SMS follow-up message sequences

Request body for all endpoints includes: businessName, category, location, services, offer, tone, platform, goal (all optional — populated from localStorage `lf_profile` on the frontend).

## Branding System (artifacts/localad-ai)

- **Logo image**: `artifacts/localad-ai/public/logo.png` — official LeadForge logo: anvil+hammer icon with green growth arrow and "LeadForge" text (white "Lead", blue-to-cyan gradient "Forge"). Dark background blends seamlessly with site.
- **Logo component**: `artifacts/localad-ai/src/components/brand/Logo.tsx` — reusable `<Logo size="sm|default|lg|xl" />` (heights: 28/38/52/72px). Used in navbar, sidebar footer.
- **Theme**: Dark-first — `index.css` `:root` sets the dark palette by default (no `.dark` toggle needed).
- **Official brand palette** (sampled from logo):
  - Background: `#060A14` → `hsl(222 75% 6%)`
  - Card surface: `#0C1528` → `hsl(220 52% 11%)`
  - Sidebar: `#040810` → `hsl(222 82% 5%)`
  - Primary cyan ("Forge" end): `#19D3FF` → `hsl(191 100% 55%)`
  - Secondary blue ("Forge" mid): `#2B85E4` → `hsl(213 74% 53%)`
  - Growth green (arrow): `#3DD13D` → `hsl(120 57% 52%)`
  - Ember orange (fire): `#FF7A1A` → `hsl(27 100% 55%)`
  - Foreground: `#F5F7FB` → `hsl(220 57% 97%)`
- **Hero headline**: "Capture more leads." uses `bg-gradient-to-r from-[#2B85E4] to-[#19D3FF]` to mirror the "Forge" gradient in the logo

## LocalAd AI Pages (artifacts/localad-ai)

- `/localad-ai/` — Landing page (public)
- `/localad-ai/sign-in` — Clerk sign-in
- `/localad-ai/sign-up` — Clerk sign-up
- `/localad-ai/pricing` — Pricing page (public)
- `/localad-ai/dashboard` — Dashboard with welcome header, stats, campaigns (auth required)
- `/localad-ai/business-profile` — Business profile setup form (auth required)
- `/localad-ai/generate` — Ad generator with platform/tone/goal selectors (auth required)
- `/localad-ai/campaigns` — Saved campaigns grid (auth required)
- `/localad-ai/exports` — Export campaigns with copy and download (auth required)
- `/localad-ai/settings` — Tabbed settings page (auth required)
- `/localad-ai/contacts` — Contact management with consent status, add/edit/delete (auth required)
- `/localad-ai/email-campaigns` — Email campaign list with draft/scheduled/sent tabs and metrics (auth required)
- `/localad-ai/email-campaigns/new` — 5-step campaign builder wizard with AI email generation and live preview (auth required)
- `/localad-ai/admin` — Admin panel: platform stats, searchable user table, inline plan/role/credits editing, user deletion (admin role required)

## AdCraft Pages

- `/` — Landing page (public) / redirects to /dashboard if signed in
- `/sign-in` — Clerk sign-in
- `/sign-up` — Clerk sign-up
- `/dashboard` — Main dashboard with stats and recent projects (auth required)
- `/generate` — Ad generation form (auth required)
- `/projects` — Saved projects list (auth required)
- `/projects/:id` — Project detail with full ad concept output (auth required)
- `/pricing` — Pricing page (public)
- `/settings` — User settings (auth required)

## Database Schema

- `users` — clerkUserId, plan (free/pro/agency), role (user/admin), credits (integer, default 0), addonCredits (integer, default 0), creditsResetAt (timestamp), stripeCustomerId, stripeSubscriptionId, timestamps
- `credit_transactions` — clerkUserId, amount (positive=gained, negative=spent), type (MONTHLY_RESET|TOPUP|USAGE|ADJUSTMENT), description, createdAt
- `projects` — userId, business info fields, generatedOutput (JSONB), timestamps
- `contacts` — userId, email, firstName, lastName, company, tags, consentStatus (subscribed|unsubscribed|no_consent|transactional_only), notes, dateAdded
- `email_campaigns` — userId, name, status (draft|scheduled|sent), subject, previewText, headline, body, ctaText, ctaUrl, offerContext, segment, scheduledAt, sentAt, metrics (recipientCount, deliveredCount, openedCount, clickedCount, unsubscribedCount)

## API Endpoints

- `GET /api/healthz` — Health check
- `GET /api/projects` — List user's projects
- `POST /api/projects` — Create a project
- `GET /api/projects/stats` — Dashboard stats
- `GET /api/projects/:id` — Get a project
- `DELETE /api/projects/:id` — Delete a project
- `POST /api/projects/generate` — Generate ad content (mock AI, structured for real AI)
- `GET /api/user/profile` — Get user profile (returns plan, role, credits, projectsCount)
- `PATCH /api/user/profile` — Update user profile

### Admin Endpoints (role=admin only)
- `GET /api/admin/stats` — Platform-wide stats (user counts by plan, total campaigns, etc.)
- `GET /api/admin/users` — All users with email, plan, role, credits, projectsCount
- `PATCH /api/admin/users/:id` — Update user: plan, role, credits (absolute or adjustment)
- `DELETE /api/admin/users/:id` — Delete user and all their campaigns (blocks admin deletion)
- `GET /api/admin/projects` — All campaigns across all users
- `DELETE /api/admin/projects/:id` — Delete any campaign

## Plan Enforcement (Access Control)

Plans: `free` | `pro` | `agency` | `full_access` — stored in `usersTable.plan` (synced from Stripe via webhook).

Pricing:
- **Free**: $0 — 1 free AI image trial, 20 lifetime credits
- **Pro** ($29/mo): 200 credits/mo, 40 AI images, 80 refinements, 40 exports
- **Agency** ($69/mo): 700 credits/mo, 120 AI images, 240 refinements, 120 exports
- **Full Access** ($99/mo): 1000 credits/mo, 300 AI images, 600 refinements, 300 exports

Limits enforced on the frontend via `src/hooks/use-plan.ts`:
- **Free**: 3 campaigns max, no email campaigns, no contacts/CRM, 1 free image trial
- **Pro**: Unlimited campaigns, email campaigns, contacts, 3 profiles, full exports
- **Agency/Full Access**: Everything in Pro + up to 10 profiles, advanced lead tracking, bulk generation, white-label exports

Shared components:
- `src/hooks/use-plan.ts` — `usePlan()` hook exposing: `plan`, `limits`, `isPro`, `isAgency`, `isFullAccess`, `isFree`, `isAdmin`, `credits`, `entitlements`, `imageGenerationsUsed`, `refinementsUsed`, `exportsUsed`, `imageTrialUsed`, `campaignCount`, `isAtCampaignLimit`, `canCreateCampaign`, `canUseEmail`, `canUseContacts`, `canUseMultiProfile`, `subscription`, `openCheckout`, `openPortal`
- `src/components/upgrade-prompt.tsx` — `UpgradePrompt` full-page gate + `CampaignLimitBanner` inline banner
- `artifacts/api-server/src/lib/plan-guards.ts` — `checkImageGenAccess`, `checkRefinementAccess`, `incrementImageGenerations`, `incrementRefinements` — backend guards for AI image generation with monthly usage tracking

### Credits System
All plans use credits. No plan bypasses credit checks.

**Plan allocations:**
- **Free**: 20 lifetime credits (no monthly reset)
- **Pro**: 200 credits/month (lazy reset on first API call after 30 days)
- **Agency**: 700 credits/month (lazy reset on first API call after 30 days)
- **Full Access**: 1000 credits/month (lazy reset on first API call after 30 days)

**Credit costs per action:** Campaign=5, Landing page=2, Email campaign=2, Follow-up/SMS=1, Headlines=2, CTAs=2

**Two credit pools:**
- `credits` — plan credits (reset monthly for paid plans)
- `addonCredits` — purchased add-on credits (never reset)
- Deduction drains plan credits first, then addon credits

**DB columns:** `credits` (plan), `addonCredits` (add-ons), `creditsResetAt` (lazy reset timestamp), `imageGenerationsUsed`, `refinementsUsed`, `exportsUsed` (monthly counters reset on subscription renewal), `imageTrialUsed` (boolean, free trial flag)

**Profile endpoint** returns: `credits`, `addonCredits`, `totalCredits`, `planCreditLimit`, `creditsResetAt`, `imageGenerationsUsed`, `refinementsUsed`, `exportsUsed`, `imageTrialUsed`

**`usePlan()` exposes:** `credits`, `addonCredits`, `totalCredits`, `planCreditLimit`, `creditsResetAt`, `creditsUsedThisPeriod`, `estimatedCampaignsLeft`, `isLowCredits`, `isOutOfCredits`, `entitlements`, `imageGenerationsUsed`, `refinementsUsed`, `exportsUsed`, `imageTrialUsed`

**Add-on packs** (Stripe one-time): 100 credits=$15, 300 credits=$39, 1000 credits=$99 — added to `addonCredits` on webhook.

**Dashboard**: `CreditsCard` component in right sidebar — shows remaining, plan/addon breakdown, usage bar, estimated campaigns, low-credit warnings with upgrade CTA.

Admins can grant/deduct/set credits directly from the Admin Panel.

### Stripe Price IDs
- Pro: `price_1TIPrT87xwLZFMFUABWYHxRh`
- Agency: `price_1TIPrU87xwLZFMFUANXT0LKp`
- Full Access: Set via `FULL_ACCESS_STRIPE_PRICE_ID` env var (create $99/mo product in Stripe dashboard)

### Admin Role
- `role` column on `usersTable` — `"user"` (default) or `"admin"`
- `ADMIN_EMAIL` env var: any user with that email is auto-promoted to admin on first sign-in via `getOrCreateUser()`
- `requireAdmin` middleware verifies DB role before allowing admin routes
- `isAdmin` exposed via `usePlan().isAdmin`
- Admin link appears in sidebar only when `isAdmin === true`

Pages with access gates:
- `email-campaigns.tsx` — free users see `UpgradePrompt` (Pro required)
- `contacts.tsx` — free users see `UpgradePrompt` (Pro required)
- `ad-generator.tsx` — free users see `CampaignLimitBanner` (3/3 cap), save button disabled at limit
- `settings.tsx` billing tab — live data from Stripe, Manage Subscription via portal, upgrade options

## AI Integration Points (Future)

The mock AI generator is in `artifacts/api-server/src/lib/adGenerator.ts`.

To connect real AI services, replace the `generateAdContent` function with:
- **OpenAI** (`process.env.OPENAI_API_KEY`) — script and headline generation
- **ElevenLabs** (`process.env.ELEVENLABS_API_KEY`) — voiceover audio synthesis
- **Image generation API** (`process.env.IMAGE_GEN_API_KEY`) — scene visuals
- **FFmpeg backend** — final video rendering pipeline

## Auth

Uses Clerk for authentication. Keys are auto-provisioned:
- `CLERK_SECRET_KEY` — server-side
- `CLERK_PUBLISHABLE_KEY` — server-side
- `VITE_CLERK_PUBLISHABLE_KEY` — client-side

See the `clerk-auth` skill for more details.
