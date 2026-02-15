#!/usr/bin/env node
/**
 * Daily Outreach Briefing Generator
 *
 * Runs on schedule (GitHub Actions) at 06:00 UTC / 08:00 CAT.
 *
 * Flow:
 *  1. Ask the AI to scan for current SA business opportunities/trends
 *  2. Query our database for companies matching those opportunities
 *  3. For each selected company, generate a personalized email draft + call script
 *  4. Save everything to the `daily_briefings` table
 *
 * Environment variables:
 *  - NEXT_PUBLIC_SUPABASE_URL
 *  - SUPABASE_SERVICE_ROLE_KEY
 *  - DASHSCOPE_API_KEY
 *  - BRIEFING_BATCH_SIZE  (optional, default 10)
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";

/* ------------------------------------------------------------------ */
/*  Config                                                              */
/* ------------------------------------------------------------------ */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY!;
const BATCH_SIZE = parseInt(process.env.BRIEFING_BATCH_SIZE || "10", 10);
const DASHSCOPE_BASE_URL =
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

if (!SUPABASE_URL || !SUPABASE_KEY || !DASHSCOPE_API_KEY) {
  console.error(
    "Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DASHSCOPE_API_KEY"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

/* ------------------------------------------------------------------ */
/*  AI helper                                                           */
/* ------------------------------------------------------------------ */

async function chatCompletion(
  systemPrompt: string,
  userPrompt: string,
  enableSearch = true
): Promise<string> {
  const body: Record<string, unknown> = {
    model: "qwen3-max",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    enable_thinking: false,
  };
  if (enableSearch) {
    body.enable_search = true;
    body.search_options = { search_strategy: "agent" };
  }

  const res = await fetch(`${DASHSCOPE_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`DashScope error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

/* ------------------------------------------------------------------ */
/*  Step 1: Discover today's opportunities                              */
/* ------------------------------------------------------------------ */

interface Opportunity {
  category_keywords: string[];
  province?: string;
  opportunity_type: string;
  summary: string;
  priority: number;
}

async function discoverOpportunities(): Promise<Opportunity[]> {
  console.log("🔍 Step 1: Scanning for SA business opportunities…");

  const response = await chatCompletion(
    `You are a South African B2B sales strategist. Your job is to identify actionable business opportunities for today. Consider:
- Recent news, government announcements, tenders
- Seasonal business patterns (current month/date: ${today})
- Industry trends in South Africa
- Economic events affecting specific sectors

Return a JSON array of 3-5 opportunities. Each object must have:
- "category_keywords": string[] — search terms to find relevant companies in our database
- "province": string | null — target province if location-specific
- "opportunity_type": string — one of: "industry_trend", "news_event", "seasonal", "expansion", "pain_point", "tender"
- "summary": string — 2-3 sentence explanation of why this is an opportunity right now
- "priority": number — 1 (highest) to 5 (lowest)

Return ONLY the JSON array, no other text. No markdown code fences.`,
    `Today is ${today}. Identify the top actionable B2B opportunities in South Africa right now that a business services company could capitalize on. Focus on opportunities where we could help companies with compliance, registration, accounting, tax, HR, or similar professional services.`,
    true
  );

  try {
    // Handle markdown fences
    const cleaned = response
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const opportunities = JSON.parse(cleaned) as Opportunity[];
    console.log(`   Found ${opportunities.length} opportunities`);
    return opportunities;
  } catch (e) {
    console.error("   Failed to parse opportunities:", e);
    console.error("   Raw response:", response.slice(0, 500));
    // Fallback: generic opportunity
    return [
      {
        category_keywords: ["accounting", "tax", "financial"],
        opportunity_type: "seasonal",
        summary:
          "General outreach to businesses that may need compliance and financial services.",
        priority: 3,
      },
    ];
  }
}

/* ------------------------------------------------------------------ */
/*  Step 2: Find matching companies                                     */
/* ------------------------------------------------------------------ */

interface CompanyTarget {
  id: string;
  name: string;
  category: string | null;
  city: string | null;
  province: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  opportunity: Opportunity;
}

async function findCompanyTargets(
  opportunities: Opportunity[]
): Promise<CompanyTarget[]> {
  console.log("🏢 Step 2: Finding matching companies…");

  const targets: CompanyTarget[] = [];
  const seenIds = new Set<string>();

  for (const opp of opportunities) {
    // Check how many we still need
    if (targets.length >= BATCH_SIZE) break;
    const remaining = BATCH_SIZE - targets.length;

    for (const keyword of opp.category_keywords) {
      if (targets.length >= BATCH_SIZE) break;

      let query = supabase
        .from("companies")
        .select("id, name, category, city, province, phone, email, website, short_description")
        .or(
          `name.ilike.%${keyword}%,category.ilike.%${keyword}%,short_description.ilike.%${keyword}%`
        );

      if (opp.province) {
        query = query.eq("province", opp.province);
      }

      // Exclude companies already briefed today
      const { data: alreadyBriefed } = await supabase
        .from("daily_briefings")
        .select("company_id")
        .eq("date", today);
      const briefedIds = (alreadyBriefed ?? []).map((r) => r.company_id);

      // Prefer companies with email (more actionable)
      query = query
        .not("email", "is", null)
        .order("name", { ascending: true })
        .limit(remaining);

      const { data, error } = await query;
      if (error) {
        console.error(`   Search error for "${keyword}":`, error.message);
        continue;
      }

      for (const c of data ?? []) {
        if (seenIds.has(c.id) || briefedIds.includes(c.id)) continue;
        seenIds.add(c.id);
        targets.push({
          id: c.id,
          name: c.name,
          category: c.category,
          city: c.city,
          province: c.province,
          phone: c.phone,
          email: c.email,
          website: c.website,
          description: c.short_description,
          opportunity: opp,
        });
        if (targets.length >= BATCH_SIZE) break;
      }
    }
  }

  console.log(`   Selected ${targets.length} companies for outreach`);
  return targets;
}

/* ------------------------------------------------------------------ */
/*  Step 3: Generate email drafts + call scripts                        */
/* ------------------------------------------------------------------ */

interface BriefingDraft {
  company: CompanyTarget;
  research_summary: string;
  email_subject: string;
  email_body: string;
  call_script: string;
}

async function generateBriefing(
  company: CompanyTarget
): Promise<BriefingDraft> {
  const companyInfo = [
    `Company: ${company.name}`,
    company.category ? `Category: ${company.category}` : null,
    company.city || company.province
      ? `Location: ${[company.city, company.province].filter(Boolean).join(", ")}`
      : null,
    company.email ? `Email: ${company.email}` : null,
    company.phone ? `Phone: ${company.phone}` : null,
    company.website ? `Website: ${company.website}` : null,
    company.description ? `Description: ${company.description}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await chatCompletion(
    `You are an expert B2B sales copywriter for a South African business services company. Generate sales outreach materials for a specific company.

Return your response in EXACTLY this JSON format (no markdown fences, just raw JSON):
{
  "research_summary": "2-3 sentences summarizing key findings about this company and why they're a good target",
  "email_subject": "Compelling, personalized subject line under 60 chars",
  "email_body": "Ready-to-send cold email under 150 words. Professional but warm. Reference their specific business. Connect to the opportunity. Include a soft CTA. Sign off as the Stalela team.",
  "call_script": "30-second phone script with: opening hook, 1-2 discovery questions, value pivot, and next step. Keep it conversational."
}`,
    `Generate outreach materials for this company based on the current opportunity.

COMPANY INFO:
${companyInfo}

OPPORTUNITY:
Type: ${company.opportunity.opportunity_type}
${company.opportunity.summary}

Search the web for additional context about this company if possible. Make the outreach highly personalized.`,
    true
  );

  try {
    const cleaned = response
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    return {
      company,
      research_summary: parsed.research_summary || "",
      email_subject: parsed.email_subject || `Partnership opportunity for ${company.name}`,
      email_body: parsed.email_body || "",
      call_script: parsed.call_script || "",
    };
  } catch (e) {
    console.error(`   Failed to parse draft for ${company.name}:`, e);
    return {
      company,
      research_summary: `Target based on ${company.opportunity.opportunity_type}: ${company.opportunity.summary}`,
      email_subject: `Partnership opportunity for ${company.name}`,
      email_body: response, // Use raw response as fallback
      call_script: "",
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Step 4: Save to database                                            */
/* ------------------------------------------------------------------ */

async function saveBriefing(draft: BriefingDraft): Promise<void> {
  const { error } = await supabase.from("daily_briefings").upsert(
    {
      date: today,
      company_id: draft.company.id,
      company_name: draft.company.name,
      opportunity_type: draft.company.opportunity.opportunity_type,
      opportunity_summary: draft.company.opportunity.summary,
      research_summary: draft.research_summary,
      email_draft_subject: draft.email_subject,
      email_draft_body: draft.email_body,
      call_script: draft.call_script,
      priority: draft.company.opportunity.priority,
      status: "pending",
    },
    { onConflict: "company_id,date" }
  );

  if (error) {
    console.error(`   Failed to save briefing for ${draft.company.name}:`, error.message);
  }
}

/* ------------------------------------------------------------------ */
/*  Step 0: Generate news digest                                        */
/* ------------------------------------------------------------------ */

const NEWS_TOPICS = [
  "South African tech industry",
  "AI and machine learning",
  "fintech in Africa",
  "B2B SaaS and enterprise",
  "software engineering and coding",
  "South African business & economy",
];

async function generateNewsBriefing(): Promise<void> {
  const response = await chatCompletion(
    `You are a sharp, concise tech and business news curator writing for a South African B2B founder/CEO.
Produce a daily digest for ${today} covering these beats: ${NEWS_TOPICS.join(", ")}.

FORMAT (use markdown):
# 📰 Daily News Briefing — ${today}

## 🇿🇦 South Africa & Africa
- **Headline**: 2-3 sentence summary with context. [Source](url)
- ...

## 🤖 AI & Tech
- **Headline**: 2-3 sentence summary. [Source](url)
- ...

## 💰 Fintech & B2B
- **Headline**: 2-3 sentence summary. [Source](url)
- ...

## 💻 Dev & Engineering
- **Headline**: 2-3 sentence summary. [Source](url)
- ...

## 🔮 One Thing to Watch
A single paragraph about an emerging trend worth tracking.

RULES:
- 8-12 stories total, prioritize South Africa + Africa first
- Each story: bold headline, 2-3 sentence summary, source link
- Only include REAL news from today or this week — do not fabricate
- Be opinionated — add brief "why it matters" where relevant
- Keep the whole digest under 800 words`,
    `Create today's news digest. Search the web for the latest real news across all the beats.`,
    true
  );

  // Determine which topics were covered
  const topicsFound: string[] = [];
  const lower = response.toLowerCase();
  if (lower.includes("south africa") || lower.includes("africa"))
    topicsFound.push("south-africa");
  if (lower.includes("ai") || lower.includes("artificial intelligence"))
    topicsFound.push("ai");
  if (lower.includes("fintech") || lower.includes("b2b"))
    topicsFound.push("fintech", "b2b");
  if (lower.includes("coding") || lower.includes("engineering") || lower.includes("developer"))
    topicsFound.push("dev");
  if (lower.includes("tech")) topicsFound.push("tech");

  // Upsert to daily_news table
  const { error } = await supabase.from("daily_news").upsert(
    {
      date: today,
      content: response,
      topics: [...new Set(topicsFound)],
    },
    { onConflict: "date" }
  );

  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/*  Main                                                                */
/* ------------------------------------------------------------------ */

async function main() {
  console.log(`\n📋 Daily Outreach Briefing — ${today}`);
  console.log(`   Batch size: ${BATCH_SIZE}\n`);

  const startTime = Date.now();

  // 0. Generate news digest (runs first, independent of company outreach)
  console.log("📰 Step 0: Generating news digest…\n");
  try {
    await generateNewsBriefing();
    console.log("   ✅ News digest saved\n");
  } catch (e) {
    console.error("   ❌ News digest failed:", e instanceof Error ? e.message : String(e));
  }

  // 1. Discover opportunities
  const opportunities = await discoverOpportunities();

  // 2. Find matching companies
  const targets = await findCompanyTargets(opportunities);

  if (targets.length === 0) {
    console.log("\n⚠️  No matching companies found. Exiting.");
    process.exit(0);
  }

  // 3 & 4. Generate drafts and save (process sequentially to respect rate limits)
  console.log(`\n✍️  Step 3: Generating personalized outreach for ${targets.length} companies…\n`);

  let success = 0;
  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    console.log(`   [${i + 1}/${targets.length}] ${target.name}…`);

    try {
      const draft = await generateBriefing(target);
      await saveBriefing(draft);
      success++;
      console.log(`   ✅ ${target.name} — saved`);
    } catch (e) {
      console.error(
        `   ❌ ${target.name} — ${e instanceof Error ? e.message : String(e)}`
      );
    }

    // Small delay between AI calls to respect rate limits
    if (i < targets.length - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n🎯 Done! ${success}/${targets.length} briefings generated in ${elapsed}s`);
  console.log(`   View in dashboard: /briefings?date=${today}\n`);

  // Write summary for GitHub Actions (WhatsApp notification)
  const companyNames = targets.slice(0, success).map((t) => t.name);
  const summary = [
    `📋 *Daily Outreach Briefing — ${today}*`,
    ``,
    `✅ ${success}/${targets.length} briefings generated in ${elapsed}s`,
    ``,
    `*Companies:*`,
    ...companyNames.map((n, i) => `${i + 1}. ${n}`),
    ``,
    `🔗 Review in dashboard: /briefings?date=${today}`,
  ].join("\n");

  // Write to file so the workflow can pick it up
  if (process.env.GITHUB_OUTPUT) {
    writeFileSync("briefing-summary.txt", summary, "utf-8");
    console.log("   Summary written to briefing-summary.txt");
  }
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
