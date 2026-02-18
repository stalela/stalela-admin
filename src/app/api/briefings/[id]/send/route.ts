import { NextRequest, NextResponse } from "next/server";
import { briefingsApi } from "@/lib/api";
import { sendEmail } from "@/lib/email";
import { buildEmailHtml } from "@/lib/email-template";

/**
 * POST /api/briefings/[id]/send
 *
 * Sends the AI-generated email draft from a daily briefing to a recipient
 * and marks the briefing status as "sent".
 *
 * Body: { to: string, toName?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { to, toName } = (await request.json()) as {
      to: string;
      toName?: string;
    };

    if (!to) {
      return NextResponse.json(
        { error: "to (recipient email) is required" },
        { status: 400 }
      );
    }

    const briefing = await briefingsApi.getById(id);

    if (!briefing.email_draft_body) {
      return NextResponse.json(
        { error: "This briefing has no email draft yet" },
        { status: 422 }
      );
    }

    const subject = briefing.email_draft_subject ?? `Opportunity: ${briefing.opportunity_type} — ${briefing.company_name}`;

    const html = buildEmailHtml({
      subject,
      body: briefing.email_draft_body,
      recipientName: toName,
      companyName: briefing.company_name,
    });

    await sendEmail({ to, toName, subject, htmlContent: html });

    // Mark briefing as sent
    await briefingsApi.update(id, {
      status: "sent",
      reviewed_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[briefings/send]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to send briefing email" },
      { status: 500 }
    );
  }
}
