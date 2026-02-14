import { NextRequest, NextResponse } from "next/server";
import { blogApi } from "@/lib/api";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;
    const post = await blogApi.togglePublish(slug);
    return NextResponse.json(post);
  } catch (error) {
    console.error("[admin/blog] Toggle error:", error);
    return NextResponse.json(
      { error: "Failed to toggle publish status" },
      { status: 500 }
    );
  }
}
