import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Mail,
  Phone,
  MapPin,
  Globe,
  Tag,
  Clock,
  Hash,
  FileText,
  User,
  Smartphone,
  Network,
} from "lucide-react";
import { companiesApi } from "@/lib/api";
import { Badge } from "@/components/Badge";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { DataTable } from "@/components/DataTable";
import { MiniMap } from "./MiniMap";
import { ResearchButton } from "./ResearchButton";
import { LinkedInButton } from "./LinkedInButton";
import type { Company } from "@stalela/commons/types";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

const sourceBadgeVariant = {
  yep: "copper" as const,
  bizcommunity: "info" as const,
  bestdirectory: "success" as const,
};

export default async function CompanyDetailPage({ params }: Props) {
  const { id } = await params;

  let company: Company;
  try {
    company = await companiesApi.getById(id);
  } catch {
    notFound();
  }

  // Get nearby companies if GPS available
  let nearbyCompanies: (Company & { distance_km: number })[] = [];
  if (company.latitude && company.longitude) {
    try {
      nearbyCompanies = await companiesApi.nearby(
        company.latitude,
        company.longitude,
        5,
        10
      );
      // Exclude self
      nearbyCompanies = nearbyCompanies.filter((c) => c.id !== company.id);
    } catch {
      // Nearby query may fail, not critical
    }
  }

  const nearbyColumns = [
    {
      key: "name",
      label: "Company",
      render: (c: Company & { distance_km: number }) => (
        <Link
          href={`/companies/${c.id}`}
          className="font-medium text-foreground hover:text-copper-light transition-colors"
        >
          {c.name}
        </Link>
      ),
    },
    {
      key: "distance_km",
      label: "Distance",
      render: (c: Company & { distance_km: number }) => (
        <span className="text-sm text-muted">{c.distance_km} km</span>
      ),
    },
    {
      key: "category",
      label: "Category",
      className: "hidden md:table-cell",
      render: (c: Company & { distance_km: number }) => (
        <span className="text-sm text-muted">{c.category || "—"}</span>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "w-16",
      render: (c: Company & { distance_km: number }) => (
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
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Link
          href="/companies/list"
          className="rounded-md p-2 text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-foreground">
              {company.name}
            </h1>
            <Badge variant={sourceBadgeVariant[company.source] ?? "default"}>
              {company.source}
            </Badge>
            {company.premium_seller && <Badge variant="warning">Premium</Badge>}
            <div className="ml-auto flex items-center gap-2">
              <ResearchButton companyId={company.id} companyName={company.name} />
              <LinkedInButton companyId={company.id} companyName={company.name} />
              <Link
                href={`/companies/graph?companyId=${company.id}&name=${encodeURIComponent(company.name)}`}
                className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted hover:bg-surface-hover hover:text-copper-light transition-colors"
              >
                <Network className="h-4 w-4" />
                View Graph
              </Link>
            </div>
          </div>
          <p className="text-sm text-muted">
            {company.category || "Uncategorized"}
            {company.city ? ` · ${company.city}` : ""}
            {company.province ? `, ${company.province}` : ""}
          </p>
        </div>
      </div>

      {/* ── Contact + Location cards ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Details</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <InfoRow icon={Mail} label="Email" value={company.email} />
            <InfoRow icon={Phone} label="Phone" value={company.phone} />
            <InfoRow icon={Phone} label="Alt Phone" value={company.alt_phone} />
            <InfoRow icon={Smartphone} label="Mobile" value={company.mobile} />
            <InfoRow icon={Phone} label="WhatsApp" value={company.whatsapp} />
            <InfoRow icon={User} label="Contact" value={company.contact_name} />
            <InfoRow icon={Mail} label="Contact Email" value={company.contact_email} />
            {company.website && (
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-copper-600 shrink-0" />
                <div>
                  <p className="text-xs text-muted">Website</p>
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-copper-light hover:underline"
                  >
                    {company.website}
                  </a>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <InfoRow icon={MapPin} label="Address" value={company.address} />
            <InfoRow icon={MapPin} label="Address Line" value={company.address_line1} />
            <InfoRow icon={MapPin} label="Suburb" value={company.suburb} />
            <InfoRow icon={MapPin} label="City" value={company.city} />
            <InfoRow icon={MapPin} label="Province" value={company.province} />
            <InfoRow icon={Hash} label="Postal Code" value={company.postal_code} />
            {company.latitude && company.longitude && (
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-copper-600 shrink-0" />
                <div>
                  <p className="text-xs text-muted">GPS Coordinates</p>
                  <p className="text-sm text-foreground font-mono">
                    {company.latitude.toFixed(6)}, {company.longitude.toFixed(6)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ── Business details + Map ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Business Details */}
        <Card>
          <CardHeader>
            <CardTitle>Business Details</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            {company.description && (
              <div>
                <p className="text-xs text-muted mb-1">Description</p>
                <p className="text-sm text-foreground leading-relaxed">
                  {company.description}
                </p>
              </div>
            )}
            {company.short_description && (
              <div>
                <p className="text-xs text-muted mb-1">Short Description</p>
                <p className="text-sm text-foreground">{company.short_description}</p>
              </div>
            )}
            {company.categories && company.categories.length > 0 && (
              <div>
                <p className="text-xs text-muted mb-1">Categories</p>
                <div className="flex flex-wrap gap-1">
                  {company.categories.map((cat) => (
                    <Badge key={cat} variant="default">{cat}</Badge>
                  ))}
                </div>
              </div>
            )}
            <InfoRow icon={Hash} label="Registration #" value={company.registration_number} />
            <InfoRow icon={Hash} label="VAT #" value={company.vat_number} />
            <InfoRow icon={Tag} label="Type" value={company.type} />
            <InfoRow icon={FileText} label="Seller ID" value={company.seller_id} />
            {company.service_range_km != null && company.service_range_km > 0 && (
              <InfoRow icon={MapPin} label="Service Range" value={`${company.service_range_km} km`} />
            )}
            {company.source_url && (
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-copper-600 shrink-0" />
                <div>
                  <p className="text-xs text-muted">Source URL</p>
                  <a
                    href={company.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-copper-light hover:underline truncate block max-w-xs"
                  >
                    {company.source_url}
                  </a>
                </div>
              </div>
            )}
            <InfoRow
              icon={Clock}
              label="Imported"
              value={new Date(company.created_at).toLocaleString("en-ZA")}
            />
          </div>
        </Card>

        {/* Mini Map */}
        {company.latitude && company.longitude ? (
          <Card>
            <CardHeader>
              <CardTitle>Map</CardTitle>
            </CardHeader>
            <MiniMap
              latitude={company.latitude}
              longitude={company.longitude}
              name={company.name}
            />
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Map</CardTitle>
            </CardHeader>
            <div className="flex h-64 items-center justify-center">
              <p className="text-sm text-muted">No GPS coordinates available</p>
            </div>
          </Card>
        )}
      </div>

      {/* ── Nearby Companies ── */}
      {nearbyCompanies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Nearby Companies</CardTitle>
          </CardHeader>
          <DataTable
            columns={nearbyColumns}
            data={nearbyCompanies}
            keyField="id"
            emptyMessage="No nearby companies found"
          />
        </Card>
      )}
    </div>
  );
}

/** Reusable info row helper. */
function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-copper-600 shrink-0" />
      <div>
        <p className="text-xs text-muted">{label}</p>
        <p className="text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}
