"use client";

import { useRouter } from "next/navigation";
import { Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import type { BlogPost } from "@stalela/commons/types";

export function BlogActions({ post }: { post: BlogPost }) {
  const router = useRouter();

  async function handleTogglePublish() {
    await fetch(`/api/blog/${post.slug}/toggle`, { method: "POST" });
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    await fetch(`/api/blog/${post.slug}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleTogglePublish}
        title={post.published ? "Unpublish" : "Publish"}
        className="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
      >
        {post.published ? (
          <EyeOff className="h-3.5 w-3.5" />
        ) : (
          <Eye className="h-3.5 w-3.5" />
        )}
      </button>
      <Link
        href={`/blog/${post.slug}/edit`}
        className="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
        title="Edit"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Link>
      <button
        onClick={handleDelete}
        title="Delete"
        className="rounded-md p-1.5 text-muted hover:bg-danger/10 hover:text-danger transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
