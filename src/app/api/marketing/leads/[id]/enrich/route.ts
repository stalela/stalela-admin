import { NextRequest, NextResponse } from "next/server";
import { leadGenApi } from "@/lib/api";
import { createClient } from "@/lib/supabase-server";
import { getTenantContext, isTenantUser } from "@/lib/tenant-context";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const DASHSCOPE_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

const SYSTEM_PROMPT = `You are an expert B2B outreach strategist specialising in South African businesses.

You are given details about a potential lead and a question or instruction from a sales agent.
Your job is to:
1. Answer the question / fulfil the instruction using your knowledge and web search.
2. Always end with an updated, ready-to-send outreach email draft that incorporates your findings.

Formatting rules:
- Answer the question clearly and concisely (2-5 sentences or a short list).
- Then write the updated email under the heading: ## Updated Draft
- The draft must be under 150 words, warm but professional, personalised to the specific company.
- Do NOT include subject lines inside the draft body — just the body text.
- Do NOT make up facts. If unsure, say so and base the draft on what you know.`;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    /* ── Auth ───────────────────────────────────────────────────── */
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ctx = await getTenantContext(user.id);
    if (!isTenantUser(ctx.role) || !ctx.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!DASHSCOPE_API_KEY) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
    }

    const { id } = await params;
    const { message } = (await request.json()) as { message: string };

    if (!message?.trim()) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    /* ── Load lead ──────────────────────────────────────────────── */
    const lead = await leadGenApi.getById(id);
    if (lead.tenant_id !== ctx.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    /* ── Build context prompt ───────────────────────────────────── */
    const context = [
      `LEAD INFORMATION:`,
      `Company: ${lead.company_name}`,
      lead.company_industry ? `Industry: ${lead.company_industry}` : null,
      lead.company_city || lead.company_province
        ? `Location: ${[lead.company_city, lead.company_province].filter(Boolean).join(", ")}, South Africa`
        : null,
      lead.company_website ? `Website: ${lead.company_website}` : null,
      lead.company_phone ? `Phone: ${lead.company_phone}` : null,
      lead.company_email ? `Email: ${lead.company_email}` : null,
      `Match reason: ${lead.match_reason}`,
      lead.outreach_suggestion
        ? `\nCURRENT OUTREACH DRAFT:\n${lead.outreach_suggestion}`
        : null,
      lead.notes ? `\nAGENT NOTES:\n${lead.notes}` : null,
      `\nAGENT REQUEST:\n${message}`,
    ]
      .filter(Boolean)
      .join("\n");

    /* ── Call DashScope with web search enabled ─────────────────── */
    const dsRes = await fetch(`${DASHSCOPE_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen3-max",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: context },
        ],
        enable_search: true,
        search_options: { forced_search: false },
        max_tokens: 1200,
        temperature: 0.7,
      }),
    });

    if (!dsRes.ok) {
      const err = await dsRes.text().catch(() => "");
      console.error("[leads/enrich] DashScope error:", err);
      return NextResponse.json({ error: "AI service error" }, { status: 502 });
    }

    const dsData = await dsRes.json();
    const fullText: string =
      dsData.choices?.[0]?.message?.content ?? "";

    /* ── Parse out updated draft ────────────────────────────────── */
    const draftMatch = fullText.match(
      /##\s*Updated Draft\s*\n+([\s\S]+?)(?:\n##|\n---|\*\*\*|$)/i
    );
    const updatedDraft = draftMatch?.[1]?.trim() ?? null;

    // Response text = everything before "## Updated Draft"
    const responseText = fullText
      .replace(/##\s*Updated Draft[\s\S]*$/i, "")
      .trim();

    /* ── Persist updated draft if extracted ─────────────────────── */
    if (updatedDraft) {
      await leadGenApi.update(id, { notes: lead.notes ?? undefined }).catch(() => {});
      // We don't overwrite outreach_suggestion automatically — UI confirms
    }

    return NextResponse.json({
      response: responseText || fullText,
      updatedDraft,
    });
  } catch (e) {
    console.error("[leads/enrich]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to enrich lead" },
      { status: 500 }
    );
  }
}
