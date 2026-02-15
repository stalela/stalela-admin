# Stalela Admin — AI Agent System

> How the AI features work across the platform — from company research to daily
> briefings. This document is for developers joining the project.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Shared Conventions](#shared-conventions)
- [Feature 1 — Company Research Reports](#feature-1--company-research-reports)
- [Feature 2 — Company Research Chat](#feature-2--company-research-chat)
- [Feature 3 — Daily Briefing Pipeline](#feature-3--daily-briefing-pipeline)
- [Feature 4 — Briefings AI Assistant](#feature-4--briefings-ai-assistant)
- [Feature 5 — News Digest](#feature-5--news-digest)
- [Supporting Infrastructure](#supporting-infrastructure)
- [Environment Variables](#environment-variables)
- [Adding a New Tool](#adding-a-new-tool)
- [Troubleshooting](#troubleshooting)

---

## Architecture Overview

All AI features use **Alibaba DashScope** (`qwen3-max` model) at
`https://dashscope-intl.aliyuncs.com/compatible-mode/v1`. The API follows
OpenAI's chat completions format with DashScope-specific extensions
(`enable_search`, `search_options`, `enable_thinking`).

There are **5 AI features** split across two product areas:

```
┌──────────────────────────────────────────────────────────────────┐
│                     STALELA AI SYSTEM                            │
├──────────────────────┬───────────────────────────────────────────┤
│  COMPANY RESEARCH    │  DAILY BRIEFINGS                         │
│                      │                                           │
│  ┌────────────────┐  │  ┌─────────────────────┐                 │
│  │ 1. Report Gen  │  │  │ 3. Briefing Pipeline│ ← GitHub Action │
│  │    (streaming) │  │  │    (automated)      │   cron 06:00UTC │
│  └───────┬────────┘  │  └──────────┬──────────┘                 │
│          │           │             │                              │
│  ┌───────▼────────┐  │  ┌──────────▼──────────┐                 │
│  │ 2. Research    │  │  │ 4. AI Assistant     │                 │
│  │    Chat Agent  │  │  │    (9 tools)        │                 │
│  │    (7 tools)   │  │  └──────────┬──────────┘                 │
│  └────────────────┘  │             │                              │
│                      │  ┌──────────▼──────────┐                 │
│                      │  │ 5. News Digest      │                 │
│                      │  │    (web search)     │                 │
│                      │  └─────────────────────┘                 │
├──────────────────────┴───────────────────────────────────────────┤
│  DashScope API (qwen3-max)  │  Supabase  │  Neo4j (optional)    │
└──────────────────────────────────────────────────────────────────┘
```

### File Map

```
stalela-admin/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── companies/
│   │   │   │   └── research/
│   │   │   │       ├── route.ts              ← Feature 1: report generation
│   │   │   │       └── chat/
│   │   │   │           └── route.ts          ← Feature 2: research chat (7 tools)
│   │   │   └── briefings/
│   │   │       ├── route.ts                  ← Briefing data fetch
│   │   │       ├── [id]/route.ts             ← Status updates (PATCH)
│   │   │       └── chat/
│   │   │           └── route.ts              ← Feature 4: briefings AI (9 tools)
│   │   └── (dashboard)/
│   │       ├── companies/[id]/
│   │       │   └── ResearchButton.tsx        ← Opens ResearchDrawer
│   │       └── briefings/
│   │           ├── page.tsx                  ← Server component (data fetching)
│   │           └── BriefingsDashboard.tsx     ← Features 4 & 5 UI (3 tabs)
│   ├── components/
│   │   ├── ResearchDrawer.tsx                ← Features 1 & 2 UI (report + chat)
│   │   └── ReportView.tsx                    ← Tabbed report renderer
│   └── lib/
│       ├── api.ts                            ← Lazy-proxied API singletons
│       ├── neo4j.ts                          ← Neo4j driver
│       └── neo4j-api.ts                      ← Neo4j queries (graph, clusters)
├── scripts/
│   └── daily-briefing.ts                     ← Feature 3: automated pipeline
└── .github/workflows/
    └── daily-briefing.yml                    ← Cron schedule + WhatsApp notify

stalela-commons/src/
├── research.ts                               ← company_research data layer
├── briefings.ts                              ← daily_briefings data layer
├── news.ts                                   ← daily_news data layer
└── types.ts                                  ← DailyBriefing, DailyNews, etc.
```

---

## Shared Conventions

Every AI feature follows these patterns. Understand these first:

### 1. DashScope API Call Pattern

```typescript
const response = await fetch(`${DASHSCOPE_BASE_URL}/chat/completions`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
  },
  body: JSON.stringify({
    model: "qwen3-max",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: question },
    ],
    enable_thinking: false,         // always false — we don't use CoT tokens
    // Optional:
    stream: true,                   // only for report generation
    enable_search: true,            // for web-grounded responses
    search_options: { search_strategy: "agent" },
    tools: TOOLS,                   // for agentic tool-calling
  }),
});
```

> **Important**: `enable_search` and `tools` cannot be used simultaneously in
> the same request — DashScope returns 400. Choose one or the other.

### 2. SSE Streaming Pattern (Server → Client)

Two variants exist:

| Variant | Used By | How It Works |
|---------|---------|--------------|
| **Real streaming** | Report generation | DashScope streams `→` server relays `→` client reads |
| **Fake streaming** | Both chat agents | Agent loop runs fully, then final text is chunked into 20-char pieces |

Both send the same wire format:

```
data: {"content":"chunk of text"}\n\n
data: {"content":"more text"}\n\n
data: [DONE]\n\n
```

Client-side reading pattern (used in ResearchDrawer and BriefingsDashboard):

```typescript
const reader = response.body?.getReader();
const decoder = new TextDecoder();
let accumulated = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const text = decoder.decode(value, { stream: true });
  for (const line of text.split("\n")) {
    if (line.startsWith("data: ")) {
      const payload = line.slice(6);
      if (payload === "[DONE]") continue;
      const { content } = JSON.parse(payload);
      accumulated += content;
      // update UI state with accumulated text
    }
  }
}
```

### 3. Agentic Tool-Calling Loop

Both chat agents (research + briefings) follow this pattern:

```
┌──────────────────────────────────────────────────┐
│                  AGENTIC LOOP                     │
│                                                    │
│   ┌──────────┐   Has tool_calls?                  │
│   │ Call LLM ├──── Yes ──► Execute tools           │
│   │ w/ tools │            │                        │
│   └────▲─────┘            │ Feed results back     │
│        │                  │ as role:"tool"         │
│        └──────────────────┘                        │
│        │                                           │
│        No (has content) ──► Return final text      │
│                                                    │
│   Max 6 rounds, then force summarization          │
├──────────────────────────────────────────────────┤
│   FALLBACK (if round 1 fails with tools):         │
│   Retry without tools + enable_search: true       │
├──────────────────────────────────────────────────┤
│   EXHAUSTION (if 6 rounds used up):               │
│   Append "Summarize now" message, call w/o tools  │
└──────────────────────────────────────────────────┘
```

### 4. Lazy Proxy Pattern

[`src/lib/api.ts`](src/lib/api.ts) wraps each commons factory in a `Proxy` that
defers `createAdminClient()` until first property access. This prevents
`next build` from crashing when environment variables are missing:

```typescript
function lazy<T extends object>(factory: () => T): T {
  let instance: T;
  return new Proxy({} as T, {
    get(_, prop) {
      if (!instance) instance = factory();
      return (instance as any)[prop];
    },
  });
}

export const briefingsApi = lazy(() =>
  createBriefingsApi(getClient())
);
```

---

## Feature 1 — Company Research Reports

**What it does**: Generates a comprehensive B2B sales intelligence dossier on a
company, including cold outreach drafts. Uses DashScope's web search to ground
the report in real-time data.

### Data Flow

```
┌─────────────────┐     ┌───────────────────────┐
│ ResearchButton   │────►│   ResearchDrawer       │
│ (company page)   │     │                         │
└─────────────────┘     │  ┌─ Progress animation  │
                         │  │  (5 stages shown     │
                         │  │   while streaming)   │
                         │  │                      │
                         │  POST /api/companies/   │
                         │       research          │
                         │  │                      │
                         │  ▼                      │
                         │  SSE stream arrives     │
                         │  text accumulated       │
                         │  silently               │
                         │  │                      │
                         │  ▼                      │
                         │  ReportView             │
                         │  (4 tabs displayed)     │
                         └───────────────────────┘
```

### Files Involved

| File | Purpose |
|------|---------|
| [`src/app/(dashboard)/companies/[id]/ResearchButton.tsx`](src/app/(dashboard)/companies/[id]/ResearchButton.tsx) | Client button on company detail page — opens the drawer |
| [`src/components/ResearchDrawer.tsx`](src/components/ResearchDrawer.tsx) | Full-screen drawer — manages streaming, progress animation, two tabs (report + chat) |
| [`src/components/ReportView.tsx`](src/components/ReportView.tsx) | Parses the markdown report into 4 tabs: **Overview**, **Digital Presence**, **Challenges**, **Sales Tools** |
| [`src/app/api/companies/research/route.ts`](src/app/api/companies/research/route.ts) | API route — checks cache, calls DashScope with streaming + web search, saves report |
| [`stalela-commons/src/research.ts`](../stalela-commons/src/research.ts) | Data layer: `getLatest()` (7-day TTL via RPC), `save()`, `list()` |

### API Route Details

```
POST /api/companies/research
Body: { companyId: string, force?: boolean }

1. Fetch company via companiesApi.getById()
2. Check 7-day cache via researchApi.getLatest() (skip if force=true)
3. If cached → return cached report
4. Call DashScope with:
   - stream: true
   - enable_search: true (web search for real-time data)
   - System prompt requesting structured sections
5. Relay SSE chunks to client in real-time
6. After streaming completes → save full report via researchApi.save()
```

### Report Sections (System Prompt requires exactly these)

1. Company Overview
2. Current Offerings & Services
3. Web & Digital Presence
4. Key People & Leadership
5. Recent News & Activity
6. Pain Points & Challenges
7. Strategic Direction & Growth Trajectory
8. Personalized Cold Email Draft (< 150 words)
9. Personalized Cold Call Script

### ReportView Tab Mapping

The `ReportView` component splits the markdown by `## ` headers and maps sections
into 4 tabs:

| Tab | Sections Included |
|-----|-------------------|
| Overview | Company Overview, Offerings, Key People, Recent News, Strategic Direction |
| Digital Presence | Web & Digital Presence |
| Challenges | Pain Points & Challenges (rendered as severity cards) |
| Sales Tools | Cold Email Draft + Cold Call Script (with copy buttons) |

### Config

| Setting | Value |
|---------|-------|
| Model | `qwen3-max` |
| Streaming | Real SSE relay |
| Web Search | `enable_search: true` |
| Tools | None |
| Cache TTL | 7 days (via Supabase RPC `get_latest_research`) |
| Max Duration | 60 seconds |

---

## Feature 2 — Company Research Chat

**What it does**: Conversational Q&A agent for a specific company. Can query the
company database, Neo4j graph, and find nearby businesses. Operates in the
"Chat" tab of the ResearchDrawer.

### Data Flow

```
┌────────────────────────────────────┐
│  ResearchDrawer — Chat Tab          │
│                                      │
│  User types question                 │
│  │                                   │
│  ▼                                   │
│  POST /api/companies/research/chat   │
│  Body: { companyId, question,        │
│          history, report }           │
│  │                                   │
│  ▼                                   │
│  ┌─ Agentic Loop (max 6 rounds) ──┐ │
│  │                                  │ │
│  │  LLM ──► tool_calls? ──► YES    │ │
│  │  │                       │      │ │
│  │  │ NO                    ▼      │ │
│  │  │              Execute tools   │ │
│  │  │              (DB / Neo4j)    │ │
│  │  ▼                       │      │ │
│  │  Final text        Feed back    │ │
│  │                         │      │ │
│  │  ◄─────────────────────┘      │ │
│  └────────────────────────────────┘ │
│  │                                   │
│  ▼                                   │
│  SSE stream (20-char chunks)         │
│  │                                   │
│  ▼                                   │
│  Chat bubble with markdown           │
└────────────────────────────────────┘
```

### Files Involved

| File | Purpose |
|------|---------|
| [`src/components/ResearchDrawer.tsx`](src/components/ResearchDrawer.tsx) | Chat UI — message list, input, suggested prompts, streaming handler |
| [`src/app/api/companies/research/chat/route.ts`](src/app/api/companies/research/chat/route.ts) | Agentic loop API with 7 tools |
| [`src/lib/neo4j-api.ts`](src/lib/neo4j-api.ts) | Neo4j graph queries (lazy-imported) |
| [`src/lib/neo4j.ts`](src/lib/neo4j.ts) | Neo4j driver connection |

### Agent Tools (7)

| Tool | Description | Data Source |
|------|-------------|-------------|
| `search_companies` | Search by name, category, city, province, source | `companiesApi.list()` |
| `find_nearby_companies` | GPS proximity search with radius (km) | `companiesApi.nearby()` |
| `get_company_details` | Full company profile by ID | `companiesApi.getById()` |
| `get_company_stats` | Aggregate stats (total, by source, by province) | `companiesApi.stats()` |
| `get_company_graph` | Neo4j relationship graph (1-3 hops) | `neo4jApi.getGraph()` |
| `get_competitors` | COMPETES_WITH graph relationships | `neo4jApi.getCompetitors()` |
| `get_clusters` | Business concentration by province → city → category | `neo4jApi.getClusters()` |

### System Prompt Context

The system prompt includes:
- The **full company details** (name, category, location, contact info)
- The **existing research report** (if available) — so the agent can reference it

### Suggested Prompts

```
"List the 10 closest businesses"
"Find similar companies in Cape Town"
"Draft a cold email for this company"
"What competitors are nearby?"
"How many businesses are in this province?"
"Who are the key decision makers?"
```

### Config

| Setting | Value |
|---------|-------|
| Model | `qwen3-max` |
| Streaming | Fake (20-char chunks after loop completes) |
| Web Search | Not used (conflicts with `tools`) |
| Tools | 7 (see table above) |
| Max Tool Rounds | 6 |
| Fallback | Retry without tools + `enable_search: true` |
| Max Duration | 120 seconds |

---

## Feature 3 — Daily Briefing Pipeline

**What it does**: Automated daily pipeline that discovers B2B opportunities,
matches them to companies in the database, and generates personalized email
drafts + call scripts. Runs via GitHub Actions at 06:00 UTC (08:00 SAST).

### Pipeline Flow

```
┌─────────────────────────────────────────────────────────┐
│              GITHUB ACTIONS (cron 06:00 UTC)             │
│              npx tsx scripts/daily-briefing.ts           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Step 0 ─── GENERATE NEWS DIGEST                         │
│  │           DashScope + web search                      │
│  │           → Save to daily_news table                  │
│  │                                                       │
│  Step 1 ─── DISCOVER OPPORTUNITIES                       │
│  │           DashScope + web search                      │
│  │           → 3-5 opportunities (JSON)                  │
│  │           e.g. "SARS compliance deadline for trusts"  │
│  │                                                       │
│  Step 2 ─── FIND MATCHING COMPANIES                      │
│  │           Supabase .or() + .ilike() queries           │
│  │           → Filter already-briefed-today              │
│  │           → Cap at BRIEFING_BATCH_SIZE (default 10)   │
│  │                                                       │
│  Step 3 ─── GENERATE OUTREACH (per company)              │
│  │           DashScope + web search (2s delay between)   │
│  │           → JSON { research_summary, email_subject,   │
│  │                     email_body, call_script }         │
│  │                                                       │
│  Step 4 ─── SAVE TO DATABASE                             │
│             Upsert daily_briefings table                  │
│             (conflict key: company_id + date)            │
│                                                           │
├─────────────────────────────────────────────────────────┤
│  Write briefing-summary.txt                               │
│  → WhatsApp notification via Meta Graph API              │
└─────────────────────────────────────────────────────────┘
```

### Files Involved

| File | Purpose |
|------|---------|
| [`scripts/daily-briefing.ts`](scripts/daily-briefing.ts) | Complete pipeline (~500 lines). Uses Supabase directly (not commons) |
| [`.github/workflows/daily-briefing.yml`](.github/workflows/daily-briefing.yml) | Cron schedule, env setup, WhatsApp notification step |
| [`stalela-commons/src/briefings.ts`](../stalela-commons/src/briefings.ts) | Data layer for `daily_briefings` |
| [`stalela-commons/src/news.ts`](../stalela-commons/src/news.ts) | Data layer for `daily_news` |

### Step Details

#### Step 0 — News Digest

| Setting | Value |
|---------|-------|
| Prompt Role | "Sharp, concise tech and business news curator for a SA B2B founder/CEO" |
| Topic Categories | SA tech, AI/ML, fintech in Africa, B2B SaaS, software engineering, SA economy |
| Output | Markdown with emoji sections (🇿🇦 🤖 💰 💻 🔮), 8-12 stories, real URLs |
| Web Search | `enable_search: true` |
| Saved To | `daily_news` table (upsert on date) |

#### Step 1 — Discover Opportunities

| Setting | Value |
|---------|-------|
| Prompt Role | "SA B2B sales strategist" |
| Output | JSON array: `{ category_keywords[], province?, opportunity_type, summary, priority }` |
| Types | `industry_trend`, `news_event`, `seasonal`, `expansion`, `pain_point`, `tender` |
| Web Search | `enable_search: true` |
| Fallback | Generic accounting/tax opportunity if JSON parsing fails |

#### Step 2 — Find Companies

Queries `companies` table using `.or()` + `.ilike()` on `name`, `category`,
`description` fields. Filters by province if specified. Excludes companies
already briefed today. Prioritizes companies with email addresses.

#### Step 3 — Generate Outreach

| Setting | Value |
|---------|-------|
| Prompt Role | "Expert B2B sales copywriter for a SA business services company" |
| Output | JSON `{ research_summary, email_subject, email_body, call_script }` |
| Web Search | `enable_search: true` (for live company context) |
| Rate Limit | 2-second delay between requests |

#### Step 4 — Save

Upserts to `daily_briefings` with `onConflict: "company_id,date"`. Initial
status: `"pending"`.

### Workflow Configuration

```yaml
# .github/workflows/daily-briefing.yml
on:
  schedule:
    - cron: "0 6 * * *"   # 06:00 UTC = 08:00 SAST
  workflow_dispatch:
    inputs:
      batch_size:
        description: "Number of companies to brief"
        default: "10"

env:
  NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
  DASHSCOPE_API_KEY: ${{ secrets.DASHSCOPE_API_KEY }}
  BRIEFING_BATCH_SIZE: ${{ inputs.batch_size || '10' }}
```

After the script runs, a WhatsApp notification is sent via cURL to the Meta
Graph API with a summary of companies briefed.

### Briefing Status Workflow

```
  pending → reviewed → sent
     │
     └──→ skipped
```

Status changes happen via `PATCH /api/briefings/[id]` from the dashboard UI.

---

## Feature 4 — Briefings AI Assistant

**What it does**: General-purpose conversational AI on the briefings dashboard.
Can query briefings, leads, companies, metrics, news, and the web. Lives in the
"AI Assistant" tab alongside Outreach and News tabs.

### Data Flow

```
┌──────────────────────────────────────────────┐
│  BriefingsDashboard — AI Assistant Tab         │
│                                                │
│  ┌───────────────────────────┐                │
│  │ Suggested prompt buttons  │                │
│  │ or free-text input        │                │
│  └────────────┬──────────────┘                │
│               │                                │
│               ▼                                │
│  POST /api/briefings/chat                      │
│  Body: { question, history }                   │
│               │                                │
│               ▼                                │
│  ┌──────────────────────────────┐             │
│  │  Agentic Loop (max 6 rounds) │             │
│  │                                │             │
│  │  9 tools available:           │             │
│  │  • get_briefings              │             │
│  │  • get_briefing_stats         │             │
│  │  • get_briefing_dates         │             │
│  │  • get_news                   │             │
│  │  • get_lead_metrics           │             │
│  │  • get_company_stats          │             │
│  │  • search_companies           │             │
│  │  • search_leads               │             │
│  │  • web_search  ← special      │             │
│  └──────────────┬───────────────┘             │
│                  │                              │
│                  ▼                              │
│  SSE stream → chat bubble with                 │
│  rich markdown (tables, blockquotes,            │
│  emoji headers, copper-accented lists)          │
└──────────────────────────────────────────────┘
```

### Files Involved

| File | Purpose |
|------|---------|
| [`src/app/(dashboard)/briefings/BriefingsDashboard.tsx`](src/app/(dashboard)/briefings/BriefingsDashboard.tsx) | 3-tab client component — AI tab has chat UI with avatars, streaming, markdown rendering |
| [`src/app/(dashboard)/briefings/page.tsx`](src/app/(dashboard)/briefings/page.tsx) | Server component — fetches data for all tabs |
| [`src/app/api/briefings/chat/route.ts`](src/app/api/briefings/chat/route.ts) | Agentic loop API with 9 tools |

### Agent Tools (9)

| Tool | Description | Data Source |
|------|-------------|-------------|
| `get_briefings` | Briefings for a date with optional status filter | `briefingsApi.listByDate()` |
| `get_briefing_stats` | Summary counts for a date | `briefingsApi.statsForDate()` |
| `get_briefing_dates` | List of dates with briefing data (up to 14) | `briefingsApi.listDates()` |
| `get_news` | News digest for a date | `newsApi.getByDate()` |
| `get_lead_metrics` | Lead totals + breakdown by source | `metricsApi.summary()` + `leadsBySource()` |
| `get_company_stats` | Aggregate company database stats | `companiesApi.stats()` |
| `search_companies` | Search by name, category, city, province | `companiesApi.list()` |
| `search_leads` | Search by name, email, phone, source | `leadsApi.list()` |
| `web_search` | Real-time internet search (see below) | DashScope `enable_search` |

### Special: `web_search` Tool

Unlike other tools that query databases, `web_search` makes a **separate
DashScope API call** with `enable_search: true`:

```typescript
// The tool triggers a one-shot DashScope call:
const webRes = await fetch(DASHSCOPE_BASE_URL + "/chat/completions", {
  body: JSON.stringify({
    model: "qwen3-max",
    messages: [{
      role: "user",
      content: `Search the web and provide a concise summary about: ${query}`
    }],
    enable_search: true,
    search_options: { search_strategy: "agent" },
  }),
});
// The search result is fed back as the tool's output
```

This workaround exists because `enable_search` and `tools` can't be used
simultaneously in DashScope.

### Chat UI Features

- **Bot avatar** (copper icon) on assistant messages
- **"You" avatar** on user messages
- **Bouncing dots** loading animation during processing
- **Rich markdown** rendering: tables, blockquotes, emoji headers, ordered/unordered lists
- **Suggested prompt chips** below the input
- **Clear chat** button
- System prompt enforces: `## Title` on every response, emoji section headers
  (📊 📧 🏢 ⚡ ✅), blockquote recommendations

### Config

| Setting | Value |
|---------|-------|
| Model | `qwen3-max` |
| Streaming | Fake (20-char chunks after loop) |
| Tools | 9 (see table above) |
| Max Tool Rounds | 6 |
| Fallback | Retry without tools + `enable_search` |
| Max Duration | 120 seconds |

---

## Feature 5 — News Digest

**What it does**: Part of the daily briefing pipeline (Step 0). Generates a
curated tech/business news digest, stored for display and AI query access.

### Data Flow

```
daily-briefing.ts (Step 0)
  │
  ▼
DashScope + web search → markdown news digest
  │
  ▼
Upsert daily_news table (one per date)
  │
  ├──► Briefings Dashboard — News Tab (rendered markdown + topic badges)
  │
  └──► Briefings AI Assistant — get_news tool (queryable by the AI)
```

### Files Involved

| File | Purpose |
|------|---------|
| [`scripts/daily-briefing.ts`](scripts/daily-briefing.ts) | `generateNewsBriefing()` function |
| [`stalela-commons/src/news.ts`](../stalela-commons/src/news.ts) | Data layer: `getByDate()`, `listDates()`, `upsert()` |
| [`stalela-commons/src/types.ts`](../stalela-commons/src/types.ts) | `DailyNews` type: `{ id, date, content, topics[], created_at }` |
| [`src/app/(dashboard)/briefings/BriefingsDashboard.tsx`](src/app/(dashboard)/briefings/BriefingsDashboard.tsx) | News tab — renders markdown with `renderMarkdown()` helper |

### News Sections (defined in the system prompt)

| Emoji | Section |
|-------|---------|
| 🇿🇦 | South Africa & Africa |
| 🤖 | AI & Tech |
| 💰 | Fintech & B2B |
| 💻 | Dev & Engineering |
| 🔮 | One Thing to Watch |

---

## Supporting Infrastructure

### Supabase Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `company_research` | Cached AI reports | `company_id`, `report`, `model`, `created_at` |
| `daily_briefings` | Per-company outreach per date | `company_id`, `date`, `email_draft_*`, `call_script`, `status`, `priority` |
| `daily_news` | Daily news digests | `date`, `content`, `topics[]` |

### APIs Used by AI Features

| API Singleton | Commons Module | Database Table |
|---------------|----------------|----------------|
| `companiesApi` | `companies.ts` | `companies` |
| `researchApi` | `research.ts` | `company_research` |
| `briefingsApi` | `briefings.ts` | `daily_briefings` |
| `newsApi` | `news.ts` | `daily_news` |
| `leadsApi` | `leads.ts` | `leads` |
| `metricsApi` | `metrics.ts` | `leads` + `blog_posts` |

### Neo4j (Optional)

Used only by the research chat agent (Feature 2). Neo4j tools are
**lazy-imported** to avoid build crashes when Neo4j is not configured:

```typescript
// In route.ts — lazy import inside the tool handler:
const { neo4jApi } = await import("@/lib/neo4j-api");
```

---

## Environment Variables

| Variable | Required By | Purpose |
|----------|-------------|---------|
| `DASHSCOPE_API_KEY` | All AI features | Alibaba DashScope API key |
| `NEXT_PUBLIC_SUPABASE_URL` | Everything | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin API routes + script | Service-role key (never exposed to client) |
| `NEO4J_URI` | Research chat only | Neo4j connection string (optional) |
| `NEO4J_USER` | Research chat only | Neo4j username (optional) |
| `NEO4J_PASSWORD` | Research chat only | Neo4j password (optional) |
| `BRIEFING_BATCH_SIZE` | Daily pipeline | Max companies per run (default 10) |
| `WHATSAPP_PHONE_NUMBER_ID` | Daily pipeline | Meta WhatsApp business phone number ID |
| `WHATSAPP_ACCESS_TOKEN` | Daily pipeline | Meta WhatsApp API token |

---

## Adding a New Tool

To add a tool to one of the chat agents, follow this pattern:

### 1. Define the tool schema

Add to the `TOOLS` array in the API route:

```typescript
{
  type: "function",
  function: {
    name: "my_new_tool",
    description: "What this tool does — be specific so the LLM knows when to use it.",
    parameters: {
      type: "object",
      properties: {
        param1: { type: "string", description: "What this parameter is for" },
      },
      required: ["param1"],
    },
  },
},
```

### 2. Implement the tool handler

Add a case to the `executeTool` switch statement:

```typescript
case "my_new_tool": {
  const result = await someApi.someMethod(args.param1 as string);
  return JSON.stringify(result);
}
```

### 3. Update the system prompt (optional)

If the tool requires special instructions (e.g. "always call tool X before
tool Y"), add that to the system prompt.

### Key rules

- Tool results must be serializable as JSON strings
- Keep results concise — large payloads waste LLM context window
- Add `try/catch` — all tools should fail gracefully with an error message
- The tool definition `description` is critical — it's how the LLM decides
  when to use the tool

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| 400 from DashScope | `enable_search` + `tools` in same request | Use only one per request |
| Agent loops forever | Tool keeps returning empty results | Check data exists; the 6-round max ensures it stops |
| Streaming shows nothing then dumps all text | Expected for chat agents (fake streaming) | This is by design — agent loops are synchronous |
| Research report is stale | 7-day cache | Pass `force: true` in the request body |
| Neo4j tools fail | Neo4j not configured | Set `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` env vars |
| Daily briefing produces no results | No matching companies in DB | Check Supabase `companies` table has data; check the keyword matching logic |
| WhatsApp notification fails | Missing secrets | Add `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ACCESS_TOKEN` to GitHub repo secrets (not environment variables) |
| `next build` crashes on API imports | Lazy proxy not used | Ensure all API singletons go through `lazy()` in `src/lib/api.ts` |
