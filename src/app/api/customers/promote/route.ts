import { NextRequest, NextResponse } from "next/server";
import { customersApi } from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.lead_id) {
      return NextResponse.json(
        { error: "lead_id is required." },
        { status: 400 }
      );
    }
    const customer = await customersApi.promoteFromLead(
      body.lead_id,
      body.overrides
    );
    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error("[admin/customers] Promote error:", error);
    return NextResponse.json(
      { error: "Failed to promote lead to customer" },
      { status: 500 }
    );
  }
}
