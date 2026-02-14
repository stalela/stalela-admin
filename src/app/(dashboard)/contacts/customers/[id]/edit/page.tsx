import { notFound } from "next/navigation";
import { customersApi } from "@/lib/api";
import { CustomerEditor } from "@/components/CustomerEditor";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditCustomerPage({ params }: Props) {
  const { id } = await params;

  let customer;
  try {
    customer = await customersApi.getById(id);
  } catch {
    notFound();
  }

  return <CustomerEditor customer={customer} mode="edit" />;
}
