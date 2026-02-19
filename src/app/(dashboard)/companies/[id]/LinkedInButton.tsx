"use client";

import { useState } from "react";
import { LinkedInDrawer } from "@/components/LinkedInDrawer";

interface LinkedInButtonProps {
  companyId: string;
  companyName: string;
}

/** Inline LinkedIn SVG icon — lucide-react doesn't include LinkedIn. */
function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="LinkedIn"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

export function LinkedInButton({ companyId, companyName }: LinkedInButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted hover:bg-surface-hover hover:text-[#0A66C2] transition-colors"
        title="Find LinkedIn profile"
      >
        <LinkedInIcon className="h-4 w-4" />
        LinkedIn
      </button>

      <LinkedInDrawer
        companyId={companyId}
        companyName={companyName}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
