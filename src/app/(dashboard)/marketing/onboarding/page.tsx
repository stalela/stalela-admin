import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getTenantContext, isTenantUser } from "@/lib/tenant-context";
import { tenantsApi, auditsApi } from "@/lib/api";
import OnboardingWizard from "@/components/OnboardingWizard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const ctx = await getTenantContext(user.id);

  if (!isTenantUser(ctx.role) || !ctx.tenantId) {
    // Internal admins don't onboard — send to marketing dashboard
    redirect("/marketing");
  }

  // If tenant already completed onboarding, redirect to marketing dashboard
  const tenant = await tenantsApi.getById(ctx.tenantId);
  if (tenant?.onboarding_status === "complete") {
    // Check if they have an audit report to show
    const latest = await auditsApi.getLatest(ctx.tenantId);
    if (latest) {
      redirect(`/marketing/reports/${latest.id}`);
    }
    redirect("/marketing");
  }

  const tenantName = tenant?.name ?? "Lalela Marketing";

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-surface p-8">
        <OnboardingWizard tenantId={ctx.tenantId} tenantName={tenantName} />
      </div>
    </div>
  );
}
