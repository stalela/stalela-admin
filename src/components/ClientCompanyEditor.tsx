"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/Button";
import { Input, Textarea } from "@/components/FormFields";
import { Card } from "@/components/Card";
import type { ClientCompany } from "@stalela/commons/types";

interface ClientEditorProps {
  client?: ClientCompany;
  tenantId: string;
  mode: "create" | "edit";
}

export function ClientCompanyEditor({
  client,
  tenantId,
  mode,
}: ClientEditorProps) {
  const router = useRouter();
  const [name, setName] = useState(client?.name ?? "");
  const [industry, setIndustry] = useState(client?.industry ?? "");
  const [website, setWebsite] = useState(client?.website ?? "");
  const [contactName, setContactName] = useState(client?.contact_name ?? "");
  const [contactEmail, setContactEmail] = useState(
    client?.contact_email ?? ""
  );
  const [contactPhone, setContactPhone] = useState(
    client?.contact_phone ?? ""
  );
  const [notes, setNotes] = useState(client?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!name) {
      setError("Company name is required");
      return;
    }
    setError("");
    setSaving(true);

    try {
      const payload = {
        name,
        industry: industry || null,
        website: website || null,
        contact_name: contactName || null,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
        notes: notes || null,
      };

      // Both create and edit go through the tenant clients endpoint
      const url = `/api/marketing/tenants/${tenantId}/clients`;
      const method = "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to save");
      }

      router.push(`/marketing/tenants/${tenantId}`);
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
            href={`/marketing/tenants/${tenantId}`}
            className="rounded-md p-2 text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-lg font-semibold text-foreground">
            {mode === "create" ? "New Client Company" : `Edit ${client?.name}`}
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
            label="Company Name"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Client Company Ltd"
          />
          <Input
            label="Industry"
            id="industry"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="Retail, SaaS, Real Estate…"
          />
          <Input
            label="Website"
            id="website"
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://example.com"
          />
          <Input
            label="Contact Name"
            id="contact_name"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="John Doe"
          />
          <Input
            label="Contact Email"
            id="contact_email"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="john@example.com"
          />
          <Input
            label="Contact Phone"
            id="contact_phone"
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="+27 11 123 4567"
          />
          <div className="sm:col-span-2">
            <Textarea
              label="Notes"
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details about this client…"
              rows={3}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
