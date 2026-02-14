import { Users, FileText, BarChart3, TrendingUp } from "lucide-react";
import { metricsApi } from "@/lib/api";
import { StatCard } from "@/components/StatCard";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { LeadsChart } from "../LeadsChart";
import { SourcesChart } from "./SourcesChart";

export const dynamic = "force-dynamic";

export default async function MetricsPage() {
  const [summary, leadsOverTime, leadsBySource] = await Promise.all([
    metricsApi.summary(),
    metricsApi.leadsOverTime(90),
    metricsApi.leadsBySource(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Metrics</h1>
        <p className="text-sm text-muted">
          Performance overview and analytics
        </p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Leads"
          value={summary.totalLeads}
          icon={Users}
        />
        <StatCard
          label="This Month"
          value={summary.leadsThisMonth}
          icon={TrendingUp}
        />
        <StatCard
          label="Published Posts"
          value={summary.publishedPosts}
          icon={FileText}
        />
        <StatCard
          label="Drafts"
          value={summary.draftPosts}
          icon={BarChart3}
        />
      </div>

      {/* Leads over 90 days */}
      <Card>
        <CardHeader>
          <CardTitle>Leads — Last 90 Days</CardTitle>
        </CardHeader>
        <div className="h-80">
          <LeadsChart data={leadsOverTime} />
        </div>
      </Card>

      {/* Sources breakdown */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Leads by Source</CardTitle>
          </CardHeader>
          <div className="h-72">
            <SourcesChart data={leadsBySource} />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Source Breakdown</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            {leadsBySource.map((s, i) => {
              const pct =
                summary.totalLeads > 0
                  ? Math.round((s.count / summary.totalLeads) * 100)
                  : 0;
              return (
                <div key={s.source}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-foreground">{s.source}</span>
                    <span className="text-xs text-muted">
                      {s.count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-elevated overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: `hsl(${25 + i * 15}, 55%, ${55 - i * 3}%)`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {leadsBySource.length === 0 && (
              <p className="text-sm text-muted">No lead data yet</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
