"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Sparkles, Video, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime, formatDate } from "@/lib/utils";

interface Meeting {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string | null;
  participants: string;
  status: string;
  lead: { id: string; name: string; company: string | null } | null;
  briefings: Array<{ id: string }>;
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  useEffect(() => {
    fetchMeetings();
  }, []);

  async function fetchMeetings() {
    setLoading(true);
    const res = await fetch("/api/meetings");
    if (res.ok) {
      const data = await res.json();
      setMeetings(data);
    }
    setLoading(false);
  }

  const now = new Date();
  const upcoming = meetings.filter((m) => new Date(m.startTime) >= now);
  const past = meetings.filter((m) => new Date(m.startTime) < now);
  const displayed = tab === "upcoming" ? upcoming : past;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Meetings</h1>
          <p className="text-sm text-gray-500 mt-1">
            {upcoming.length} upcoming, {past.length} past
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            await fetch("/api/sync/calendar", { method: "POST" });
            fetchMeetings();
          }}
        >
          <Calendar className="h-4 w-4" />
          Sync Calendar
        </Button>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("upcoming")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
            tab === "upcoming" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"
          }`}
        >
          Upcoming ({upcoming.length})
        </button>
        <button
          onClick={() => setTab("past")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
            tab === "past" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"
          }`}
        >
          Past ({past.length})
        </button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-400">
              Loading meetings...
            </CardContent>
          </Card>
        ) : displayed.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-400">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No {tab} meetings. Sync your calendar to see meetings.
            </CardContent>
          </Card>
        ) : (
          displayed.map((meeting) => {
            const participants = JSON.parse(meeting.participants || "[]") as Array<{
              name: string;
              email: string;
            }>;
            const hasBriefing = meeting.briefings.length > 0;

            return (
              <Card key={meeting.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-gray-900">
                          {meeting.title}
                        </h3>
                        {hasBriefing && (
                          <Badge variant="success" className="text-xs">
                            Briefing ready
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>{formatDateTime(meeting.startTime)}</span>
                        {meeting.lead && (
                          <Link
                            href={`/leads/${meeting.lead.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {meeting.lead.name}
                            {meeting.lead.company && ` (${meeting.lead.company})`}
                          </Link>
                        )}
                        {meeting.location && (
                          <span className="flex items-center gap-1">
                            {meeting.location.startsWith("http") ? (
                              <Video className="h-3 w-3" />
                            ) : (
                              <MapPin className="h-3 w-3" />
                            )}
                            {meeting.location.startsWith("http") ? "Video Call" : meeting.location}
                          </span>
                        )}
                      </div>
                      {participants.length > 0 && (
                        <div className="text-xs text-gray-400 mt-1">
                          {participants.map((p) => p.name || p.email).join(", ")}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {meeting.lead && (
                        <Link href={`/leads/${meeting.lead.id}`}>
                          <Button variant="ghost" size="sm">
                            View Lead
                          </Button>
                        </Link>
                      )}
                      {!hasBriefing && meeting.lead && (
                        <GenerateBriefingBtn
                          meetingId={meeting.id}
                          onDone={fetchMeetings}
                        />
                      )}
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

function GenerateBriefingBtn({
  meetingId,
  onDone,
}: {
  meetingId: string;
  onDone: () => void;
}) {
  const [generating, setGenerating] = useState(false);

  async function generate() {
    setGenerating(true);
    try {
      await fetch("/api/briefings/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId }),
      });
      onDone();
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={generate} disabled={generating}>
      <Sparkles className="h-3 w-3" />
      {generating ? "..." : "Briefing"}
    </Button>
  );
}
