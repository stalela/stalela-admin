import {
  Users,
  UserPlus,
  FileText,
  FilePenLine,
  ArrowUpRight,
  Clock,
} from "lucide-react";
import { metricsApi, blogApi } from "@/lib/api";
import { StatCard } from "@/components/StatCard";
import { Card, CardHeader, CardTitle } from "@/components/Card";
import { Badge } from "@/components/Badge";
import Link from "next/link";
import { LeadsChart } from "./LeadsChart";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [summary, leadsOverTime, leadsBySource, recentLeads, recentPosts] =
    await Promise.all([
      metricsApi.summary(),
      metricsApi.leadsOverTime(30),
      metricsApi.leadsBySource(),
      metricsApi.recentLeads(8),
      metricsApi.recentBlogPosts(5),
    ]);

  return (
    <div className="space-y-6">
      {/* ── Summary cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Leads"
          value={summary.totalLeads}
          icon={Users}
        />
        <StatCard
          label="Leads This Month"
          value={summary.leadsThisMonth}
          icon={UserPlus}
        />
        <StatCard
          label="Published Posts"
          value={summary.publishedPosts}
          icon={FileText}
        />
        <StatCard
          label="Drafts"
          value={summary.draftPosts}
          icon={FilePenLine}
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Leads over time — spans 2 cols */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Leads — Last 30 Days</CardTitle>
          </CardHeader>
          <div className="h-64">
            <LeadsChart data={leadsOverTime} />
          </div>
        </Card>

        {/* Leads by source */}
        <Card>
          <CardHeader>
            <CardTitle>Top Sources</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            {leadsBySource.slice(0, 8).map((s) => (
              <div key={s.source} className="flex items-center justify-between">
                <span className="text-sm text-foreground truncate max-w-[180px]">
                  {s.source}
                </span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 rounded-full bg-copper-600/20" style={{ width: `${Math.min(100, (s.count / (leadsBySource[0]?.count || 1)) * 100)}px` }}>
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-copper-600 to-copper-light"
                      style={{ width: "100%" }}
                    />
                  </div>
                  <span className="text-xs font-mono text-muted w-8 text-right">
                    {s.count}
                  </span>
                </div>
              </div>
            ))}
            {leadsBySource.length === 0 && (
              <p className="text-sm text-muted">No lead data yet</p>
            )}
          </div>
        </Card>
      </div>

      {/* ── Recent activity row ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Recent leads */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Leads</CardTitle>
            <Link
              href="/contacts/leads"
              className="text-xs text-copper-600 hover:text-copper-light transition-colors flex items-center gap-1"
            >
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <div className="space-y-3">
            {recentLeads.map((lead) => (
              <div
                key={lead.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 transition-colors hover:bg-surface-hover"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {lead.name || lead.email}
                  </p>
                  {lead.name && (
                    <p className="truncate text-xs text-muted">{lead.email}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="copper">{lead.source}</Badge>
                  <span className="text-xs text-muted flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(lead.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
            {recentLeads.length === 0 && (
              <p className="text-sm text-muted">No leads yet</p>
            )}
          </div>
        </Card>

        {/* Recent blog posts */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Blog Activity</CardTitle>
            <Link
              href="/blog"
              className="text-xs text-copper-600 hover:text-copper-light transition-colors flex items-center gap-1"
            >
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <div className="space-y-3">
            {recentPosts.map((post) => (
              <div
                key={post.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 transition-colors hover:bg-surface-hover"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {post.title}
                  </p>
                  <p className="text-xs text-muted">/{post.slug}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={post.published ? "success" : "warning"}>
                    {post.published ? "Published" : "Draft"}
                  </Badge>
                  <span className="text-xs text-muted">
                    {new Date(post.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
            {recentPosts.length === 0 && (
              <p className="text-sm text-muted">No blog posts yet</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
