"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Upload, FolderOpen, File, Trash2, Loader2, Search, FileText, FileImage, FileAudio, FileVideo, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Doc {
  id: string;
  title: string;
  fileName: string;
  contentType: string;
  extractedText: string | null;
  category: string | null;
  fileSize: number | null;
  createdAt: string;
}

const fileIcon = (ct: string) => {
  if (ct?.startsWith("audio/")) return FileAudio;
  if (ct?.startsWith("video/")) return FileVideo;
  if (ct?.startsWith("image/")) return FileImage;
  if (ct === "application/pdf") return FileText;
  return File;
};

export function LibraryContent() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      if (res.ok) { const d = await res.json(); setDocs(d?.documents ?? []); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const presignRes = await fetch("/api/upload/presigned", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: file.name, contentType: file.type, isPublic: false }),
        });
        if (!presignRes.ok) throw new Error("Upload URL failed");
        const { uploadUrl, cloud_storage_path } = await presignRes.json();

        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!uploadRes.ok) throw new Error("Upload failed");

        let extractedText = null;
        if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
          extractedText = await file.text();
        }

        await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: file.name,
            fileName: file.name,
            contentType: file.type,
            cloudStoragePath: cloud_storage_path,
            extractedText,
            fileSize: file.size,
          }),
        });
      }
      toast.success(`${files.length} file(s) uploaded`);
      load();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const deleteDoc = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Deleted"); load(); }
    else toast.error("Failed to delete");
  };

  const filtered = docs.filter((d) =>
    d.title?.toLowerCase().includes(search.toLowerCase()) ||
    d.category?.toLowerCase()?.includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold tracking-tight">Document Library</h2>
          <p className="text-muted-foreground mt-1">Upload and manage research papers, meeting agendas, and reference documents.</p>
        </div>
        <div>
          <input
            id="library-upload"
            type="file"
            multiple
            accept=".pdf,.txt,.md,.doc,.docx"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
          <Button className="gap-2" disabled={uploading} onClick={() => document.getElementById("library-upload")?.click()}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload Files
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search documents..."
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FolderOpen className="h-12 w-12 mb-4 opacity-40" />
            <p className="text-lg font-medium">No documents yet</p>
            <p className="text-sm mt-1">Upload PDFs, text files, or research papers to build your library.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc: Doc) => {
            const Icon = fileIcon(doc.contentType);
            return (
              <Card key={doc.id} className="hover:bg-accent/30 transition-colors">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{doc.title}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(0)} KB` : ""}
                      </span>
                      {doc.category && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{doc.category}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    {doc.extractedText && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {doc.extractedText.substring(0, 150)}...
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deleteDoc(doc.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
