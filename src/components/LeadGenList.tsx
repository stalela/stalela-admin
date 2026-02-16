"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  Globe,
  Phone,
  Mail,
  MapPin,
  Building2,
  Trash2,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import type { GeneratedLead, GeneratedLeadStatus } from "@stalela/commons/types";

const STATUS_OPTIONS: { value: GeneratedLeadStatus; label: string; variant: "default" | "success" | "warning" | "danger" | "info" | "copper" }[] = [
  { value: "new", label: "New", variant: "info" },
  { value: "contacted", label: "Contacted", variant: "warning" },
  { value: "qualified", label: "Qualified", variant: "success" },
  { value: "rejected", label: "Rejected", variant: "danger" },
];

function ScoreBadge({ score }: { score: number }) {
  const variant =
    score >= 80 ? "success" : score >= 60 ? "copper" : score >= 40 ? "warning" : "default";
  return (
    <Badge variant={variant} className="tabular-nums">
      {score}/100
    </Badge>
  );
}

export default function LeadGenList({
  initialLeads,
  initialTotal,
}: {
  initialLeads: GeneratedLead[];
  initialTotal: number;
}) {
  const router = useRouter();
  const [leads, setLeads] = useState(initialLeads);
  const [total, setTotal] = useState(initialTotal);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  /* ── Generate leads ─────────────────────────────────────────── */
  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/marketing/leads/generate", {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed (${res.status})`);
      }
      router.refresh();
      // Also update local state from response
      const data = await res.json();
      if (data.leads) {
        setLeads((prev) => [...data.leads, ...prev]);
        setTotal((prev) => prev + data.leads.length);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate leads");
    } finally {
      setGenerating(false);
    }
  }

  /* ── Update lead status ─────────────────────────────────────── */
  async function handleStatusChange(leadId: string, newStatus: GeneratedLeadStatus) {
    setUpdatingId(leadId);
    try {
      const res = await fetch("/api/marketing/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: leadId, status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
      );
    } catch {
      setError("Failed to update lead status");
    } finally {
      setUpdatingId(null);
    }
  }

  /* ── Delete lead ────────────────────────────────────────────── */
  async function handleDelete(leadId: string) {
    if (!confirm("Remove this lead?")) return;
    setUpdatingId(leadId);
    try {
      const res = await fetch(`/api/marketing/leads?id=${leadId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
      setTotal((prev) => prev - 1);
    } catch {
      setError("Failed to delete lead");
    } finally {
      setUpdatingId(null);
    }
  }

  /* ── Save notes ─────────────────────────────────────────────── */
  async function handleSaveNotes(leadId: string, notes: string) {
    try {
      const res = await fetch("/api/marketing/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: leadId, notes }),
      });
      if (!res.ok) throw new Error("Failed to save notes");
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, notes } : l))
      );
    } catch {
      setError("Failed to save notes");
    }
  }

  /* ── Filtering ──────────────────────────────────────────────── */
  const filteredLeads =
    filterStatus === "all"
      ? leads
      : leads.filter((l) => l.status === filterStatus);

  const statusCounts = leads.reduce(
    (acc, l) => {
      acc[l.status] = (acc[l.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-4">
      {/* ── Header actions ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted">
          <span>{total} leads generated</span>
          {total > 0 && (
            <>
              <span className="text-border">|</span>
              {Object.entries(statusCounts).map(([status, count]) => (
                <span key={status} className="capitalize">
                  {count} {status}
                </span>
              ))}
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {total > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Generate More
            </Button>
          )}
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {generating
              ? "Generating…"
              : total === 0
                ? "Generate Leads"
                : "Generate 10 More"}
          </Button>
        </div>
      </div>

      {/* ── Error banner ───────────────────────────────────────── */}
      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-3 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Generating spinner ─────────────────────────────────── */}
      {generating && (
        <Card className="flex items-center justify-center gap-3 py-12">
          <Loader2 className="h-6 w-6 animate-spin text-copper-600" />
          <div>
            <p className="font-medium text-foreground">
              AI is analyzing your business profile…
            </p>
            <p className="text-sm text-muted">
              Cross-referencing with our company database and graph intelligence.
              This may take 30–60 seconds.
            </p>
          </div>
        </Card>
      )}

      {/* ── Empty state ────────────────────────────────────────── */}
      {!generating && total === 0 && (
        <Card className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-copper-600/10">
            <Sparkles className="h-8 w-8 text-copper-light" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              No leads yet
            </h3>
            <p className="mt-1 max-w-md text-sm text-muted">
              Click &ldquo;Generate Leads&rdquo; to discover 10 potential B2B
              leads matched to your business profile using AI analysis of our
              company database.
            </p>
          </div>
        </Card>
      )}

      {/* ── Filter bar ─────────────────────────────────────────── */}
      {total > 0 && !generating && (
        <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
          <FilterButton
            active={filterStatus === "all"}
            onClick={() => setFilterStatus("all")}
            label={`All (${total})`}
          />
          {STATUS_OPTIONS.map((s) => (
            <FilterButton
              key={s.value}
              active={filterStatus === s.value}
              onClick={() => setFilterStatus(s.value)}
              label={`${s.label} (${statusCounts[s.value] || 0})`}
            />
          ))}
        </div>
      )}

      {/* ── Lead cards ─────────────────────────────────────────── */}
      {!generating && filteredLeads.length > 0 && (
        <div className="space-y-3">
          {filteredLeads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              expanded={expandedId === lead.id}
              updating={updatingId === lead.id}
              onToggle={() =>
                setExpandedId(expandedId === lead.id ? null : lead.id)
              }
              onStatusChange={(s) => handleStatusChange(lead.id, s)}
              onDelete={() => handleDelete(lead.id)}
              onSaveNotes={(n) => handleSaveNotes(lead.id, n)}
            />
          ))}
        </div>
      )}

      {!generating && total > 0 && filteredLeads.length === 0 && (
        <Card className="py-8 text-center">
          <p className="text-sm text-muted">
            No leads matching filter &ldquo;{filterStatus}&rdquo;.
          </p>
        </Card>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Sub-components                                                      */
/* ================================================================== */

function FilterButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-copper-600/20 text-copper-light"
          : "text-muted hover:text-foreground hover:bg-surface-hover"
      )}
    >
      {label}
    </button>
  );
}

function LeadCard({
  lead,
  expanded,
  updating,
  onToggle,
  onStatusChange,
  onDelete,
  onSaveNotes,
}: {
  lead: GeneratedLead;
  expanded: boolean;
  updating: boolean;
  onToggle: () => void;
  onStatusChange: (s: GeneratedLeadStatus) => void;
  onDelete: () => void;
  onSaveNotes: (notes: string) => void;
}) {
  const statusOption = STATUS_OPTIONS.find((s) => s.value === lead.status);
  const [notes, setNotes] = useState(lead.notes || "");
  const [notesDirty, setNotesDirty] = useState(false);

  return (
    <Card className={cn("transition-all", updating && "opacity-60")}>
      {/* ── Collapsed row ──────────────────────────────────────── */}
      <div
        className="flex cursor-pointer items-center gap-4"
        onClick={onToggle}
      >
        {/* Score */}
        <div className="hidden sm:block">
          <ScoreBadge score={lead.relevance_score} />
        </div>

        {/* Company info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-foreground">
              {lead.company_name}
            </h3>
            <div className="sm:hidden">
              <ScoreBadge score={lead.relevance_score} />
            </div>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            {lead.company_industry && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {lead.company_industry}
              </span>
            )}
            {(lead.company_city || lead.company_province) && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {[lead.company_city, lead.company_province]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            )}
          </div>
        </div>

        {/* Status badge */}
        <Badge variant={statusOption?.variant || "default"}>
          {statusOption?.label || lead.status}
        </Badge>

        {/* Expand toggle */}
        <div className="text-muted">
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </div>

      {/* ── Match reason (always visible) ──────────────────────── */}
      <p className="mt-2 text-sm text-muted">{lead.match_reason}</p>

      {/* ── Expanded detail ────────────────────────────────────── */}
      {expanded && (
        <div className="mt-4 space-y-4 border-t border-border pt-4">
          {/* Contact details */}
          <div className="grid gap-3 sm:grid-cols-3">
            {lead.company_website && (
              <a
                href={
                  lead.company_website.startsWith("http")
                    ? lead.company_website
                    : `https://${lead.company_website}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted transition-colors hover:border-copper-600 hover:text-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <Globe className="h-4 w-4 shrink-0 text-copper-600" />
                <span className="truncate">
                  {lead.company_website.replace(/^https?:\/\//, "")}
                </span>
                <ExternalLink className="ml-auto h-3 w-3 shrink-0" />
              </a>
            )}
            {lead.company_phone && (
              <a
                href={`tel:${lead.company_phone}`}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted transition-colors hover:border-copper-600 hover:text-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="h-4 w-4 shrink-0 text-copper-600" />
                <span>{lead.company_phone}</span>
              </a>
            )}
            {lead.company_email && (
              <a
                href={`mailto:${lead.company_email}`}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted transition-colors hover:border-copper-600 hover:text-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <Mail className="h-4 w-4 shrink-0 text-copper-600" />
                <span className="truncate">{lead.company_email}</span>
              </a>
            )}
          </div>

          {/* Outreach suggestion */}
          {lead.outreach_suggestion && (
            <div className="rounded-lg border border-copper-600/20 bg-copper-600/5 p-4">
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-copper-light">
                Suggested Outreach
              </h4>
              <p className="text-sm text-foreground leading-relaxed">
                {lead.outreach_suggestion}
              </p>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setNotesDirty(true);
              }}
              onBlur={() => {
                if (notesDirty) {
                  onSaveNotes(notes);
                  setNotesDirty(false);
                }
              }}
              onClick={(e) => e.stopPropagation()}
              placeholder="Add private notes about this lead…"
              rows={2}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:border-copper-600 focus:outline-none focus:ring-1 focus:ring-copper-600"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted">Status:</span>
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s.value}
                disabled={updating || lead.status === s.value}
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(s.value);
                }}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  lead.status === s.value
                    ? "bg-copper-600/20 text-copper-light cursor-default"
                    : "text-muted hover:text-foreground hover:bg-surface-hover border border-border"
                )}
              >
                {s.label}
              </button>
            ))}

            <div className="ml-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                disabled={updating}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-danger/70 transition-colors hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 className="h-3 w-3" />
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
