"use client";

import { useState, useMemo } from "react";
import {
  Building2,
  Globe,
  AlertTriangle,
  Mail,
  Phone,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ReportSection {
  heading: string;
  body: string;
}

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
  sections: ReportSection[];
}

/* ------------------------------------------------------------------ */
/*  Section → tab mapping                                              */
/* ------------------------------------------------------------------ */

const ICON_SIZE = "h-4 w-4";

/** Map each known heading to a tab id. Unknown headings go to "overview". */
function tabIdForHeading(h: string): string {
  const lower = h.toLowerCase();
  if (lower.includes("offering") || lower.includes("service"))
    return "overview";
  if (lower.includes("overview") || lower.includes("company"))
    return "overview";
  if (lower.includes("people") || lower.includes("leadership"))
    return "overview";
  if (
    lower.includes("digital") ||
    lower.includes("web") ||
    lower.includes("presence")
  )
    return "digital";
  if (lower.includes("news") || lower.includes("activity")) return "digital";
  if (lower.includes("pain") || lower.includes("challenge")) return "challenges";
  if (lower.includes("strategic") || lower.includes("trajectory") || lower.includes("growth"))
    return "challenges";
  if (lower.includes("email")) return "sales";
  if (lower.includes("call") || lower.includes("script")) return "sales";
  return "overview";
}

const TAB_META: Record<string, { label: string; icon: React.ReactNode }> = {
  overview: { label: "Overview", icon: <Building2 className={ICON_SIZE} /> },
  digital: { label: "Digital Presence", icon: <Globe className={ICON_SIZE} /> },
  challenges: {
    label: "Challenges",
    icon: <AlertTriangle className={ICON_SIZE} />,
  },
  sales: { label: "Sales Tools", icon: <Mail className={ICON_SIZE} /> },
};

const TAB_ORDER = ["overview", "digital", "challenges", "sales"];

/* ------------------------------------------------------------------ */
/*  Parser                                                             */
/* ------------------------------------------------------------------ */

function parseSections(markdown: string): ReportSection[] {
  const sections: ReportSection[] = [];
  // Split on ## headings (not ### or #)
  const parts = markdown.split(/^## /m);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const newlineIdx = trimmed.indexOf("\n");
    if (newlineIdx === -1) {
      // Heading-only section (no body)
      sections.push({ heading: trimmed, body: "" });
    } else {
      sections.push({
        heading: trimmed.slice(0, newlineIdx).trim(),
        body: trimmed.slice(newlineIdx + 1).trim(),
      });
    }
  }

  return sections;
}

function buildTabs(sections: ReportSection[]): Tab[] {
  const buckets: Record<string, ReportSection[]> = {};

  for (const section of sections) {
    const id = tabIdForHeading(section.heading);
    if (!buckets[id]) buckets[id] = [];
    buckets[id].push(section);
  }

  return TAB_ORDER.filter((id) => buckets[id]?.length)
    .map((id) => ({
      id,
      label: TAB_META[id].label,
      icon: TAB_META[id].icon,
      sections: buckets[id],
    }));
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

const proseClasses =
  "prose prose-invert prose-sm max-w-none prose-headings:text-foreground prose-headings:font-semibold prose-h3:text-sm prose-h3:mt-4 prose-h3:mb-2 prose-p:text-muted prose-p:leading-relaxed prose-li:text-muted prose-strong:text-foreground prose-a:text-copper-light prose-a:no-underline hover:prose-a:underline prose-code:text-copper-light prose-code:bg-surface-elevated prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-surface-elevated prose-pre:border prose-pre:border-border";

/** A single section card with heading, body, and optional copy button. */
function SectionCard({
  section,
  showCopy,
}: {
  section: ReportSection;
  showCopy?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(section.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-border bg-surface-elevated/30 p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-foreground">
          {section.heading}
        </h3>
        {showCopy && (
          <button
            onClick={handleCopy}
            className="shrink-0 rounded-md border border-border px-2.5 py-1 text-xs text-muted hover:bg-surface-hover hover:text-copper-light transition-colors flex items-center gap-1.5"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy
              </>
            )}
          </button>
        )}
      </div>
      <article className={proseClasses}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {section.body}
        </ReactMarkdown>
      </article>
    </div>
  );
}

/** Pain-point/challenge section with severity indicators. */
function ChallengeCard({ section }: { section: ReportSection }) {
  // Split body by bold-labelled items (e.g. "**Digital Deficiency:** …" or "Digital Deficiency: …")
  const items = useMemo(() => {
    const lines = section.body.split("\n").filter((l) => l.trim());
    const result: { label: string; description: string }[] = [];

    for (const line of lines) {
      // Match "**Label:** Description" or "Label: Description"
      const match = line.match(
        /^\s*[-*]?\s*\*{0,2}([^*:]+?)\*{0,2}\s*:\s*(.+)$/
      );
      if (match) {
        result.push({ label: match[1].trim(), description: match[2].trim() });
      }
    }

    // Fallback: if we didn't extract any structured items, return nothing
    // and let the default markdown render handle it
    return result;
  }, [section.body]);

  if (items.length === 0) {
    return <SectionCard section={section} />;
  }

  return (
    <div className="rounded-lg border border-border bg-surface-elevated/30 p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">
        {section.heading}
      </h3>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex gap-3 rounded-md border border-border/60 bg-background/50 px-3 py-2.5"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-warning" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {item.label}
              </p>
              <p className="text-xs text-muted mt-0.5 leading-relaxed">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Sales tool section (email/call script) with copy and collapsible sub-parts. */
function SalesCard({ section }: { section: ReportSection }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const isEmail = section.heading.toLowerCase().includes("email");
  const isCall = section.heading.toLowerCase().includes("call");

  const handleCopy = () => {
    navigator.clipboard.writeText(section.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Extract email subject line if present
  const subjectMatch = isEmail
    ? section.body.match(/Subject:\s*(.+)/i)
    : null;

  return (
    <div className="rounded-lg border border-copper-600/30 bg-surface-elevated/30 p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-copper-light transition-colors"
        >
          {isEmail ? (
            <Mail className="h-4 w-4 text-copper-light" />
          ) : isCall ? (
            <Phone className="h-4 w-4 text-copper-light" />
          ) : null}
          {section.heading}
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted" />
          )}
        </button>
        <button
          onClick={handleCopy}
          className="shrink-0 rounded-md border border-copper-600/40 bg-copper-600/10 px-2.5 py-1 text-xs text-copper-light hover:bg-copper-600/20 transition-colors flex items-center gap-1.5"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </button>
      </div>

      {subjectMatch && (
        <div className="mb-3 rounded-md bg-background/60 border border-border/60 px-3 py-2">
          <span className="text-xs text-muted">Subject: </span>
          <span className="text-xs font-medium text-foreground">
            {subjectMatch[1]}
          </span>
        </div>
      )}

      {expanded && (
        <article className={proseClasses}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {section.body}
          </ReactMarkdown>
        </article>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

interface ReportViewProps {
  markdown: string;
}

export function ReportView({ markdown }: ReportViewProps) {
  const tabs = useMemo(() => {
    const sections = parseSections(markdown);
    return buildTabs(sections);
  }, [markdown]);

  const [activeTabId, setActiveTabId] = useState<string>(
    tabs[0]?.id ?? "overview"
  );

  // If active tab doesn't exist in current tabs, reset to first
  const activeTab =
    tabs.find((t) => t.id === activeTabId) ?? tabs[0] ?? null;

  if (!tabs.length) {
    // Fallback: raw markdown if no sections detected
    return (
      <article className={proseClasses}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </article>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border pb-px mb-4 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-t-md px-3 py-2 text-xs font-medium transition-colors ${
              activeTab?.id === tab.id
                ? "border-b-2 border-copper-light text-copper-light bg-surface-elevated/40"
                : "text-muted hover:text-foreground hover:bg-surface-hover"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab && (
        <div className="flex-1 overflow-y-auto space-y-4">
          {activeTab.sections.map((section, i) => {
            const tabId = activeTab.id;

            if (tabId === "challenges") {
              return <ChallengeCard key={i} section={section} />;
            }

            if (tabId === "sales") {
              return <SalesCard key={i} section={section} />;
            }

            return (
              <SectionCard
                key={i}
                section={section}
                showCopy={false}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
