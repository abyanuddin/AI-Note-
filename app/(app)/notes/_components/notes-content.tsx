"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { FileText, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Note {
  id: string;
  title: string;
  content: string | null;
  meetingId: string | null;
  updatedAt: string;
}

export function NotesContent() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notes");
      if (res.ok) { const d = await res.json(); setNotes(d?.notes ?? []); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const deleteNote = async (id: string) => {
    if (!confirm("Delete this note?")) return;
    const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Deleted"); load(); }
    else toast.error("Failed");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold tracking-tight">Notes</h2>
        <p className="text-muted-foreground mt-1">All your composed notes across meetings.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (notes?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FileText className="h-12 w-12 mb-4 opacity-40" />
            <p className="text-lg font-medium">No notes yet</p>
            <p className="text-sm mt-1">Create notes from a meeting&apos;s Smart Composer.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notes.map((n: Note) => (
            <Card key={n.id} className="hover:bg-accent/30 transition-colors">
              <CardContent className="flex items-center justify-between p-4">
                <Link href={n.meetingId ? `/meeting/${n.meetingId}?tab=composer` : "#"} className="flex-1 min-w-0">
                  <p className="font-medium truncate">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Updated {formatDistanceToNow(new Date(n.updatedAt), { addSuffix: true })}
                  </p>
                </Link>
                <Button variant="ghost" size="sm" onClick={() => deleteNote(n.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
