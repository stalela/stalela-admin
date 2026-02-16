import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getTenantContext, isTenantUser } from "@/lib/tenant-context";
import { getStripe, getOrCreateStripeCustomer, PREMIUM_PRICE_ZAR } from "@/lib/stripe";
import { tenantsApi } from "@/lib/api";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/*  POST — Create a Stripe Checkout session for Premium upgrade        */
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

    // Check if already premium
    const tenant = await tenantsApi.getById(ctx.tenantId);
    if (tenant.plan === "premium") {
      return NextResponse.json(
        { error: "Already on Premium plan" },
        { status: 400 }
      );
    }

    /* ── Create or retrieve Stripe customer ───────────────────── */
    const customerId = await getOrCreateStripeCustomer(
      ctx.tenantId,
      tenant.owner_email,
      tenant.name
    );

    /* ── Create Checkout session ──────────────────────────────── */
    const stripe = getStripe();

    // Use existing price ID if set, otherwise create price inline
    const priceId = process.env.STRIPE_PRICE_ID;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: "subscription",
      success_url: `${baseUrl}/marketing/billing?success=true`,
      cancel_url: `${baseUrl}/marketing/billing`,
      metadata: { tenant_id: ctx.tenantId },
      subscription_data: {
        metadata: { tenant_id: ctx.tenantId },
      },
      line_items: priceId
        ? [{ price: priceId, quantity: 1 }]
        : [
            {
              price_data: {
                currency: "zar",
                unit_amount: PREMIUM_PRICE_ZAR,
                recurring: { interval: "month" },
                product_data: {
                  name: "Lalela Premium",
                  description:
                    "Unlock all AI-generated leads, 500 leads/month, full contact details & outreach suggestions.",
                },
              },
              quantity: 1,
            },
          ],
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[billing/checkout]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Checkout failed" },
      { status: 500 }
    );
  }
}
