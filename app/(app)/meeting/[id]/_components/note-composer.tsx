"use client";

import { useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Sparkles, Send, Loader2, Plus, FileText, Download, Copy, Brain,
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Heading2, Quote, Undo, Redo, Highlighter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const TiptapEditor = dynamic(() => import("./tiptap-editor"), { ssr: false, loading: () => <div className="h-64 bg-muted/30 rounded-lg animate-pulse" /> });

interface Meeting {
  id: string;
  title: string;
  transcript: string | null;
  executiveSummary: string | null;
  keyPoints: string | null;
  decisions: string | null;
  openQuestions: string | null;
  followUps: string | null;
  actionItems: any[];
  meetingDocs: any[];
  notes: any[];
}

export function NoteComposer({ meeting }: { meeting: Meeting }) {
  const [noteId, setNoteId] = useState<string | null>(meeting.notes?.[0]?.id ?? null);
  const [noteTitle, setNoteTitle] = useState(meeting.notes?.[0]?.title ?? `Notes: ${meeting.title}`);
  const [content, setContent] = useState(meeting.notes?.[0]?.content ?? "");
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<any>(null);

  const saveNote = useCallback(async (newContent?: string) => {
    setSaving(true);
    try {
      const body = { title: noteTitle, content: newContent ?? content, meetingId: meeting.id };
      if (noteId) {
        await fetch(`/api/notes/${noteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const data = await res.json();
          setNoteId(data?.note?.id ?? null);
        }
      }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }, [noteId, noteTitle, content, meeting.id]);

  const insertAiContent = (sectionKey: string) => {
    let text = "";
    const parseJson = (s: string | null) => { try { return JSON.parse(s ?? "[]"); } catch { return []; } };

    switch (sectionKey) {
      case "summary": text = meeting.executiveSummary ?? ""; break;
      case "keyPoints": text = parseJson(meeting.keyPoints).map((p: string) => `• ${p}`).join("\n"); break;
      case "decisions": text = parseJson(meeting.decisions).map((d: string) => `✓ ${d}`).join("\n"); break;
      case "actions":
        text = (meeting.actionItems ?? []).map((a: any) =>
          `□ ${a.task}${a.assignee ? " (@" + a.assignee + ")" : ""}${a.dueDate ? " - Due: " + a.dueDate : ""} [${a.priority}]`
        ).join("\n");
        break;
      case "questions": text = parseJson(meeting.openQuestions).map((q: string) => `? ${q}`).join("\n"); break;
    }
    if (text && editorRef.current) {
      editorRef.current.commands?.insertContent("\n" + text + "\n");
    }
  };

  const askAi = async () => {
    if (!aiQuestion.trim()) return;
    setAiLoading(true);
    setAiResponse("");
    try {
      const docTexts = (meeting.meetingDocs ?? []).map((md: any) => ({
        title: md?.document?.title ?? "Document",
        text: md?.document?.extractedText ?? "",
      }));

      const res = await fetch("/api/ai-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: aiQuestion,
          transcript: meeting.transcript ?? "",
          meetingSummary: meeting.executiveSummary ?? "",
          documentTexts: docTexts,
        }),
      });

      if (!res.ok) throw new Error("AI request failed");

      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let result = "";
      let partialRead = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        partialRead += decoder.decode(value, { stream: true });
        const lines = partialRead.split("\n");
        partialRead = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const chunk = parsed?.choices?.[0]?.delta?.content ?? "";
              result += chunk;
              setAiResponse(result);
            } catch { /* skip */ }
          }
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("AI request failed");
    } finally {
      setAiLoading(false);
    }
  };

  const insertAiResponse = () => {
    if (aiResponse && editorRef.current) {
      editorRef.current.commands?.insertContent("\n" + aiResponse + "\n");
      toast.success("AI content inserted");
    }
  };

  const exportNote = () => {
    const text = editorRef.current?.getText?.() ?? content;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${noteTitle.replace(/[^a-zA-Z0-9]/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <input
          type="text"
          value={noteTitle}
          onChange={(e) => setNoteTitle(e.target.value)}
          className="text-lg font-semibold bg-transparent border-none outline-none w-full"
          placeholder="Note title..."
        />
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setShowAiPanel(!showAiPanel)} className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Ask AI
          </Button>
          <Button variant="outline" size="sm" onClick={exportNote} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button size="sm" onClick={() => saveNote()} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Save
          </Button>
        </div>
      </div>

      {/* Insert AI Content buttons */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-muted-foreground self-center mr-1">Insert:</span>
        {[
          { key: "summary", label: "Summary" },
          { key: "keyPoints", label: "Key Points" },
          { key: "decisions", label: "Decisions" },
          { key: "actions", label: "Action Items" },
          { key: "questions", label: "Questions" },
        ].map((s) => (
          <Button key={s.key} variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => insertAiContent(s.key)}>
            <Plus className="h-3 w-3" /> {s.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Editor */}
        <div className={showAiPanel ? "lg:col-span-2" : "lg:col-span-3"}>
          <Card className="tiptap-editor">
            <CardContent className="p-0">
              <TiptapEditor
                content={content}
                onUpdate={(html: string) => { setContent(html); }}
                editorRef={editorRef}
              />
            </CardContent>
          </Card>
        </div>

        {/* AI Panel */}
        {showAiPanel && (
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" /> AI Assistant
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="Ask about the meeting, combine with documents, or request content..."
                  value={aiQuestion}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAiQuestion(e.target.value)}
                  rows={3}
                  className="text-sm"
                />
                <Button size="sm" onClick={askAi} disabled={aiLoading || !aiQuestion.trim()} className="w-full gap-1.5">
                  {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  {aiLoading ? "Thinking..." : "Ask"}
                </Button>
                {aiResponse && (
                  <div className="space-y-2">
                    <div className="bg-muted/50 rounded-lg p-3 max-h-64 overflow-y-auto">
                      <p className="text-sm whitespace-pre-wrap">{aiResponse}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={insertAiResponse}>
                        <Plus className="h-3 w-3" /> Insert
                      </Button>
                      <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={() => { navigator.clipboard?.writeText(aiResponse); toast.success("Copied"); }}>
                        <Copy className="h-3 w-3" /> Copy
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
