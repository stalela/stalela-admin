import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

/**
 * POST /api/email/send
 *
 * Generic email dispatch endpoint. Accepts a pre-built HTML body.
 * Used by client components and scripts that need to trigger an email
 * without reaching for the Brevo SDK directly.
 *
 * Body: { to, toName?, subject, html, text?, replyTo? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      to: string;
      toName?: string;
      subject: string;
      html: string;
      text?: string;
      replyTo?: string;
    };

    if (!body.to || !body.subject || !body.html) {
      return NextResponse.json(
        { error: "to, subject, and html are required" },
        { status: 400 }
      );
    }

    await sendEmail({
      to: body.to,
      toName: body.toName,
      subject: body.subject,
      htmlContent: body.html,
      textContent: body.text,
      replyTo: body.replyTo,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[email/send]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to send email" },
      { status: 500 }
    );
  }
}
