"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

interface FlowOfFundsRecord {
  id: string;
  version: number;
  trigger: string;
  paymentDirection: string | null;
  sourceOfFunds: string | null;
  destinationOfFunds: string | null;
  paymentMethods: string | null;
  currencies: string | null;
  expectedVolume: string | null;
  feeStructure: string | null;
  settlementTimeline: string | null;
  complianceRequirements: string | null;
  integrationType: string | null;
  riskLevel: string | null;
  geographicScope: string | null;
  businessModel: string | null;
  keyStakeholders: string | null;
  specialRequirements: string | null;
  confidenceScore: number | null;
  createdAt: string;
}

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return value.split(",").map((s) => s.trim());
  }
}

function RiskBadge({ level }: { level: string | null }) {
  if (!level) return <span className="text-gray-400 italic">Not identified</span>;
  const colors: Record<string, string> = {
    LOW: "bg-green-100 text-green-700",
    MEDIUM: "bg-yellow-100 text-yellow-700",
    HIGH: "bg-orange-100 text-orange-700",
    CRITICAL: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[level] || "bg-gray-100 text-gray-700"}`}>
      {level}
    </span>
  );
}

function FieldValue({ value, type = "text" }: { value: string | null; type?: "text" | "badges" | "risk" }) {
  if (!value) return <span className="text-gray-400 italic text-sm">Not yet identified</span>;
  if (type === "risk") return <RiskBadge level={value} />;
  if (type === "badges") {
    const items = parseJsonArray(value);
    if (items.length === 0) return <span className="text-gray-400 italic text-sm">Not yet identified</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {items.map((item) => (
          <Badge key={item} variant="secondary" className="text-xs">
            {item}
          </Badge>
        ))}
      </div>
    );
  }
  return <span className="text-sm text-gray-900">{value}</span>;
}

function ConfidenceBar({ score }: { score: number | null }) {
  const s = score ?? 0;
  const color = s < 30 ? "bg-red-500" : s < 70 ? "bg-yellow-500" : "bg-green-500";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${s}%` }} />
      </div>
      <span className="text-sm font-medium text-gray-600">{s}%</span>
    </div>
  );
}

export function FofDisplay({ fof }: { fof: FlowOfFundsRecord }) {
  const fields: Array<{ label: string; key: keyof FlowOfFundsRecord; type?: "text" | "badges" | "risk" }> = [
    { label: "Payment Direction", key: "paymentDirection" },
    { label: "Business Model", key: "businessModel" },
    { label: "Source of Funds", key: "sourceOfFunds" },
    { label: "Destination of Funds", key: "destinationOfFunds" },
    { label: "Payment Methods", key: "paymentMethods", type: "badges" },
    { label: "Currencies", key: "currencies", type: "badges" },
    { label: "Expected Volume", key: "expectedVolume" },
    { label: "Fee Structure", key: "feeStructure" },
    { label: "Settlement Timeline", key: "settlementTimeline" },
    { label: "Integration Type", key: "integrationType" },
    { label: "Risk Level", key: "riskLevel", type: "risk" },
    { label: "Geographic Scope", key: "geographicScope", type: "badges" },
    { label: "Compliance Requirements", key: "complianceRequirements" },
    { label: "Key Stakeholders", key: "keyStakeholders" },
    { label: "Special Requirements", key: "specialRequirements" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">Flow of Funds</h3>
          <Badge variant="outline" className="text-xs">
            v{fof.version}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {fof.trigger}
          </Badge>
        </div>
        <span className="text-xs text-gray-500">{formatDate(new Date(fof.createdAt))}</span>
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-1">AI Confidence</p>
        <ConfidenceBar score={fof.confidenceScore} />
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map(({ label, key, type }) => (
            <div key={key}>
              <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
              <FieldValue value={fof[key] as string | null} type={type || "text"} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function FofEmpty({ onGenerate, generating }: { onGenerate: () => void; generating: boolean }) {
  return (
    <Card className="p-8 text-center">
      <div className="text-4xl mb-3">💸</div>
      <h3 className="font-semibold text-gray-900 mb-1">No Flow of Funds Yet</h3>
      <p className="text-sm text-gray-500 mb-4">
        Generate a FOF analysis from all communications with this client.
      </p>
      <button
        onClick={onGenerate}
        disabled={generating}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
      >
        {generating ? (
          <>
            <span className="animate-spin">&#9696;</span>
            Generating...
          </>
        ) : (
          "Generate FOF with AI"
        )}
      </button>
    </Card>
  );
}

export type { FlowOfFundsRecord };
