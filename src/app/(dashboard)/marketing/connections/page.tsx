import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getTenantContext, isTenantUser } from "@/lib/tenant-context";
import { platformsApi } from "@/lib/api";
import ConnectionsGrid from "@/components/ConnectionsGrid";
import type { PlatformConnection } from "@stalela/commons/types";

export const dynamic = "force-dynamic";

export default async function ConnectionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const ctx = await getTenantContext(user.id);

  if (!isTenantUser(ctx.role) || !ctx.tenantId) {
    redirect("/marketing");
  }

  let connections: PlatformConnection[] = [];
  try {
    connections = await platformsApi.list(ctx.tenantId);
  } catch {
    // skip
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Platform Connections</h1>
        <p className="mt-1 text-sm text-muted">
          Connect your advertising platforms to sync campaigns and performance data.
        </p>
      </div>

      <ConnectionsGrid tenantId={ctx.tenantId} initialConnections={connections} />
    </div>
  );
}
