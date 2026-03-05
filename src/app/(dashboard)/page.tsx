import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [todayTasks, overdueTasks, upcomingMeetings, newLeads, totalLeads] =
    await Promise.all([
      prisma.task.findMany({
        where: {
          userId,
          completed: false,
          dueDate: { gte: todayStart, lt: todayEnd },
        },
        include: { lead: { select: { id: true, name: true, company: true } } },
        orderBy: { dueDate: "asc" },
      }),
      prisma.task.findMany({
        where: {
          userId,
          completed: false,
          dueDate: { lt: todayStart },
        },
        include: { lead: { select: { id: true, name: true, company: true } } },
        orderBy: { dueDate: "asc" },
      }),
      prisma.meeting.findMany({
        where: {
          userId,
          startTime: { gte: now, lt: weekEnd },
        },
        include: {
          lead: { select: { id: true, name: true, company: true } },
          briefings: { select: { id: true }, take: 1 },
        },
        orderBy: { startTime: "asc" },
        take: 10,
      }),
      prisma.lead.count({
        where: { userId, status: "NEW" },
      }),
      prisma.lead.count({
        where: { userId },
      }),
    ]);

  return (
    <DashboardContent
      todayTasks={JSON.parse(JSON.stringify(todayTasks))}
      overdueTasks={JSON.parse(JSON.stringify(overdueTasks))}
      upcomingMeetings={JSON.parse(JSON.stringify(upcomingMeetings))}
      newLeadsCount={newLeads}
      totalLeadsCount={totalLeads}
    />
  );
}
