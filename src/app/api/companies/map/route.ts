import { NextRequest, NextResponse } from "next/server";
import { companiesApi } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/companies/map?minLat=&maxLat=&minLng=&maxLng=&source= */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  const minLat = Number(sp.get("minLat"));
  const maxLat = Number(sp.get("maxLat"));
  const minLng = Number(sp.get("minLng"));
  const maxLng = Number(sp.get("maxLng"));
  const source = sp.get("source") || undefined;

  if ([minLat, maxLat, minLng, maxLng].some(isNaN)) {
    return NextResponse.json(
      { error: "minLat, maxLat, minLng, maxLng are required numeric params" },
      { status: 400 }
    );
  }

  try {
    const markers = await companiesApi.boundingBox(
      minLat,
      maxLat,
      minLng,
      maxLng,
      { limit: 5000, source }
    );

    return NextResponse.json({ markers });
  } catch (err) {
    console.error("Map markers error:", err);
    return NextResponse.json(
      { error: "Failed to fetch markers" },
      { status: 500 }
    );
  }
}
