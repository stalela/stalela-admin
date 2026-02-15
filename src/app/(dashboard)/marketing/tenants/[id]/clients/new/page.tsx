import { ClientCompanyEditor } from "@/components/ClientCompanyEditor";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function NewClientPage({ params }: PageProps) {
  const { id } = await params;
  return <ClientCompanyEditor mode="create" tenantId={id} />;
}
