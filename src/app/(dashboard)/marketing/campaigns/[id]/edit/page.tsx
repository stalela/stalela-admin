import { campaignsApi, tenantsApi } from "@/lib/api";
import { CampaignEditor } from "@/components/CampaignEditor";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCampaignPage({ params }: PageProps) {
  const { id } = await params;
  const campaign = await campaignsApi.getById(id);
  const { clients } = await tenantsApi.listClients(campaign.tenant_id, {
    limit: 100,
  });

  return (
    <CampaignEditor
      mode="edit"
      campaign={campaign}
      tenantId={campaign.tenant_id}
      clients={clients}
    />
  );
}
