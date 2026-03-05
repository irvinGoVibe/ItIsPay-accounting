"use client";

import Link from "next/link";
import {
  CheckSquare,
  Calendar,
  Users,
  AlertTriangle,
  Sparkles,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatDate } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  dueDate: string | null;
  priority: string;
  lead: { id: string; name: string; company: string | null } | null;
}

interface Meeting {
  id: string;
  title: string;
  startTime: string;
  lead: { id: string; name: string; company: string | null } | null;
  briefings: Array<{ id: string }>;
}

export function DashboardContent({
  todayTasks,
  overdueTasks,
  upcomingMeetings,
  newLeadsCount,
  totalLeadsCount,
}: {
  todayTasks: Task[];
  overdueTasks: Task[];
  upcomingMeetings: Meeting[];
  newLeadsCount: number;
  totalLeadsCount: number;
}) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{totalLeadsCount}</p>
                <p className="text-xs text-gray-500">Total Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{newLeadsCount}</p>
                <p className="text-xs text-gray-500">New Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{upcomingMeetings.length}</p>
                <p className="text-xs text-gray-500">Upcoming Meetings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{overdueTasks.length}</p>
                <p className="text-xs text-gray-500">Overdue Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue + Today Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Today&apos;s Tasks
              {overdueTasks.length > 0 && (
                <Badge variant="destructive">{overdueTasks.length} overdue</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overdueTasks.length === 0 && todayTasks.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">
                No tasks for today
              </p>
            ) : (
              <div className="space-y-2">
                {overdueTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 rounded-lg bg-red-50 p-2 border border-red-100"
                  >
                    <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {task.title}
                      </p>
                      {task.lead && (
                        <Link
                          href={`/leads/${task.lead.id}`}
                          className="text-xs text-gray-500 hover:text-blue-600"
                        >
                          {task.lead.name}
                        </Link>
                      )}
                    </div>
                    {task.dueDate && (
                      <span className="text-xs text-red-500">
                        {formatDate(task.dueDate)}
                      </span>
                    )}
                  </div>
                ))}
                {todayTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50"
                  >
                    <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {task.title}
                      </p>
                      {task.lead && (
                        <Link
                          href={`/leads/${task.lead.id}`}
                          className="text-xs text-gray-500 hover:text-blue-600"
                        >
                          {task.lead.name}
                        </Link>
                      )}
                    </div>
                    <Badge
                      variant={
                        task.priority === "HIGH"
                          ? "destructive"
                          : task.priority === "MEDIUM"
                            ? "warning"
                            : "secondary"
                      }
                      className="text-xs"
                    >
                      {task.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 pt-3 border-t">
              <Link href="/tasks">
                <Button variant="ghost" size="sm" className="w-full">
                  View all tasks
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Meetings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Meetings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingMeetings.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">
                No upcoming meetings
              </p>
            ) : (
              <div className="space-y-2">
                {upcomingMeetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50"
                  >
                    <Calendar className="h-4 w-4 text-blue-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {meeting.title}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {formatDateTime(meeting.startTime)}
                        </span>
                        {meeting.lead && (
                          <Link
                            href={`/leads/${meeting.lead.id}`}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            {meeting.lead.name}
                          </Link>
                        )}
                      </div>
                    </div>
                    {meeting.briefings.length > 0 ? (
                      <Badge variant="success" className="text-xs">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Ready
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        No briefing
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 pt-3 border-t">
              <Link href="/meetings">
                <Button variant="ghost" size="sm" className="w-full">
                  View all meetings
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
