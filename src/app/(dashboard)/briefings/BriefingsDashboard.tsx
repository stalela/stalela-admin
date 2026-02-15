"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  ClipboardCopy,
  Loader2,
  Mail,
  Newspaper,
  Phone,
  Send,
  SendHorizontal,
  SkipForward,
  Sparkles,
  Target,
  XCircle,
} from "lucide-react";
import type { DailyBriefing, DailyNews, BriefingStatus } from "@stalela/commons/types";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/Badge";
import { cn } from "@/lib/utils";
import { buildEmailHtml, copyHtmlToClipboard } from "@/lib/email-template";

/* ── Chat types ───────────────────────────────────────────────── */

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

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
  const [activeTab, setActiveTab] = useState<"outreach" | "news" | "ai">("outreach");
  const [copied, setCopied] = useState<string | null>(null);

  /* ── AI Chat state ──────────────────────────────────────────── */
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatStreaming, setChatStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

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
    // Copy branded HTML to clipboard first, then open Gmail compose
    const html = buildEmailHtml({
      subject: briefing.email_draft_subject,
      body: briefing.email_draft_body,
      companyName: briefing.company_name,
    });
    copyHtmlToClipboard(html).then((ok) => {
      if (ok) setCopied(briefing.id);
      setTimeout(() => setCopied(null), 3000);
    });
    const params = new URLSearchParams({
      view: "cm",
      su: briefing.email_draft_subject,
      body: briefing.email_draft_body,
    });
    window.open(`https://mail.google.com/mail/?${params.toString()}`, "_blank");
  }

  async function copyBrandedEmail(briefing: DailyBriefing) {
    if (!briefing.email_draft_subject || !briefing.email_draft_body) return;
    const html = buildEmailHtml({
      subject: briefing.email_draft_subject,
      body: briefing.email_draft_body,
      companyName: briefing.company_name,
    });
    const ok = await copyHtmlToClipboard(html);
    if (ok) {
      setCopied(briefing.id);
      setTimeout(() => setCopied(null), 3000);
    }
  }

  /* ── AI Chat ────────────────────────────────────────────────── */

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, scrollToBottom]);

  async function sendChatMessage(text?: string) {
    const question = (text ?? chatInput).trim();
    if (!question || chatLoading) return;

    setChatInput("");
    const userMsg: ChatMessage = { role: "user", content: question };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatLoading(true);
    setChatStreaming(true);

    // Add placeholder for assistant response
    setChatMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const history = chatMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/briefings/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const payload = line.slice(6);
              if (payload === "[DONE]") continue;
              try {
                const parsed = JSON.parse(payload);
                if (parsed.content) {
                  accumulated += parsed.content;
                  setChatMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      role: "assistant",
                      content: accumulated,
                    };
                    return updated;
                  });
                }
              } catch {
                // skip malformed SSE
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("[briefings-chat]", err);
      setChatMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        };
        return updated;
      });
    } finally {
      setChatLoading(false);
      setChatStreaming(false);
    }
  }

  const suggestedPrompts = [
    "Summarize today's briefings",
    "Which leads need follow-up?",
    "Show me top priority outreach",
    "What are the latest news trends?",
    "Give me lead pipeline metrics",
    "How many companies in Gauteng?",
  ];

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
        <button
          onClick={() => setActiveTab("ai")}
          className={cn(
            "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "ai"
              ? "bg-copper-600 text-white"
              : "text-muted hover:text-foreground"
          )}
        >
          <Bot className="h-4 w-4" />
          AI Assistant
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

      {/* ── AI Assistant Tab ─────────────────────────────────── */}
      {activeTab === "ai" && (
        <div className="flex flex-col rounded-xl border border-border bg-surface" style={{ height: "calc(100vh - 280px)" }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-copper-600/10 mb-4">
                  <Bot className="h-8 w-8 text-copper-600" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Stalela AI Assistant
                </h3>
                <p className="text-sm text-muted mb-6 max-w-md">
                  Ask me anything about your briefings, pipeline, metrics, companies, or market trends.
                </p>
                <div className="grid grid-cols-2 gap-2 max-w-lg">
                  {suggestedPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendChatMessage(prompt)}
                      className="rounded-lg border border-border bg-surface-elevated px-3 py-2.5 text-left text-sm text-muted transition-colors hover:border-copper-600/40 hover:text-foreground"
                    >
                      <Sparkles className="inline h-3.5 w-3.5 mr-1.5 text-copper-600" />
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-3",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {/* Avatar */}
                {msg.role === "assistant" && (
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-copper-600/10 mt-1">
                    <Bot className="h-4 w-4 text-copper-600" />
                  </div>
                )}

                <div
                  className={cn(
                    "max-w-[85%] rounded-xl text-sm",
                    msg.role === "user"
                      ? "bg-copper-600 text-white px-4 py-3"
                      : "bg-surface-elevated border border-border text-foreground px-5 py-4"
                  )}
                >
                  {msg.role === "assistant" ? (
                    msg.content ? (
                      <div
                        className="chat-markdown prose prose-invert prose-sm max-w-none
                          prose-headings:text-foreground prose-headings:font-semibold
                          prose-h1:text-base prose-h1:mb-3 prose-h1:mt-0
                          prose-h2:text-[0.9rem] prose-h2:mt-5 prose-h2:mb-2 prose-h2:text-copper-light prose-h2:flex prose-h2:items-center prose-h2:gap-2
                          prose-h3:text-sm prose-h3:mt-4 prose-h3:mb-1.5 prose-h3:text-copper-light
                          prose-p:text-muted prose-p:leading-relaxed prose-p:my-1.5
                          prose-li:text-muted prose-li:leading-relaxed prose-li:my-0.5
                          prose-strong:text-foreground prose-strong:font-semibold
                          prose-a:text-copper-light prose-a:no-underline hover:prose-a:underline
                          prose-blockquote:border-l-2 prose-blockquote:border-copper-600 prose-blockquote:bg-copper-600/5 prose-blockquote:rounded-r-lg prose-blockquote:px-4 prose-blockquote:py-2 prose-blockquote:my-3 prose-blockquote:not-italic prose-blockquote:text-foreground
                          prose-table:text-sm prose-table:w-full
                          prose-thead:border-b prose-thead:border-border
                          prose-th:text-foreground prose-th:font-semibold prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:bg-surface/50
                          prose-td:text-muted prose-td:px-3 prose-td:py-2 prose-td:border-b prose-td:border-border/50
                          prose-tr:transition-colors hover:prose-tr:bg-surface/30
                          prose-code:text-copper-light prose-code:bg-background prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono
                          prose-hr:border-border prose-hr:my-4
                          prose-ol:list-decimal prose-ol:pl-4 prose-ol:my-2
                          prose-ul:list-disc prose-ul:pl-4 prose-ul:my-2"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                      />
                    ) : (
                      <div className="flex items-center gap-3 text-muted py-1">
                        <div className="flex gap-1">
                          <span className="h-2 w-2 rounded-full bg-copper-600 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="h-2 w-2 rounded-full bg-copper-600 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="h-2 w-2 rounded-full bg-copper-600 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                        <span className="text-sm">Analyzing data…</span>
                      </div>
                    )
                  ) : (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  )}
                </div>

                {/* User avatar */}
                {msg.role === "user" && (
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-copper-600 mt-1">
                    <span className="text-xs font-bold text-white">You</span>
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input bar */}
          <div className="border-t border-border p-4">
            <div className="flex items-end gap-2">
              <textarea
                ref={chatInputRef}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendChatMessage();
                  }
                }}
                placeholder="Ask about briefings, metrics, leads, companies…"
                rows={1}
                className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-copper-600 focus:outline-none focus:ring-1 focus:ring-copper-600/30"
                style={{ maxHeight: "120px" }}
              />
              <button
                onClick={() => sendChatMessage()}
                disabled={!chatInput.trim() || chatLoading}
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-copper-600 text-white transition-colors hover:bg-copper-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {chatStreaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <SendHorizontal className="h-4 w-4" />
                )}
              </button>
            </div>
            {chatMessages.length > 0 && (
              <div className="mt-2 flex items-center justify-between">
                <div className="flex flex-wrap gap-1.5">
                  {suggestedPrompts.slice(0, 3).map((prompt) => (
                    <button
                      key={prompt}
                      disabled={chatLoading}
                      onClick={() => sendChatMessage(prompt)}
                      className="rounded-md bg-surface-elevated px-2 py-1 text-xs text-muted transition-colors hover:text-foreground disabled:opacity-40"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setChatMessages([])}
                  className="text-xs text-muted hover:text-foreground transition-colors"
                >
                  Clear chat
                </button>
              </div>
            )}
          </div>
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
                    {briefing.email_draft_body && (
                      <button
                        onClick={() => copyBrandedEmail(briefing)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-vibranium/10 px-3 py-2 text-sm font-medium text-vibranium transition-colors hover:bg-vibranium/20"
                      >
                        <ClipboardCopy className="h-4 w-4" />
                        {copied === briefing.id ? "Copied!" : "Copy Branded Email"}
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
  let html = md;

  // Tables: detect markdown tables and convert to HTML
  html = html.replace(
    /^(\|.+\|)\n(\|[\s-:|]+\|)\n((\|.+\|\n?)+)/gm,
    (_match, headerRow: string, _sep: string, bodyBlock: string) => {
      const headers = headerRow.split("|").filter((c: string) => c.trim()).map((c: string) => c.trim());
      const rows = bodyBlock.trim().split("\n").map((row: string) =>
        row.split("|").filter((c: string) => c.trim()).map((c: string) => c.trim())
      );
      const ths = headers.map((h: string) => `<th>${h}</th>`).join("");
      const trs = rows.map((cols: string[]) => `<tr>${cols.map((c: string) => `<td>${c}</td>`).join("")}</tr>`).join("");
      return `<div class="table-wrap"><table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>`;
    }
  );

  html = html
    // Horizontal rules
    .replace(/^---$/gm, '<hr />')
    // Headers (with optional emoji/icon prefix)
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Links (BEFORE bold, so [**text**](url) works)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bare URLs (not already inside an href)
    .replace(/(?<!href=")(?<!href=')(https?:\/\/[^\s<)]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
    // Numbered list items
    .replace(/^\d+\.\s+(.+)$/gm, '<li class="numbered">$1</li>')
    // Unordered list items
    .replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>')
    // Wrap consecutive <li class="numbered"> in <ol>
    .replace(/((?:<li class="numbered">.*<\/li>\n?)+)/g, (m) =>
      `<ol>${m.replace(/ class="numbered"/g, "")}</ol>`
    )
    // Wrap consecutive <li> (unordered) in <ul>
    .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')
    // Merge consecutive blockquotes
    .replace(/<\/blockquote>\n<blockquote>/g, '<br />')
    // Line breaks for remaining text
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hupob]|<li|<ul|<ol|<div|<ta|<hr)(.*\S.*)$/gm, '<p>$1</p>');

  return html;
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
