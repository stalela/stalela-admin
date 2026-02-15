import { redirect } from "next/navigation";
import Link from "next/link";
import { Megaphone, Users, Target, BarChart3, ArrowUpRight, Plus, Globe, Zap } from "lucide-react";
import { tenantsApi, campaignsApi, auditsApi } from "@/lib/api";
import { createClient } from "@/lib/supabase-server";
import { getTenantContext, isTenantUser } from "@/lib/tenant-context";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import type { Tenant, WebsiteAudit } from "@stalela/commons/types";

export const dynamic = "force-dynamic";

export default async function MarketingPage() {
  // Resolve user context to determine scope
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const ctx = user ? await getTenantContext(user.id) : null;
  const isTenant = ctx ? isTenantUser(ctx.role) : false;

  let tenants: Tenant[] = [];
  let totalTenants = 0;
  let totalCampaigns = 0;
  let activeCampaigns = 0;
  let latestAudit: WebsiteAudit | null = null;

  if (isTenant && ctx?.tenantId) {
    // Check onboarding status — redirect if not complete
    const tenant = await tenantsApi.getById(ctx.tenantId);
    if (tenant && tenant.onboarding_status !== "complete") {
      redirect("/marketing/onboarding");
    }

    if (tenant) {
      tenants = [tenant];
      totalTenants = 1;
    }

    // Fetch latest audit
    try {
      latestAudit = await auditsApi.getLatest(ctx.tenantId);
    } catch {
      // skip
    }

    try {
      const { total } = await campaignsApi.list(ctx.tenantId, { limit: 1 });
      totalCampaigns = total;
      const { total: active } = await campaignsApi.list(ctx.tenantId, { status: "active", limit: 1 });
      activeCampaigns = active;
    } catch {
      // skip
    }
  } else {
    // Admin: show all tenants
    const result = await tenantsApi.list({ limit: 5 });
    tenants = result.tenants;
    totalTenants = result.total;

    for (const t of tenants) {
      try {
        const { total } = await campaignsApi.list(t.id, { limit: 1 });
        totalCampaigns += total;
        const { total: active } = await campaignsApi.list(t.id, { status: "active", limit: 1 });
        activeCampaigns += active;
      } catch {
        // skip
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            {isTenant ? "My Dashboard" : "Stalela Marketing"}
          </h1>
          <p className="text-sm text-muted">
            AI-powered ad management platform
          </p>
        </div>
        {!isTenant && (
          <Link href="/marketing/tenants/new">
            <Button>
              <Plus className="h-4 w-4" />
              New Tenant
            </Button>
          </Link>
        )}
        {isTenant && ctx?.tenantId && (
          <Link href={`/marketing/campaigns/new?tenant_id=${ctx.tenantId}`}>
            <Button>
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Tenants"
          value={totalTenants}
          icon={Users}
        />
        <StatCard
          label="Total Campaigns"
          value={totalCampaigns}
          icon={Megaphone}
        />
        <StatCard
          label="Active Campaigns"
          value={activeCampaigns}
          icon={Target}
        />
        <StatCard
          label="Platforms"
          value="6"
          icon={BarChart3}
          change="Google, Meta, LinkedIn, TikTok, X, Generic"
          trend="neutral"
        />
      </div>

      {/* Latest Audit (tenant view) */}
      {isTenant && latestAudit && latestAudit.report && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-copper-600/10 text-copper-light">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Website Audit</CardTitle>
                <p className="text-xs text-muted">{latestAudit.url}</p>
              </div>
            </div>
            <Link
              href={`/marketing/reports/${latestAudit.id}`}
              className="flex items-center gap-1 text-xs text-copper-light hover:underline"
            >
              View Full Report
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <div className="px-5 pb-5">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground">
                  {(latestAudit.report as { ad_readiness_score?: number }).ad_readiness_score ?? "—"}
                </div>
                <div className="text-xs text-muted">Ad Readiness</div>
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted line-clamp-2">
                  {(latestAudit.report as { brand_summary?: string }).brand_summary ?? ""}
                </p>
              </div>
              <Link
                href="/marketing/onboarding"
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-muted hover:border-copper-600 hover:text-foreground transition-colors"
              >
                <Zap className="h-3.5 w-3.5" />
                Re-Audit
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Recent tenants */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Tenants</CardTitle>
          <Link
            href="/marketing/tenants"
            className="text-xs text-copper-light hover:underline"
          >
            View all
          </Link>
        </CardHeader>

        {tenants.length === 0 ? (
          <p className="text-sm text-muted">
            No tenants yet. Create one to get started.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {tenants.map((t: Tenant) => (
              <div
                key={t.id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <Link
                    href={`/marketing/tenants/${t.id}`}
                    className="font-medium text-foreground hover:text-copper-light transition-colors"
                  >
                    {t.name}
                  </Link>
                  <p className="text-xs text-muted">{t.owner_email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      t.status === "active"
                        ? "success"
                        : t.status === "trial"
                          ? "warning"
                          : "danger"
                    }
                  >
                    {t.status}
                  </Badge>
                  <Badge variant="copper">{t.plan}</Badge>
                  <Link
                    href={`/marketing/tenants/${t.id}`}
                    className="text-muted hover:text-copper-600 transition-colors"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
