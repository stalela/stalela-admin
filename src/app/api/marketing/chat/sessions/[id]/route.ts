import { NextRequest, NextResponse } from "next/server";
import { chatApi } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [session, messages] = await Promise.all([
      chatApi.getSession(id),
      chatApi.getMessages(id),
    ]);

    return NextResponse.json({ session, messages });
  } catch (e) {
    console.error("[chat-session] Error:", e);
    return NextResponse.json(
      { error: "Session not found" },
      { status: 404 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await chatApi.deleteSession(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[chat-session] Delete error:", e);
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 }
    );
  }
}
