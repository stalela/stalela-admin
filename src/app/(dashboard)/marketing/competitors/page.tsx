import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getTenantContext, isTenantUser } from "@/lib/tenant-context";
import { competitorsApi } from "@/lib/api";
import CompetitorsList from "@/components/CompetitorsList";
import type { Competitor } from "@stalela/commons/types";

export const dynamic = "force-dynamic";

export default async function CompetitorsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const ctx = await getTenantContext(user.id);

  if (!isTenantUser(ctx.role) || !ctx.tenantId) {
    redirect("/marketing");
  }

  let competitors: Competitor[] = [];
  try {
    competitors = await competitorsApi.list(ctx.tenantId);
  } catch {
    // skip
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Competitor Analysis</h1>
        <p className="mt-1 text-sm text-muted">
          Track and analyze your competitors to find differentiation opportunities.
        </p>
      </div>

      <CompetitorsList tenantId={ctx.tenantId} initialCompetitors={competitors} />
    </div>
  );
}
