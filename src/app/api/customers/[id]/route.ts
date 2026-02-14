import { NextRequest, NextResponse } from "next/server";
import { customersApi } from "@/lib/api";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const customer = await customersApi.getById(id);
    return NextResponse.json(customer);
  } catch (error) {
    console.error("[admin/customers] Fetch error:", error);
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const customer = await customersApi.update(id, body);
    return NextResponse.json(customer);
  } catch (error) {
    console.error("[admin/customers] Update error:", error);
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await customersApi.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin/customers] Delete error:", error);
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 });
  }
}
