import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Globe,
  Target,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Users,
  MessageSquare,
  BarChart3,
  Megaphone,
  Lightbulb,
  Clock,
  Tag,
} from "lucide-react";
import { competitorsApi } from "@/lib/api";
import { createClient } from "@/lib/supabase-server";
import { getTenantContext, isTenantUser } from "@/lib/tenant-context";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { Badge } from "@/components/Badge";
import type { CompetitorAnalysis } from "@stalela/commons/types";

export const dynamic = "force-dynamic";

export default async function CompetitorDetailPage({
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
  if (!isTenantUser(ctx.role) || !ctx.tenantId) redirect("/marketing");

  let competitor;
  try {
    competitor = await competitorsApi.getById(id);
  } catch {
    notFound();
  }

  if (!competitor || competitor.tenant_id !== ctx.tenantId) notFound();

  const analysis = competitor.ad_analysis as CompetitorAnalysis | null;

  return (
    <div className="space-y-6">
      {/* Back link + header */}
      <div>
        <Link
          href="/marketing/competitors"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-copper-light"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Competitors
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-vibranium/10 text-2xl font-bold text-vibranium">
            {competitor.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {competitor.name}
            </h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted">
              {competitor.website && (
                <a
                  href={competitor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-copper-light hover:underline"
                >
                  <Globe className="h-3.5 w-3.5" />
                  {new URL(competitor.website).hostname}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {competitor.industry && (
                <span className="flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5" />
                  {competitor.industry}
                </span>
              )}
              <Badge
                variant={
                  competitor.discovered_via === "ai_audit"
                    ? "copper"
                    : competitor.discovered_via === "ad_library"
                      ? "info"
                      : "default"
                }
              >
                {competitor.discovered_via === "ai_audit"
                  ? "AI Discovered"
                  : competitor.discovered_via === "ad_library"
                    ? "Ad Library"
                    : "Manual"}
              </Badge>
            </div>
          </div>
        </div>

        {competitor.last_analyzed_at && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
            <Clock className="h-3.5 w-3.5" />
            Last analyzed{" "}
            {new Date(competitor.last_analyzed_at).toLocaleDateString("en-ZA", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        )}
      </div>

      {/* Notes */}
      {competitor.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <MessageSquare className="h-4 w-4 text-copper-light" />
              Notes
            </CardTitle>
          </CardHeader>
          <div className="px-6 pb-5">
            <p className="text-sm text-muted">{competitor.notes}</p>
          </div>
        </Card>
      )}

      {/* Analysis */}
      {analysis ? (
        <div className="space-y-6">
          {/* Top-level insights */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <div className="flex items-start gap-3 p-5">
                <div className="rounded-lg bg-vibranium/10 p-2">
                  <Target className="h-5 w-5 text-vibranium" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">
                    Brand Positioning
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {analysis.brand_positioning}
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-start gap-3 p-5">
                <div className="rounded-lg bg-copper-600/10 p-2">
                  <Users className="h-5 w-5 text-copper-light" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">
                    Target Audience
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {analysis.target_audience}
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-start gap-3 p-5">
                <div className="rounded-lg bg-info/10 p-2">
                  <Megaphone className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">
                    Messaging Strategy
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {analysis.messaging_strategy}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Platform Presence + Ad Patterns */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <BarChart3 className="h-4 w-4 text-copper-light" />
                  Platform Presence
                </CardTitle>
              </CardHeader>
              <div className="px-6 pb-5">
                <div className="flex flex-wrap gap-2">
                  {analysis.platform_presence.map((platform) => (
                    <span
                      key={platform}
                      className="rounded-lg border border-border bg-surface-elevated px-3 py-1.5 text-sm text-foreground"
                    >
                      {platform}
                    </span>
                  ))}
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-copper-light" />
                  Ad Patterns
                </CardTitle>
              </CardHeader>
              <div className="space-y-2 px-6 pb-5">
                {analysis.ad_patterns.map((pattern, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-sm text-muted"
                  >
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-copper-light" />
                    {pattern}
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Strengths + Weaknesses */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  Strengths
                </CardTitle>
              </CardHeader>
              <div className="space-y-2 px-6 pb-5">
                {analysis.strengths.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-sm text-foreground"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success/60" />
                    {s}
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  Weaknesses
                </CardTitle>
              </CardHeader>
              <div className="space-y-2 px-6 pb-5">
                {analysis.weaknesses.map((w, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-sm text-foreground"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning/60" />
                    {w}
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Differentiation Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Lightbulb className="h-4 w-4 text-copper-light" />
                Differentiation Opportunities
              </CardTitle>
            </CardHeader>
            <div className="grid gap-3 px-6 pb-5 md:grid-cols-2">
              {analysis.differentiation_tips.map((tip, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-copper-600/20 bg-copper-600/5 p-3"
                >
                  <p className="text-sm text-foreground">{tip}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <Card>
          <div className="flex flex-col items-center justify-center py-16">
            <Zap className="h-12 w-12 text-muted/30" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              No analysis yet
            </h3>
            <p className="mt-1 text-sm text-muted">
              Go back to the competitors list and click &quot;Analyze&quot; to run
              an AI-powered analysis.
            </p>
            <Link
              href="/marketing/competitors"
              className="mt-4 flex items-center gap-2 rounded-lg bg-copper-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-copper-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Competitors
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
