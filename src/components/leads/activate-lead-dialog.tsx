"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FofDisplay } from "@/components/leads/fof-display";
import { useToast } from "@/components/ui/toast";
import ReactMarkdown from "react-markdown";
import {
  Search,
  Star,
  Mail,
  Phone,
  Calendar,
  ArrowLeft,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Check,
} from "lucide-react";

type Phase = "SEARCH" | "PREVIEW" | "PROCESSING" | "RESULTS";

interface LeadPreview {
  id: string;
  name: string;
  email: string;
  company: string | null;
  status: string;
  stage: string;
  classification: string | null;
  isActiveDeal: boolean;
  _count: { emails: number; meetings: number; callLogs: number };
}

interface ActionItem {
  title: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  dueInDays: number;
  owner: "us" | "client";
}

interface ActivationResult {
  lead: LeadPreview;
  fof: {
    data: Record<string, unknown> | null;
    version: number;
    skipped: boolean;
  } | null;
  recommendations: {
    markdown: string;
    actions: ActionItem[];
  } | null;
  errors: { fof?: string; recommendations?: string } | null;
}

interface ActivateLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActivated?: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  NEW: "Новый",
  CONTACTED: "Контакт",
  QUALIFIED: "Квалифицирован",
  PROPOSAL: "Предложение",
  NEGOTIATION: "Переговоры",
  CLOSED_WON: "Закрыт (успех)",
  CLOSED_LOST: "Закрыт (отказ)",
};

const PRIORITY_LABELS: Record<string, string> = {
  HIGH: "Высокий",
  MEDIUM: "Средний",
  LOW: "Низкий",
};

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: "bg-red-100 text-red-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  LOW: "bg-green-100 text-green-700",
};

export function ActivateLeadDialog({
  open,
  onOpenChange,
  onActivated,
}: ActivateLeadDialogProps) {
  const [phase, setPhase] = useState<Phase>("SEARCH");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LeadPreview[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadPreview | null>(null);
  const [result, setResult] = useState<ActivationResult | null>(null);
  const [selectedActions, setSelectedActions] = useState<Set<number>>(new Set());
  const [creatingTasks, setCreatingTasks] = useState(false);
  const [createdTasks, setCreatedTasks] = useState<Set<number>>(new Set());
  const [processingStep, setProcessingStep] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const { toast: addToast } = useToast();

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setPhase("SEARCH");
      setSearchQuery("");
      setSearchResults([]);
      setSelectedLead(null);
      setResult(null);
      setSelectedActions(new Set());
      setCreatedTasks(new Set());
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Debounced search
  const doSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `/api/leads?search=${encodeURIComponent(query)}`
      );
      if (res.ok) {
        const leads = await res.json();
        setSearchResults(leads.slice(0, 10));
      }
    } catch {
      // ignore search errors
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(searchQuery), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, doSearch]);

  const handleSelectLead = (lead: LeadPreview) => {
    setSelectedLead(lead);
    setPhase("PREVIEW");
  };

  const handleActivate = async () => {
    if (!selectedLead) return;
    setPhase("PROCESSING");
    setProcessingStep("Активация лида...");

    try {
      setTimeout(() => setProcessingStep("Генерация Flow of Funds..."), 2000);
      setTimeout(
        () => setProcessingStep("Подготовка рекомендаций..."),
        5000
      );

      const res = await fetch("/api/leads/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: selectedLead.email }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Activation failed");
      }

      const data: ActivationResult = await res.json();
      setResult(data);

      // Pre-select all actions
      if (data.recommendations?.actions) {
        setSelectedActions(
          new Set(data.recommendations.actions.map((_, i) => i))
        );
      }

      setPhase("RESULTS");
      onActivated?.();
    } catch (error) {
      addToast(
        `Ошибка: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`,
        "error"
      );
      setPhase("PREVIEW");
    }
  };

  const toggleAction = (index: number) => {
    setSelectedActions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleCreateTasks = async () => {
    if (!result?.recommendations?.actions || !result.lead) return;
    setCreatingTasks(true);

    const actions = result.recommendations.actions;
    const toCreate = Array.from(selectedActions)
      .filter((i) => !createdTasks.has(i))
      .map((i) => actions[i]);

    try {
      for (const action of toCreate) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + action.dueInDays);

        await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: action.title,
            leadId: result.lead.id,
            priority: action.priority,
            dueDate: dueDate.toISOString(),
            owner: action.owner,
            source: "AI_ANALYSIS",
          }),
        });
      }

      setCreatedTasks(
        (prev) => new Set([...prev, ...selectedActions])
      );
      addToast(
        `Создано задач: ${toCreate.length}`,
        "success"
      );
      onActivated?.();
    } catch {
      addToast("Ошибка при создании задач", "error");
    } finally {
      setCreatingTasks(false);
    }
  };

  const allTasksCreated =
    result?.recommendations?.actions &&
    result.recommendations.actions.every((_, i) => createdTasks.has(i));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          phase === "RESULTS"
            ? "max-w-3xl max-h-[85vh] overflow-y-auto"
            : "max-w-lg"
        }
      >
        {/* ── PHASE: SEARCH ── */}
        {phase === "SEARCH" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Активировать лид
              </DialogTitle>
              <DialogDescription>
                Введите email лида для поиска и активации
              </DialogDescription>
            </DialogHeader>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={inputRef}
                type="email"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="email@company.com"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>

            {searching && (
              <div className="flex items-center justify-center py-4 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Поиск...
              </div>
            )}

            {!searching && searchResults.length > 0 && (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {searchResults.map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => handleSelectLead(lead)}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {lead.name}
                        </span>
                        {lead.isActiveDeal && (
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />
                        )}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {lead.email}
                        {lead.company && ` · ${lead.company}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <Badge variant="outline" className="text-xs">
                        {STATUS_LABELS[lead.status] || lead.status}
                      </Badge>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {lead._count.emails}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!searching &&
              searchQuery.length >= 2 &&
              searchResults.length === 0 && (
                <div className="text-center py-6 text-sm text-gray-500">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  Лид с таким email не найден
                </div>
              )}
          </>
        )}

        {/* ── PHASE: PREVIEW ── */}
        {phase === "PREVIEW" && selectedLead && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Активация лида
              </DialogTitle>
            </DialogHeader>

            <Card className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{selectedLead.name}</h3>
                  <p className="text-sm text-gray-500">{selectedLead.email}</p>
                  {selectedLead.company && (
                    <p className="text-sm text-gray-600">
                      {selectedLead.company}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="outline">
                    {STATUS_LABELS[selectedLead.status] || selectedLead.status}
                  </Badge>
                  {selectedLead.classification && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedLead.classification}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500 border-t pt-3">
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {selectedLead._count.emails} писем
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {selectedLead._count.meetings} встреч
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {selectedLead._count.callLogs} звонков
                </span>
              </div>

              {selectedLead.isActiveDeal && (
                <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                  <Star className="h-3.5 w-3.5 fill-amber-400" />
                  Этот лид уже активирован. Анализ будет обновлён.
                </div>
              )}
            </Card>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setPhase("SEARCH")}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Назад
              </button>
              <button
                onClick={handleActivate}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                Активировать и проанализировать
              </button>
            </div>
          </>
        )}

        {/* ── PHASE: PROCESSING ── */}
        {phase === "PROCESSING" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                Обработка
              </DialogTitle>
            </DialogHeader>

            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative mb-6">
                <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-blue-600 animate-pulse" />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-700">
                {processingStep}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Это может занять до минуты
              </p>
            </div>
          </>
        )}

        {/* ── PHASE: RESULTS ── */}
        {phase === "RESULTS" && result && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Лид активирован
              </DialogTitle>
              <DialogDescription>
                {result.lead.name}
                {result.lead.company ? ` · ${result.lead.company}` : ""}
              </DialogDescription>
            </DialogHeader>

            {/* Lead confirmation */}
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">
                  {result.lead.name} — активная сделка
                </p>
                <p className="text-xs text-green-600">{result.lead.email}</p>
              </div>
              <Badge variant="outline">
                {STATUS_LABELS[result.lead.status] || result.lead.status}
              </Badge>
            </div>

            {/* FOF Section */}
            <div className="border-t pt-4">
              <h3 className="font-semibold text-sm text-gray-900 mb-3">
                Flow of Funds
              </h3>
              {result.errors?.fof ? (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  {result.errors.fof}
                </div>
              ) : result.fof?.data ? (
                <FofDisplay
                  fof={{
                    id: "",
                    version: result.fof.version,
                    trigger: "MANUAL",
                    createdAt: new Date().toISOString(),
                    confidenceScore:
                      (result.fof.data as Record<string, unknown>)
                        .confidenceScore as number | null,
                    paymentDirection:
                      (result.fof.data.paymentDirection as string) || null,
                    sourceOfFunds:
                      (result.fof.data.sourceOfFunds as string) || null,
                    destinationOfFunds:
                      (result.fof.data.destinationOfFunds as string) || null,
                    paymentMethods: result.fof.data.paymentMethods
                      ? JSON.stringify(result.fof.data.paymentMethods)
                      : null,
                    currencies: result.fof.data.currencies
                      ? JSON.stringify(result.fof.data.currencies)
                      : null,
                    expectedVolume:
                      (result.fof.data.expectedVolume as string) || null,
                    feeStructure:
                      (result.fof.data.feeStructure as string) || null,
                    settlementTimeline:
                      (result.fof.data.settlementTimeline as string) || null,
                    complianceRequirements:
                      (result.fof.data.complianceRequirements as string) ||
                      null,
                    integrationType:
                      (result.fof.data.integrationType as string) || null,
                    riskLevel:
                      (result.fof.data.riskLevel as string) || null,
                    geographicScope: result.fof.data.geographicScope
                      ? JSON.stringify(result.fof.data.geographicScope)
                      : null,
                    businessModel:
                      (result.fof.data.businessModel as string) || null,
                    keyStakeholders:
                      (result.fof.data.keyStakeholders as string) || null,
                    specialRequirements:
                      (result.fof.data.specialRequirements as string) || null,
                  }}
                />
              ) : result.fof?.skipped ? (
                <p className="text-sm text-gray-500 italic">
                  FOF уже был сгенерирован недавно.
                </p>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  Недостаточно данных для генерации FOF.
                </p>
              )}
            </div>

            {/* Recommendations Section */}
            <div className="border-t pt-4">
              <h3 className="font-semibold text-sm text-gray-900 mb-3">
                Рекомендации
              </h3>
              {result.errors?.recommendations ? (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  {result.errors.recommendations}
                </div>
              ) : result.recommendations?.markdown ? (
                <div className="prose prose-sm max-w-none text-gray-700">
                  <ReactMarkdown>
                    {result.recommendations.markdown}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  Рекомендации не были сгенерированы.
                </p>
              )}
            </div>

            {/* Action Items / Task Creation */}
            {result.recommendations?.actions &&
              result.recommendations.actions.length > 0 && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm text-gray-900">
                      Создать задачи
                    </h3>
                    {!allTasksCreated && (
                      <button
                        onClick={() => {
                          const allIndices = result.recommendations!.actions.map(
                            (_, i) => i
                          );
                          const allSelected =
                            selectedActions.size === allIndices.length;
                          setSelectedActions(
                            allSelected ? new Set() : new Set(allIndices)
                          );
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        {selectedActions.size ===
                        result.recommendations.actions.length
                          ? "Снять все"
                          : "Выбрать все"}
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {result.recommendations.actions.map((action, i) => {
                      const isCreated = createdTasks.has(i);
                      return (
                        <div
                          key={i}
                          className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                            isCreated
                              ? "bg-green-50 border-green-200"
                              : selectedActions.has(i)
                                ? "bg-blue-50 border-blue-200"
                                : "bg-white border-gray-200"
                          }`}
                        >
                          {isCreated ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                          ) : (
                            <button
                              onClick={() => toggleAction(i)}
                              className={`h-5 w-5 mt-0.5 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                                selectedActions.has(i)
                                  ? "bg-blue-600 border-blue-600"
                                  : "border-gray-300 hover:border-blue-400"
                              }`}
                            >
                              {selectedActions.has(i) && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </button>
                          )}
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-medium ${isCreated ? "text-green-800 line-through" : "text-gray-900"}`}
                            >
                              {action.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[action.priority]}`}
                              >
                                {PRIORITY_LABELS[action.priority]}
                              </span>
                              <span className="text-xs text-gray-500">
                                {action.dueInDays === 0
                                  ? "Сегодня"
                                  : action.dueInDays === 1
                                    ? "Завтра"
                                    : `Через ${action.dueInDays} дн.`}
                              </span>
                              <span className="text-xs text-gray-400">
                                {action.owner === "us" ? "Мы" : "Клиент"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {!allTasksCreated && (
                    <button
                      onClick={handleCreateTasks}
                      disabled={
                        creatingTasks ||
                        selectedActions.size === 0 ||
                        Array.from(selectedActions).every((i) =>
                          createdTasks.has(i)
                        )
                      }
                      className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                    >
                      {creatingTasks ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Создание...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Создать выбранные задачи (
                          {
                            Array.from(selectedActions).filter(
                              (i) => !createdTasks.has(i)
                            ).length
                          }
                          )
                        </>
                      )}
                    </button>
                  )}

                  {allTasksCreated && (
                    <div className="mt-4 text-center text-sm text-green-600 font-medium">
                      <CheckCircle2 className="h-5 w-5 inline mr-1" />
                      Все задачи созданы
                    </div>
                  )}
                </div>
              )}

            {/* Close button */}
            <div className="border-t pt-4 flex justify-end">
              <button
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Закрыть
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
