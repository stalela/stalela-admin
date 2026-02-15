"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/Button";
import { Input, Select } from "@/components/FormFields";
import { Card } from "@/components/Card";
import type { Tenant } from "@stalela/commons/types";

interface TenantEditorProps {
  tenant?: Tenant;
  mode: "create" | "edit";
}

export function TenantEditor({ tenant, mode }: TenantEditorProps) {
  const router = useRouter();
  const [name, setName] = useState(tenant?.name ?? "");
  const [slug, setSlug] = useState(tenant?.slug ?? "");
  const [ownerEmail, setOwnerEmail] = useState(tenant?.owner_email ?? "");
  const [plan, setPlan] = useState(tenant?.plan ?? "free");
  const [status, setStatus] = useState(tenant?.status ?? "trial");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Auto-generate slug from name
  function handleNameChange(val: string) {
    setName(val);
    if (mode === "create") {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
      );
    }
  }

  async function handleSave() {
    if (!name || !slug || !ownerEmail) {
      setError("Name, slug, and owner email are required");
      return;
    }
    setError("");
    setSaving(true);

    try {
      const payload = { name, slug, owner_email: ownerEmail, plan, status };
      const url =
        mode === "create"
          ? "/api/marketing/tenants"
          : `/api/marketing/tenants/${tenant?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to save");
      }

      router.push("/marketing/tenants");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/marketing/tenants"
            className="rounded-md p-2 text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-lg font-semibold text-foreground">
            {mode === "create" ? "New Tenant" : `Edit ${tenant?.name}`}
          </h1>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Tenant Name"
            id="name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Acme Marketing Agency"
          />
          <Input
            label="Slug"
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="acme-marketing"
          />
          <Input
            label="Owner Email"
            id="owner_email"
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            placeholder="admin@example.com"
          />
          <Select
            label="Plan"
            id="plan"
            value={plan}
            onChange={(e) => setPlan(e.target.value as typeof plan)}
            options={[
              { value: "free", label: "Free" },
              { value: "premium", label: "Premium" },
              { value: "enterprise", label: "Enterprise" },
            ]}
          />
          <Select
            label="Status"
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            options={[
              { value: "trial", label: "Trial" },
              { value: "active", label: "Active" },
              { value: "suspended", label: "Suspended" },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}
