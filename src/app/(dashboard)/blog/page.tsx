import Link from "next/link";
import { Plus } from "lucide-react";
import { blogApi } from "@/lib/api";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { DataTable } from "@/components/DataTable";
import { BlogActions } from "./BlogActions";
import type { BlogPost } from "@stalela/commons/types";

export const dynamic = "force-dynamic";

export default async function BlogListPage() {
  const posts = await blogApi.list();

  const columns = [
    {
      key: "title",
      label: "Title",
      render: (post: BlogPost) => (
        <div>
          <Link
            href={`/blog/${post.slug}`}
            className="font-medium text-foreground hover:text-copper-light transition-colors"
          >
            {post.title}
          </Link>
          <p className="text-xs text-muted mt-0.5">/{post.slug}</p>
        </div>
      ),
    },
    {
      key: "author",
      label: "Author",
      className: "hidden sm:table-cell",
      render: (post: BlogPost) => (
        <span className="text-sm text-muted">{post.author}</span>
      ),
    },
    {
      key: "published",
      label: "Status",
      render: (post: BlogPost) => (
        <Badge variant={post.published ? "success" : "warning"}>
          {post.published ? "Published" : "Draft"}
        </Badge>
      ),
    },
    {
      key: "updated_at",
      label: "Updated",
      className: "hidden md:table-cell",
      render: (post: BlogPost) => (
        <span className="text-xs text-muted">
          {new Date(post.updated_at).toLocaleDateString("en-ZA", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "w-24",
      render: (post: BlogPost) => <BlogActions post={post} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Blog Posts</h1>
          <p className="text-sm text-muted">
            {posts.length} post{posts.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link href="/blog/new">
          <Button>
            <Plus className="h-4 w-4" />
            New Post
          </Button>
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={posts}
        keyField="id"
        emptyMessage="No blog posts yet. Create your first one!"
      />
    </div>
  );
}
