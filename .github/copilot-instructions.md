# Stalela Admin — Copilot Instructions

## Scope
- This repo is the Stalela internal admin dashboard (Next.js App Router + React 19).
- Shared data layer comes from `@stalela/commons` (installed via `github:stalela/stalela-commons`).

## Architecture
- Primary flow: UI → Next.js route/server component → `@stalela/commons` factory API → Supabase.
- Admin uses service-role client via lazy proxies: `src/lib/api.ts` (`lazy()` prevents `next build` crashes when env vars are missing).
- `createAdminClient()` must remain server-only; never expose `SUPABASE_SERVICE_ROLE_KEY` to client components.

## Key integration paths
- Auth gate: `src/middleware.ts` + `src/lib/supabase-middleware.ts` (redirect unauthenticated users to `/login`, redirect logged-in users away from `/login`).
- Company intelligence endpoints (`src/app/api/companies/*`) integrate Supabase, optional Neo4j (`NEO4J_*`), and DashScope (`DASHSCOPE_API_KEY`).

## Framework conventions
- Next.js App Router + React 19; `params` in pages/layouts are often `Promise<...>` and must be awaited.
- `reactCompiler: true` is enabled; `transpilePackages: ["@stalela/commons"]` in `next.config.ts`.

## Import conventions
- Use `@stalela/commons` subpath imports: `/client`, `/blog`, `/leads`, `/customers`, `/seo`, `/metrics`, `/companies`, `/research`, `/types`.
- Use `@/*` path alias for local source files.

## Env vars
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Optional: `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`, `DASHSCOPE_API_KEY`

## Change constraints
- Prefer targeted changes that match existing patterns over new abstractions.
- Supabase remote image host is `hwfhtdlbtjhmwzyvejxd.supabase.co`.
