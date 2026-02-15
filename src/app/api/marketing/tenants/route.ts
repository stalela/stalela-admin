import { NextRequest, NextResponse } from "next/server";
import { tenantsApi } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;
    const offset = searchParams.get("offset") ? Number(searchParams.get("offset")) : undefined;
    const result = await tenantsApi.list({ search, limit, offset });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[admin/marketing/tenants] List error:", error);
    return NextResponse.json({ error: "Failed to list tenants" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name || !body.slug || !body.owner_email) {
      return NextResponse.json(
        { error: "Name, slug, and owner_email are required." },
        { status: 400 }
      );
    }
    const tenant = await tenantsApi.create(body);
    return NextResponse.json(tenant, { status: 201 });
  } catch (error) {
    console.error("[admin/marketing/tenants] Create error:", error);
    return NextResponse.json({ error: "Failed to create tenant" }, { status: 500 });
  }
}
