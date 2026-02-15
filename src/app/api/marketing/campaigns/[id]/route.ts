import { NextRequest, NextResponse } from "next/server";
import { campaignsApi } from "@/lib/api";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const campaign = await campaignsApi.getById(id);
    return NextResponse.json(campaign);
  } catch (error) {
    console.error("[admin/marketing/campaigns] Fetch error:", error);
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const campaign = await campaignsApi.update(id, body);
    return NextResponse.json(campaign);
  } catch (error) {
    console.error("[admin/marketing/campaigns] Update error:", error);
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await campaignsApi.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin/marketing/campaigns] Delete error:", error);
    return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 });
  }
}
