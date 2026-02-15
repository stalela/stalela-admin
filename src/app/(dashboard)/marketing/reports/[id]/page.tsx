import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Globe,
  Target,
  BarChart3,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  TrendingUp,
  Users,
  Palette,
  Search,
  MousePointerClick,
  Share2,
} from "lucide-react";
import { auditsApi } from "@/lib/api";
import { createClient } from "@/lib/supabase-server";
import { getTenantContext, isTenantUser } from "@/lib/tenant-context";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { Badge } from "@/components/Badge";
import type { AuditReport, AuditReportSection } from "@stalela/commons/types";

export const dynamic = "force-dynamic";

const SECTION_ICONS: Record<string, React.ReactNode> = {
  "Brand & Messaging": <Palette className="h-5 w-5" />,
  "Visual Design & UX": <Target className="h-5 w-5" />,
  "SEO & Content": <Search className="h-5 w-5" />,
  "Conversion Optimization": <MousePointerClick className="h-5 w-5" />,
  "Ad Readiness": <Zap className="h-5 w-5" />,
  "Social & Trust Signals": <Share2 className="h-5 w-5" />,
};

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 70
      ? "text-success"
      : score >= 40
        ? "text-warning"
        : "text-danger";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="rotate-[-90deg]" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          className="text-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={color}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-lg font-bold ${color}`}>{score}</span>
      </div>
    </div>
  );
}

function SectionCard({ section }: { section: AuditReportSection }) {
  const icon = SECTION_ICONS[section.title] ?? <BarChart3 className="h-5 w-5" />;
  const scoreBadge =
    section.score !== undefined ? (
      <Badge
        variant={
          section.score >= 70
            ? "success"
            : section.score >= 40
              ? "warning"
              : "danger"
        }
      >
        {section.score}/100
      </Badge>
    ) : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-elevated text-copper-light">
              {icon}
            </div>
            <CardTitle>{section.title}</CardTitle>
          </div>
          {scoreBadge}
        </div>
      </CardHeader>
      <div className="px-5 pb-5">
        <p className="text-sm leading-relaxed text-muted">{section.content}</p>
      </div>
    </Card>
  );
}

export default async function AuditReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ctx = await getTenantContext(user.id);

  let audit;
  try {
    audit = await auditsApi.getById(id);
  } catch {
    notFound();
  }

  if (!audit) notFound();

  // Tenant users can only view their own audits
  if (isTenantUser(ctx.role) && audit.tenant_id !== ctx.tenantId) {
    notFound();
  }

  const report = audit.report as AuditReport | null;

  if (audit.status !== "complete" || !report) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="max-w-md text-center">
          <div className="p-8">
            {audit.status === "failed" ? (
              <>
                <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-danger" />
                <h2 className="text-lg font-bold text-foreground">
                  Audit Failed
                </h2>
                <p className="mt-2 text-sm text-muted">
                  {audit.error_message || "Something went wrong during the audit."}
                </p>
                <Link
                  href="/marketing/onboarding"
                  className="mt-4 inline-block rounded-lg bg-copper-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-copper-700"
                >
                  Try Again
                </Link>
              </>
            ) : (
              <>
                <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-border border-t-copper-600" />
                <h2 className="text-lg font-bold text-foreground">
                  Audit in Progress
                </h2>
                <p className="mt-2 text-sm text-muted">
                  Your website is being analyzed. This page will update when complete.
                </p>
              </>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/marketing"
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Marketing
          </Link>
          <h1 className="text-2xl font-bold text-foreground">
            Website Audit Report
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted">
            <Globe className="h-4 w-4" />
            <a
              href={audit.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-copper-light hover:underline"
            >
              {audit.url}
              <ExternalLink className="h-3 w-3" />
            </a>
            <span className="text-border">•</span>
            <span>
              {new Date(audit.created_at).toLocaleDateString("en-ZA", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ScoreRing score={report.ad_readiness_score} size={72} />
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted">
              Ad Readiness
            </div>
            <div className="text-2xl font-bold text-foreground">
              {report.ad_readiness_score}
              <span className="text-sm text-muted">/100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Brand Summary & Positioning */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-copper-600/10 text-copper-light">
                <TrendingUp className="h-5 w-5" />
              </div>
              <CardTitle>Brand Summary</CardTitle>
            </div>
          </CardHeader>
          <div className="px-5 pb-5">
            <p className="text-sm leading-relaxed text-muted">
              {report.brand_summary}
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-vibranium/10 text-vibranium">
                <Users className="h-5 w-5" />
              </div>
              <CardTitle>Market Positioning</CardTitle>
            </div>
          </CardHeader>
          <div className="px-5 pb-5">
            <p className="text-sm leading-relaxed text-muted">
              {report.market_positioning}
            </p>
          </div>
        </Card>
      </div>

      {/* Section Scores */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {report.sections.map((section) => (
          <SectionCard key={section.title} section={section} />
        ))}
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <CardTitle>Recommendations</CardTitle>
          </div>
        </CardHeader>
        <div className="px-5 pb-5">
          <ul className="space-y-3">
            {report.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-copper-600/10 text-xs font-bold text-copper-light">
                  {i + 1}
                </span>
                <span className="text-sm text-muted">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      {/* Competitor Signals */}
      {report.competitor_signals.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
                <Target className="h-5 w-5" />
              </div>
              <CardTitle>Competitive Landscape</CardTitle>
            </div>
          </CardHeader>
          <div className="px-5 pb-5">
            <div className="space-y-3">
              {report.competitor_signals.map((comp, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-lg border border-border bg-surface-elevated p-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/10 text-sm font-bold text-warning">
                    {typeof comp === "string" ? (i + 1) : comp.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    {typeof comp === "string" ? (
                      <p className="text-sm text-muted">{comp}</p>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {comp.name}
                          </span>
                          {comp.website && (
                            <a
                              href={comp.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-copper-light hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        <p className="mt-0.5 text-sm text-muted">{comp.notes}</p>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Run Another Audit */}
      <div className="flex justify-center pb-8">
        <Link
          href="/marketing/onboarding"
          className="flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-medium text-muted transition-colors hover:border-copper-600 hover:text-foreground"
        >
          <Zap className="h-4 w-4" />
          Run Another Audit
        </Link>
      </div>
    </div>
  );
}
