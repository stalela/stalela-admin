import { NextRequest, NextResponse } from "next/server";
import { briefingsApi } from "@/lib/api";
import type { BriefingStatus } from "@stalela/commons/types";

export const dynamic = "force-dynamic";

/** GET /api/briefings?date=YYYY-MM-DD&status=pending */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date =
      searchParams.get("date") || new Date().toISOString().slice(0, 10);
    const status = searchParams.get("status") as BriefingStatus | null;

    const [briefings, stats, dates] = await Promise.all([
      briefingsApi.listByDate(date, status || undefined),
      briefingsApi.statsForDate(date),
      briefingsApi.listDates(14),
    ]);

    return NextResponse.json({
      date,
      ...briefings,
      stats,
      availableDates: dates,
    });
  } catch (e) {
    console.error("[briefings] GET error:", e);
    return NextResponse.json(
      { error: "Failed to fetch briefings" },
      { status: 500 }
    );
  }
}
