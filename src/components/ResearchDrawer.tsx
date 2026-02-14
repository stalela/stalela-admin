"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { X, RefreshCw, Sparkles, Clock, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ReportView } from "@/components/ReportView";

interface ResearchDrawerProps {
  companyId: string;
  companyName: string;
  open: boolean;
  onClose: () => void;
}

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
  const [hasLoaded, setHasLoaded] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

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
          setHasLoaded(true);
          return;
        }

        // Streaming SSE response
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
                setReport(accumulated);
              }
            } catch {
              // Skip malformed chunks
            }
          }
        }

        setHasLoaded(true);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Failed to generate report");
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [companyId]
  );

  // Auto-fetch on first open
  useEffect(() => {
    if (open && !hasLoaded && !streaming) {
      fetchReport(false);
    }
  }, [open, hasLoaded, streaming, fetchReport]);

  // Auto-scroll while streaming
  useEffect(() => {
    if (streaming && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [report, streaming]);

  // Abort on close/unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
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
                Researching…
              </span>
            )}
            {cached && cachedAt && (
              <span className="flex items-center gap-1 text-xs text-muted">
                <Clock className="h-3 w-3" />
                {new Date(cachedAt).toLocaleDateString()}
              </span>
            )}
            {hasLoaded && !streaming && (
              <button
                onClick={() => fetchReport(true)}
                className="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-copper-light transition-colors"
                title="Regenerate report"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
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

          {!report && !error && streaming && (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
              <div className="relative">
                <Sparkles className="h-8 w-8 text-copper-light animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Researching {companyName}…
                </p>
                <p className="mt-1 text-xs text-muted">
                  Searching the web for current intelligence. This may take 30-60 seconds.
                </p>
              </div>
            </div>
          )}

          {!report && !error && !streaming && !hasLoaded && (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
              <Sparkles className="h-8 w-8 text-muted" />
              <p className="text-sm text-muted">
                Click to generate an AI research report
              </p>
            </div>
          )}

          {report && streaming && (
            <article className="prose prose-invert prose-sm max-w-none prose-headings:text-foreground prose-headings:font-semibold prose-h2:text-base prose-h2:border-b prose-h2:border-border prose-h2:pb-2 prose-h2:mt-6 prose-h2:mb-3 prose-p:text-muted prose-p:leading-relaxed prose-li:text-muted prose-strong:text-foreground prose-a:text-copper-light prose-a:no-underline hover:prose-a:underline prose-code:text-copper-light prose-code:bg-surface-elevated prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-surface-elevated prose-pre:border prose-pre:border-border">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {report}
              </ReactMarkdown>
              <span className="inline-block h-4 w-1.5 animate-pulse rounded-sm bg-copper-light ml-0.5" />
            </article>
          )}

          {report && !streaming && (
            <ReportView markdown={report} />
          )}
        </div>
      </div>
    </>
  );
}
