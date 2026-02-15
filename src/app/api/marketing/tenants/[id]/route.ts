import { NextRequest, NextResponse } from "next/server";
import { tenantsApi } from "@/lib/api";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const tenant = await tenantsApi.getById(id);
    return NextResponse.json(tenant);
  } catch (error) {
    console.error("[admin/marketing/tenants] Fetch error:", error);
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const tenant = await tenantsApi.update(id, body);
    return NextResponse.json(tenant);
  } catch (error) {
    console.error("[admin/marketing/tenants] Update error:", error);
    return NextResponse.json({ error: "Failed to update tenant" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await tenantsApi.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin/marketing/tenants] Delete error:", error);
    return NextResponse.json({ error: "Failed to delete tenant" }, { status: 500 });
  }
}
