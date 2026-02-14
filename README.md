# Stalela Admin

Internal admin dashboard for Stalela. Built with Next.js App Router + React 19.

## Setup

```bash
npm install
cp .env.example .env.local  # fill in your env vars
npm run dev
```

Runs on [http://localhost:3001](http://localhost:3001).

## Dependencies

- **[@stalela/commons](https://github.com/stalela/stalela-commons)** — Shared Supabase data layer (installed from GitHub).

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-only) |
| `NEO4J_URI` | No | Neo4j connection URI |
| `NEO4J_USER` | No | Neo4j username |
| `NEO4J_PASSWORD` | No | Neo4j password |
| `DASHSCOPE_API_KEY` | No | DashScope API key for AI features |
