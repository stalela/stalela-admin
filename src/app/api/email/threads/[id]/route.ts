import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@stalela/commons/client";
import { createClient } from "@/lib/supabase-server";
import { getTenantContext, isTenantUser } from "@/lib/tenant-context";
import { sendEmail } from "@/lib/email";
import { buildEmailHtml } from "@/lib/email-template";

type DBClient = {
  from: (table: string) => {
    select: (cols?: string) => {
      eq: (col: string, val: unknown) => {
        single: () => Promise<{ data: ThreadRow | null; error: unknown }>;
      };
    };
    update: (patch: Record<string, unknown>) => {
      eq: (col: string, val: unknown) => Promise<{ error: unknown }>;
    };
  };
};

interface ThreadRow {
  id: string;
  tenant_id: string | null;
  lead_id: string | null;
  from_email: string;
  from_name: string | null;
  subject: string | null;
  body_text: string | null;
  ai_draft: string | null;
  status: "pending_review" | "sent" | "dismissed";
}

async function getAuthedThread(
  request: NextRequest,
  id: string
): Promise<{ thread: ThreadRow; error?: never } | { thread?: never; error: NextResponse }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const ctx = await getTenantContext(user.id);
  if (!isTenantUser(ctx.role) || !ctx.tenantId) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const admin = createAdminClient() as unknown as DBClient;
  const { data: thread, error } = await admin
    .from("email_threads")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !thread) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  if (thread.tenant_id !== ctx.tenantId) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { thread };
}

/**
 * PATCH /api/email/threads/[id]
 * Update the ai_draft of a pending thread.
 * Body: { ai_draft: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getAuthedThread(request, id);
    if (result.error) return result.error;

    const { ai_draft } = (await request.json()) as { ai_draft: string };
    if (typeof ai_draft !== "string") {
      return NextResponse.json({ error: "ai_draft is required" }, { status: 400 });
    }

    const admin = createAdminClient() as unknown as DBClient;
    const { error } = await admin
      .from("email_threads")
      .update({ ai_draft, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[email/threads PATCH]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * DELETE /api/email/threads/[id]
 * Dismiss a pending thread (marks status = "dismissed").
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getAuthedThread(request, id);
    if (result.error) return result.error;

    const admin = createAdminClient() as unknown as DBClient;
    const { error } = await admin
      .from("email_threads")
      .update({ status: "dismissed", updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[email/threads DELETE]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * POST /api/email/threads/[id]  (used as "send" action)
 * Send the AI draft as a reply to the lead and mark thread as sent.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getAuthedThread(request, id);
    if (result.error) return result.error;
    const { thread } = result;

    if (!thread.ai_draft) {
      return NextResponse.json({ error: "No draft to send" }, { status: 422 });
    }

    const replySubject = thread.subject
      ? thread.subject.startsWith("Re:") ? thread.subject : `Re: ${thread.subject}`
      : "Re: Your message";

    const html = buildEmailHtml({
      subject: replySubject,
      body: thread.ai_draft,
      recipientName: thread.from_name ?? thread.from_email,
      companyName: thread.from_name ?? undefined,
    });

    await sendEmail({
      to: thread.from_email,
      toName: thread.from_name ?? undefined,
      subject: replySubject,
      htmlContent: html,
      textContent: thread.ai_draft,
    });

    const admin = createAdminClient() as unknown as DBClient;
    const { error } = await admin
      .from("email_threads")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[email/threads POST send]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
