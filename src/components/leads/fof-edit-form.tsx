"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import type { FlowOfFundsRecord } from "./fof-display";

interface FofEditFormProps {
  currentFof: FlowOfFundsRecord | null;
  leadId: string;
  onSaved: () => void;
  onCancel: () => void;
}

export function FofEditForm({ currentFof, leadId, onSaved, onCancel }: FofEditFormProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    paymentDirection: currentFof?.paymentDirection || "",
    sourceOfFunds: currentFof?.sourceOfFunds || "",
    destinationOfFunds: currentFof?.destinationOfFunds || "",
    paymentMethods: currentFof?.paymentMethods || "[]",
    currencies: currentFof?.currencies || "[]",
    expectedVolume: currentFof?.expectedVolume || "",
    feeStructure: currentFof?.feeStructure || "",
    settlementTimeline: currentFof?.settlementTimeline || "",
    complianceRequirements: currentFof?.complianceRequirements || "",
    integrationType: currentFof?.integrationType || "",
    riskLevel: currentFof?.riskLevel || "",
    geographicScope: currentFof?.geographicScope || "[]",
    businessModel: currentFof?.businessModel || "",
    keyStakeholders: currentFof?.keyStakeholders || "",
    specialRequirements: currentFof?.specialRequirements || "",
    confidenceScore: currentFof?.confidenceScore ?? 50,
  });

  function parseArrayField(value: string): string {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.join(", ") : value;
    } catch {
      return value;
    }
  }

  function toArrayJson(value: string): string {
    const items = value.split(",").map((s) => s.trim()).filter(Boolean);
    return JSON.stringify(items);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/fof", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          paymentDirection: form.paymentDirection || null,
          sourceOfFunds: form.sourceOfFunds || null,
          destinationOfFunds: form.destinationOfFunds || null,
          paymentMethods: form.paymentMethods,
          currencies: form.currencies,
          expectedVolume: form.expectedVolume || null,
          feeStructure: form.feeStructure || null,
          settlementTimeline: form.settlementTimeline || null,
          complianceRequirements: form.complianceRequirements || null,
          integrationType: form.integrationType || null,
          riskLevel: form.riskLevel || null,
          geographicScope: form.geographicScope,
          businessModel: form.businessModel || null,
          keyStakeholders: form.keyStakeholders || null,
          specialRequirements: form.specialRequirements || null,
          confidenceScore: form.confidenceScore,
        }),
      });
      if (res.ok) onSaved();
    } finally {
      setSaving(false);
    }
  }

  const selectFields = [
    {
      label: "Payment Direction",
      key: "paymentDirection" as const,
      options: ["", "INBOUND", "OUTBOUND", "BOTH"],
    },
    {
      label: "Risk Level",
      key: "riskLevel" as const,
      options: ["", "LOW", "MEDIUM", "HIGH", "CRITICAL"],
    },
    {
      label: "Integration Type",
      key: "integrationType" as const,
      options: ["", "API", "HOSTED_PAGE", "PLUGIN", "WHITE_LABEL"],
    },
    {
      label: "Business Model",
      key: "businessModel" as const,
      options: ["", "MARKETPLACE", "SAAS", "ECOMMERCE", "GAMBLING", "TRAVEL", "FINTECH", "OTHER"],
    },
  ];

  const textFields = [
    { label: "Source of Funds", key: "sourceOfFunds" as const },
    { label: "Destination of Funds", key: "destinationOfFunds" as const },
    { label: "Expected Volume", key: "expectedVolume" as const },
    { label: "Fee Structure", key: "feeStructure" as const },
    { label: "Settlement Timeline", key: "settlementTimeline" as const },
    { label: "Key Stakeholders", key: "keyStakeholders" as const },
  ];

  const arrayFields = [
    { label: "Payment Methods (comma-separated)", key: "paymentMethods" as const },
    { label: "Currencies (comma-separated)", key: "currencies" as const },
    { label: "Geographic Scope (comma-separated)", key: "geographicScope" as const },
  ];

  const textareaFields = [
    { label: "Compliance Requirements", key: "complianceRequirements" as const },
    { label: "Special Requirements", key: "specialRequirements" as const },
  ];

  return (
    <Card className="p-4 space-y-4">
      <h4 className="font-semibold text-gray-900">Edit Flow of Funds</h4>
      <p className="text-xs text-gray-500">Saving creates a new version. Previous versions are preserved.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {selectFields.map(({ label, key, options }) => (
          <div key={key}>
            <label className="text-xs font-medium text-gray-600">{label}</label>
            <select
              value={form[key] as string}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {options.map((o) => (
                <option key={o} value={o}>{o || "Select..."}</option>
              ))}
            </select>
          </div>
        ))}

        {textFields.map(({ label, key }) => (
          <div key={key}>
            <label className="text-xs font-medium text-gray-600">{label}</label>
            <Input
              value={form[key] as string}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              className="mt-1"
            />
          </div>
        ))}

        {arrayFields.map(({ label, key }) => (
          <div key={key}>
            <label className="text-xs font-medium text-gray-600">{label}</label>
            <Input
              value={parseArrayField(form[key] as string)}
              onChange={(e) => setForm((f) => ({ ...f, [key]: toArrayJson(e.target.value) }))}
              className="mt-1"
              placeholder="USD, EUR, GBP"
            />
          </div>
        ))}

        {textareaFields.map(({ label, key }) => (
          <div key={key} className="md:col-span-2">
            <label className="text-xs font-medium text-gray-600">{label}</label>
            <Textarea
              value={form[key] as string}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              className="mt-1"
              rows={2}
            />
          </div>
        ))}

        <div>
          <label className="text-xs font-medium text-gray-600">Confidence Score (0-100)</label>
          <Input
            type="number"
            min={0}
            max={100}
            value={form.confidenceScore}
            onChange={(e) => setForm((f) => ({ ...f, confidenceScore: parseInt(e.target.value) || 0 }))}
            className="mt-1"
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save as New Version"}
        </Button>
      </div>
    </Card>
  );
}
