# Stalela Admin — Copilot Instructions

## Scope
- Internal admin dashboard (Next.js 16 App Router + React 19). Runs on port **3001**.
- Shared data layer from `@stalela/commons` (installed via `github:stalela/stalela-commons`).

## Architecture
- **Data flow**: Server components → lazy-proxied API singletons (`src/lib/api.ts`) → `@stalela/commons` factories → Supabase (service-role).
- **Lazy proxy** (`lazy()` in `src/lib/api.ts`): Wraps each commons factory in a `Proxy` that defers `createAdminClient()` until first property access — prevents `next build` crashes when env vars are missing. All API singletons (`blogApi`, `leadsApi`, etc.) use this pattern.
- **Never expose** `SUPABASE_SERVICE_ROLE_KEY` to client components.
- **Neo4j** integration (`src/lib/neo4j.ts`, `neo4j-api.ts`) is admin-only graph logic, not part of commons.

## Server vs client component split
- **Server components**: All pages fetch data directly via lazy API singletons (`blogApi.list()`, `companiesApi.stats()`, etc.) and pass data as props.
- **Client components** (`"use client"`): Handle interactivity (forms, filters, maps, charts). Mutations always go through `fetch()` to internal `/api/` routes — never direct Supabase calls from the browser.
- **Mutation pattern**: `fetch("/api/...")` → check `res.ok` → `router.push()` + `router.refresh()` on success → inline error banner on failure.
- Forms use controlled `useState` (no form library). Editors (`BlogEditor`, `CustomerEditor`, `SeoEditor`) call API routes for create/update.

## Auth flow
- `src/middleware.ts` → `updateSession()` in `src/lib/supabase-middleware.ts` — checks `supabase.auth.getUser()` on every request.
- Unauthenticated → redirect to `/login`. Authenticated on `/login` → redirect to `/`.
- Login page uses browser Supabase client (`src/lib/supabase-browser.ts`) for email/password sign-in.

## Route structure
```
/login                          Auth (outside dashboard layout)
/                               Dashboard home (stats, charts)
/blog, /blog/new, /blog/[slug], /blog/[slug]/edit
/seo, /seo/new, /seo/[id]/edit
/contacts/leads, /contacts/leads/[id]
/contacts/customers, /contacts/customers/new, /contacts/customers/[id], /contacts/customers/[id]/edit
/metrics                        Analytics
/companies, /companies/list, /companies/[id], /companies/map, /companies/graph
```

## API routes (`src/app/api/`)
- All follow: import from `@/lib/api` → try/catch → `console.error("[tag]", error)` → `NextResponse.json({ error }, { status })`.
- Dynamic route params use `Promise<{ slug/id: string }>` (Next.js 16 async params) and must be `await`-ed.
- `/api/companies/graph` lazy-imports `neo4j-api.ts` to avoid build crashes when Neo4j is absent.
- `/api/companies/research` streams DashScope AI responses via SSE, with 7-day TTL caching in Supabase.

## Design system
- **"Wakanda" dark theme**: Background `#0a0a0c`, surfaces `#121217`–`#22222d`, copper accents `#a4785a`/`#d4a574`, vibranium purple `#7c5cff`.
- **Styling**: `cn()` utility (`twMerge(clsx(...))`) in `src/lib/utils.ts`. Custom CSS utilities: `.wakanda-lines`, `.wakanda-glow`, `.wakanda-border`.
- **Icons**: Lucide React. **Charts**: Recharts with dark tooltip styling. **Maps**: Leaflet with dark CARTO tiles.

## Import conventions
- `@stalela/commons` subpath imports: `/client`, `/blog`, `/leads`, `/customers`, `/seo`, `/metrics`, `/companies`, `/research`, `/types`.
- `@/*` path alias for local source files.

## Env vars
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Optional: `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`, `DASHSCOPE_API_KEY`

## Change constraints
- Prefer targeted changes that match existing patterns over new abstractions.
- `reactCompiler: true` is enabled; `transpilePackages: ["@stalela/commons"]` in `next.config.ts`.
- Supabase remote image host is `hwfhtdlbtjhmwzyvejxd.supabase.co`.
