import { NextRequest, NextResponse } from "next/server";
import { leadGenApi } from "@/lib/api";
import { sendEmail } from "@/lib/email";
import { buildEmailHtml } from "@/lib/email-template";
import { createClient } from "@/lib/supabase-server";
import { getTenantContext, isTenantUser } from "@/lib/tenant-context";

/**
 * POST /api/marketing/leads/[id]/send
 *
 * Sends an outreach email to a generated lead using the lead's
 * AI-produced outreach_suggestion as the email body.
 * Updates the lead status to "contacted".
 *
 * Body: { to?: string, toName?: string, customBody?: string }
 *   - to: recipient address. Falls back to lead.company_email if omitted.
 *   - toName: display name. Falls back to lead.company_name.
 *   - customBody: override the outreach_suggestion with your own copy.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    const { id } = await params;
    const {
      to,
      toName,
      customBody,
    } = (await request.json()) as {
      to?: string;
      toName?: string;
      customBody?: string;
    };

    const lead = await leadGenApi.getById(id);

    if (lead.tenant_id !== ctx.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const recipient = to ?? lead.company_email;
    if (!recipient) {
      return NextResponse.json(
        { error: "No recipient email — provide 'to' in the request body or add an email to this lead" },
        { status: 422 }
      );
    }

    const body = customBody ?? lead.outreach_suggestion;
    if (!body) {
      return NextResponse.json(
        { error: "No outreach body — provide 'customBody' or generate an outreach suggestion first" },
        { status: 422 }
      );
    }

    const displayName = toName ?? lead.company_name;
    const subject = `Partnership Opportunity — ${lead.company_name}`;

    const html = buildEmailHtml({
      subject,
      body,
      recipientName: displayName,
      companyName: lead.company_name,
    });

    await sendEmail({
      to: recipient,
      toName: displayName,
      subject,
      htmlContent: html,
    });

    // Mark as contacted
    await leadGenApi.update(id, { status: "contacted" });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[leads/send]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to send lead email" },
      { status: 500 }
    );
  }
}
