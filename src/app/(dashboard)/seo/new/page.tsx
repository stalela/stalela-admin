"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SeoEditor } from "@/components/SeoEditor";

function SeoNewInner() {
  const searchParams = useSearchParams();
  const defaultPath = searchParams.get("path") ?? "";
  return <SeoEditor defaultPath={defaultPath} />;
}

export default function NewSeoOverridePage() {
  return (
    <Suspense fallback={<div className="text-muted p-8">Loading…</div>}>
      <SeoNewInner />
    </Suspense>
  );
}
