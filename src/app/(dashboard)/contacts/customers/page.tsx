import Link from "next/link";
import { Plus, ArrowUpRight, Building2 } from "lucide-react";
import { customersApi } from "@/lib/api";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { DataTable } from "@/components/DataTable";
import type { Customer } from "@stalela/commons/types";

export const dynamic = "force-dynamic";

const statusVariant: Record<string, "success" | "warning" | "default"> = {
  active: "success",
  prospect: "warning",
  inactive: "default",
};

export default async function CustomersPage() {
  const { customers, total } = await customersApi.list({ limit: 50 });

  const columns = [
    {
      key: "name",
      label: "Name",
      render: (c: Customer) => (
        <Link
          href={`/contacts/customers/${c.id}`}
          className="font-medium text-foreground hover:text-copper-light transition-colors"
        >
          {c.name}
        </Link>
      ),
    },
    {
      key: "email",
      label: "Email",
      render: (c: Customer) => (
        <span className="text-sm text-muted">{c.email}</span>
      ),
    },
    {
      key: "company",
      label: "Company",
      className: "hidden md:table-cell",
      render: (c: Customer) => (
        <span className="flex items-center gap-1 text-sm text-muted">
          {c.company ? (
            <>
              <Building2 className="h-3 w-3" /> {c.company}
            </>
          ) : (
            "—"
          )}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (c: Customer) => (
        <Badge variant={statusVariant[c.status] ?? "default"}>
          {c.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "w-16",
      render: (c: Customer) => (
        <Link
          href={`/contacts/customers/${c.id}`}
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
          <h1 className="text-lg font-semibold text-foreground">Customers</h1>
          <p className="text-sm text-muted">{total} customer{total !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/contacts/customers/new">
          <Button>
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={customers}
        keyField="id"
        emptyMessage="No customers yet. Promote leads or add a new customer."
      />
    </div>
  );
}
