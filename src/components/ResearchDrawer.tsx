"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { X, RefreshCw, Sparkles, Clock, Loader2, Mail } from "lucide-react";
import { ReportView } from "@/components/ReportView";

interface ResearchDrawerProps {
  companyId: string;
  companyName: string;
  open: boolean;
  onClose: () => void;
}

/** Streaming progress stages shown while the AI generates the report. */
const PROGRESS_STAGES = [
  { label: "Searching the web for company intelligence…", delay: 0 },
  { label: "Analyzing digital presence & reviews…", delay: 8000 },
  { label: "Identifying pain points & opportunities…", delay: 18000 },
  { label: "Crafting personalized outreach…", delay: 30000 },
  { label: "Finalizing your report…", delay: 45000 },
];

export function ResearchDrawer({
  companyId,
  companyName,
  open,
  onClose,
}: ResearchDrawerProps) {
  const [report, setReport] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [cached, setCached] = useState(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const streamStartRef = useRef<number>(0);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startProgressAnimation = useCallback(() => {
    streamStartRef.current = Date.now();
    setStageIndex(0);
    setProgress(0);

    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - streamStartRef.current;
      // Progress bar: asymptotic approach to 90% over 60s
      const pct = Math.min(90, (elapsed / 60000) * 100);
      setProgress(pct);

      // Advance stage
      for (let i = PROGRESS_STAGES.length - 1; i >= 0; i--) {
        if (elapsed >= PROGRESS_STAGES[i].delay) {
          setStageIndex(i);
          break;
        }
      }
    }, 200);
  }, []);

  const stopProgressAnimation = useCallback(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    setProgress(100);
  }, []);

  const fetchReport = useCallback(
    async (force = false) => {
      // Abort any in-flight request
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setReport("");
      setStreaming(true);
      setCached(false);
      setCachedAt(null);
      setError(null);

      try {
        const res = await fetch("/api/companies/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId, force }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Request failed" }));
          throw new Error(err.error || `Error ${res.status}`);
        }

        const contentType = res.headers.get("content-type") || "";

        // Cached response — returned as JSON
        if (contentType.includes("application/json")) {
          const data = await res.json();
          setReport(data.report);
          setCached(true);
          setCachedAt(data.created_at);
          setStreaming(false);
          return;
        }

        // Streaming SSE response — collect silently, show progress animation
        startProgressAnimation();
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                accumulated += parsed.content;
              }
            } catch {
              // Skip malformed chunks
            }
          }
        }

        stopProgressAnimation();
        setReport(accumulated);
      } catch (e) {
        stopProgressAnimation();
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Failed to generate report");
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [companyId, startProgressAnimation, stopProgressAnimation]
  );

  // Auto-fetch on open when no report is loaded
  useEffect(() => {
    if (open && !report && !streaming && !error) {
      fetchReport(false);
    }
  }, [open, report, streaming, error, fetchReport]);

  // Reset state when companyId changes
  useEffect(() => {
    setReport("");
    setCached(false);
    setCachedAt(null);
    setError(null);
  }, [companyId]);

  // Abort on close/unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  // ESC key handler
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col border-l border-border bg-background transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <Sparkles className="h-5 w-5 shrink-0 text-copper-light" />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground truncate">
                AI Research Report
              </h2>
              <p className="text-xs text-muted truncate">{companyName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {streaming && (
              <span className="flex items-center gap-1.5 text-xs text-copper-light">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Generating…
              </span>
            )}
            {cached && cachedAt && (
              <span className="flex items-center gap-1 text-xs text-muted">
                <Clock className="h-3 w-3" />
                {new Date(cachedAt).toLocaleDateString()}
              </span>
            )}
            {report && !streaming && (
              <>
                <button
                  onClick={() => {
                    const subject = encodeURIComponent(
                      `AI Research Report — ${companyName}`
                    );
                    const body = encodeURIComponent(report);
                    window.open(
                      `https://mail.google.com/mail/?view=cm&su=${subject}&body=${body}`,
                      "_blank"
                    );
                  }}
                  className="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-copper-light transition-colors"
                  title="Send report via Gmail"
                >
                  <Mail className="h-4 w-4" />
                </button>
                <button
                  onClick={() => fetchReport(true)}
                  className="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-copper-light transition-colors"
                  title="Regenerate report"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto px-6 py-6 scroll-smooth"
        >
          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
              <button
                onClick={() => fetchReport(false)}
                className="ml-2 underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Progress animation while streaming (report hidden) */}
          {streaming && (
            <div className="flex flex-col items-center justify-center gap-6 py-16">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-copper-light/20 animate-ping" />
                <div className="relative rounded-full bg-surface-elevated p-4">
                  <Sparkles className="h-8 w-8 text-copper-light" />
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  Preparing report for {companyName}
                </p>
                <p className="mt-2 text-xs text-muted transition-all duration-500">
                  {PROGRESS_STAGES[stageIndex].label}
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full max-w-xs">
                <div className="h-1.5 w-full rounded-full bg-surface-elevated overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-copper-600 to-copper-light transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-1.5 text-center text-xs text-muted">
                  {Math.round(progress)}%
                </p>
              </div>
            </div>
          )}

          {/* Empty state — no report yet, not streaming */}
          {!report && !error && !streaming && (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
              <Sparkles className="h-8 w-8 text-muted" />
              <p className="text-sm text-muted">
                Click to generate an AI research report
              </p>
            </div>
          )}

          {/* Completed report — tabbed view */}
          {report && !streaming && (
            <ReportView markdown={report} />
          )}
        </div>
      </div>
    </>
  );
}
