import { NextRequest, NextResponse } from "next/server";
import { platformsApi } from "@/lib/api";

export const dynamic = "force-dynamic";

/** DELETE /api/marketing/connections/[id] — disconnect a platform */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await platformsApi.disconnect(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[connections] DELETE error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
