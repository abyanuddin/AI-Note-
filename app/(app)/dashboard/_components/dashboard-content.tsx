"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Brain, FileText, FolderOpen, Clock, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

interface Meeting {
  id: string;
  title: string;
  date: string;
  status: string;
  executiveSummary: string | null;
  duration: number | null;
  _count?: { actionItems: number };
}

interface Note {
  id: string;
  title: string;
  updatedAt: string;
  meetingId: string | null;
}

export function DashboardContent() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [stats, setStats] = useState({ meetings: 0, documents: 0, notes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [mRes, nRes, sRes] = await Promise.all([
          fetch("/api/meetings?limit=5"),
          fetch("/api/notes?limit=5"),
          fetch("/api/meetings/stats"),
        ]);
        if (mRes.ok) { const d = await mRes.json(); setMeetings(d?.meetings ?? []); }
        if (nRes.ok) { const d = await nRes.json(); setNotes(d?.notes ?? []); }
        if (sRes.ok) { const d = await sRes.json(); setStats(d ?? { meetings: 0, documents: 0, notes: 0 }); }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold tracking-tight">Your Workspace</h2>
          <p className="text-muted-foreground mt-1">Capture, summarize, and compose smarter meeting notes.</p>
        </div>
        <Link href="/meeting/new">
          <Button className="gap-2"><Plus className="h-4 w-4" /> New Meeting</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Meetings", value: stats.meetings, icon: Brain, color: "text-primary" },
          { label: "Documents", value: stats.documents, icon: FolderOpen, color: "text-emerald-500" },
          { label: "Notes", value: stats.notes, icon: FileText, color: "text-amber-500" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-display font-semibold">Recent Meetings</h3>
        </div>
        {(meetings?.length ?? 0) === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Brain className="h-10 w-10 mb-3 opacity-40" />
              <p>No meetings yet. Start your first one!</p>
              <Link href="/meeting/new"><Button variant="outline" className="mt-4 gap-2"><Plus className="h-4 w-4" />New Meeting</Button></Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {meetings.map((m: Meeting) => (
              <Link key={m.id} href={`/meeting/${m.id}`}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{m.title}</p>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {m.executiveSummary ? (m.executiveSummary.substring(0, 120) + "...") : "No summary yet"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        m.status === "completed" ? "bg-emerald-500/10 text-emerald-500" :
                        m.status === "processing" ? "bg-amber-500/10 text-amber-500" :
                        "bg-muted text-muted-foreground"
                      }`}>{m.status}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(m.date), { addSuffix: true })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-display font-semibold mb-4">Recent Notes</h3>
        {(notes?.length ?? 0) === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mb-3 opacity-40" />
              <p>No notes yet. Create one from a meeting session.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {notes.map((n: Note) => (
              <Link key={n.id} href={n.meetingId ? `/meeting/${n.meetingId}?tab=composer` : "/notes"}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <p className="font-medium truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Updated {formatDistanceToNow(new Date(n.updatedAt), { addSuffix: true })}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
