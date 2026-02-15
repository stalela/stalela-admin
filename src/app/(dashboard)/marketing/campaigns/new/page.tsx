import { tenantsApi } from "@/lib/api";
import { CampaignEditor } from "@/components/CampaignEditor";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ tenant_id?: string }>;
}

export default async function NewCampaignPage({ searchParams }: PageProps) {
  const { tenant_id } = await searchParams;

  if (!tenant_id) {
    return (
      <div className="text-sm text-muted">
        Missing tenant_id query parameter.
      </div>
    );
  }

  const { clients } = await tenantsApi.listClients(tenant_id, { limit: 100 });

  return (
    <CampaignEditor mode="create" tenantId={tenant_id} clients={clients} />
  );
}
