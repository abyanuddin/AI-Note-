"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, FileText, CheckSquare, HelpCircle, CalendarCheck, MessageSquare,
  ChevronDown, ChevronUp, Copy, Download, Trash2, Sparkles, Brain
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { NoteComposer } from "./note-composer";

interface ActionItem {
  id: string;
  task: string;
  assignee: string | null;
  dueDate: string | null;
  priority: string;
  completed: boolean;
}

interface MeetingDoc {
  id: string;
  document: {
    id: string;
    title: string;
    extractedText: string | null;
  };
}

interface Meeting {
  id: string;
  title: string;
  date: string;
  status: string;
  transcript: string | null;
  executiveSummary: string | null;
  keyPoints: string | null;
  decisions: string | null;
  openQuestions: string | null;
  followUps: string | null;
  actionItems: ActionItem[];
  meetingDocs: MeetingDoc[];
  notes: any[];
}

export function MeetingDetailContent({ meetingId }: { meetingId: string }) {
  const router = useRouter();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    summary: true, keyPoints: true, decisions: true, actions: true, questions: false, followUps: false, transcript: false,
  });

  const loadMeeting = useCallback(async () => {
    try {
      const res = await fetch(`/api/meetings/${meetingId}`);
      if (res.ok) {
        const data = await res.json();
        setMeeting(data?.meeting ?? null);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [meetingId]);

  useEffect(() => { loadMeeting(); }, [loadMeeting]);

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    toast.success("Copied to clipboard");
  };

  const parseJsonArray = (str: string | null): string[] => {
    if (!str) return [];
    try { return JSON.parse(str); } catch { return []; }
  };

  const exportMarkdown = () => {
    if (!meeting) return;
    const kp = parseJsonArray(meeting.keyPoints);
    const dec = parseJsonArray(meeting.decisions);
    const oq = parseJsonArray(meeting.openQuestions);
    const fu = parseJsonArray(meeting.followUps);
    let md = `# ${meeting.title}\n\n`;
    md += `## Executive Summary\n${meeting.executiveSummary ?? "N/A"}\n\n`;
    if (kp.length) md += `## Key Points\n${kp.map((p: string) => `- ${p}`).join("\n")}\n\n`;
    if (dec.length) md += `## Decisions\n${dec.map((d: string) => `- ${d}`).join("\n")}\n\n`;
    if ((meeting.actionItems?.length ?? 0) > 0) {
      md += `## Action Items\n${(meeting.actionItems ?? []).map((a: ActionItem) =>
        `- [${a.completed ? "x" : " "}] ${a.task}${a.assignee ? " (@" + a.assignee + ")" : ""}${a.dueDate ? " due " + a.dueDate : ""} [${a.priority}]`
      ).join("\n")}\n\n`;
    }
    if (oq.length) md += `## Open Questions\n${oq.map((q: string) => `- ${q}`).join("\n")}\n\n`;
    if (fu.length) md += `## Follow-ups\n${fu.map((f: string) => `- ${f}`).join("\n")}\n\n`;
    if (meeting.transcript) md += `## Transcript\n${meeting.transcript}\n`;

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${meeting.title.replace(/[^a-zA-Z0-9]/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteMeeting = async () => {
    if (!confirm("Delete this meeting?")) return;
    const res = await fetch(`/api/meetings/${meetingId}`, { method: "DELETE" });
    if (res.ok) { toast.success("Meeting deleted"); router.push("/dashboard"); }
    else toast.error("Failed to delete");
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!meeting) return <div className="text-center py-12 text-muted-foreground">Meeting not found</div>;

  const keyPoints = parseJsonArray(meeting.keyPoints);
  const decisions = parseJsonArray(meeting.decisions);
  const openQuestions = parseJsonArray(meeting.openQuestions);
  const followUps = parseJsonArray(meeting.followUps);

  return (
    <div className="max-w-5xl mx-auto">
      <Tabs defaultValue="summary" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-display font-bold tracking-tight">{meeting.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date(meeting.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={exportMarkdown}>
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 text-destructive" onClick={deleteMeeting}>
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        </div>

        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="composer">Smart Composer</TabsTrigger>
          <TabsTrigger value="transcript">Full Transcript</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          {meeting.status === "processing" && (
            <Card>
              <CardContent className="flex items-center gap-3 p-5">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span>Processing meeting... This may take a moment.</span>
              </CardContent>
            </Card>
          )}

          {/* Executive Summary */}
          <CollapsibleCard
            title="Executive Summary"
            icon={<Brain className="h-4 w-4 text-primary" />}
            expanded={expandedSections.summary ?? true}
            onToggle={() => toggleSection("summary")}
            onCopy={() => copyToClipboard(meeting.executiveSummary ?? "")}
          >
            <p className="text-sm leading-relaxed">{meeting.executiveSummary ?? "No summary available"}</p>
          </CollapsibleCard>

          {/* Key Points */}
          <CollapsibleCard
            title={`Key Discussion Points (${keyPoints.length})`}
            icon={<MessageSquare className="h-4 w-4 text-blue-500" />}
            expanded={expandedSections.keyPoints ?? true}
            onToggle={() => toggleSection("keyPoints")}
            onCopy={() => copyToClipboard(keyPoints.join("\n"))}
          >
            <ul className="space-y-2">
              {keyPoints.map((p: string, i: number) => (
                <li key={i} className="text-sm flex gap-2"><span className="text-primary mt-0.5">•</span>{p}</li>
              ))}
            </ul>
          </CollapsibleCard>

          {/* Decisions */}
          {decisions.length > 0 && (
            <CollapsibleCard
              title={`Decisions Made (${decisions.length})`}
              icon={<CheckSquare className="h-4 w-4 text-emerald-500" />}
              expanded={expandedSections.decisions ?? true}
              onToggle={() => toggleSection("decisions")}
              onCopy={() => copyToClipboard(decisions.join("\n"))}
            >
              <ul className="space-y-2">
                {decisions.map((d: string, i: number) => (
                  <li key={i} className="text-sm flex gap-2"><CheckSquare className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />{d}</li>
                ))}
              </ul>
            </CollapsibleCard>
          )}

          {/* Action Items */}
          {(meeting.actionItems?.length ?? 0) > 0 && (
            <CollapsibleCard
              title={`Action Items (${meeting.actionItems?.length ?? 0})`}
              icon={<Sparkles className="h-4 w-4 text-amber-500" />}
              expanded={expandedSections.actions ?? true}
              onToggle={() => toggleSection("actions")}
              onCopy={() => copyToClipboard(
                (meeting.actionItems ?? []).map((a: ActionItem) => `${a.task} (${a.assignee ?? "unassigned"}) [${a.priority}]`).join("\n")
              )}
            >
              <div className="space-y-3">
                {(meeting.actionItems ?? []).map((a: ActionItem) => (
                  <div key={a.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{a.task}</p>
                      <div className="flex items-center gap-3 mt-1">
                        {a.assignee && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">@{a.assignee}</span>}
                        {a.dueDate && <span className="text-xs text-muted-foreground">Due: {a.dueDate}</span>}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          a.priority === "High" ? "bg-red-500/10 text-red-500" :
                          a.priority === "Low" ? "bg-blue-500/10 text-blue-500" :
                          "bg-amber-500/10 text-amber-500"
                        }`}>{a.priority}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleCard>
          )}

          {/* Open Questions */}
          {openQuestions.length > 0 && (
            <CollapsibleCard
              title={`Open Questions (${openQuestions.length})`}
              icon={<HelpCircle className="h-4 w-4 text-orange-500" />}
              expanded={expandedSections.questions ?? false}
              onToggle={() => toggleSection("questions")}
              onCopy={() => copyToClipboard(openQuestions.join("\n"))}
            >
              <ul className="space-y-2">
                {openQuestions.map((q: string, i: number) => (
                  <li key={i} className="text-sm flex gap-2"><HelpCircle className="h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0" />{q}</li>
                ))}
              </ul>
            </CollapsibleCard>
          )}

          {/* Follow-ups */}
          {followUps.length > 0 && (
            <CollapsibleCard
              title={`Follow-ups (${followUps.length})`}
              icon={<CalendarCheck className="h-4 w-4 text-violet-500" />}
              expanded={expandedSections.followUps ?? false}
              onToggle={() => toggleSection("followUps")}
              onCopy={() => copyToClipboard(followUps.join("\n"))}
            >
              <ul className="space-y-2">
                {followUps.map((f: string, i: number) => (
                  <li key={i} className="text-sm flex gap-2"><CalendarCheck className="h-3.5 w-3.5 text-violet-500 mt-0.5 shrink-0" />{f}</li>
                ))}
              </ul>
            </CollapsibleCard>
          )}
        </TabsContent>

        <TabsContent value="composer">
          <NoteComposer meeting={meeting} />
        </TabsContent>

        <TabsContent value="transcript">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" /> Full Transcript
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(meeting.transcript ?? "")}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent>
              <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed text-muted-foreground">
                {meeting.transcript ?? "No transcript available"}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CollapsibleCard({
  title, icon, expanded, onToggle, onCopy, children,
}: {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  onCopy: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between cursor-pointer py-3 px-5" onClick={onToggle}>
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={(e: React.MouseEvent) => { e.stopPropagation(); onCopy(); }}>
            <Copy className="h-3 w-3" />
          </Button>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </CardHeader>
      {expanded && <CardContent className="pt-0 px-5 pb-5">{children}</CardContent>}
    </Card>
  );
}
