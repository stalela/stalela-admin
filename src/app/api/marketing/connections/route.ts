import { NextRequest, NextResponse } from "next/server";
import { platformsApi } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/marketing/connections?tenant_id=... */
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.nextUrl.searchParams.get("tenant_id");
    if (!tenantId) {
      return NextResponse.json(
        { error: "tenant_id is required" },
        { status: 400 }
      );
    }

    const connections = await platformsApi.list(tenantId);
    return NextResponse.json(connections);
  } catch (e) {
    console.error("[connections] GET error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/** POST /api/marketing/connections — upsert a connection */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenant_id, platform, account_name, external_account_id } = body as {
      tenant_id: string;
      platform: string;
      account_name?: string;
      external_account_id?: string;
    };

    if (!tenant_id || !platform) {
      return NextResponse.json(
        { error: "tenant_id and platform are required" },
        { status: 400 }
      );
    }

    const connection = await platformsApi.upsert({
      tenant_id,
      platform: platform as "google" | "meta" | "linkedin" | "tiktok" | "x" | "generic",
      status: "connected",
      account_name: account_name || null,
      external_account_id: external_account_id || null,
      connected_at: new Date().toISOString(),
    });

    return NextResponse.json(connection, { status: 201 });
  } catch (e) {
    console.error("[connections] POST error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
