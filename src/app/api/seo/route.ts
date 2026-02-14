import { NextRequest, NextResponse } from "next/server";
import { seoApi } from "@/lib/api";

export async function GET() {
  try {
    const overrides = await seoApi.list();
    return NextResponse.json(overrides);
  } catch (error) {
    console.error("[admin/seo] List error:", error);
    return NextResponse.json({ error: "Failed to list overrides" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.page_path) {
      return NextResponse.json({ error: "page_path is required" }, { status: 400 });
    }
    const override = await seoApi.upsert(body);
    return NextResponse.json(override, { status: 201 });
  } catch (error) {
    console.error("[admin/seo] Upsert error:", error);
    return NextResponse.json({ error: "Failed to save override" }, { status: 500 });
  }
}
