import { NextRequest, NextResponse } from "next/server";
import { customersApi } from "@/lib/api";

export async function GET() {
  try {
    const result = await customersApi.list({ limit: 100 });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[admin/customers] List error:", error);
    return NextResponse.json({ error: "Failed to list customers" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name || !body.email) {
      return NextResponse.json(
        { error: "Name and email are required." },
        { status: 400 }
      );
    }
    const customer = await customersApi.create(body);
    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error("[admin/customers] Create error:", error);
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
  }
}
