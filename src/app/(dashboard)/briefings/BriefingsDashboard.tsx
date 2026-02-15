"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Mail,
  Newspaper,
  Phone,
  Send,
  SkipForward,
  Sparkles,
  Target,
  XCircle,
} from "lucide-react";
import type { DailyBriefing, DailyNews, BriefingStatus } from "@stalela/commons/types";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/Badge";
import { cn } from "@/lib/utils";

/* ── Types ────────────────────────────────────────────────────── */

interface BriefingStats {
  total: number;
  pending: number;
  reviewed: number;
  sent: number;
  skipped: number;
}

interface Props {
  date: string;
  today: string;
  briefings: DailyBriefing[];
  stats: BriefingStats;
  availableDates: string[];
  news: DailyNews | null;
}

/* ── Status helpers ───────────────────────────────────────────── */

const statusBadge: Record<BriefingStatus, { label: string; variant: "default" | "success" | "warning" | "danger" | "info" | "copper" }> = {
  pending: { label: "Pending", variant: "warning" },
  reviewed: { label: "Reviewed", variant: "info" },
  sent: { label: "Sent", variant: "success" },
  skipped: { label: "Skipped", variant: "default" },
};

const priorityLabel: Record<number, { label: string; color: string }> = {
  1: { label: "Critical", color: "text-danger" },
  2: { label: "High", color: "text-warning" },
  3: { label: "Medium", color: "text-copper-light" },
  4: { label: "Low", color: "text-muted" },
  5: { label: "Optional", color: "text-muted" },
};

/* ── Main component ───────────────────────────────────────────── */

export function BriefingsDashboard({ date, today, briefings, stats, availableDates, news }: Props) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<BriefingStatus | "all">("all");
  const [activeTab, setActiveTab] = useState<"outreach" | "news">("outreach");

  const isToday = date === today;
  const formattedDate = new Date(date + "T00:00:00").toLocaleDateString("en-ZA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const filtered = filter === "all"
    ? briefings
    : briefings.filter((b) => b.status === filter);

  /* ── Actions ────────────────────────────────────────────────── */

  async function updateStatus(id: string, status: BriefingStatus) {
    setUpdating(id);
    try {
      const res = await fetch(`/api/briefings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update");
      router.refresh();
    } catch (err) {
      console.error("[briefings]", err);
    } finally {
      setUpdating(null);
    }
  }

  function openGmail(briefing: DailyBriefing) {
    if (!briefing.email_draft_subject || !briefing.email_draft_body) return;
    const params = new URLSearchParams({
      view: "cm",
      su: briefing.email_draft_subject,
      body: briefing.email_draft_body,
    });
    window.open(`https://mail.google.com/mail/?${params.toString()}`, "_blank");
  }

  /* ── Render ─────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isToday ? "Morning Briefing" : "Briefing Archive"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            <Calendar className="mr-1.5 inline h-4 w-4" />
            {formattedDate}
          </p>
        </div>

        {/* Date selector */}
        <div className="flex items-center gap-3">
          <select
            value={date}
            onChange={(e) => router.push(`/briefings?date=${e.target.value}`)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-copper-600 focus:outline-none"
          >
            {!availableDates.includes(today) && (
              <option value={today}>Today ({today})</option>
            )}
            {availableDates.map((d) => (
              <option key={d} value={d}>
                {d === today ? `Today (${d})` : d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg border border-border bg-surface-elevated p-1">
        <button
          onClick={() => setActiveTab("outreach")}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "outreach"
              ? "bg-copper-600 text-white"
              : "text-muted hover:text-foreground"
          )}
        >
          <Target className="h-4 w-4" />
          Outreach
          {stats.total > 0 && (
            <span className={cn(
              "rounded-full px-1.5 text-xs",
              activeTab === "outreach" ? "bg-white/20" : "bg-surface text-muted"
            )}>
              {stats.total}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("news")}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "news"
              ? "bg-copper-600 text-white"
              : "text-muted hover:text-foreground"
          )}
        >
          <Newspaper className="h-4 w-4" />
          News Briefing
          {news && (
            <span className={cn(
              "rounded-full px-1.5 text-xs",
              activeTab === "news" ? "bg-white/20" : "bg-surface text-muted"
            )}>
              ●
            </span>
          )}
        </button>
      </div>

      {/* ── News Tab ─────────────────────────────────────────── */}
      {activeTab === "news" && (
        <div className="space-y-4">
          {news ? (
            <div className="rounded-xl border border-border bg-surface p-6">
              <div
                className="prose prose-invert prose-sm max-w-none
                  prose-headings:text-foreground prose-headings:font-semibold
                  prose-h1:text-xl prose-h1:mb-4 prose-h1:border-b prose-h1:border-border prose-h1:pb-3
                  prose-h2:text-base prose-h2:mt-6 prose-h2:mb-3 prose-h2:text-copper-light
                  prose-p:text-muted prose-p:leading-relaxed
                  prose-li:text-muted prose-li:leading-relaxed
                  prose-strong:text-foreground
                  prose-a:text-copper-light prose-a:no-underline hover:prose-a:underline
                  prose-ul:space-y-2"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(news.content) }}
              />
              <div className="mt-6 flex items-center gap-2 border-t border-border pt-4">
                {news.topics.map((topic) => (
                  <Badge key={topic} variant="copper">{topic}</Badge>
                ))}
                <span className="ml-auto text-xs text-muted">
                  Generated {new Date(news.created_at).toLocaleTimeString("en-ZA", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Newspaper className="mb-4 h-12 w-12 text-copper-600/40" />
              <h3 className="text-lg font-semibold text-foreground">
                No news digest for this date
              </h3>
              <p className="mt-1 text-sm text-muted">
                The daily agent hasn&apos;t generated a news briefing yet.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Outreach Tab ─────────────────────────────────────── */}
      {activeTab === "outreach" && (<>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Total" value={stats.total} icon={Target} />
        <StatCard label="Pending" value={stats.pending} icon={Clock} />
        <StatCard label="Reviewed" value={stats.reviewed} icon={CheckCircle2} />
        <StatCard label="Sent" value={stats.sent} icon={Send} />
        <StatCard
          label="Skipped"
          value={stats.skipped}
          icon={SkipForward}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {(["all", "pending", "reviewed", "sent", "skipped"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors",
              filter === f
                ? "bg-copper-600 text-white"
                : "bg-surface-elevated text-muted hover:text-foreground"
            )}
          >
            {f === "all" ? "All" : f}
            {f !== "all" && (
              <span className="ml-1.5 opacity-60">
                {briefings.filter((b) => b.status === f).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Sparkles className="mb-4 h-12 w-12 text-copper-600/40" />
          <h3 className="text-lg font-semibold text-foreground">
            {briefings.length === 0
              ? "No briefings for this date"
              : "No matching briefings"}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {briefings.length === 0
              ? "The daily briefing agent hasn't generated any reports yet."
              : "Try a different filter to see more briefings."}
          </p>
        </div>
      )}

      {/* Briefing cards */}
      <div className="space-y-3">
        {filtered.map((briefing) => {
          const isExpanded = expandedId === briefing.id;
          const isUpdating = updating === briefing.id;
          const prio = priorityLabel[briefing.priority] ?? priorityLabel[3];
          const badge = statusBadge[briefing.status];

          return (
            <div
              key={briefing.id}
              className={cn(
                "group rounded-xl border border-border bg-surface transition-all duration-200",
                isExpanded && "border-copper-600/40 shadow-lg shadow-copper-600/5"
              )}
            >
              {/* Collapsed header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : briefing.id)}
                className="flex w-full items-center gap-4 p-4 text-left"
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-copper-600/10">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-copper-600" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-copper-600" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold text-foreground">
                      {briefing.company_name}
                    </span>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                    <span className={cn("text-xs font-medium", prio.color)}>
                      P{briefing.priority}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted">
                    <span className="font-medium text-copper-light">
                      {briefing.opportunity_type}
                    </span>
                    {" — "}
                    {briefing.opportunity_summary}
                  </p>
                </div>

                {/* Quick actions (visible on hover) */}
                <div className="flex flex-shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {briefing.status === "pending" && (
                    <>
                      <ActionButton
                        icon={CheckCircle2}
                        title="Mark reviewed"
                        disabled={isUpdating}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatus(briefing.id, "reviewed");
                        }}
                        className="text-info hover:bg-info/10"
                      />
                      <ActionButton
                        icon={SkipForward}
                        title="Skip"
                        disabled={isUpdating}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatus(briefing.id, "skipped");
                        }}
                        className="text-muted hover:bg-surface-elevated"
                      />
                    </>
                  )}
                  {briefing.email_draft_body && (
                    <ActionButton
                      icon={Mail}
                      title="Open in Gmail"
                      onClick={(e) => {
                        e.stopPropagation();
                        openGmail(briefing);
                      }}
                      className="text-copper-light hover:bg-copper-600/10"
                    />
                  )}
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-border px-4 pb-5 pt-4">
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Email Draft */}
                    <div>
                      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Mail className="h-4 w-4 text-copper-600" />
                        Email Draft
                      </h4>
                      {briefing.email_draft_subject ? (
                        <div className="rounded-lg border border-border bg-background p-4">
                          <p className="mb-2 text-sm font-medium text-foreground">
                            Subject: {briefing.email_draft_subject}
                          </p>
                          <div className="whitespace-pre-wrap text-sm text-muted leading-relaxed">
                            {briefing.email_draft_body}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm italic text-muted">
                          No email draft generated.
                        </p>
                      )}
                    </div>

                    {/* Call Script */}
                    <div>
                      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Phone className="h-4 w-4 text-copper-600" />
                        Call Script
                      </h4>
                      {briefing.call_script ? (
                        <div className="rounded-lg border border-border bg-background p-4">
                          <div className="whitespace-pre-wrap text-sm text-muted leading-relaxed">
                            {briefing.call_script}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm italic text-muted">
                          No call script generated.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Research summary */}
                  {briefing.research_summary && (
                    <div className="mt-4">
                      <h4 className="mb-2 text-sm font-semibold text-foreground">
                        Research & Reasoning
                      </h4>
                      <div className="rounded-lg border border-border bg-background p-4">
                        <p className="whitespace-pre-wrap text-sm text-muted leading-relaxed">
                          {briefing.research_summary}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Action bar */}
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                    {briefing.status === "pending" && (
                      <button
                        disabled={isUpdating}
                        onClick={() => updateStatus(briefing.id, "reviewed")}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-info/10 px-3 py-2 text-sm font-medium text-info transition-colors hover:bg-info/20 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Mark Reviewed
                      </button>
                    )}
                    {(briefing.status === "pending" || briefing.status === "reviewed") &&
                      briefing.email_draft_body && (
                        <button
                          disabled={isUpdating}
                          onClick={() => {
                            openGmail(briefing);
                            updateStatus(briefing.id, "sent");
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-copper-600/10 px-3 py-2 text-sm font-medium text-copper-light transition-colors hover:bg-copper-600/20 disabled:opacity-50"
                        >
                          <Send className="h-4 w-4" />
                          Send via Gmail
                        </button>
                      )}
                    {briefing.status === "pending" && (
                      <button
                        disabled={isUpdating}
                        onClick={() => updateStatus(briefing.id, "skipped")}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-surface-elevated px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4" />
                        Skip
                      </button>
                    )}
                    <span className="ml-auto text-xs text-muted">
                      Generated {new Date(briefing.created_at).toLocaleTimeString("en-ZA", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      </>)}
    </div>
  );
}

/* ── Markdown renderer ──────────────────────────────────────── */

function renderMarkdown(md: string): string {
  return md
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Links (BEFORE bold, so [**text**](url) works)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
    // Bare URLs (not already inside an href)
    .replace(/(?<!href=")(?<!href=')(https?:\/\/[^\s<)]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
    // Unordered list items
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')
    // Line breaks for remaining text
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hup]|<li|<ul)(.*\S.*)$/gm, '<p>$1</p>');
}

/* ── Small action button ────────────────────────────────────── */

function ActionButton({
  icon: Icon,
  title,
  onClick,
  disabled,
  className,
}: {
  icon: typeof CheckCircle2;
  title: string;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-lg p-2 transition-colors disabled:opacity-50",
        className
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
