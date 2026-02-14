import Link from "next/link";
import { Plus, ExternalLink } from "lucide-react";
import { seoApi } from "@/lib/api";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { DataTable } from "@/components/DataTable";
import type { SeoOverride } from "@stalela/commons/types";

export const dynamic = "force-dynamic";

/** Known marketing site pages for reference */
const knownPages = [
  "/",
  "/services",
  "/pricing",
  "/how-it-works",
  "/contact",
  "/register",
  "/blog",
];

export default async function SeoListPage() {
  const overrides = await seoApi.list();

  // Merge known pages with existing overrides
  const overrideMap = new Map(overrides.map((o) => [o.page_path, o]));
  const allPages = [
    ...knownPages.map((path) => ({
      path,
      override: overrideMap.get(path) ?? null,
    })),
    ...overrides
      .filter((o) => !knownPages.includes(o.page_path))
      .map((o) => ({ path: o.page_path, override: o })),
  ];

  const columns = [
    {
      key: "path",
      label: "Page Path",
      render: (row: { path: string; override: SeoOverride | null }) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-foreground">{row.path}</span>
          <a
            href={`https://stalela.com/en${row.path === "/" ? "" : row.path}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted hover:text-copper-600 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      ),
    },
    {
      key: "title",
      label: "Title Override",
      render: (row: { path: string; override: SeoOverride | null }) => (
        <span className="text-sm text-muted">
          {row.override?.title_override || "—"}
        </span>
      ),
    },
    {
      key: "keywords",
      label: "Keywords",
      render: (row: { path: string; override: SeoOverride | null }) => (
        <div className="flex flex-wrap gap-1">
          {(row.override?.keywords ?? []).slice(0, 3).map((kw) => (
            <Badge key={kw} variant="copper">
              {kw}
            </Badge>
          ))}
          {(row.override?.keywords?.length ?? 0) > 3 && (
            <Badge variant="default">
              +{(row.override?.keywords?.length ?? 0) - 3}
            </Badge>
          )}
          {(!row.override?.keywords || row.override.keywords.length === 0) && (
            <span className="text-xs text-muted">None</span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row: { path: string; override: SeoOverride | null }) => (
        <Badge variant={row.override ? "success" : "default"}>
          {row.override ? "Customised" : "Default"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "w-20",
      render: (row: { path: string; override: SeoOverride | null }) => (
        <Link
          href={
            row.override
              ? `/seo/${row.override.id}/edit`
              : `/seo/new?path=${encodeURIComponent(row.path)}`
          }
          className="text-xs text-copper-600 hover:text-copper-light transition-colors"
        >
          {row.override ? "Edit" : "Add"}
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            SEO Management
          </h1>
          <p className="text-sm text-muted">
            Override meta titles, descriptions, and keywords per page
          </p>
        </div>
        <Link href="/seo/new">
          <Button>
            <Plus className="h-4 w-4" />
            Add Override
          </Button>
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={allPages}
        keyField="path"
        emptyMessage="No pages found"
      />
    </div>
  );
}
