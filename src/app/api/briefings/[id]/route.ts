import { NextRequest, NextResponse } from "next/server";
import { briefingsApi } from "@/lib/api";

export const dynamic = "force-dynamic";

/** PATCH /api/briefings/[id] — update status, email draft, etc. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // If marking as reviewed, set reviewed_at
    if (body.status === "reviewed" && !body.reviewed_at) {
      body.reviewed_at = new Date().toISOString();
    }

    await briefingsApi.update(id, body);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[briefings] PATCH error:", e);
    return NextResponse.json(
      { error: "Failed to update briefing" },
      { status: 500 }
    );
  }
}
