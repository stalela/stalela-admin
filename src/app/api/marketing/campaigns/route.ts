import { NextRequest, NextResponse } from "next/server";
import { campaignsApi } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenant_id = searchParams.get("tenant_id");
    if (!tenant_id) {
      return NextResponse.json({ error: "tenant_id is required" }, { status: 400 });
    }
    const status = searchParams.get("status") ?? undefined;
    const platform = searchParams.get("platform") ?? undefined;
    const search = searchParams.get("search") ?? undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;
    const offset = searchParams.get("offset") ? Number(searchParams.get("offset")) : undefined;

    const result = await campaignsApi.list(tenant_id, { status, platform, search, limit, offset });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[admin/marketing/campaigns] List error:", error);
    return NextResponse.json({ error: "Failed to list campaigns" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.tenant_id || !body.name) {
      return NextResponse.json(
        { error: "tenant_id and name are required." },
        { status: 400 }
      );
    }
    const campaign = await campaignsApi.create(body);
    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error("[admin/marketing/campaigns] Create error:", error);
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
