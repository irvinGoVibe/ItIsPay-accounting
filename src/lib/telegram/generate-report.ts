import ExcelJS from "exceljs";

/* eslint-disable @typescript-eslint/no-explicit-any */

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF4472C4" },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: "FFFFFFFF" },
  size: 11,
};

const SECTION_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFD9E2F3" },
};

function styleHeaders(sheet: ExcelJS.Worksheet) {
  sheet.getRow(1).eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  sheet.getRow(1).height = 24;
}

function fmt(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("ru-RU") + " " + d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("ru-RU");
}

function safeJson(val: string | null | undefined): string {
  if (!val) return "—";
  try {
    const arr = JSON.parse(val);
    return Array.isArray(arr) ? arr.join(", ") : String(arr);
  } catch {
    return val;
  }
}

// ─── Main leads sheet ──────────────────────────────────────

function addLeadsSheet(workbook: ExcelJS.Workbook, name: string, leads: any[]) {
  const sheet = workbook.addWorksheet(name);
  sheet.columns = [
    { header: "Имя", key: "name", width: 22 },
    { header: "Компания", key: "company", width: 18 },
    { header: "Email", key: "email", width: 26 },
    { header: "Телефон", key: "phone", width: 16 },
    { header: "Роль", key: "role", width: 16 },
    { header: "Классификация", key: "classification", width: 16 },
    { header: "Статус", key: "status", width: 14 },
    { header: "Этап", key: "stage", width: 14 },
    { header: "Источник", key: "source", width: 10 },
    { header: "Последний контакт", key: "lastContact", width: 18 },
    { header: "Писем", key: "emailCount", width: 8 },
    { header: "Встреч", key: "meetingCount", width: 8 },
    { header: "Звонков", key: "callCount", width: 8 },
    { header: "Задач", key: "taskCount", width: 8 },
    { header: "Дата создания", key: "createdAt", width: 16 },
  ];
  styleHeaders(sheet);

  for (const lead of leads) {
    sheet.addRow({
      name: lead.name,
      company: lead.company ?? "—",
      email: lead.email,
      phone: lead.phone ?? "—",
      role: lead.role ?? "—",
      classification: lead.classification ?? "—",
      status: lead.status.replace("_", " "),
      stage: lead.stage,
      source: lead.source ?? "—",
      lastContact: fmtDate(lead.lastContact),
      emailCount: lead.emails?.length ?? 0,
      meetingCount: lead.meetings?.length ?? 0,
      callCount: lead.callLogs?.length ?? 0,
      taskCount: lead.tasks?.filter((t: any) => !t.completed)?.length ?? 0,
      createdAt: fmtDate(lead.createdAt),
    });
  }

  // Count
  const r = sheet.addRow({});
  r.getCell(1).value = `Всего: ${leads.length}`;
  r.getCell(1).font = { bold: true };
}

// ─── Call Logs sheet ───────────────────────────────────────

function addCallLogsSheet(workbook: ExcelJS.Workbook, leads: any[]) {
  const allCalls: any[] = [];
  for (const lead of leads) {
    for (const c of lead.callLogs ?? []) {
      allCalls.push({ ...c, leadName: lead.name, leadCompany: lead.company });
    }
  }
  if (allCalls.length === 0) return;

  const sheet = workbook.addWorksheet("Звонки");
  sheet.columns = [
    { header: "Лид", key: "leadName", width: 20 },
    { header: "Компания", key: "leadCompany", width: 18 },
    { header: "Дата", key: "date", width: 16 },
    { header: "Результат", key: "outcome", width: 14 },
    { header: "Вовлечённость", key: "engagement", width: 14 },
    { header: "AI Саммари", key: "summary", width: 50 },
    { header: "Ключевые пункты", key: "keyPoints", width: 40 },
    { header: "Договорённости", key: "agreements", width: 40 },
    { header: "Открытые вопросы", key: "openQuestions", width: 40 },
    { header: "Следующие шаги", key: "nextSteps", width: 40 },
  ];
  styleHeaders(sheet);

  for (const c of allCalls) {
    sheet.addRow({
      leadName: c.leadName,
      leadCompany: c.leadCompany ?? "—",
      date: fmtDate(c.createdAt),
      outcome: c.outcome ?? "—",
      engagement: c.aiEngagementLevel ?? "—",
      summary: c.aiSummary ?? c.rawText?.slice(0, 300) ?? "—",
      keyPoints: safeJson(c.aiKeyPoints),
      agreements: safeJson(c.aiAgreements),
      openQuestions: safeJson(c.aiOpenQuestions),
      nextSteps: safeJson(c.aiNextSteps),
    });
  }

  // Wrap text for long columns
  ["summary", "keyPoints", "agreements", "openQuestions", "nextSteps"].forEach((key) => {
    sheet.getColumn(key).alignment = { wrapText: true, vertical: "top" };
  });
}

// ─── Meetings sheet ────────────────────────────────────────

function addMeetingsSheet(workbook: ExcelJS.Workbook, leads: any[]) {
  const allMeetings: any[] = [];
  for (const lead of leads) {
    for (const m of lead.meetings ?? []) {
      allMeetings.push({ ...m, leadName: lead.name, leadCompany: lead.company });
    }
  }
  if (allMeetings.length === 0) return;

  const sheet = workbook.addWorksheet("Встречи");
  sheet.columns = [
    { header: "Лид", key: "leadName", width: 20 },
    { header: "Компания", key: "leadCompany", width: 18 },
    { header: "Встреча", key: "title", width: 30 },
    { header: "Начало", key: "start", width: 18 },
    { header: "Конец", key: "end", width: 18 },
    { header: "Статус", key: "status", width: 14 },
    { header: "Локация", key: "location", width: 30 },
    { header: "Участники", key: "participants", width: 35 },
  ];
  styleHeaders(sheet);

  for (const m of allMeetings) {
    let participants = "—";
    try {
      const arr = JSON.parse(m.participants);
      participants = arr.map((p: any) => p.name || p.email).join(", ");
    } catch { /* ignore */ }

    sheet.addRow({
      leadName: m.leadName,
      leadCompany: m.leadCompany ?? "—",
      title: m.title,
      start: fmt(m.startTime),
      end: fmt(m.endTime),
      status: m.status,
      location: m.location ?? "—",
      participants,
    });
  }
}

// ─── Flow of Funds sheet ───────────────────────────────────

function addFofSheet(workbook: ExcelJS.Workbook, leads: any[]) {
  const allFof: any[] = [];
  for (const lead of leads) {
    const latest = lead.flowOfFunds?.sort((a: any, b: any) => b.version - a.version)?.[0];
    if (latest) {
      allFof.push({ ...latest, leadName: lead.name, leadCompany: lead.company });
    }
  }
  if (allFof.length === 0) return;

  const sheet = workbook.addWorksheet("Flow of Funds");
  sheet.columns = [
    { header: "Лид", key: "leadName", width: 20 },
    { header: "Компания", key: "leadCompany", width: 18 },
    { header: "Direction", key: "direction", width: 14 },
    { header: "Business Model", key: "business", width: 16 },
    { header: "Volume", key: "volume", width: 16 },
    { header: "Currencies", key: "currencies", width: 16 },
    { header: "Payment Methods", key: "methods", width: 20 },
    { header: "Risk", key: "risk", width: 10 },
    { header: "Confidence", key: "confidence", width: 12 },
    { header: "Geography", key: "geo", width: 20 },
    { header: "Integration", key: "integration", width: 14 },
    { header: "Settlement", key: "settlement", width: 14 },
    { header: "Compliance", key: "compliance", width: 24 },
    { header: "Source of Funds", key: "sourceOfFunds", width: 20 },
    { header: "Destination", key: "destination", width: 20 },
    { header: "Special Req", key: "special", width: 24 },
  ];
  styleHeaders(sheet);

  for (const f of allFof) {
    sheet.addRow({
      leadName: f.leadName,
      leadCompany: f.leadCompany ?? "—",
      direction: f.paymentDirection ?? "—",
      business: f.businessModel ?? "—",
      volume: f.expectedVolume ?? "—",
      currencies: safeJson(f.currencies),
      methods: safeJson(f.paymentMethods),
      risk: f.riskLevel ?? "—",
      confidence: f.confidenceScore ? `${f.confidenceScore}%` : "—",
      geo: safeJson(f.geographicScope),
      integration: f.integrationType ?? "—",
      settlement: f.settlementTimeline ?? "—",
      compliance: f.complianceRequirements ?? "—",
      sourceOfFunds: f.sourceOfFunds ?? "—",
      destination: f.destinationOfFunds ?? "—",
      special: f.specialRequirements ?? "—",
    });
  }
}

// ─── Tasks sheet ───────────────────────────────────────────

function addTasksSheet(workbook: ExcelJS.Workbook, leads: any[]) {
  const allTasks: any[] = [];
  for (const lead of leads) {
    for (const t of lead.tasks ?? []) {
      allTasks.push({ ...t, leadName: lead.name, leadCompany: lead.company });
    }
  }
  if (allTasks.length === 0) return;

  const sheet = workbook.addWorksheet("Задачи");
  sheet.columns = [
    { header: "Лид", key: "leadName", width: 20 },
    { header: "Компания", key: "leadCompany", width: 18 },
    { header: "Задача", key: "title", width: 35 },
    { header: "Приоритет", key: "priority", width: 12 },
    { header: "Ответственный", key: "owner", width: 14 },
    { header: "Дедлайн", key: "dueDate", width: 14 },
    { header: "Статус", key: "status", width: 12 },
    { header: "Источник", key: "source", width: 12 },
  ];
  styleHeaders(sheet);

  for (const t of allTasks) {
    sheet.addRow({
      leadName: t.leadName,
      leadCompany: t.leadCompany ?? "—",
      title: t.title,
      priority: t.priority,
      owner: t.owner === "us" ? "Мы" : "Клиент",
      dueDate: fmtDate(t.dueDate),
      status: t.completed ? "✅ Выполнено" : "☐ В работе",
      source: t.source,
    });
  }
}

// ─── Emails sheet ──────────────────────────────────────────

function addEmailsSheet(workbook: ExcelJS.Workbook, leads: any[]) {
  const allEmails: any[] = [];
  for (const lead of leads) {
    for (const e of lead.emails ?? []) {
      allEmails.push({ ...e, leadName: lead.name, leadCompany: lead.company });
    }
  }
  if (allEmails.length === 0) return;

  const sheet = workbook.addWorksheet("Письма");
  sheet.columns = [
    { header: "Лид", key: "leadName", width: 20 },
    { header: "Компания", key: "leadCompany", width: 18 },
    { header: "Направление", key: "direction", width: 14 },
    { header: "Дата", key: "date", width: 16 },
    { header: "Тема", key: "subject", width: 40 },
    { header: "От кого", key: "from", width: 24 },
    { header: "Кому", key: "to", width: 24 },
  ];
  styleHeaders(sheet);

  for (const e of allEmails) {
    sheet.addRow({
      leadName: e.leadName,
      leadCompany: e.leadCompany ?? "—",
      direction: e.isInbound ? "📥 Входящее" : "📤 Исходящее",
      date: fmt(e.date),
      subject: e.subject ?? "(без темы)",
      from: e.fromEmail,
      to: e.toEmail,
    });
  }
}

// ─── MAIN EXPORT ───────────────────────────────────────────

export async function generateActiveDealsReport(leads: any[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ItIsPay SRM";
  workbook.created = new Date();

  const newLeads = leads.filter((l) => l.status === "NEW");
  const inWorkLeads = leads.filter((l) => l.status !== "NEW");

  // Sheet 1 & 2: Lead overview
  addLeadsSheet(workbook, "Новые поступившие", newLeads);
  addLeadsSheet(workbook, "В работе", inWorkLeads);

  // Sheet 3: All call logs with AI analysis
  addCallLogsSheet(workbook, leads);

  // Sheet 4: All meetings
  addMeetingsSheet(workbook, leads);

  // Sheet 5: Flow of Funds (latest version per lead)
  addFofSheet(workbook, leads);

  // Sheet 6: Tasks
  addTasksSheet(workbook, leads);

  // Sheet 7: Emails
  addEmailsSheet(workbook, leads);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
