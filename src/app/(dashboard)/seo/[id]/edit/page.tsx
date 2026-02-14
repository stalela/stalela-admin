import { notFound } from "next/navigation";
import { seoApi } from "@/lib/api";
import { SeoEditor } from "@/components/SeoEditor";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditSeoOverridePage({ params }: Props) {
  const { id } = await params;

  let override;
  try {
    override = await seoApi.getById(id);
  } catch {
    notFound();
  }

  return <SeoEditor override={override} />;
}
