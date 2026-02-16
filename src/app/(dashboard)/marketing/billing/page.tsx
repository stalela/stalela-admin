import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getTenantContext, isTenantUser } from "@/lib/tenant-context";
import { tenantsApi, leadGenApi } from "@/lib/api";
import BillingPage from "@/components/BillingPage";

export const dynamic = "force-dynamic";

export default async function BillingRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const ctx = await getTenantContext(user.id);

  if (!isTenantUser(ctx.role) || !ctx.tenantId) {
    redirect("/marketing");
  }

  let plan = "free";
  let settings: Record<string, unknown> = {};
  let monthlyUsage = 0;

  try {
    const tenant = await tenantsApi.getById(ctx.tenantId);
    plan = tenant.plan || "free";
    settings = (tenant.settings ?? {}) as Record<string, unknown>;
  } catch {
    // skip
  }

  try {
    monthlyUsage = await leadGenApi.countMonthly(ctx.tenantId);
  } catch {
    // skip
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Billing</h1>
        <p className="mt-1 text-sm text-muted">
          Manage your subscription and view your usage.
        </p>
      </div>

      <BillingPage
        plan={plan}
        monthlyUsage={monthlyUsage}
        hasStripeCustomer={!!settings.stripe_customer_id}
      />
    </div>
  );
}
