import Link from "next/link";
import { Clock, Mail, Phone, ArrowUpRight } from "lucide-react";
import { leadsApi } from "@/lib/api";
import { Badge } from "@/components/Badge";
import { DataTable } from "@/components/DataTable";
import { LeadFilters } from "./LeadFilters";
import type { Lead } from "@stalela/commons/types";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ source?: string; search?: string; page?: string }>;
}

export default async function LeadsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10);
  const limit = 20;
  const offset = (page - 1) * limit;

  const [{ leads, total }, sources] = await Promise.all([
    leadsApi.list({
      source: params.source,
      search: params.search,
      limit,
      offset,
    }),
    leadsApi.sources(),
  ]);

  const totalPages = Math.ceil(total / limit);

  const columns = [
    {
      key: "name",
      label: "Contact",
      render: (lead: Lead) => (
        <div>
          <Link
            href={`/contacts/leads/${lead.id}`}
            className="font-medium text-foreground hover:text-copper-light transition-colors"
          >
            {lead.name || "—"}
          </Link>
          <p className="flex items-center gap-1 text-xs text-muted mt-0.5">
            <Mail className="h-3 w-3" /> {lead.email}
          </p>
        </div>
      ),
    },
    {
      key: "phone",
      label: "Phone",
      className: "hidden md:table-cell",
      render: (lead: Lead) => (
        <span className="flex items-center gap-1 text-sm text-muted">
          {lead.phone ? (
            <>
              <Phone className="h-3 w-3" /> {lead.phone}
            </>
          ) : (
            "—"
          )}
        </span>
      ),
    },
    {
      key: "source",
      label: "Source",
      render: (lead: Lead) => <Badge variant="copper">{lead.source}</Badge>,
    },
    {
      key: "created_at",
      label: "Captured",
      render: (lead: Lead) => (
        <span className="flex items-center gap-1 text-xs text-muted">
          <Clock className="h-3 w-3" />
          {new Date(lead.created_at).toLocaleDateString("en-ZA", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "w-16",
      render: (lead: Lead) => (
        <Link
          href={`/contacts/leads/${lead.id}`}
          className="text-muted hover:text-copper-600 transition-colors"
        >
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Leads</h1>
        <p className="text-sm text-muted">{total} total leads captured</p>
      </div>

      <LeadFilters sources={sources} />

      <DataTable
        columns={columns}
        data={leads}
        keyField="id"
        emptyMessage="No leads found matching your filters"
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={{
                pathname: "/contacts/leads",
                query: { ...params, page: p.toString() },
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                p === page
                  ? "bg-copper-600 text-white"
                  : "text-muted hover:bg-surface-hover hover:text-foreground"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
