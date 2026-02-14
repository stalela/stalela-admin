"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Eye, ArrowLeft } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/Button";
import { Input, Textarea } from "@/components/FormFields";
import { Card } from "@/components/Card";
import type { BlogPost } from "@stalela/commons/types";

interface BlogEditorProps {
  post?: BlogPost;
  mode: "create" | "edit";
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function BlogEditor({ post, mode }: BlogEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [author, setAuthor] = useState(post?.author ?? "Stalela");
  const [coverImage, setCoverImage] = useState(post?.cover_image ?? "");
  const [published, setPublished] = useState(post?.published ?? false);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleTitleChange(value: string) {
    setTitle(value);
    if (mode === "create") {
      setSlug(slugify(value));
    }
  }

  async function handleSave() {
    setError("");
    setSaving(true);

    try {
      const payload = {
        title,
        slug,
        content,
        excerpt: excerpt || null,
        author,
        cover_image: coverImage || null,
        published,
      };

      const url =
        mode === "create" ? "/api/blog" : `/api/blog/${post?.slug}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to save");
      }

      router.push("/blog");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/blog"
            className="rounded-md p-2 text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-lg font-semibold text-foreground">
            {mode === "create" ? "New Post" : `Edit: ${post?.title}`}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPreview(!preview)}
          >
            <Eye className="h-4 w-4" />
            {preview ? "Editor" : "Preview"}
          </Button>
          <Button onClick={handleSave} disabled={saving || !title || !content}>
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Main editor */}
        <div className="xl:col-span-2 space-y-4">
          <Input
            label="Title"
            id="title"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Post title..."
          />
          <Input
            label="Slug"
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="post-url-slug"
          />

          {preview ? (
            <Card className="prose prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content || "*Nothing to preview yet...*"}
              </ReactMarkdown>
            </Card>
          ) : (
            <Textarea
              label="Content (Markdown)"
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={24}
              placeholder="Write your post in Markdown..."
              className="font-mono text-sm"
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <h3 className="mb-4 text-sm font-semibold text-foreground">
              Post Settings
            </h3>
            <div className="space-y-4">
              <Textarea
                label="Excerpt"
                id="excerpt"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={3}
                placeholder="Brief summary for listings..."
              />
              <Input
                label="Author"
                id="author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
              />
              <Input
                label="Cover Image URL"
                id="cover"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://..."
              />
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="published"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                  className="h-4 w-4 rounded border-border bg-surface-elevated text-copper-600 focus:ring-copper-600"
                />
                <label
                  htmlFor="published"
                  className="text-sm text-foreground"
                >
                  Publish immediately
                </label>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
