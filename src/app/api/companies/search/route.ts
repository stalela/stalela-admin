import { NextRequest, NextResponse } from "next/server";
import { companiesApi } from "@/lib/api";

export const dynamic = "force-dynamic";

/** GET /api/companies/search?q=...&limit=10 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const q = sp.get("q") || "";
  const limit = Math.min(Number(sp.get("limit")) || 10, 20);

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await companiesApi.search(q, limit);
    return NextResponse.json({ results });
  } catch (err) {
    console.error("Company search error:", err);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
