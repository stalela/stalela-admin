import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@stalela/commons/client";
import { createClient } from "@/lib/supabase-server";
import { getTenantContext, isTenantUser } from "@/lib/tenant-context";

type SupabaseAdminClient = ReturnType<typeof createAdminClient>;
type QueryBuilder = ReturnType<SupabaseAdminClient["from"]>;

function db() {
  return createAdminClient() as unknown as {
    from: (table: string) => QueryBuilder & {
      select: (cols?: string) => QueryBuilder & {
        eq: (col: string, val: unknown) => QueryBuilder & {
          eq: (col: string, val: unknown) => QueryBuilder & {
            order: (col: string, opts?: { ascending?: boolean }) => Promise<{
              data: EmailThreadRow[] | null;
              error: unknown;
            }>;
          };
          order: (col: string, opts?: { ascending?: boolean }) => Promise<{
            data: EmailThreadRow[] | null;
            error: unknown;
          }>;
        };
      };
    };
  };
}

export interface EmailThreadRow {
  id: string;
  tenant_id: string | null;
  lead_id: string | null;
  from_email: string;
  from_name: string | null;
  subject: string | null;
  body_text: string | null;
  ai_draft: string | null;
  status: "pending_review" | "sent" | "dismissed";
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/email/threads?lead_id=<uuid>
 * Returns pending_review threads for the authenticated tenant.
 * Filter to a specific lead with ?lead_id=
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ctx = await getTenantContext(user.id);
    if (!isTenantUser(ctx.role) || !ctx.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const leadId = request.nextUrl.searchParams.get("lead_id");
    const admin = createAdminClient();

    let query = admin
      .from("email_threads")
      .select("*")
      .eq("tenant_id", ctx.tenantId)
      .eq("status", "pending_review");

    if (leadId) {
      query = query.eq("lead_id", leadId) as typeof query;
    }

    const { data, error } = await (query as unknown as Promise<{ data: EmailThreadRow[] | null; error: unknown }>);

    if (error) throw error;

    return NextResponse.json({ threads: data ?? [] });
  } catch (err) {
    console.error("[email/threads GET]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
