import Link from "next/link";
import { Megaphone, Users, Target, BarChart3, ArrowUpRight, Plus } from "lucide-react";
import { tenantsApi, campaignsApi } from "@/lib/api";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import type { Tenant } from "@stalela/commons/types";

export const dynamic = "force-dynamic";

export default async function MarketingPage() {
  const { tenants, total: totalTenants } = await tenantsApi.list({ limit: 5 });

  // Gather campaign counts per tenant (for the top-level overview)
  let totalCampaigns = 0;
  let activeCampaigns = 0;
  for (const t of tenants) {
    try {
      const { total } = await campaignsApi.list(t.id, { limit: 1 });
      totalCampaigns += total;
      const { total: active } = await campaignsApi.list(t.id, {
        status: "active",
        limit: 1,
      });
      activeCampaigns += active;
    } catch {
      // skip
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            Lalela Marketing
          </h1>
          <p className="text-sm text-muted">
            AI-powered ad management platform
          </p>
        </div>
        <Link href="/marketing/tenants/new">
          <Button>
            <Plus className="h-4 w-4" />
            New Tenant
          </Button>
        </Link>
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
