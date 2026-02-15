"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/Button";
import { useRouter } from "next/navigation";

const CONTENT_TYPES = [
  { value: "headline", label: "Headlines" },
  { value: "ad_copy", label: "Ad Copy" },
  { value: "description", label: "Descriptions" },
  { value: "cta", label: "Call-to-Actions" },
  { value: "social_post", label: "Social Posts" },
  { value: "image_prompt", label: "Image Prompts" },
] as const;

export function ContentGenerator({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(["headline", "ad_copy"]);
  const [context, setContext] = useState("");
  const [generating, setGenerating] = useState(false);
  const [streamOutput, setStreamOutput] = useState("");
  const [error, setError] = useState("");

  function toggleType(type: string) {
    setSelected((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  async function handleGenerate() {
    if (!selected.length) {
      setError("Select at least one content type");
      return;
    }
    setError("");
    setGenerating(true);
    setStreamOutput("");

    try {
      const res = await fetch(
        `/api/marketing/campaigns/${campaignId}/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId,
            contentTypes: selected,
            context: context || undefined,
            stream: true,
          }),
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Error ${res.status}`);
      }

      // Read SSE stream
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

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
              setStreamOutput((prev) => prev + parsed.content);
            }
            if (parsed.saved) {
              // Content was auto-saved, refresh the page
              router.refresh();
            }
          } catch {
            // skip
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Content type selector */}
      <div>
        <p className="mb-2 text-xs font-medium text-muted">
          Select content types to generate:
        </p>
        <div className="flex flex-wrap gap-2">
          {CONTENT_TYPES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => toggleType(value)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                selected.includes(value)
                  ? "border-copper-600/50 bg-copper-600/20 text-copper-light"
                  : "border-border bg-surface-elevated text-muted hover:border-border-bright hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Optional context */}
      <div className="space-y-1.5">
        <label
          htmlFor="gen-context"
          className="block text-xs font-medium text-muted"
        >
          Additional context (optional)
        </label>
        <textarea
          id="gen-context"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="E.g. target audience details, brand voice guidance, specific product features…"
          rows={2}
          className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:border-copper-600 focus:outline-none focus:ring-1 focus:ring-copper-600/50 transition-colors duration-200 resize-y"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <Button onClick={handleGenerate} disabled={generating}>
        {generating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {generating ? "Generating…" : "Generate Content"}
      </Button>

      {/* Stream output preview */}
      {streamOutput && (
        <div className="rounded-lg border border-border bg-surface-elevated p-4">
          <p className="mb-2 text-xs font-medium text-muted">
            AI Output Preview
          </p>
          <pre className="whitespace-pre-wrap text-sm text-foreground font-mono">
            {streamOutput}
          </pre>
        </div>
      )}
    </div>
  );
}
