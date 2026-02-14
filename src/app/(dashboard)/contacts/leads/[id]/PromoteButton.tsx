"use client";

import { useRouter } from "next/navigation";
import { UserCheck } from "lucide-react";
import { Button } from "@/components/Button";

interface PromoteButtonProps {
  leadId: string;
  leadName: string | null;
  leadEmail: string;
}

export function PromoteButton({ leadId, leadName, leadEmail }: PromoteButtonProps) {
  const router = useRouter();

  async function handlePromote() {
    if (
      !confirm(
        `Promote ${leadName || leadEmail} to a customer?`
      )
    )
      return;

    const res = await fetch("/api/customers/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead_id: leadId }),
    });

    if (res.ok) {
      router.push("/contacts/customers");
      router.refresh();
    }
  }

  return (
    <Button onClick={handlePromote}>
      <UserCheck className="h-4 w-4" />
      Promote to Customer
    </Button>
  );
}
