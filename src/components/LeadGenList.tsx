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
  X,
  Lock,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import type { GeneratedLead, GeneratedLeadStatus } from "@stalela/commons/types";

/** Matches FREE_VISIBLE_LEADS in src/lib/stripe.ts */
const FREE_VISIBLE_LEADS = 3;

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

const SA_PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
];

export default function LeadGenList({
  initialLeads,
  initialTotal,
  tenantId,
  tenantSettings,
  tenantPlan = "free",
  monthlyUsage = 0,
}: {
  initialLeads: GeneratedLead[];
  initialTotal: number;
  tenantId: string;
  tenantSettings: Record<string, unknown>;
  tenantPlan?: string;
  monthlyUsage?: number;
}) {
  const isFree = tenantPlan !== "premium" && tenantPlan !== "enterprise";
  const router = useRouter();
  const [leads, setLeads] = useState(initialLeads);
  const [total, setTotal] = useState(initialTotal);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [savedSettings, setSavedSettings] = useState(tenantSettings);

  /* ── Check if profile is complete enough for lead gen ────────── */
  function isProfileComplete(s: Record<string, unknown>) {
    return !!s.industry && (!!s.city || !!s.province);
  }

  /* ── Intercept generate — show modal if profile incomplete ──── */
  function handleGenerateClick() {
    if (isProfileComplete(savedSettings)) {
      doGenerate();
    } else {
      setShowProfileModal(true);
    }
  }

  /* ── Generate leads ─────────────────────────────────────────── */
  async function doGenerate(profileOverrides?: { industry?: string; city?: string; province?: string; additional_details?: string }) {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/marketing/leads/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileOverrides || {}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed (${res.status})`);
      }
      const data = await res.json();
      if (data.leads) {
        setLeads((prev) => [...data.leads, ...prev]);
        setTotal((prev) => prev + data.leads.length);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate leads");
    } finally {
      setGenerating(false);
    }
  }

  /* ── Handle profile modal submit ────────────────────────────── */
  async function handleProfileSubmit(profile: { industry: string; city: string; province: string; target_market?: string; additional_details?: string }) {
    setShowProfileModal(false);
    setError(null);

    // Save to tenant settings (exclude additional_details — it's per-generation, not a saved setting)
    try {
      const { additional_details: _, ...settingsToSave } = profile;
      const newSettings = { ...savedSettings, ...settingsToSave };
      const res = await fetch(`/api/marketing/tenants/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: newSettings }),
      });
      if (res.ok) {
        setSavedSettings(newSettings);
      }
    } catch {
      // Best effort — generate will still use override params
    }

    // Generate with overrides so the route has the data immediately
    doGenerate({ industry: profile.industry, city: profile.city, province: profile.province, additional_details: profile.additional_details });
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
              onClick={handleGenerateClick}
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
          <Button onClick={handleGenerateClick} disabled={generating}>
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

      {/* ── Profile modal ──────────────────────────────────────── */}
      {showProfileModal && (
        <ProfileModal
          initialValues={{
            industry: (savedSettings.industry as string) || "",
            city: (savedSettings.city as string) || "",
            province: (savedSettings.province as string) || "",
            target_market: (savedSettings.target_market as string) || "",
          }}
          onSubmit={handleProfileSubmit}
          onClose={() => setShowProfileModal(false)}
        />
      )}

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
            {!isProfileComplete(savedSettings) && (
              <p className="mt-2 max-w-md text-xs text-warning">
                We&apos;ll need a few details about your business first — industry and location — so we can find the right matches.
              </p>
            )}
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
          {filteredLeads.map((lead, idx) => {
            const isLocked = isFree && idx >= FREE_VISIBLE_LEADS;

            if (isLocked) return null; // blurred overlay handles these below

            return (
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
            );
          })}
        </div>
      )}

      {/* ── Blurred leads paywall (free users) ───────────────── */}
      {!generating && isFree && filteredLeads.length > FREE_VISIBLE_LEADS && (
        <LockedLeadsOverlay
          lockedCount={filteredLeads.length - FREE_VISIBLE_LEADS}
          leads={filteredLeads.slice(FREE_VISIBLE_LEADS)}
        />
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

/* ── Profile completion modal ──────────────────────────────── */

function ProfileModal({
  initialValues,
  onSubmit,
  onClose,
}: {
  initialValues: { industry: string; city: string; province: string; target_market: string };
  onSubmit: (profile: { industry: string; city: string; province: string; target_market: string; additional_details: string }) => void;
  onClose: () => void;
}) {
  const [industry, setIndustry] = useState(initialValues.industry);
  const [city, setCity] = useState(initialValues.city);
  const [province, setProvince] = useState(initialValues.province);
  const [targetMarket, setTargetMarket] = useState(initialValues.target_market);
  const [additionalDetails, setAdditionalDetails] = useState("");

  const canSubmit = industry.trim().length > 0 && (city.trim().length > 0 || province.trim().length > 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      industry: industry.trim(),
      city: city.trim(),
      province: province.trim(),
      target_market: targetMarket.trim(),
      additional_details: additionalDetails.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-copper-600/10">
              <Sparkles className="h-5 w-5 text-copper-light" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Tell us about your business
            </h2>
          </div>
          <p className="text-sm text-muted">
            We need a few details to find the most relevant B2B leads for you. This info will be saved to your profile.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Industry */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Industry / Sector <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. Digital Marketing, Construction, Legal Services"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:border-copper-600 focus:outline-none focus:ring-1 focus:ring-copper-600"
              autoFocus
            />
            <p className="mt-1 text-xs text-muted">What does your business do?</p>
          </div>

          {/* Province */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Province <span className="text-danger">*</span>
            </label>
            <select
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-copper-600 focus:outline-none focus:ring-1 focus:ring-copper-600"
            >
              <option value="">Select province…</option>
              {SA_PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* City */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              City
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Johannesburg, Cape Town, Durban"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:border-copper-600 focus:outline-none focus:ring-1 focus:ring-copper-600"
            />
          </div>

          {/* Target market */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Target Market
            </label>
            <input
              type="text"
              value={targetMarket}
              onChange={(e) => setTargetMarket(e.target.value)}
              placeholder="e.g. SMEs, Retail, Healthcare providers"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:border-copper-600 focus:outline-none focus:ring-1 focus:ring-copper-600"
            />
            <p className="mt-1 text-xs text-muted">What types of businesses are you trying to reach?</p>
          </div>

          {/* Additional details */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Additional Details
            </label>
            <textarea
              value={additionalDetails}
              onChange={(e) => setAdditionalDetails(e.target.value)}
              placeholder="e.g. Looking for companies that need website redesigns, or businesses expanding into Gauteng"
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:border-copper-600 focus:outline-none focus:ring-1 focus:ring-copper-600 resize-none"
            />
            <p className="mt-1 text-xs text-muted">Describe the kind of leads you&apos;re looking for — the more specific, the better.</p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              <Sparkles className="h-4 w-4" />
              Save &amp; Generate Leads
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

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

/* ── Blurred paywall overlay for free users ────────────────── */

function LockedLeadsOverlay({
  lockedCount,
  leads,
}: {
  lockedCount: number;
  leads: GeneratedLead[];
}) {
  const router = useRouter();

  return (
    <div className="relative mt-3">
      {/* Blurred preview cards */}
      <div className="space-y-3 select-none pointer-events-none" aria-hidden>
        {leads.slice(0, 3).map((lead) => (
          <Card key={lead.id} className="blur-[6px] opacity-60">
            <div className="flex items-center gap-4">
              <Badge variant="default" className="tabular-nums">
                {lead.relevance_score}/100
              </Badge>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold text-foreground">
                  {lead.company_name}
                </h3>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-muted">
                  {lead.company_industry && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {lead.company_industry}
                    </span>
                  )}
                  {(lead.company_city || lead.company_province) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {[lead.company_city, lead.company_province].filter(Boolean).join(", ")}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <p className="mt-2 text-sm text-muted">{lead.match_reason}</p>
          </Card>
        ))}
        {lockedCount > 3 && (
          <Card className="blur-[6px] opacity-40 py-6 text-center">
            <p className="text-sm text-muted">
              +{lockedCount - 3} more matching leads…
            </p>
          </Card>
        )}
      </div>

      {/* Upgrade overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="mx-4 w-full max-w-md rounded-2xl border border-copper-600/30 bg-surface/95 backdrop-blur-sm p-8 shadow-2xl text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-copper-600/10">
            <Lock className="h-7 w-7 text-copper-light" />
          </div>
          <h3 className="text-lg font-bold text-foreground">
            Unlock {lockedCount} More Lead{lockedCount !== 1 ? "s" : ""}
          </h3>
          <p className="mt-2 text-sm text-muted">
            Upgrade to <span className="font-semibold text-copper-light">Lalela Premium</span> to
            see all your matched leads with full contact details and AI-crafted
            outreach suggestions.
          </p>
          <ul className="mx-auto mt-4 max-w-sm space-y-2 text-left text-sm text-muted">
            <li className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-copper-light shrink-0" />
              <span>See <strong className="text-foreground">all leads</strong> — no blur</span>
            </li>
            <li className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-copper-light shrink-0" />
              <span>Up to <strong className="text-foreground">500 leads/month</strong></span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-copper-light shrink-0" />
              <span>Full contact details &amp; outreach messages</span>
            </li>
          </ul>
          <Button
            className="mt-6 w-full"
            onClick={() => router.push("/marketing/billing")}
          >
            <Crown className="h-4 w-4" />
            Upgrade to Premium — R300/mo
          </Button>
          <p className="mt-2 text-xs text-muted">Cancel anytime. No commitment.</p>
        </div>
      </div>
    </div>
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
