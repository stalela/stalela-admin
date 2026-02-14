import { notFound } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Pencil, Calendar, User } from "lucide-react";
import { blogApi } from "@/lib/api";
import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ViewBlogPostPage({ params }: Props) {
  const { slug } = await params;

  let post;
  try {
    post = await blogApi.getBySlug(slug);
  } catch {
    notFound();
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
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              {post.title}
            </h1>
            <div className="mt-1 flex items-center gap-3 text-xs text-muted">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" /> {post.author}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />{" "}
                {new Date(post.updated_at).toLocaleDateString("en-ZA")}
              </span>
              <Badge variant={post.published ? "success" : "warning"}>
                {post.published ? "Published" : "Draft"}
              </Badge>
            </div>
          </div>
        </div>
        <Link href={`/blog/${post.slug}/edit`}>
          <Button variant="secondary">
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        </Link>
      </div>

      {/* Cover image */}
      {post.cover_image && (
        <div className="overflow-hidden rounded-xl border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.cover_image}
            alt={post.title}
            className="w-full h-64 object-cover"
          />
        </div>
      )}

      {/* Content */}
      <Card className="prose prose-invert max-w-none prose-headings:text-foreground prose-a:text-copper-600 prose-strong:text-foreground">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {post.content}
        </ReactMarkdown>
      </Card>
    </div>
  );
}
