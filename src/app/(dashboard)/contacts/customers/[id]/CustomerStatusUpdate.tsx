"use client";

import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/Card";

interface CustomerStatusUpdateProps {
  customerId: string;
  currentStatus: string;
}

const statuses = [
  { value: "prospect", label: "Prospect", color: "bg-warning" },
  { value: "active", label: "Active", color: "bg-success" },
  { value: "inactive", label: "Inactive", color: "bg-muted" },
];

export function CustomerStatusUpdate({
  customerId,
  currentStatus,
}: CustomerStatusUpdateProps) {
  const router = useRouter();

  async function handleStatusChange(status: string) {
    await fetch(`/api/customers/${customerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status</CardTitle>
      </CardHeader>
      <div className="flex gap-2">
        {statuses.map((s) => (
          <button
            key={s.value}
            onClick={() => handleStatusChange(s.value)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
              currentStatus === s.value
                ? "border-copper-600/30 bg-copper-600/10 text-copper-light"
                : "border-border text-muted hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${s.color}`} />
            {s.label}
          </button>
        ))}
      </div>
    </Card>
  );
}
