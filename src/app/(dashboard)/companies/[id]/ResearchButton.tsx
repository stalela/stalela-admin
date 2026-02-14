"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { ResearchDrawer } from "@/components/ResearchDrawer";

interface ResearchButtonProps {
  companyId: string;
  companyName: string;
}

export function ResearchButton({ companyId, companyName }: ResearchButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted hover:bg-surface-hover hover:text-copper-light transition-colors"
      >
        <Sparkles className="h-4 w-4" />
        Research
      </button>

      <ResearchDrawer
        companyId={companyId}
        companyName={companyName}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
