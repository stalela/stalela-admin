import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { tenantsApi, campaignsApi } from "@/lib/api";
import { createClient } from "@/lib/supabase-server";
import { getTenantContext, isTenantUser } from "@/lib/tenant-context";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { DataTable } from "@/components/DataTable";
import type { Campaign } from "@stalela/commons/types";

export const dynamic = "force-dynamic";

const statusVariant: Record<string, "success" | "warning" | "danger" | "default" | "info"> = {
  active: "success",
  draft: "default",
  paused: "warning",
  completed: "info",
  archived: "default",
};

export default async function AllCampaignsPage() {
  // Resolve user context
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const ctx = user ? await getTenantContext(user.id) : null;
  const isTenant = ctx ? isTenantUser(ctx.role) : false;

  const allCampaigns: Campaign[] = [];

  if (isTenant && ctx?.tenantId) {
    // Tenant user: show only their campaigns
    const { campaigns } = await campaignsApi.list(ctx.tenantId, { limit: 100 });
    allCampaigns.push(...campaigns);
  } else {
    // Admin: aggregate across all tenants
    const { tenants } = await tenantsApi.list({ limit: 100 });
    for (const t of tenants) {
      try {
        const { campaigns } = await campaignsApi.list(t.id, { limit: 100 });
        allCampaigns.push(...campaigns);
      } catch {
        // skip
      }
    }
  }

  // Sort by updated_at descending
  allCampaigns.sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  const columns = [
    {
      key: "name",
      label: "Campaign",
      render: (c: Campaign) => (
        <Link
          href={`/marketing/campaigns/${c.id}`}
          className="font-medium text-foreground hover:text-copper-light transition-colors"
        >
          {c.name}
        </Link>
      ),
    },
    {
      key: "platform",
      label: "Platform",
      render: (c: Campaign) => <Badge variant="copper">{c.platform}</Badge>,
    },
    {
      key: "status",
      label: "Status",
      render: (c: Campaign) => (
        <Badge variant={statusVariant[c.status] ?? "default"}>
          {c.status}
        </Badge>
      ),
    },
    {
      key: "budget",
      label: "Budget",
      className: "hidden md:table-cell",
      render: (c: Campaign) => (
        <span className="text-sm text-muted">
          {c.budget ? `${c.currency} ${c.budget.toLocaleString()}` : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "w-16",
      render: (c: Campaign) => (
        <Link
          href={`/marketing/campaigns/${c.id}`}
          className="text-muted hover:text-copper-600 transition-colors"
        >
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            {isTenant ? "My Campaigns" : "All Campaigns"}
          </h1>
          <p className="text-sm text-muted">
            {allCampaigns.length} campaign{allCampaigns.length !== 1 ? "s" : ""}
            {!isTenant && ` across all tenants`}
          </p>
        </div>
        {isTenant && ctx?.tenantId && (
          <Link href={`/marketing/campaigns/new?tenant_id=${ctx.tenantId}`}>
            <Button>
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          </Link>
        )}
      </div>

      <DataTable
        columns={columns}
        data={allCampaigns}
        keyField="id"
        emptyMessage="No campaigns yet."
      />
    </div>
  );
}
