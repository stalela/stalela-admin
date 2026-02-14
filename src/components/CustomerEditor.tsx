"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/Button";
import { Input, Textarea, Select } from "@/components/FormFields";
import { Card } from "@/components/Card";
import type { Customer } from "@stalela/commons/types";

interface CustomerEditorProps {
  customer?: Customer;
  mode: "create" | "edit";
}

export function CustomerEditor({ customer, mode }: CustomerEditorProps) {
  const router = useRouter();
  const [name, setName] = useState(customer?.name ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [company, setCompany] = useState(customer?.company ?? "");
  const [status, setStatus] = useState(customer?.status ?? "prospect");
  const [notes, setNotes] = useState(customer?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!name || !email) {
      setError("Name and email are required");
      return;
    }
    setError("");
    setSaving(true);

    try {
      const payload = {
        name,
        email,
        phone: phone || null,
        company: company || null,
        status,
        notes: notes || null,
      };

      const url =
        mode === "create"
          ? "/api/customers"
          : `/api/customers/${customer?.id}`;
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

      router.push("/contacts/customers");
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
            href="/contacts/customers"
            className="rounded-md p-2 text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-lg font-semibold text-foreground">
            {mode === "create" ? "New Customer" : `Edit: ${customer?.name}`}
          </h1>
        </div>
        <Button onClick={handleSave} disabled={saving || !name || !email}>
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Contact Details
          </h3>
          <div className="space-y-4">
            <Input
              label="Name"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              required
            />
            <Input
              label="Email"
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
            />
            <Input
              label="Phone"
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+27..."
            />
            <Input
              label="Company"
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company name"
            />
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 text-sm font-semibold text-foreground">
            Status & Notes
          </h3>
          <div className="space-y-4">
            <Select
              label="Status"
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as Customer["status"])}
              options={[
                { value: "prospect", label: "Prospect" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
            />
            <Textarea
              label="Notes"
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
              placeholder="Internal notes about this customer..."
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
