import Link from "next/link";
import { ArrowLeft, Plus, ArrowUpRight, Building2, Megaphone } from "lucide-react";
import { tenantsApi, campaignsApi } from "@/lib/api";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { DataTable } from "@/components/DataTable";
import type { Campaign, ClientCompany } from "@stalela/commons/types";

export const dynamic = "force-dynamic";

const statusVariant: Record<string, "success" | "warning" | "danger" | "default" | "info" | "copper"> = {
  active: "success",
  draft: "default",
  paused: "warning",
  completed: "copper",
  archived: "default",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TenantDetailPage({ params }: PageProps) {
  const { id } = await params;
  const tenant = await tenantsApi.getById(id);
  const { clients } = await tenantsApi.listClients(id, { limit: 50 });
  const { campaigns, total: totalCampaigns } = await campaignsApi.list(id, {
    limit: 10,
  });

  const campaignColumns = [
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
      render: (c: Campaign) => (
        <Badge variant="copper">{c.platform}</Badge>
      ),
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/marketing/tenants"
            className="rounded-md p-2 text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              {tenant.name}
            </h1>
            <p className="text-sm text-muted">{tenant.owner_email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              tenant.status === "active"
                ? "success"
                : tenant.status === "trial"
                  ? "warning"
                  : "danger"
            }
          >
            {tenant.status}
          </Badge>
          <Badge variant="copper">{tenant.plan}</Badge>
        </div>
      </div>

      {/* Clients card */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Building2 className="mr-2 inline h-4 w-4" />
            Client Companies ({clients.length})
          </CardTitle>
          <Link href={`/marketing/tenants/${id}/clients/new`}>
            <Button size="sm" variant="outline">
              <Plus className="h-3 w-3" />
              Add Client
            </Button>
          </Link>
        </CardHeader>

        {clients.length === 0 ? (
          <p className="text-sm text-muted">
            No client companies yet.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {clients.map((c: ClientCompany) => (
              <div
                key={c.id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-medium text-foreground">{c.name}</p>
                  <p className="text-xs text-muted">
                    {[c.industry, c.contact_email].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {c.website && (
                  <a
                    href={c.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-copper-light hover:underline"
                  >
                    {c.website}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Megaphone className="mr-2 inline h-4 w-4" />
            Campaigns ({totalCampaigns})
          </CardTitle>
          <Link href={`/marketing/campaigns/new?tenant_id=${id}`}>
            <Button size="sm" variant="outline">
              <Plus className="h-3 w-3" />
              New Campaign
            </Button>
          </Link>
        </CardHeader>

        <DataTable
          columns={campaignColumns}
          data={campaigns}
          keyField="id"
          emptyMessage="No campaigns yet. Create one to get started."
        />
      </Card>
    </div>
  );
}
