import Link from "next/link";
import { Plus, ArrowUpRight } from "lucide-react";
import { tenantsApi } from "@/lib/api";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { DataTable } from "@/components/DataTable";
import type { Tenant } from "@stalela/commons/types";

export const dynamic = "force-dynamic";

const statusVariant: Record<string, "success" | "warning" | "danger" | "default"> = {
  active: "success",
  trial: "warning",
  suspended: "danger",
};

export default async function TenantsPage() {
  const { tenants, total } = await tenantsApi.list({ limit: 100 });

  const columns = [
    {
      key: "name",
      label: "Name",
      render: (t: Tenant) => (
        <Link
          href={`/marketing/tenants/${t.id}`}
          className="font-medium text-foreground hover:text-copper-light transition-colors"
        >
          {t.name}
        </Link>
      ),
    },
    {
      key: "slug",
      label: "Slug",
      render: (t: Tenant) => (
        <span className="text-sm text-muted font-mono">{t.slug}</span>
      ),
    },
    {
      key: "owner_email",
      label: "Owner",
      className: "hidden md:table-cell",
      render: (t: Tenant) => (
        <span className="text-sm text-muted">{t.owner_email}</span>
      ),
    },
    {
      key: "plan",
      label: "Plan",
      render: (t: Tenant) => <Badge variant="copper">{t.plan}</Badge>,
    },
    {
      key: "status",
      label: "Status",
      render: (t: Tenant) => (
        <Badge variant={statusVariant[t.status] ?? "default"}>
          {t.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "w-16",
      render: (t: Tenant) => (
        <Link
          href={`/marketing/tenants/${t.id}`}
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
          <h1 className="text-lg font-semibold text-foreground">Tenants</h1>
          <p className="text-sm text-muted">
            {total} tenant{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/marketing/tenants/new">
          <Button>
            <Plus className="h-4 w-4" />
            Add Tenant
          </Button>
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={tenants}
        keyField="id"
        emptyMessage="No tenants yet. Create one to get started."
      />
    </div>
  );
}
