import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getTenantContext, isTenantUser } from "@/lib/tenant-context";
import { leadGenApi, tenantsApi } from "@/lib/api";
import { createAdminClient } from "@stalela/commons/client";
import LeadGenList from "@/components/LeadGenList";
import type { GeneratedLead } from "@stalela/commons/types";
import type { EmailThreadRow } from "@/app/api/email/threads/route";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const ctx = await getTenantContext(user.id);

  if (!isTenantUser(ctx.role) || !ctx.tenantId) {
    redirect("/marketing");
  }

  let leads: GeneratedLead[] = [];
  let total = 0;
  let tenantSettings: Record<string, unknown> = {};
  let tenantPlan = "free";
  let monthlyUsage = 0;
  try {
    const result = await leadGenApi.list(ctx.tenantId);
    leads = result.leads;
    total = result.total;
  } catch {
    // skip — table may not exist yet
  }
  try {
    const tenant = await tenantsApi.getById(ctx.tenantId);
    tenantSettings = (tenant.settings ?? {}) as Record<string, unknown>;
    tenantPlan = tenant.plan || "free";
  } catch {
    // skip
  }
  try {
    monthlyUsage = await leadGenApi.countMonthly(ctx.tenantId);
  } catch {
    // skip
  }

  let pendingThreads: EmailThreadRow[] = [];
  try {
    const admin = createAdminClient();
    const { data } = await (
      admin as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            eq: (col: string, val: string) => {
              eq: (col: string, val: string) => {
                order: (col: string, opts: { ascending: boolean }) => Promise<{
                  data: EmailThreadRow[] | null;
                }>;
              };
            };
          };
        };
      }
    )
      .from("email_threads")
      .select("*")
      .eq("tenant_id", ctx.tenantId)
      .eq("status", "pending_review")
      .order("created_at", { ascending: false });
    pendingThreads = data ?? [];
  } catch {
    // skip — table may not exist yet
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Lead Generation</h1>
        <p className="mt-1 text-sm text-muted">
          AI-powered B2B leads matched to your business profile using our company database and graph intelligence.
        </p>
      </div>

      <LeadGenList
        initialLeads={leads}
        initialTotal={total}
        tenantId={ctx.tenantId}
        tenantSettings={tenantSettings}
        tenantPlan={tenantPlan}
        monthlyUsage={monthlyUsage}
        initialThreads={pendingThreads}
      />
    </div>
  );
}
