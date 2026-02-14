import {
  Building2,
  MapPin,
  Mail,
  Globe,
  ArrowUpRight,
} from "lucide-react";
import { companiesApi } from "@/lib/api";
import { StatCard } from "@/components/StatCard";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/Badge";
import Link from "next/link";
import type { Company } from "@stalela/commons/types";
import { SourceBarChart } from "./SourceBarChart";
import { ProvinceChart } from "./ProvinceChart";

export const dynamic = "force-dynamic";

export default async function CompaniesOverviewPage() {
  const [stats, { companies: recentCompanies }] = await Promise.all([
    companiesApi.stats(),
    companiesApi.list({ limit: 20 }),
  ]);

  const columns = [
    {
      key: "name",
      label: "Company",
      render: (c: Company) => (
        <Link
          href={`/companies/${c.id}`}
          className="font-medium text-foreground hover:text-copper-light transition-colors"
        >
          {c.name || "—"}
        </Link>
      ),
    },
    {
      key: "city",
      label: "City",
      className: "hidden md:table-cell",
      render: (c: Company) => (
        <span className="text-sm text-muted">{c.city || "—"}</span>
      ),
    },
    {
      key: "province",
      label: "Province",
      className: "hidden lg:table-cell",
      render: (c: Company) => (
        <span className="text-sm text-muted">{c.province || "—"}</span>
      ),
    },
    {
      key: "source",
      label: "Source",
      render: (c: Company) => (
        <Badge variant="copper">{c.source}</Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "w-16",
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
      {/* ── Summary cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Companies"
          value={stats.totalCompanies.toLocaleString()}
          icon={Building2}
        />
        <StatCard
          label="With GPS"
          value={stats.withGps.toLocaleString()}
          icon={MapPin}
          change={`${((stats.withGps / stats.totalCompanies) * 100).toFixed(1)}%`}
          trend="neutral"
        />
        <StatCard
          label="With Email"
          value={stats.withEmail.toLocaleString()}
          icon={Mail}
          change={`${((stats.withEmail / stats.totalCompanies) * 100).toFixed(1)}%`}
          trend="neutral"
        />
        <StatCard
          label="With Website"
          value={stats.withWebsite.toLocaleString()}
          icon={Globe}
          change={`${((stats.withWebsite / stats.totalCompanies) * 100).toFixed(1)}%`}
          trend="neutral"
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Companies by Source</CardTitle>
          </CardHeader>
          <div className="h-64">
            <SourceBarChart data={stats.bySource} />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Companies by Province</CardTitle>
          </CardHeader>
          <div className="h-72">
            <ProvinceChart data={stats.byProvince} />
          </div>
        </Card>
      </div>

      {/* ── Recent companies ── */}
      <Card>
        <CardHeader>
          <CardTitle>Companies</CardTitle>
          <Link
            href="/companies/list"
            className="text-xs text-copper-600 hover:text-copper-light transition-colors flex items-center gap-1"
          >
            View all <ArrowUpRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <DataTable
          columns={columns}
          data={recentCompanies}
          keyField="id"
          emptyMessage="No companies imported yet"
        />
      </Card>
    </div>
  );
}
