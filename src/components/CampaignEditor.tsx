"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/Button";
import { Input, Textarea, Select } from "@/components/FormFields";
import { Card } from "@/components/Card";
import type { Campaign, ClientCompany } from "@stalela/commons/types";

interface CampaignEditorProps {
  campaign?: Campaign;
  tenantId: string;
  clients: ClientCompany[];
  mode: "create" | "edit";
}

export function CampaignEditor({
  campaign,
  tenantId,
  clients,
  mode,
}: CampaignEditorProps) {
  const router = useRouter();
  const [name, setName] = useState(campaign?.name ?? "");
  const [objective, setObjective] = useState(campaign?.objective ?? "");
  const [platform, setPlatform] = useState(campaign?.platform ?? "generic");
  const [status, setStatus] = useState(campaign?.status ?? "draft");
  const [clientCompanyId, setClientCompanyId] = useState(
    campaign?.client_company_id ?? ""
  );
  const [budget, setBudget] = useState(
    campaign?.budget?.toString() ?? ""
  );
  const [currency, setCurrency] = useState(campaign?.currency ?? "ZAR");
  const [startDate, setStartDate] = useState(campaign?.start_date ?? "");
  const [endDate, setEndDate] = useState(campaign?.end_date ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!name) {
      setError("Campaign name is required");
      return;
    }
    setError("");
    setSaving(true);

    try {
      const payload = {
        tenant_id: tenantId,
        client_company_id: clientCompanyId || null,
        name,
        objective: objective || null,
        platform,
        status,
        budget: budget ? Number(budget) : null,
        currency,
        start_date: startDate || null,
        end_date: endDate || null,
      };

      const url =
        mode === "create"
          ? "/api/marketing/campaigns"
          : `/api/marketing/campaigns/${campaign?.id}`;
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

      if (mode === "create") {
        router.push(`/marketing/tenants/${tenantId}`);
      } else {
        router.push(`/marketing/campaigns/${campaign?.id}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  const backHref =
    mode === "create"
      ? `/marketing/tenants/${tenantId}`
      : `/marketing/campaigns/${campaign?.id}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            className="rounded-md p-2 text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-lg font-semibold text-foreground">
            {mode === "create" ? "New Campaign" : `Edit ${campaign?.name}`}
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
            label="Campaign Name"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Summer Sale 2025"
          />
          <Select
            label="Platform"
            id="platform"
            value={platform}
            onChange={(e) => setPlatform(e.target.value as typeof platform)}
            options={[
              { value: "generic", label: "Generic / Multi-platform" },
              { value: "google", label: "Google Ads" },
              { value: "meta", label: "Meta (Facebook / Instagram)" },
              { value: "linkedin", label: "LinkedIn" },
              { value: "tiktok", label: "TikTok" },
              { value: "x", label: "X (Twitter)" },
            ]}
          />
          <Select
            label="Status"
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            options={[
              { value: "draft", label: "Draft" },
              { value: "active", label: "Active" },
              { value: "paused", label: "Paused" },
              { value: "completed", label: "Completed" },
              { value: "archived", label: "Archived" },
            ]}
          />
          <Select
            label="Client Company"
            id="client_company_id"
            value={clientCompanyId}
            onChange={(e) => setClientCompanyId(e.target.value)}
            options={[
              { value: "", label: "— None —" },
              ...clients.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Budget"
              id="budget"
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="10000"
            />
            <Select
              label="Currency"
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              options={[
                { value: "ZAR", label: "ZAR" },
                { value: "USD", label: "USD" },
                { value: "EUR", label: "EUR" },
                { value: "GBP", label: "GBP" },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              id="start_date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="End Date"
              id="end_date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Textarea
              label="Objective"
              id="objective"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Increase brand awareness and drive conversions for the summer collection…"
              rows={3}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
