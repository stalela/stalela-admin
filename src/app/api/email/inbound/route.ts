import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@stalela/commons/client";
import { createLeadGenApi } from "@stalela/commons/lead-gen";

/**
 * POST /api/email/inbound
 *
 * Brevo Inbound Email Parsing webhook.
 * Fired whenever someone replies to an outreach email sent to an address on
 * your inbound subdomain (e.g. replies@inbound.stalela.com).
 *
 * Flow:
 *  1. Validate optional BREVO_INBOUND_SECRET via ?secret= query param
 *  2. Parse Brevo JSON payload → extract sender + body
 *  3. Look up the sender email in generated_leads
 *  4. Call DashScope Qwen to draft a contextual reply
 *  5. Insert into email_threads (status = "pending_review")
 *  6. Return 200 immediately (Brevo retries on non-2xx)
 *
 * Brevo Inbound JSON fields used:
 *   FromFull  { Name, Address }   — sender
 *   From      "Name <email>"      — fallback
 *   Subject   string
 *   RawTextBody  string           — plain text body
 *   TextBody     string           — fallback
 */

export const dynamic = "force-dynamic";
export const maxDuration = 45;

const BREVO_INBOUND_SECRET = process.env.BREVO_INBOUND_SECRET ?? null;
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const DASHSCOPE_BASE_URL =
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

const REPLY_SYSTEM_PROMPT = `You are a professional B2B outreach assistant representing Stalela, a South African marketing and advertising agency.

A potential lead has replied to an outreach email. You are given:
- The lead's company context (industry, location, match reason)
- The original outreach email that was sent to them
- Their reply

Write a warm, helpful follow-up reply that:
1. Acknowledges their specific response naturally
2. Addresses any questions or concerns they raised
3. Moves the conversation toward a discovery call or next step
4. Stays under 150 words and uses plain professional language

Write ONLY the email body. No subject line. No "To:" / "From:" headers. No sign-off with a name (the sender will add that).`;

/* ── Parse From field helpers ─────────────────────────────────────── */

function parseFrom(
  fromFull?: { Name?: string; Address?: string } | null,
  fromStr?: string
): { email: string; name: string | null } {
  if (fromFull?.Address) {
    return { email: fromFull.Address.toLowerCase(), name: fromFull.Name || null };
  }
  // "Display Name <email@example.com>" or just "email@example.com"
  if (fromStr) {
    const match = fromStr.match(/<([^>]+)>/);
    if (match) {
      const nameMatch = fromStr.match(/^([^<]+)</) ;
      return {
        email: match[1].toLowerCase().trim(),
        name: nameMatch ? nameMatch[1].trim() || null : null,
      };
    }
    return { email: fromStr.toLowerCase().trim(), name: null };
  }
  return { email: "", name: null };
}

export async function POST(request: NextRequest) {
  // ── Secret validation (optional) ──────────────────────────────────
  if (BREVO_INBOUND_SECRET) {
    const secret =
      request.nextUrl.searchParams.get("secret") ??
      request.headers.get("x-brevo-token");
    if (secret !== BREVO_INBOUND_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    // Brevo may send form-encoded — fall back gracefully
    return NextResponse.json({ ok: true });
  }

  // ── Parse sender ────────────────────────────────────────────────
  const fromFull = payload.FromFull as
    | { Name?: string; Address?: string }
    | null
    | undefined;
  const fromStr = (payload.From ?? payload.from) as string | undefined;
  const { email: fromEmail, name: fromName } = parseFrom(fromFull, fromStr);

  if (!fromEmail) {
    console.error("[inbound] Could not parse sender email from payload", payload);
    return NextResponse.json({ ok: true }); // don't let Brevo retry forever
  }

  const subject = ((payload.Subject ?? payload.subject) as string) || null;
  const bodyText =
    ((payload.RawTextBody ??
      payload.TextBody ??
      payload.text ??
      payload.body_text) as string) || null;

  // ── Look up lead ────────────────────────────────────────────────
  const supabase = createAdminClient();
  const leadGenApi = createLeadGenApi(supabase);

  let lead: Awaited<ReturnType<typeof leadGenApi.list>>["leads"][number] | null =
    null;
  let tenantId: string | null = null;

  try {
    // Search all tenants for this email (service-role, safe)
    const { data: matches } = await (
      supabase as unknown as {
        from: (t: string) => {
          select: (
            cols: string
          ) => { ilike: (col: string, val: string) => Promise<{ data: Array<{ id: string; tenant_id: string }> }> };
        };
      }
    )
      .from("generated_leads")
      .select("id, tenant_id")
      .ilike("company_email", fromEmail);

    if (matches && matches.length > 0) {
      const match = matches[0];
      lead = await leadGenApi.getById(match.id);
      tenantId = match.tenant_id;
    }
  } catch (err) {
    console.error("[inbound] Lead lookup failed:", err);
  }

  // ── AI draft reply ────────────────────────────────────────────
  let aiDraft: string | null = null;

  if (DASHSCOPE_API_KEY && bodyText) {
    try {
      const context = [
        lead
          ? [
              `LEAD CONTEXT:`,
              `Company: ${lead.company_name}`,
              lead.company_industry ? `Industry: ${lead.company_industry}` : null,
              lead.company_city || lead.company_province
                ? `Location: ${[lead.company_city, lead.company_province].filter(Boolean).join(", ")}, South Africa`
                : null,
              `Match reason: ${lead.match_reason}`,
              lead.outreach_suggestion
                ? `\nORIGINAL OUTREACH SENT:\n${lead.outreach_suggestion}`
                : null,
            ]
              .filter(Boolean)
              .join("\n")
          : "LEAD CONTEXT: Unknown lead — no matching record found.",
        `\nTHEIR REPLY:\n${bodyText.slice(0, 2000)}`,
      ].join("\n");

      const dsRes = await fetch(`${DASHSCOPE_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "qwen3-max",
          messages: [
            { role: "system", content: REPLY_SYSTEM_PROMPT },
            { role: "user", content: context },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (dsRes.ok) {
        const dsData = (await dsRes.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        aiDraft = dsData.choices?.[0]?.message?.content?.trim() ?? null;
        // Strip <think>...</think> tags that qwen3 sometimes emits
        if (aiDraft) {
          aiDraft = aiDraft.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
        }
      } else {
        console.error("[inbound] DashScope error:", await dsRes.text());
      }
    } catch (err) {
      console.error("[inbound] AI draft failed:", err);
    }
  }

  // ── Insert thread ────────────────────────────────────────────
  try {
    await (
      supabase as unknown as {
        from: (t: string) => {
          insert: (row: Record<string, unknown>) => Promise<{ error: unknown }>;
        };
      }
    )
      .from("email_threads")
      .insert({
        tenant_id: tenantId,
        lead_id: lead?.id ?? null,
        from_email: fromEmail,
        from_name: fromName,
        subject,
        body_text: bodyText?.slice(0, 5000) ?? null,
        ai_draft: aiDraft,
        status: "pending_review",
      });
  } catch (err) {
    console.error("[inbound] Failed to insert email_thread:", err);
  }

  // Always return 200 so Brevo doesn't retry
  return NextResponse.json({ ok: true });
}
