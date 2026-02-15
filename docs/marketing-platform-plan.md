# Marketing Platform Enhancement Plan

> Inspired by LeoAds — extend Stalela Marketing with onboarding, website audits, platform connections, competitor analysis, and AI chat.

## Architecture Decisions

- **AI Provider**: DashScope (qwen3-max) — existing infrastructure, no new API keys
- **Platform Connections**: UI + schema only — no actual Meta/Google OAuth yet
- **Website Scraping**: Server-side `fetch()` for HTML extraction — no headless browser
- **Chat**: Modeled on existing agentic chat in `/api/companies/research/chat` (602 lines with tool-calling)
- **Streaming**: Reuse existing SSE patterns from `ContentGenerator` + `/api/marketing/campaigns/[id]/generate`

---

## Phase 1 — Onboarding Wizard + Website Audit Report

After signup, users go through a guided onboarding. The system fetches their website, analyzes it with AI, and generates an initial audit report.

### Tasks

| # | Task | Status | Description |
|---|------|--------|-------------|
| 1.1 | Commons: audit types + tenant fields | not-started | Add `OnboardingStatus`, `WebsiteAudit`/`Insert`, `AuditReport` interface to `src/types.ts`. Add `onboarding_status` and `website_url` to `Tenant`/`TenantInsert`/`TenantUpdate` types. |
| 1.2 | Commons: audits factory | not-started | Create `src/audits.ts` with `createAuditsApi(supabase)` — methods: `create()`, `getLatest(tenant_id)`, `getById()`, `list(tenant_id)`. Add subpath export `./audits` to `package.json` and barrel export in `index.ts`. |
| 1.3 | Migration: website_audits table + tenant columns | not-started | SQL migration: `ALTER TABLE tenants ADD COLUMN onboarding_status text DEFAULT 'pending', website_url text`. Create `website_audits` table (id uuid, tenant_id uuid FK, url text, status text, report_json jsonb, created_at timestamptz). RLS policies scoped to tenant. |
| 1.4 | Admin: onboarding page | not-started | Create `/marketing/onboarding/page.tsx` — 3-step wizard (client component). Step 1: website URL + industry selector. Step 2: platform interest checkboxes (no OAuth yet). Step 3: "Generating audit..." with progress animation. Saves website_url to tenant, triggers audit API, redirects to report on completion. |
| 1.5 | Admin: audit API route | not-started | Create `/api/marketing/audit/route.ts` — POST `{ url, tenant_id }`. Fetches homepage HTML via `fetch()`, extracts meta tags/title/description/headings/OG images. Sends extracted content to DashScope (qwen3-max) via SSE streaming. Generates structured audit report JSON. Saves to `website_audits` table. Returns SSE stream to client. |
| 1.6 | Admin: audit report page | not-started | Create `/marketing/reports/[id]/page.tsx` — server component rendering the audit report. Sections: Brand Analysis, Market Positioning, Ad Readiness Score (0-100), Top Recommendations (numbered), Competitive Landscape, Next Steps (CTAs to create campaign or connect platforms). Wakanda dark theme styling. |
| 1.7 | Admin: redirect new tenants to onboarding | not-started | Update auth callback to redirect new tenants to `/marketing/onboarding` instead of `/marketing`. Add `/marketing/onboarding` to tenant-allowed paths in middleware. Update marketing dashboard to show latest audit report card with "View Full Report" link. |
| 1.8 | Admin: sidebar + navigation updates | not-started | Add "Reports" nav item to Sidebar for tenant users. Add `/marketing/reports` route title to Header. Link onboarding completion to dashboard. |

---

## Phase 2 — Platform Connections Hub

Users can indicate which ad platforms they use. Stores connection status only (UI + schema) — actual OAuth deferred to future work.

### Tasks

| # | Task | Status | Description |
|---|------|--------|-------------|
| 2.1 | Commons: platform connection types | not-started | Add `PlatformConnection`/`Insert`/`Update` to `src/types.ts`. Fields: id, tenant_id, platform (`CampaignPlatform`), status (`"disconnected" | "connected" | "expired" | "error"`), external_account_id, account_name, access_token_encrypted, refresh_token_encrypted, token_expires_at, scopes text[], connected_at, metadata jsonb. |
| 2.2 | Commons: platforms factory | not-started | Create `src/platforms.ts` with `createPlatformsApi(supabase)` — methods: `list(tenant_id)`, `upsert(connection)`, `disconnect(id)`, `getByPlatform(tenant_id, platform)`. Add subpath export `./platforms` to `package.json` and barrel export. |
| 2.3 | Migration: platform_connections table | not-started | SQL migration: `platform_connections` table with all columns from 2.1. RLS policies: tenant users can read/write their own tenant's connections. Index on `(tenant_id, platform)` unique constraint. |
| 2.4 | Admin: connections page | not-started | Create `/marketing/connections/page.tsx` — grid of 5 platform cards (Meta, Google, LinkedIn, TikTok, X). Each shows: platform logo/icon, connection status badge, account name if connected, "Connect" / "Disconnect" buttons. Connect button opens a modal explaining that direct OAuth is coming soon, with option to manually enter account ID/name. |
| 2.5 | Admin: connections API route | not-started | Create `/api/marketing/connections/route.ts` — GET (list connections for tenant), POST (create/update connection). `/api/marketing/connections/[id]/route.ts` — DELETE (disconnect). |
| 2.6 | Admin: sidebar + onboarding integration | not-started | Add "Connections" nav item to Sidebar for tenant users. Update onboarding Step 2 to link to connections page or embed simplified version. |

---

## Phase 3 — Competitor Analysis

AI-powered competitor discovery and tracking. Users enter competitors or the system infers them from the website audit.

### Tasks

| # | Task | Status | Description |
|---|------|--------|-------------|
| 3.1 | Commons: competitor types | not-started | Add `Competitor`/`Insert`/`Update` to `src/types.ts`. Fields: id, tenant_id, name, website, industry, discovered_via (`"manual" | "ai_audit" | "ad_library"`), notes, ad_analysis jsonb, last_analyzed_at, created_at. |
| 3.2 | Commons: competitors factory | not-started | Create `src/competitors.ts` with `createCompetitorsApi(supabase)` — methods: `list(tenant_id)`, `create()`, `update()`, `delete()`, `getById()`. Add subpath export `./competitors`. |
| 3.3 | Migration: competitors table | not-started | SQL migration: `competitors` table with all columns from 3.1. RLS policies scoped to tenant. |
| 3.4 | Admin: competitor analysis API | not-started | Create `/api/marketing/competitors/route.ts` — GET (list), POST (create). `/api/marketing/competitors/[id]/route.ts` — GET, PATCH, DELETE. `/api/marketing/competitors/[id]/analyze/route.ts` — POST: fetches competitor website via `fetch()`, extracts content, sends to DashScope SSE for analysis (brand positioning, target audience, messaging strategy, platform presence, ad patterns). Saves structured analysis to `competitors.ad_analysis`. |
| 3.5 | Admin: competitors list page | not-started | Create `/marketing/competitors/page.tsx` — list view of tracked competitors. Each card: name, website, last analyzed date, key insight badges, "Analyze" / "Delete" buttons. "Add Competitor" button with URL input modal. |
| 3.6 | Admin: competitor detail page | not-started | Create `/marketing/competitors/[id]/page.tsx` — full AI analysis rendered in sections: Brand Positioning, Target Audience, Messaging Strategy, Platform Presence, Ad Creative Patterns, Differentiation Recommendations. "Re-analyze" button to refresh. |
| 3.7 | Audit integration: auto-discover competitors | not-started | Update the audit API (Phase 1 task 1.5) to include competitor discovery in the AI prompt. After audit completes, auto-create 3-5 `Competitor` records with `discovered_via: "ai_audit"` and initial analysis sketches. |
| 3.8 | Admin: sidebar update | not-started | Add "Competitors" nav item to Sidebar for tenant users. Add route titles to Header. |

---

## Phase 4 — AI Chat Assistant ("Lalela")

Always-available chat assistant for marketing tenants, using agentic tool-calling. Available as a slide-out panel on all marketing pages.

### Tasks

| # | Task | Status | Description |
|---|------|--------|-------------|
| 4.1 | Commons: chat types | not-started | Add `ChatSession`/`Insert` and `ChatMessage`/`Insert` to `src/types.ts`. ChatSession: id, tenant_id, user_id, title, created_at. ChatMessage: id, session_id, tenant_id, user_id, role (`"user" | "assistant" | "system"`), content text, tool_calls jsonb, created_at. |
| 4.2 | Commons: chat factory | not-started | Create `src/chat.ts` with `createChatApi(supabase)` — methods: `createSession()`, `listSessions(tenant_id, user_id)`, `getSession()`, `deleteSession()`, `addMessage()`, `getMessages(session_id)`. Add subpath export `./chat`. |
| 4.3 | Migration: chat tables | not-started | SQL migration: `chat_sessions` and `chat_messages` tables. RLS: users can only access their own tenant's sessions. Index on `(session_id, created_at)` for message ordering. |
| 4.4 | Admin: chat API route | not-started | Create `/api/marketing/chat/route.ts` — POST `{ message, session_id, tenant_id }` → SSE streaming. System prompt includes tenant context (company name, website, industry, connected platforms, active campaigns, latest audit). 8 tools: `get_audit_report`, `get_campaigns`, `get_competitors`, `analyze_website`, `create_campaign_draft`, `generate_ad_copy`, `get_platform_status`, `create_report`. Uses DashScope function-calling loop pattern from `/api/companies/research/chat`. |
| 4.5 | Admin: chat sessions API | not-started | Create `/api/marketing/chat/sessions/route.ts` — GET (list sessions), POST (create session). `/api/marketing/chat/sessions/[id]/route.ts` — GET (session + messages), DELETE. |
| 4.6 | Admin: MarketingChat component | not-started | Create `src/components/MarketingChat.tsx` — "use client" slide-out panel. Features: message list with user/assistant bubbles, SSE streaming for real-time responses, tool call indicators ("Creating report..." spinner), session management (new conversation, history dropdown), floating "Ask Lalela" button with copper accent. |
| 4.7 | Admin: chat layout integration | not-started | Add `MarketingChat` component to the marketing section of the dashboard layout so it's available on every `/marketing/*` page via a floating button. Only visible to tenant users. |
| 4.8 | Admin: chat history page | not-started | Create `/marketing/chat/page.tsx` — list of past conversation sessions with titles, dates. Click to reopen a session. Delete sessions. |

---

## Summary

| Phase | Tasks | Dependencies | Estimated Scope |
|-------|-------|-------------|-----------------|
| Phase 1 — Onboarding + Audit | 8 tasks (1.1–1.8) | None | Commons types + factory, migration, 3 pages, 1 API route, middleware updates |
| Phase 2 — Connections | 6 tasks (2.1–2.6) | None (parallel with Phase 1) | Commons types + factory, migration, 1 page, 1 API route, sidebar |
| Phase 3 — Competitors | 8 tasks (3.1–3.8) | Phase 1 for auto-discovery (3.7) | Commons types + factory, migration, 2 pages, 3 API routes, sidebar |
| Phase 4 — Chat | 8 tasks (4.1–4.8) | Phases 1-3 for tool data access | Commons types + factory, migration, 1 component, 2 API routes, 2 pages |

**Execution order**: Phase 1 → Phase 2 (can overlap) → Phase 3 → Phase 4

**Agent execution guidance**: Each phase can be executed as a single agent task. Within a phase, the natural order is: commons types → commons factory → migration → API routes → pages/components → sidebar/navigation updates.
