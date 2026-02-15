import { NextRequest, NextResponse } from "next/server";
import { chatApi } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenant_id");
    const userId = searchParams.get("user_id");

    if (!tenantId || !userId) {
      return NextResponse.json(
        { error: "tenant_id and user_id are required" },
        { status: 400 }
      );
    }

    const sessions = await chatApi.listSessions(tenantId, userId);
    return NextResponse.json(sessions);
  } catch (e) {
    console.error("[chat-sessions] Error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenant_id, user_id, title } = body as {
      tenant_id: string;
      user_id: string;
      title?: string;
    };

    if (!tenant_id || !user_id) {
      return NextResponse.json(
        { error: "tenant_id and user_id are required" },
        { status: 400 }
      );
    }

    const session = await chatApi.createSession({
      tenant_id,
      user_id,
      title,
    });

    return NextResponse.json(session, { status: 201 });
  } catch (e) {
    console.error("[chat-sessions] Error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
