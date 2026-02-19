import { NextRequest, NextResponse } from "next/server";
import { companiesApi } from "@/lib/api";
import { createAdminClient } from "@stalela/commons/client";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const DASHSCOPE_BASE_URL =
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

/** Cache TTL in days — re-enrich if older than this. */
const CACHE_DAYS = 30;

const SYSTEM_PROMPT = `You are a LinkedIn company intelligence specialist. Your job is to find the official LinkedIn company page for a South African business and extract key profile information.

Search LinkedIn and the broader web to locate the company's LinkedIn presence.

Return ONLY a valid JSON object — no markdown, no explanation, no code fences — using EXACTLY this structure:

If found:
{
  "found": true,
  "linkedin_url": "https://www.linkedin.com/company/example/",
  "company_size": "51-200 employees",
  "industry": "Construction",
  "founded": "2005",
  "about": "Company description from LinkedIn",
  "specialties": ["specialty1", "specialty2"],
  "key_people": [
    {"name": "Jane Smith", "title": "Chief Executive Officer", "linkedin_url": "https://www.linkedin.com/in/jane-smith/"}
  ],
  "followers": "1 234",
  "headquarters": "Cape Town, Western Cape, South Africa"
}

If not found:
{
  "found": false,
  "not_found_reason": "No LinkedIn company page could be located for this business"
}

Rules:
- Only include linkedin.com URLs — no other domains
- If a field is unknown, use null
- specialties must be an array (empty array if none found)
- key_people must be an array (empty array if none found)
- Return ONLY the JSON object, nothing else`;

export interface LinkedInProfile {
  found: boolean;
  linkedin_url: string | null;
  company_size: string | null;
  industry: string | null;
  founded: string | null;
  about: string | null;
  specialties: string[];
  key_people: { name: string; title: string; linkedin_url: string | null }[];
  followers: string | null;
  headquarters: string | null;
  not_found_reason: string | null;
  model: string | null;
  created_at: string;
}

/** Return the latest cached profile for a company, or null if stale / missing. */
async function getCachedProfile(
  companyId: string
): Promise<LinkedInProfile | null> {
  try {
    const client = createAdminClient();
    const cutoff = new Date(
      Date.now() - CACHE_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();
    const { data, error } = await client
      .from("company_linkedin_profiles")
      .select("*")
      .eq("company_id", companyId)
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return data as LinkedInProfile;
  } catch {
    return null;
  }
}

/** Persist a new profile row. */
async function saveProfile(
  companyId: string,
  profile: Omit<LinkedInProfile, "created_at">,
  model: string
): Promise<void> {
  try {
    const client = createAdminClient();
    await client.from("company_linkedin_profiles").insert({
      company_id: companyId,
      found: profile.found,
      linkedin_url: profile.linkedin_url,
      company_size: profile.company_size,
      industry: profile.industry,
      founded: profile.founded,
      about: profile.about,
      specialties: profile.specialties ?? [],
      key_people: profile.key_people ?? [],
      followers: profile.followers,
      headquarters: profile.headquarters,
      not_found_reason: profile.not_found_reason,
      model,
    });
  } catch (e) {
    console.error("[linkedin] Failed to save profile:", e);
  }
}

/** GET /api/companies/linkedin?companyId=xxx — return cached profile */
export async function GET(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json(
      { error: "companyId is required" },
      { status: 400 }
    );
  }
  const cached = await getCachedProfile(companyId);
  if (!cached) {
    return NextResponse.json({ cached: false }, { status: 404 });
  }
  return NextResponse.json({ cached: true, profile: cached });
}

/** POST /api/companies/linkedin — enrich company from LinkedIn via DashScope */
export async function POST(request: NextRequest) {
  try {
    if (!DASHSCOPE_API_KEY) {
      return NextResponse.json(
        { error: "DASHSCOPE_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { companyId, force } = body as {
      companyId: string;
      force?: boolean;
    };

    if (!companyId) {
      return NextResponse.json(
        { error: "companyId is required" },
        { status: 400 }
      );
    }

    // Return cached data unless a force-refresh is requested
    if (!force) {
      const cached = await getCachedProfile(companyId);
      if (cached) {
        return NextResponse.json({ cached: true, profile: cached });
      }
    }

    // Fetch company context from DB
    let company;
    try {
      company = await companiesApi.getById(companyId);
    } catch {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    // Build enriched search context
    const contextParts: string[] = [`**Company Name:** ${company.name}`];
    if (company.website) contextParts.push(`**Website:** ${company.website}`);
    if (company.city || company.province)
      contextParts.push(
        `**Location:** ${[company.city, company.province, "South Africa"]
          .filter(Boolean)
          .join(", ")}`
      );
    if (company.category) contextParts.push(`**Industry:** ${company.category}`);
    if (company.email) contextParts.push(`**Email:** ${company.email}`);
    if (company.phone) contextParts.push(`**Phone:** ${company.phone}`);
    if (company.registration_number)
      contextParts.push(
        `**Registration #:** ${company.registration_number}`
      );

    const userPrompt = `Find the LinkedIn company page for this South African business and extract all available profile information:\n\n${contextParts.join("\n")}\n\nSearch LinkedIn directly for this company. Return ONLY the JSON object as described.`;

    const model = "qwen3-max";
    const response = await fetch(`${DASHSCOPE_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        stream: false,
        enable_search: true,
        search_options: { search_strategy: "agent" },
        enable_thinking: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[linkedin] DashScope error:", response.status, errText);
      return NextResponse.json(
        { error: `AI service error: ${response.status}` },
        { status: 502 }
      );
    }

    const aiResponse = await response.json();
    const rawContent: string =
      aiResponse.choices?.[0]?.message?.content ?? "";

    // Strip any accidental markdown code fences before parsing
    const jsonText = rawContent
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let profile: Omit<LinkedInProfile, "created_at">;
    try {
      const parsed = JSON.parse(jsonText);
      profile = {
        found: Boolean(parsed.found),
        linkedin_url: parsed.linkedin_url ?? null,
        company_size: parsed.company_size ?? null,
        industry: parsed.industry ?? null,
        founded: parsed.founded ?? null,
        about: parsed.about ?? null,
        specialties: Array.isArray(parsed.specialties) ? parsed.specialties : [],
        key_people: Array.isArray(parsed.key_people) ? parsed.key_people : [],
        followers: parsed.followers ?? null,
        headquarters: parsed.headquarters ?? null,
        not_found_reason: parsed.not_found_reason ?? parsed.reason ?? null,
        model,
      };
    } catch (e) {
      console.error("[linkedin] Failed to parse AI JSON:", e, rawContent);
      return NextResponse.json(
        { error: "Failed to parse LinkedIn data from AI response" },
        { status: 502 }
      );
    }

    await saveProfile(companyId, profile, model);

    return NextResponse.json({
      cached: false,
      profile: { ...profile, created_at: new Date().toISOString() },
    });
  } catch (e) {
    console.error("[linkedin] API error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
