import { NextRequest, NextResponse } from "next/server";
import { competitorsApi } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/marketing/competitors/[id] */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const competitor = await competitorsApi.getById(id);
    return NextResponse.json(competitor);
  } catch (e) {
    console.error("[competitors] GET by ID error:", e);
    return NextResponse.json(
      { error: "Competitor not found" },
      { status: 404 }
    );
  }
}

/** PATCH /api/marketing/competitors/[id] */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const competitor = await competitorsApi.update(id, body);
    return NextResponse.json(competitor);
  } catch (e) {
    console.error("[competitors] PATCH error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/** DELETE /api/marketing/competitors/[id] */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await competitorsApi.delete(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[competitors] DELETE error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
