import { NextRequest, NextResponse } from "next/server";
import { competitorsApi } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/marketing/competitors?tenant_id=... */
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.nextUrl.searchParams.get("tenant_id");
    if (!tenantId) {
      return NextResponse.json(
        { error: "tenant_id is required" },
        { status: 400 }
      );
    }

    const competitors = await competitorsApi.list(tenantId);
    return NextResponse.json(competitors);
  } catch (e) {
    console.error("[competitors] GET error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/** POST /api/marketing/competitors — create a competitor */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenant_id, name, website, industry, discovered_via, notes } = body as {
      tenant_id: string;
      name: string;
      website?: string;
      industry?: string;
      discovered_via?: string;
      notes?: string;
    };

    if (!tenant_id || !name) {
      return NextResponse.json(
        { error: "tenant_id and name are required" },
        { status: 400 }
      );
    }

    const competitor = await competitorsApi.create({
      tenant_id,
      name,
      website: website || null,
      industry: industry || null,
      discovered_via: (discovered_via as "manual" | "ai_audit" | "ad_library") ?? "manual",
      notes: notes || null,
    });

    return NextResponse.json(competitor, { status: 201 });
  } catch (e) {
    console.error("[competitors] POST error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
