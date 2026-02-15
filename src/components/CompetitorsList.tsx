"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Trash2,
  ExternalLink,
  Zap,
  Loader2,
  X,
  Globe,
  Target,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/Badge";
import type { Competitor } from "@stalela/commons/types";

interface Props {
  tenantId: string;
  initialCompetitors: Competitor[];
}

export default function CompetitorsList({ tenantId, initialCompetitors }: Props) {
  const router = useRouter();
  const [competitors, setCompetitors] = useState<Competitor[]>(initialCompetitors);
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleAdd() {
    if (!name.trim()) {
      setError("Competitor name is required.");
      return;
    }

    setLoading(true);
    setError("");

    let url = website.trim();
    if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    try {
      const res = await fetch("/api/marketing/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          name: name.trim(),
          website: url || null,
          industry: industry.trim() || null,
          discovered_via: "manual",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add competitor");
      }

      const comp = await res.json();
      setCompetitors((prev) => [comp, ...prev]);
      setShowAddModal(false);
      setName("");
      setWebsite("");
      setIndustry("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyze(competitor: Competitor) {
    setAnalyzingId(competitor.id);

    try {
      const res = await fetch(
        `/api/marketing/competitors/${competitor.id}/analyze`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Analysis failed");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response stream");

      let analysis = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.analysis) {
                analysis = parsed.analysis;
              }
            } catch {
              // skip
            }
          }
        }
      }

      if (analysis) {
        setCompetitors((prev) =>
          prev.map((c) =>
            c.id === competitor.id
              ? {
                  ...c,
                  ad_analysis: analysis,
                  last_analyzed_at: new Date().toISOString(),
                }
              : c
          )
        );
      }

      router.refresh();
    } catch (err) {
      console.error("Analysis error:", err);
    } finally {
      setAnalyzingId(null);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/marketing/competitors/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");

      setCompetitors((prev) => prev.filter((c) => c.id !== id));
      router.refresh();
    } catch (err) {
      console.error("Delete error:", err);
    }
  }

  return (
    <>
      {/* Add button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-lg bg-copper-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-copper-700"
        >
          <Plus className="h-4 w-4" />
          Add Competitor
        </button>
      </div>

      {/* Competitors grid */}
      {competitors.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface py-16">
          <Target className="h-12 w-12 text-muted/30" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            No competitors tracked yet
          </h3>
          <p className="mt-1 text-sm text-muted">
            Add your first competitor to get AI-powered analysis.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 flex items-center gap-2 rounded-lg bg-copper-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-copper-700"
          >
            <Plus className="h-4 w-4" />
            Add Competitor
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {competitors.map((comp) => {
            const isAnalyzing = analyzingId === comp.id;
            const hasAnalysis = !!comp.ad_analysis;

            return (
              <div
                key={comp.id}
                className={cn(
                  "group relative rounded-xl border bg-surface transition-all",
                  hasAnalysis ? "border-border" : "border-border/50"
                )}
              >
                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-vibranium/10 text-lg font-bold text-vibranium">
                        {comp.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {comp.name}
                        </h3>
                        {comp.website && (
                          <a
                            href={comp.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-copper-light hover:underline"
                          >
                            {new URL(comp.website).hostname}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(comp.id)}
                      className="rounded-lg p-1.5 text-muted opacity-0 transition-all hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Discovery badge */}
                  <div className="mt-3 flex items-center gap-2">
                    <Badge
                      variant={
                        comp.discovered_via === "ai_audit"
                          ? "copper"
                          : comp.discovered_via === "ad_library"
                            ? "info"
                            : "default"
                      }
                    >
                      {comp.discovered_via === "ai_audit"
                        ? "AI Discovered"
                        : comp.discovered_via === "ad_library"
                          ? "Ad Library"
                          : "Manual"}
                    </Badge>
                    {comp.industry && (
                      <span className="text-xs text-muted">{comp.industry}</span>
                    )}
                  </div>

                  {/* Analysis preview */}
                  {hasAnalysis && comp.ad_analysis && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-muted line-clamp-2">
                        {comp.ad_analysis.brand_positioning}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {comp.ad_analysis.platform_presence.slice(0, 3).map((p) => (
                          <span
                            key={p}
                            className="rounded-full bg-surface-elevated px-2 py-0.5 text-xs text-muted"
                          >
                            {p}
                          </span>
                        ))}
                        {comp.ad_analysis.platform_presence.length > 3 && (
                          <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-xs text-muted">
                            +{comp.ad_analysis.platform_presence.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Last analyzed */}
                  {comp.last_analyzed_at && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted">
                      <Clock className="h-3 w-3" />
                      Analyzed{" "}
                      {new Date(comp.last_analyzed_at).toLocaleDateString("en-ZA")}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleAnalyze(comp)}
                      disabled={isAnalyzing}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-copper-600/30 bg-copper-600/10 px-3 py-2 text-xs font-medium text-copper-light transition-all hover:bg-copper-600/20 disabled:opacity-50"
                    >
                      {isAnalyzing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Zap className="h-3.5 w-3.5" />
                      )}
                      {isAnalyzing
                        ? "Analyzing..."
                        : hasAnalysis
                          ? "Re-analyze"
                          : "Analyze"}
                    </button>

                    {hasAnalysis && (
                      <Link
                        href={`/marketing/competitors/${comp.id}`}
                        className="flex items-center justify-center gap-1 rounded-lg border border-border px-3 py-2 text-xs text-muted transition-colors hover:border-copper-600 hover:text-foreground"
                      >
                        View
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Competitor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">
                Add Competitor
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1 text-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium uppercase tracking-wider text-muted">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Acme Marketing"
                  className="w-full rounded-lg border border-border bg-surface-elevated px-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:border-copper-600 focus:outline-none focus:ring-1 focus:ring-copper-600/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium uppercase tracking-wider text-muted">
                  Website
                </label>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted" />
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://competitor.com"
                    className="w-full rounded-lg border border-border bg-surface-elevated px-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:border-copper-600 focus:outline-none focus:ring-1 focus:ring-copper-600/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium uppercase tracking-wider text-muted">
                  Industry
                </label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="Digital Marketing"
                  className="w-full rounded-lg border border-border bg-surface-elevated px-4 py-2.5 text-sm text-foreground placeholder:text-muted/40 focus:border-copper-600 focus:outline-none focus:ring-1 focus:ring-copper-600/50"
                />
              </div>
            </div>

            {error && (
              <div className="mt-3 rounded-lg border border-danger/20 bg-danger/5 px-4 py-2.5 text-sm text-danger">
                {error}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-lg border border-border px-4 py-2.5 text-sm text-muted hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-copper-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-copper-700 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
