import { notFound } from "next/navigation";
import { blogApi } from "@/lib/api";
import { BlogEditor } from "@/components/BlogEditor";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function EditBlogPostPage({ params }: Props) {
  const { slug } = await params;

  let post;
  try {
    post = await blogApi.getBySlug(slug);
  } catch {
    notFound();
  }

  return <BlogEditor post={post} mode="edit" />;
}
