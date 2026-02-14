"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, X } from "lucide-react";
import { Button } from "@/components/Button";
import { Input, Textarea } from "@/components/FormFields";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import type { SeoOverride } from "@stalela/commons/types";

interface SeoEditorProps {
  override?: SeoOverride;
  defaultPath?: string;
}

export function SeoEditor({ override, defaultPath }: SeoEditorProps) {
  const router = useRouter();
  const [pagePath, setPagePath] = useState(override?.page_path ?? defaultPath ?? "");
  const [titleOverride, setTitleOverride] = useState(override?.title_override ?? "");
  const [metaDescription, setMetaDescription] = useState(override?.meta_description ?? "");
  const [keywords, setKeywords] = useState<string[]>(override?.keywords ?? []);
  const [keywordInput, setKeywordInput] = useState("");
  const [ogImageUrl, setOgImageUrl] = useState(override?.og_image_url ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function addKeyword() {
    const kw = keywordInput.trim().toLowerCase();
    if (kw && !keywords.includes(kw)) {
      setKeywords([...keywords, kw]);
    }
    setKeywordInput("");
  }

  function removeKeyword(kw: string) {
    setKeywords(keywords.filter((k) => k !== kw));
  }

  function handleKeywordKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addKeyword();
    }
  }

  async function handleSave() {
    if (!pagePath) {
      setError("Page path is required");
      return;
    }
    setError("");
    setSaving(true);

    try {
      const res = await fetch("/api/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_path: pagePath,
          title_override: titleOverride || null,
          meta_description: metaDescription || null,
          keywords,
          og_image_url: ogImageUrl || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to save");
      }

      router.push("/seo");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/seo"
            className="rounded-md p-2 text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-lg font-semibold text-foreground">
            {override ? "Edit SEO Override" : "New SEO Override"}
          </h1>
        </div>
        <Button onClick={handleSave} disabled={saving || !pagePath}>
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Page & Meta
          </h3>
          <div className="space-y-4">
            <Input
              label="Page Path"
              id="path"
              value={pagePath}
              onChange={(e) => setPagePath(e.target.value)}
              placeholder="/services/company-registration"
              disabled={!!override}
            />
            <Input
              label="Title Override"
              id="title"
              value={titleOverride}
              onChange={(e) => setTitleOverride(e.target.value)}
              placeholder="Custom page title..."
            />
            <Textarea
              label="Meta Description"
              id="description"
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              rows={3}
              placeholder="Custom meta description for search engines..."
            />
            <Input
              label="OG Image URL"
              id="ogimage"
              value={ogImageUrl}
              onChange={(e) => setOgImageUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Keywords
          </h3>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                id="keyword-input"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={handleKeywordKeyDown}
                placeholder="Type keyword + Enter"
                className="flex-1"
              />
              <Button variant="secondary" onClick={addKeyword} size="md">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 min-h-[40px]">
              {keywords.map((kw) => (
                <Badge key={kw} variant="copper" className="flex items-center gap-1">
                  {kw}
                  <button
                    onClick={() => removeKeyword(kw)}
                    className="ml-0.5 hover:text-danger transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {keywords.length === 0 && (
                <p className="text-xs text-muted">
                  No keywords added yet. Type a keyword and press Enter.
                </p>
              )}
            </div>
            <p className="text-xs text-muted">
              {keywords.length} keyword{keywords.length !== 1 ? "s" : ""}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
