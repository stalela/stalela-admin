import { NextRequest, NextResponse } from "next/server";
import { blogApi } from "@/lib/api";

export async function GET() {
  try {
    const posts = await blogApi.list();
    return NextResponse.json(posts);
  } catch (error) {
    console.error("[admin/blog] List error:", error);
    return NextResponse.json({ error: "Failed to list posts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.title || !body.slug || !body.content) {
      return NextResponse.json(
        { error: "Title, slug, and content are required." },
        { status: 400 }
      );
    }

    const post = await blogApi.create(body);
    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("[admin/blog] Create error:", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
