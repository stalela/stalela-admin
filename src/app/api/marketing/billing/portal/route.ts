import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getTenantContext, isTenantUser } from "@/lib/tenant-context";
import { getStripe } from "@/lib/stripe";
import { tenantsApi } from "@/lib/api";

export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/*  POST — Create a Stripe Customer Portal session                     */
/* ------------------------------------------------------------------ */

export async function POST() {
  try {
    /* ── Auth ─────────────────────────────────────────────────── */
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

    const tenant = await tenantsApi.getById(ctx.tenantId);
    const settings = (tenant.settings ?? {}) as Record<string, unknown>;
    const customerId = settings.stripe_customer_id as string | undefined;

    if (!customerId) {
      return NextResponse.json(
        { error: "No billing account found. Please upgrade first." },
        { status: 400 }
      );
    }

    /* ── Create portal session ────────────────────────────────── */
    const stripe = getStripe();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/marketing/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[billing/portal]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Portal session failed" },
      { status: 500 }
    );
  }
}
