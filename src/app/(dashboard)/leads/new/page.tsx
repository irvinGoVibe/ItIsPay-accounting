"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { LEAD_CLASSIFICATIONS, CLASSIFICATION_LABELS } from "@/lib/utils";

export default function NewLeadPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    role: "",
    classification: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email) return;

    setSaving(true);
    try {
      const payload = {
        ...form,
        classification: form.classification || null,
      };
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const lead = await res.json();
        toast("Lead created successfully");
        router.push(`/leads/${lead.id}`);
      } else {
        toast("Failed to create lead", "error");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <Link
        href="/leads"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Leads
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>New Lead</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="John Doe"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Email <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="john@company.com"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Company</label>
              <Input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="Acme Inc."
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Type</label>
              <select
                value={form.classification}
                onChange={(e) => setForm({ ...form, classification: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select type...</option>
                {LEAD_CLASSIFICATIONS.map((c) => (
                  <option key={c} value={c}>{CLASSIFICATION_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Phone</label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Role</label>
              <Input
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                placeholder="CTO, Head of Payments, etc."
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={saving || !form.name || !form.email}>
                {saving ? "Creating..." : "Create Lead"}
              </Button>
              <Link href="/leads">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
