import { NextRequest, NextResponse } from "next/server";
import { campaignsApi } from "@/lib/api";
import { sendEmail } from "@/lib/email";

/**
 * POST /api/marketing/campaigns/[id]/send
 *
 * Sends an email preview of a campaign's approved content to a recipient.
 * Designed for sending campaign copy drafts to the client for sign-off,
 * or for direct targeted email delivery of campaign content.
 *
 * Body: { to: string, toName?: string, subject?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const {
      to,
      toName,
      subject: customSubject,
    } = (await request.json()) as {
      to: string;
      toName?: string;
      subject?: string;
    };

    if (!to) {
      return NextResponse.json(
        { error: "to (recipient email) is required" },
        { status: 400 }
      );
    }

    const [campaign, contents] = await Promise.all([
      campaignsApi.getById(id),
      campaignsApi.listContent(id),
    ]);

    // Use approved content; fall back to all content if none are approved yet
    const approved = contents.filter((c) => c.approved);
    const items = approved.length > 0 ? approved : contents;

    if (items.length === 0) {
      return NextResponse.json(
        { error: "This campaign has no content to send" },
        { status: 422 }
      );
    }

    const subject = customSubject ?? `Campaign Preview: ${campaign.name}`;

    // Build a clean HTML body from the content blocks
    const contentRows = items
      .map(
        (c) => `
        <tr>
          <td style="padding:8px 0 4px;">
            <span style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:600;color:#a4785a;text-transform:uppercase;letter-spacing:1px;">${c.content_type.replace("_", " ")}${c.variant_label ? ` · ${c.variant_label}` : ""}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:0 0 16px;">
            <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#333333;line-height:1.6;">${c.content.replace(/\n/g, "<br>")}</p>
          </td>
        </tr>`
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f0;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f5f5f0;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,#0a0a0c 0%,#1a1a22 100%);padding:24px 32px;text-align:center;">
              <span style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:3px;">STALELA</span>
            </td>
          </tr>
          <tr><td style="height:3px;background:linear-gradient(90deg,#a4785a,#d4a574,#a4785a);"></td></tr>
          <tr>
            <td style="padding:24px 32px 8px;">
              <p style="margin:0 0 4px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;">Campaign Preview</p>
              <h2 style="margin:0 0 4px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:20px;font-weight:700;color:#0a0a0c;">${campaign.name}</h2>
              ${campaign.objective ? `<p style="margin:0 0 16px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:#777;">${campaign.objective}</p>` : ""}
              <div style="height:1px;background-color:#e8e4df;margin-bottom:24px;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                ${contentRows}
              </table>
            </td>
          </tr>
          <tr><td style="padding:0 32px;"><div style="height:1px;background-color:#e8e4df;"></div></td></tr>
          <tr>
            <td style="padding:20px 32px;text-align:center;">
              <p style="margin:0 0 4px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:#a4785a;font-weight:600;">Stalela Marketing</p>
              <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#999;">
                <a href="https://stalela.com" style="color:#a4785a;text-decoration:none;">stalela.com</a>
                &nbsp;·&nbsp;
                <a href="mailto:hello@stalela.com" style="color:#a4785a;text-decoration:none;">hello@stalela.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    await sendEmail({ to, toName, subject, htmlContent: html });

    return NextResponse.json({ success: true, contentSent: items.length });
  } catch (e) {
    console.error("[campaigns/send]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to send campaign email" },
      { status: 500 }
    );
  }
}
