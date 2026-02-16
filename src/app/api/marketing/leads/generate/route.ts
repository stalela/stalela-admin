import { NextRequest, NextResponse } from "next/server";
import {
  tenantsApi,
  auditsApi,
  competitorsApi,
  companiesApi,
  leadGenApi,
} from "@/lib/api";
import { createClient } from "@/lib/supabase-server";
import { getTenantContext, isTenantUser } from "@/lib/tenant-context";
import type { Company, GeneratedLeadInsert } from "@stalela/commons/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const DASHSCOPE_BASE_URL =
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

/* ------------------------------------------------------------------ */
/*  POST — Generate 10 AI-scored B2B leads for the tenant              */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  try {
    /* ── Auth ─────────────────────────────────────────────────── */
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await getTenantContext(user.id);
    if (!isTenantUser(ctx.role) || !ctx.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tenantId = ctx.tenantId;

    // Accept optional profile overrides from request body
    let bodyOverrides: { industry?: string; city?: string; province?: string } = {};
    try {
      bodyOverrides = await request.json();
    } catch {
      // No body or invalid JSON — fine, we'll use tenant settings
    }

    if (!DASHSCOPE_API_KEY) {
      return NextResponse.json(
        { error: "AI service not configured (DASHSCOPE_API_KEY missing)" },
        { status: 500 }
      );
    }

    /* ── Gather tenant profile ────────────────────────────────── */
    const [tenant, audits, competitors] = await Promise.all([
      tenantsApi.getById(tenantId).catch(() => null),
      auditsApi.list(tenantId).catch(() => []),
      competitorsApi.list(tenantId).catch(() => []),
    ]);

    const settings = (tenant?.settings ?? {}) as Record<string, unknown>;
    const industry = bodyOverrides.industry || (settings.industry as string) || null;
    const city = bodyOverrides.city || (settings.city as string) || null;
    const province = bodyOverrides.province || (settings.province as string) || null;
    const companyName = tenant?.name || "Unknown";
    const websiteUrl = tenant?.website_url || null;

    const latestAudit = (
      audits as { status: string; report?: { brand_summary?: string; market_positioning?: string; competitor_signals?: { name: string; notes: string }[] } }[]
    ).find((a) => a.status === "complete");

    const auditBrandSummary = latestAudit?.report?.brand_summary || null;
    const auditPositioning = latestAudit?.report?.market_positioning || null;
    const competitorNames = (competitors as { name: string }[]).map(
      (c) => c.name
    );

    /* ── Query candidate companies from Supabase ──────────────── */
    const candidateCompanies: Company[] = [];

    // Strategy 1: Search by industry/category
    if (industry) {
      try {
        const { companies } = await companiesApi.list({
          search: industry,
          limit: 30,
        });
        candidateCompanies.push(...companies);
      } catch {
        // skip
      }
    }

    // Strategy 2: Search by city/province for local businesses
    if (city || province) {
      try {
        const { companies } = await companiesApi.list({
          city: city || undefined,
          province: province || undefined,
          limit: 20,
        });
        // Add non-duplicate companies
        const existingIds = new Set(candidateCompanies.map((c) => c.id));
        for (const c of companies) {
          if (!existingIds.has(c.id)) {
            candidateCompanies.push(c);
            existingIds.add(c.id);
          }
        }
      } catch {
        // skip
      }
    }

    // Strategy 3: Broader search if we don't have enough candidates
    if (candidateCompanies.length < 20) {
      try {
        const searchTerms = [companyName.split(" ")[0]];
        if (auditBrandSummary) {
          // Extract a keyword from brand summary
          const words = auditBrandSummary
            .split(/\s+/)
            .filter((w) => w.length > 4)
            .slice(0, 3);
          searchTerms.push(...words);
        }
        for (const term of searchTerms) {
          if (candidateCompanies.length >= 50) break;
          const { companies } = await companiesApi.list({
            search: term,
            limit: 15,
          });
          const existingIds = new Set(candidateCompanies.map((c) => c.id));
          for (const c of companies) {
            if (!existingIds.has(c.id)) {
              candidateCompanies.push(c);
              existingIds.add(c.id);
            }
          }
        }
      } catch {
        // skip
      }
    }

    /* ── Query Neo4j for graph-based candidates (optional) ────── */
    let neo4jCandidateNames: string[] = [];
    try {
      if (
        process.env.NEO4J_URI &&
        process.env.NEO4J_PASSWORD &&
        (province || city)
      ) {
        const { createNeo4jApi } = await import("@/lib/neo4j-api");
        const neo4jApi = createNeo4jApi();
        const clusters = await neo4jApi.getClusters(
          province || undefined,
          city || undefined
        );
        neo4jCandidateNames = clusters
          .sort((a, b) => (b.count as number) - (a.count as number))
          .slice(0, 10)
          .map((c) => c.name)
          .filter(Boolean) as string[];
      }
    } catch {
      // Neo4j unavailable — no problem
    }

    if (candidateCompanies.length === 0) {
      return NextResponse.json(
        {
          error:
            "Could not find candidate companies. Make sure your business profile has industry and location details set.",
        },
        { status: 404 }
      );
    }

    /* ── Build AI prompt ──────────────────────────────────────── */
    const companyListForAI = candidateCompanies.slice(0, 50).map((c) => ({
      id: c.id,
      name: c.name,
      category: c.category,
      industry: c.categories?.join(", ") || c.category || null,
      city: c.city,
      province: c.province,
      website: c.website,
      phone: c.phone || c.mobile || c.whatsapp,
      email: c.email || c.contact_email,
      description: c.short_description || c.description?.slice(0, 150),
    }));

    const systemPrompt = `You are a B2B lead qualification analyst for a South African marketing firm. Your task is to score and rank potential B2B leads for a company.

SCORING CRITERIA (0–100):
- Industry relevance: Does the lead's industry/category complement or match the client's business? (0-30 points)
- Geographic proximity: Same city is best, same province is good (0-20 points)
- Business viability: Has website, phone, email? (0-15 points)
- Partnership potential: Could they benefit from each other's services? (0-20 points)
- Size/quality signals: Premium seller, description quality, multiple contact channels (0-15 points)

RULES:
1. Select exactly 10 leads from the candidates list
2. Return ONLY valid JSON — no markdown, no explanation outside JSON
3. Each match_reason should be 1-2 sentences explaining WHY this is a good lead
4. Each outreach_suggestion should be a personalized 2-3 sentence pitch the company could send
5. Do NOT include the client company itself or its known competitors as leads
6. Prioritize diversity of categories — don't pick 10 companies from the exact same niche
7. Be South Africa market-aware`;

    const userPrompt = `CLIENT COMPANY PROFILE:
- Name: ${companyName}
- Website: ${websiteUrl || "Not set"}
- Industry: ${industry || "Not specified"}
- Location: ${city ? `${city}, ` : ""}${province || "Not specified"}
${auditBrandSummary ? `- Brand Summary: ${auditBrandSummary}` : ""}
${auditPositioning ? `- Market Positioning: ${auditPositioning}` : ""}
${competitorNames.length > 0 ? `- Known Competitors (exclude these): ${competitorNames.join(", ")}` : ""}
${neo4jCandidateNames.length > 0 ? `- Industry Clusters (from graph data): ${neo4jCandidateNames.join(", ")}` : ""}

CANDIDATE COMPANIES (select 10 from these):
${JSON.stringify(companyListForAI, null, 2)}

Return a JSON object with this exact structure:
{
  "leads": [
    {
      "company_id": "uuid from candidate list",
      "company_name": "name",
      "relevance_score": 85,
      "match_reason": "Why this is a strong lead for ${companyName}",
      "outreach_suggestion": "Personalized outreach message to send"
    }
  ]
}`;

    /* ── Call DashScope AI ─────────────────────────────────────── */
    console.log(
      `[lead-gen] Generating leads for tenant ${tenantId} (${companyName}) with ${candidateCompanies.length} candidates`
    );

    const aiResponse = await fetch(
      `${DASHSCOPE_BASE_URL}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "qwen3-max",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          enable_thinking: false,
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("[lead-gen] DashScope error:", aiResponse.status, errText);
      return NextResponse.json(
        { error: `AI service error: ${aiResponse.status}` },
        { status: 502 }
      );
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content;

    if (!rawContent) {
      return NextResponse.json(
        { error: "AI returned empty response" },
        { status: 502 }
      );
    }

    /* ── Parse AI response ────────────────────────────────────── */
    let parsed: {
      leads: {
        company_id: string;
        company_name: string;
        relevance_score: number;
        match_reason: string;
        outreach_suggestion: string;
      }[];
    };

    try {
      parsed = JSON.parse(rawContent);
    } catch {
      // Try extracting JSON from markdown code blocks
      const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]);
      } else {
        console.error("[lead-gen] Failed to parse AI response:", rawContent);
        return NextResponse.json(
          { error: "Failed to parse AI response" },
          { status: 502 }
        );
      }
    }

    if (!parsed.leads || !Array.isArray(parsed.leads)) {
      return NextResponse.json(
        { error: "AI response missing leads array" },
        { status: 502 }
      );
    }

    /* ── Build lead inserts ───────────────────────────────────── */
    const companyMap = new Map(
      candidateCompanies.map((c) => [c.id, c])
    );

    const leadInserts: GeneratedLeadInsert[] = parsed.leads
      .slice(0, 10)
      .map((aiLead) => {
        const matched = companyMap.get(aiLead.company_id);
        return {
          tenant_id: tenantId,
          matched_company_id: matched?.id || null,
          company_name: aiLead.company_name || matched?.name || "Unknown",
          company_industry:
            matched?.category || matched?.categories?.[0] || null,
          company_city: matched?.city || null,
          company_province: matched?.province || null,
          company_website: matched?.website || null,
          company_phone:
            matched?.phone || matched?.mobile || matched?.whatsapp || null,
          company_email:
            matched?.email || matched?.contact_email || null,
          match_reason: aiLead.match_reason || "Matched by AI analysis",
          relevance_score: Math.min(100, Math.max(0, aiLead.relevance_score || 50)),
          outreach_suggestion: aiLead.outreach_suggestion || null,
          status: "new" as const,
        };
      });

    if (leadInserts.length === 0) {
      return NextResponse.json(
        { error: "AI did not return any valid leads" },
        { status: 502 }
      );
    }

    /* ── Save to database ─────────────────────────────────────── */
    const savedLeads = await leadGenApi.createBatch(leadInserts);

    console.log(
      `[lead-gen] Generated ${savedLeads.length} leads for tenant ${tenantId}`
    );

    return NextResponse.json({
      leads: savedLeads,
      count: savedLeads.length,
    });
  } catch (e) {
    console.error("[lead-gen] Error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
