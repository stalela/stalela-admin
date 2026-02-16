import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getTenantContext, isTenantUser } from "@/lib/tenant-context";
import { leadGenApi } from "@/lib/api";
import LeadGenList from "@/components/LeadGenList";
import type { GeneratedLead } from "@stalela/commons/types";

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
  try {
    const result = await leadGenApi.list(ctx.tenantId);
    leads = result.leads;
    total = result.total;
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

      <LeadGenList initialLeads={leads} initialTotal={total} />
    </div>
  );
}
