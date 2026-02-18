import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@stalela/commons/client";
import { createLeadGenApi } from "@stalela/commons/lead-gen";

/**
 * POST /api/email/inbound
 *
 * Cloudmailin inbound email webhook.
 * Fired whenever someone replies to an outreach email addressed to your
 * Cloudmailin target address (e.g. xxxxx@cloudmailin.net or a custom
 * subdomain configured via Custom MX in your registrar).
 *
 * Flow:
 *  1. Validate optional INBOUND_WEBHOOK_SECRET via ?secret= query param
 *  2. Parse Cloudmailin JSON payload → extract sender + body
 *  3. Look up sender email in generated_leads (service-role, all tenants)
 *  4. Call DashScope Qwen to draft a contextual reply
 *  5. Insert into email_threads (status = "pending_review")
 *  6. Return 200 immediately (Cloudmailin retries on non-2xx)
 *
 * Cloudmailin JSON shape (multipart format):
 *   envelope.from          — sender email
 *   headers.From           — "Name <email>" string
 *   headers.Subject        — subject line
 *   body.reply_plain       — reply text with quoted history stripped  ← preferred
 *   body.plain             — full plain-text body (fallback)
 */

export const dynamic = "force-dynamic";
export const maxDuration = 45;

const INBOUND_WEBHOOK_SECRET =
  process.env.INBOUND_WEBHOOK_SECRET ??
  process.env.BREVO_INBOUND_SECRET ??   // backward compat
  null;
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
  // ── Secret validation (optional) ────────────────────────────────
  if (INBOUND_WEBHOOK_SECRET) {
    const secret =
      request.nextUrl.searchParams.get("secret") ??
      request.headers.get("x-webhook-token");
    if (secret !== INBOUND_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: true });
  }

  // ── Parse Cloudmailin payload ────────────────────────────────────
  // Shape: { envelope: { from }, headers: { From, Subject }, body: { plain, reply_plain } }
  const envelope = payload.envelope as Record<string, string> | undefined;
  const headers  = payload.headers  as Record<string, string> | undefined;
  const body     = payload.body     as Record<string, string> | undefined;

  // Sender email — prefer envelope.from (always clean), fall back to headers.From
  const rawFrom = envelope?.from ?? headers?.From ?? (payload.From as string) ?? "";
  const { email: fromEmail, name: fromName } = parseFrom(null, rawFrom);

  // If headers.From has a display name, use it
  const nameFromHeader = headers?.From ? parseFrom(null, headers.From).name : null;
  const resolvedName = nameFromHeader ?? fromName;

  if (!fromEmail) {
    console.error("[inbound] Could not parse sender email", payload);
    return NextResponse.json({ ok: true });
  }

  const subject = headers?.Subject ?? (payload.Subject as string) ?? null;

  // reply_plain has quoted history stripped — much cleaner for AI context
  const bodyText = (
    body?.reply_plain ??
    body?.plain ??
    (payload.RawTextBody as string) ??
    (payload.TextBody as string) ??
    null
  );

  // ── Look up lead ─────────────────────────────────────────────────
  const supabase = createAdminClient();
  const leadGenApi = createLeadGenApi(supabase);

  let lead: Awaited<ReturnType<typeof leadGenApi.list>>["leads"][number] | null = null;
  let tenantId: string | null = null;

  try {
    const { data: matches } = await (
      supabase as unknown as {
        from: (t: string) => {
          select: (cols: string) => {
            ilike: (col: string, val: string) => Promise<{ data: Array<{ id: string; tenant_id: string }> }>;
          };
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

  // ── AI draft reply ───────────────────────────────────────────────
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

  // ── Insert thread ────────────────────────────────────────────────
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
        from_name: resolvedName,
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
