import { NextRequest, NextResponse } from "next/server";
import { briefingsApi } from "@/lib/api";
import { sendEmail } from "@/lib/email";
import { buildEmailHtml } from "@/lib/email-template";

export const dynamic = "force-dynamic";

interface BulkSendItem {
  id: string;
  to: string;
  toName?: string;
  /** Override the saved draft subject */
  subject?: string;
  /** Override the saved draft body */
  body?: string;
  attachments?: Array<{ name: string; content: string }>;
}

/**
 * POST /api/briefings/bulk-send
 *
 * Sends one email per item in the `sends` array.
 * Falls back to the briefing's saved email_draft_subject / email_draft_body when
 * subject / body are not provided in the item.
 *
 * Returns a summary: { sent: string[], failed: Array<{ id, error }> }
 */
export async function POST(request: NextRequest) {
  try {
    const { sends } = (await request.json()) as { sends: BulkSendItem[] };

    if (!Array.isArray(sends) || sends.length === 0) {
      return NextResponse.json(
        { error: "sends array is required and must not be empty" },
        { status: 400 }
      );
    }

    const results: { sent: string[]; failed: Array<{ id: string; error: string }> } = {
      sent: [],
      failed: [],
    };

    for (const item of sends) {
      try {
        const briefing = await briefingsApi.getById(item.id);
        const body = item.body ?? briefing.email_draft_body;

        if (!body) {
          results.failed.push({ id: item.id, error: "No email draft body" });
          continue;
        }

        const subject =
          item.subject ??
          briefing.email_draft_subject ??
          `Opportunity: ${briefing.opportunity_type} — ${briefing.company_name}`;

        const html = buildEmailHtml({
          subject,
          body,
          recipientName: item.toName,
          companyName: briefing.company_name,
        });

        await sendEmail({
          to: item.to,
          toName: item.toName,
          subject,
          htmlContent: html,
          replyTo: process.env.CLOUDMAILIN_ADDRESS ?? undefined,
          attachments: item.attachments?.length ? item.attachments : undefined,
        });

        await briefingsApi.update(item.id, {
          status: "sent",
          reviewed_at: new Date().toISOString(),
        });

        results.sent.push(item.id);
      } catch (err) {
        console.error(`[briefings/bulk-send] id=${item.id}`, err);
        results.failed.push({
          id: item.id,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json(results);
  } catch (e) {
    console.error("[briefings/bulk-send]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Bulk send failed" },
      { status: 500 }
    );
  }
}
