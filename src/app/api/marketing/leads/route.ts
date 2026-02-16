import { NextRequest, NextResponse } from "next/server";
import { leadGenApi } from "@/lib/api";
import { createClient } from "@/lib/supabase-server";
import { getTenantContext, isTenantUser } from "@/lib/tenant-context";

export const dynamic = "force-dynamic";

/* ── GET — list generated leads for current tenant ─────────── */

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await getTenantContext(user.id);
    if (!isTenantUser(ctx.role) || !ctx.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get("status") || undefined;

    const { leads, total } = await leadGenApi.list(ctx.tenantId, { status });

    return NextResponse.json({ leads, total });
  } catch (e) {
    console.error("[lead-gen-list]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/* ── PATCH — update lead status / notes ────────────────────── */

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await getTenantContext(user.id);
    if (!isTenantUser(ctx.role) || !ctx.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, status, notes } = (await request.json()) as {
      id: string;
      status?: string;
      notes?: string;
    };

    if (!id) {
      return NextResponse.json(
        { error: "lead id is required" },
        { status: 400 }
      );
    }

    // Verify the lead belongs to this tenant
    const lead = await leadGenApi.getById(id);
    if (lead.tenant_id !== ctx.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await leadGenApi.update(id, {
      ...(status ? { status: status as "new" | "contacted" | "qualified" | "rejected" } : {}),
      ...(notes !== undefined ? { notes } : {}),
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error("[lead-gen-update]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/* ── DELETE — remove a generated lead ──────────────────────── */

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ctx = await getTenantContext(user.id);
    if (!isTenantUser(ctx.role) || !ctx.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "lead id is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const lead = await leadGenApi.getById(id);
    if (lead.tenant_id !== ctx.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await leadGenApi.delete(id);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[lead-gen-delete]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 }
    );
  }
}
