import { NextRequest, NextResponse } from "next/server";
import { tenantsApi } from "@/lib/api";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const result = await tenantsApi.listClients(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[admin/marketing/tenants/clients] List error:", error);
    return NextResponse.json({ error: "Failed to list clients" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json(
        { error: "Client name is required." },
        { status: 400 }
      );
    }
    const client = await tenantsApi.createClient({ ...body, tenant_id: id });
    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("[admin/marketing/tenants/clients] Create error:", error);
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
