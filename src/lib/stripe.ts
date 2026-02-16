/**
 * Stripe integration utilities.
 * Lazy-initialised so imports don't crash during `next build`
 * when env vars may not yet be available.
 */
import Stripe from "stripe";
import { tenantsApi } from "@/lib/api";

/* ── Constants ────────────────────────────────────────────────── */

/** 300 ZAR in cents */
export const PREMIUM_PRICE_ZAR = 30000;

/** Free-tier: only 3 leads visible per generation (rest blurred) */
export const FREE_VISIBLE_LEADS = 3;

/** Premium monthly lead generation cap */
export const PREMIUM_MONTHLY_LEAD_CAP = 500;

/* ── Lazy Stripe client ───────────────────────────────────────── */

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
    _stripe = new Stripe(key, { apiVersion: "2026-01-28.clover" });
  }
  return _stripe;
}

/* ── Helpers ──────────────────────────────────────────────────── */

/**
 * Get or create a Stripe customer for a tenant.
 * Stores `stripe_customer_id` in `tenant.settings` for future lookups.
 */
export async function getOrCreateStripeCustomer(
  tenantId: string,
  email: string,
  name: string
): Promise<string> {
  // Check if tenant already has a Stripe customer
  const tenant = await tenantsApi.getById(tenantId);
  const settings = (tenant.settings ?? {}) as Record<string, unknown>;

  if (settings.stripe_customer_id) {
    return settings.stripe_customer_id as string;
  }

  // Create new Stripe customer
  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { tenant_id: tenantId },
  });

  // Save back to tenant settings
  await tenantsApi.update(tenantId, {
    settings: { ...settings, stripe_customer_id: customer.id },
  });

  return customer.id;
}
