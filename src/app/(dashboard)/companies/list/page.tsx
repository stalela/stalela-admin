import Link from "next/link";
import { Mail, Phone, ArrowUpRight, Network } from "lucide-react";
import { companiesApi } from "@/lib/api";
import { Badge } from "@/components/Badge";
import { DataTable } from "@/components/DataTable";
import { Pagination } from "@/components/Pagination";
import { CompanyFilters } from "./CompanyFilters";
import type { Company } from "@stalela/commons/types";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    source?: string;
    province?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function CompanyListPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10);
  const limit = 50;
  const offset = (page - 1) * limit;

  const [{ companies, total }, sources, provinces] = await Promise.all([
    companiesApi.list({
      source: params.source,
      province: params.province,
      search: params.search,
      limit,
      offset,
    }),
    companiesApi.sources(),
    companiesApi.provinces(),
  ]);

  const totalPages = Math.ceil(total / limit);

  const columns = [
    {
      key: "name",
      label: "Company",
      render: (c: Company) => (
        <div>
          <Link
            href={`/companies/${c.id}`}
            className="font-medium text-foreground hover:text-copper-light transition-colors"
          >
            {c.name || "—"}
          </Link>
          {c.email && (
            <p className="flex items-center gap-1 text-xs text-muted mt-0.5">
              <Mail className="h-3 w-3" /> {c.email}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "phone",
      label: "Phone",
      className: "hidden md:table-cell",
      render: (c: Company) => (
        <span className="flex items-center gap-1 text-sm text-muted">
          {c.phone ? (
            <>
              <Phone className="h-3 w-3" /> {c.phone}
            </>
          ) : (
            "—"
          )}
        </span>
      ),
    },
    {
      key: "city",
      label: "City",
      className: "hidden lg:table-cell",
      render: (c: Company) => (
        <span className="text-sm text-muted">{c.city || "—"}</span>
      ),
    },
    {
      key: "province",
      label: "Province",
      className: "hidden xl:table-cell",
      render: (c: Company) => (
        <span className="text-sm text-muted">{c.province || "—"}</span>
      ),
    },
    {
      key: "source",
      label: "Source",
      render: (c: Company) => <Badge variant="copper">{c.source}</Badge>,
    },
    {
      key: "graph",
      label: "",
      className: "w-12",
      render: (c: Company) => (
        <Link
          href={`/companies/graph?companyId=${c.id}&name=${encodeURIComponent(c.name)}`}
          className="text-muted hover:text-copper-600 transition-colors"
          title="View Graph"
        >
          <Network className="h-4 w-4" />
        </Link>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "w-12",
      render: (c: Company) => (
        <Link
          href={`/companies/${c.id}`}
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
        <h1 className="text-lg font-semibold text-foreground">All Companies</h1>
        <p className="text-sm text-muted">
          {total.toLocaleString()} companies
          {params.source ? ` from ${params.source}` : ""}
          {params.province ? ` in ${params.province}` : ""}
          {params.search ? ` matching "${params.search}"` : ""}
        </p>
      </div>

      <CompanyFilters sources={sources} provinces={provinces} />

      <DataTable
        columns={columns}
        data={companies}
        keyField="id"
        emptyMessage="No companies found matching your filters"
      />

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        pathname="/companies/list"
        searchParams={params}
      />
    </div>
  );
}
