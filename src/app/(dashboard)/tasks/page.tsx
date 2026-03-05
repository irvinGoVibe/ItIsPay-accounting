"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { CheckSquare, Plus, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  dueDate: string | null;
  priority: string;
  completed: boolean;
  owner: string;
  source: string;
  lead: { id: string; name: string; company: string | null } | null;
  createdAt: string;
}

const FILTER_TABS = ["all", "today", "week", "overdue", "completed"] as const;

const priorityBadge: Record<string, "destructive" | "warning" | "secondary"> = {
  HIGH: "destructive",
  MEDIUM: "warning",
  LOW: "secondary",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [newTitle, setNewTitle] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/tasks?filter=${filter}`);
    const data = await res.json();
    setTasks(data);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  async function toggleComplete(taskId: string, completed: boolean) {
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: taskId, completed }),
    });
    fetchTasks();
  }

  async function addTask() {
    if (!newTitle.trim()) return;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    });
    setNewTitle("");
    setShowAdd(false);
    fetchTasks();
  }

  const now = new Date();
  const overdueCount = tasks.filter(
    (t) => !t.completed && t.dueDate && new Date(t.dueDate) < now
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500 mt-1">
            {tasks.length} tasks
            {overdueCount > 0 && (
              <span className="text-red-500 ml-1">({overdueCount} overdue)</span>
            )}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardContent className="py-4">
            <div className="flex gap-2">
              <Input
                placeholder="Task title..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
                autoFocus
              />
              <Button onClick={addTask}>Add</Button>
              <Button variant="outline" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {FILTER_TABS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              filter === f
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-400">
              Loading tasks...
            </CardContent>
          </Card>
        ) : tasks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-400">
              <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No tasks found
            </CardContent>
          </Card>
        ) : (
          tasks.map((task) => {
            const isOverdue =
              !task.completed &&
              task.dueDate &&
              new Date(task.dueDate) < now;

            return (
              <Card
                key={task.id}
                className={isOverdue ? "border-red-200 bg-red-50" : ""}
              >
                <CardContent className="py-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={(e) => toggleComplete(task.id, e.target.checked)}
                      className="h-4 w-4 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-medium ${
                            task.completed
                              ? "line-through text-gray-400"
                              : "text-gray-900"
                          }`}
                        >
                          {task.title}
                        </span>
                        <Badge variant={priorityBadge[task.priority] ?? "secondary"} className="text-xs">
                          {task.priority}
                        </Badge>
                        {task.source === "AI_ANALYSIS" && (
                          <Badge variant="default" className="text-xs">AI</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        {task.lead && (
                          <Link
                            href={`/leads/${task.lead.id}`}
                            className="hover:text-blue-600"
                          >
                            {task.lead.name}
                            {task.lead.company && ` (${task.lead.company})`}
                          </Link>
                        )}
                        {task.dueDate && (
                          <span className={`flex items-center gap-1 ${isOverdue ? "text-red-500 font-medium" : ""}`}>
                            {isOverdue ? (
                              <AlertTriangle className="h-3 w-3" />
                            ) : (
                              <Clock className="h-3 w-3" />
                            )}
                            {isOverdue ? "Overdue: " : "Due: "}
                            {formatDate(task.dueDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
