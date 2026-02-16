import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { tenantsApi } from "@/lib/api";
import type { TenantPlan } from "@stalela/commons/types";

export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/*  POST — Stripe webhook receiver                                     */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[billing/webhook] STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature" },
      { status: 400 }
    );
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[billing/webhook] Signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      /* ── Checkout completed → upgrade to premium ──────────── */
      case "checkout.session.completed": {
        const session = event.data.object;
        const tenantId = session.metadata?.tenant_id;

        if (!tenantId) {
          console.error("[billing/webhook] No tenant_id in session metadata");
          break;
        }

        const subscriptionId = session.subscription;

        // Update tenant plan and store subscription ID
        const tenant = await tenantsApi.getById(tenantId);
        const settings = (tenant.settings ?? {}) as Record<string, unknown>;

        await tenantsApi.update(tenantId, {
          plan: "premium" as TenantPlan,
          settings: {
            ...settings,
            stripe_subscription_id: subscriptionId || null,
            stripe_customer_id:
              settings.stripe_customer_id || session.customer || null,
            premium_activated_at: new Date().toISOString(),
          },
        });

        console.log(
          `[billing/webhook] Tenant ${tenantId} upgraded to premium (sub: ${subscriptionId})`
        );
        break;
      }

      /* ── Subscription deleted → downgrade to free ─────────── */
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const tenantId = subscription.metadata?.tenant_id;

        if (!tenantId) {
          console.error(
            "[billing/webhook] No tenant_id in subscription metadata"
          );
          break;
        }

        const tenant = await tenantsApi.getById(tenantId);
        const settings = (tenant.settings ?? {}) as Record<string, unknown>;

        await tenantsApi.update(tenantId, {
          plan: "free" as TenantPlan,
          settings: {
            ...settings,
            stripe_subscription_id: null,
            premium_cancelled_at: new Date().toISOString(),
          },
        });

        console.log(
          `[billing/webhook] Tenant ${tenantId} downgraded to free (subscription deleted)`
        );
        break;
      }

      /* ── Subscription updated (e.g. payment method change) ── */
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const tenantId = subscription.metadata?.tenant_id;

        if (!tenantId) break;

        // If subscription is no longer active, downgrade
        if (
          subscription.status === "canceled" ||
          subscription.status === "unpaid" ||
          subscription.status === "past_due"
        ) {
          const tenant = await tenantsApi.getById(tenantId);
          const settings = (tenant.settings ?? {}) as Record<string, unknown>;

          const newPlan: TenantPlan =
            subscription.status === "past_due" ? "premium" : "free";

          await tenantsApi.update(tenantId, {
            plan: newPlan,
            status:
              subscription.status === "past_due" ? "suspended" : "active",
            settings: {
              ...settings,
              subscription_status: subscription.status,
            },
          });

          console.log(
            `[billing/webhook] Tenant ${tenantId} subscription status: ${subscription.status}`
          );
        }
        break;
      }

      /* ── Invoice payment failed ─────────────────────────────── */
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subRef = invoice.parent?.subscription_details?.subscription;
        const subscriptionId = typeof subRef === "string" ? subRef : subRef?.id;

        if (subscriptionId) {
          // Look up subscription to get tenant_id
          const sub =
            await stripe.subscriptions.retrieve(subscriptionId);
          const tenantId = sub.metadata?.tenant_id;

          if (tenantId) {
            console.log(
              `[billing/webhook] Payment failed for tenant ${tenantId}`
            );
          }
        }
        break;
      }

      default:
        // Unhandled event type
        break;
    }
  } catch (err) {
    console.error(`[billing/webhook] Error processing ${event.type}:`, err);
    // Return 200 anyway so Stripe doesn't retry indefinitely
  }

  return NextResponse.json({ received: true });
}
