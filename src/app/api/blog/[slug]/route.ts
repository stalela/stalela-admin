import { NextRequest, NextResponse } from "next/server";
import { blogApi } from "@/lib/api";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const post = await blogApi.getBySlug(slug);
    return NextResponse.json(post);
  } catch (error) {
    console.error("[admin/blog] Fetch error:", error);
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const post = await blogApi.update(slug, body);
    return NextResponse.json(post);
  } catch (error) {
    console.error("[admin/blog] Update error:", error);
    return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    await blogApi.delete(slug);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin/blog] Delete error:", error);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
