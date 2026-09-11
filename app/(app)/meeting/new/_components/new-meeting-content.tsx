"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Mic, MicOff, Upload, FileText, Loader2, Play, Square, Trash2,
  Brain, Sparkles, AlertCircle, CheckCircle2, File, X, Monitor, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface UploadedFile {
  file: File;
  name: string;
  type: string;
  status: "pending" | "uploading" | "uploaded" | "error";
  cloudStoragePath?: string;
  extractedText?: string;
}

export function NewMeetingContent() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [pastedTranscript, setPastedTranscript] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [recording, setRecording] = useState(false);
  const [recordSource, setRecordSource] = useState<"mic" | "meeting">("mic");
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<"input" | "transcribing" | "summarizing">("input");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeStreamsRef = useRef<MediaStream[]>([]);

  // --- Recording ---
  const startRecording = async (source: "mic" | "meeting") => {
    try {
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const destination = audioCtx.createMediaStreamDestination();
      activeStreamsRef.current = [];

      if (source === "meeting") {
        // Capture the meeting audio (all participants) from the shared tab/window/screen.
        let displayStream: MediaStream;
        try {
          displayStream = await navigator.mediaDevices.getDisplayMedia({
            audio: true,
            video: true, // video track is required by most browsers to expose an audio track
          });
        } catch (e) {
          console.error(e);
          toast.error("Screen/tab share was cancelled. Pick your meeting tab or window and enable 'Share audio'.");
          audioCtx.close();
          return;
        }
        const displayAudioTracks = displayStream.getAudioTracks();
        if (displayAudioTracks.length === 0) {
          displayStream.getTracks().forEach((t) => t.stop());
          audioCtx.close();
          toast.error("No meeting audio was captured. When sharing, choose the tab/window running your meeting and turn ON 'Share tab audio' / 'Share system audio'.");
          return;
        }
        // We only need the audio; drop the video track to save resources.
        displayStream.getVideoTracks().forEach((t) => t.stop());
        activeStreamsRef.current.push(displayStream);
        const displaySource = audioCtx.createMediaStreamSource(
          new MediaStream(displayAudioTracks)
        );
        displaySource.connect(destination);

        // Also try to capture the user's own microphone so their voice is included.
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          activeStreamsRef.current.push(micStream);
          const micSource = audioCtx.createMediaStreamSource(micStream);
          micSource.connect(destination);
        } catch {
          toast("Recording meeting audio only (microphone unavailable).");
        }
      } else {
        // Microphone only (in-person meetings).
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        activeStreamsRef.current.push(micStream);
        const micSource = audioCtx.createMediaStreamSource(micStream);
        micSource.connect(destination);
      }

      const mixedStream = destination.stream;
      streamRef.current = mixedStream;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      audioCtx.createMediaStreamSource(mixedStream).connect(analyser);
      analyserRef.current = analyser;

      const mr = new MediaRecorder(mixedStream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e: BlobEvent) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setRecordedBlob(blob);
        activeStreamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
        activeStreamsRef.current = [];
        audioCtxRef.current?.close();
        audioCtxRef.current = null;
      };
      // If the user stops the tab share from the browser bar, stop recording too.
      activeStreamsRef.current.forEach((s) =>
        s.getTracks().forEach((t) => {
          t.onended = () => { if (mediaRecorderRef.current?.state === "recording") stopRecording(); };
        })
      );
      mr.start(250);
      mediaRecorderRef.current = mr;
      setRecording(true);
      drawWaveform();
    } catch (err) {
      console.error(err);
      toast.error(source === "meeting" ? "Could not capture meeting audio" : "Could not access microphone");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    cancelAnimationFrame(animFrameRef.current);
  };

  const drawWaveform = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);
      ctx.fillStyle = "hsl(240 8% 10%)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "hsl(250 80% 65%)";
      ctx.beginPath();
      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = (dataArray[i] ?? 128) / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };
    draw();
  };

  // --- File upload ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? []);
    const newFiles: UploadedFile[] = selectedFiles.map((f) => ({
      file: f, name: f.name, type: f.type, status: "pending" as const,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const uploadFile = async (uf: UploadedFile): Promise<UploadedFile> => {
    try {
      // Get presigned URL
      const presignRes = await fetch("/api/upload/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: uf.name, contentType: uf.type, isPublic: false }),
      });
      if (!presignRes.ok) throw new Error("Failed to get upload URL");
      const { uploadUrl, cloud_storage_path } = await presignRes.json();

      // Upload directly to S3
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": uf.type },
        body: uf.file,
      });
      if (!uploadRes.ok) throw new Error("Upload failed");

      // Extract text for text/PDF files
      let extractedText = "";
      if (uf.type === "text/plain" || uf.type === "text/markdown" || uf.name.endsWith(".md") || uf.name.endsWith(".txt")) {
        extractedText = await uf.file.text();
      }

      return { ...uf, status: "uploaded", cloudStoragePath: cloud_storage_path, extractedText };
    } catch (err) {
      console.error(err);
      return { ...uf, status: "error" };
    }
  };

  // --- Process meeting ---
  const processMeeting = async () => {
    setProcessing(true);
    try {
      // 1. Create meeting
      const meetingRes = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title || "Meeting " + new Date().toLocaleDateString("en-US", { timeZone: "UTC" }) }),
      });
      if (!meetingRes.ok) throw new Error("Failed to create meeting");
      const { meeting } = await meetingRes.json();

      // 2. Upload files
      setStep("input");
      const uploadedFiles: UploadedFile[] = [];
      for (let i = 0; i < files.length; i++) {
        const uploaded = await uploadFile(files[i]);
        uploadedFiles.push(uploaded);
        setFiles((prev) => prev.map((f, idx) => (idx === i ? uploaded : f)));
      }

      // Save documents to DB
      for (const uf of uploadedFiles) {
        if (uf.status === "uploaded" && uf.cloudStoragePath) {
          await fetch("/api/documents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: uf.name,
              fileName: uf.name,
              contentType: uf.type,
              cloudStoragePath: uf.cloudStoragePath,
              extractedText: uf.extractedText ?? null,
              fileSize: uf.file.size,
            }),
          });
        }
      }

      // 3. Transcribe audio if needed
      let fullTranscript = pastedTranscript;

      // Add text from text files
      for (const uf of uploadedFiles) {
        if (uf.extractedText) fullTranscript += "\n\n" + uf.extractedText;
      }

      // Transcribe recorded audio
      if (recordedBlob) {
        setStep("transcribing");
        const base64 = await blobToBase64(recordedBlob);
        const transcriptText = await transcribeAudio(base64, "recording.webm", "audio/webm");
        fullTranscript = transcriptText + (fullTranscript ? "\n\n" + fullTranscript : "");
      }

      // Transcribe audio/video files via FFmpeg + transcription
      for (const uf of uploadedFiles) {
        if (uf.status === "uploaded" && uf.cloudStoragePath &&
          (uf.type.startsWith("audio/") || uf.type.startsWith("video/"))) {
          setStep("transcribing");
          try {
            // Extract audio via FFmpeg
            const ffRes = await fetch("/api/ffmpeg-process", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ cloudStoragePath: uf.cloudStoragePath, contentType: uf.type, isPublic: false }),
            });
            if (ffRes.ok) {
              const ffData = await ffRes.json();
              if (ffData?.success && ffData.outputUrl) {
                // Download the extracted audio and transcribe
                const audioRes = await fetch(ffData.outputUrl);
                if (audioRes.ok) {
                  const audioBlob = await audioRes.blob();
                  const audioBase64 = await blobToBase64(audioBlob);
                  const transcriptText = await transcribeAudio(audioBase64, uf.name + ".mp3", "audio/mpeg");
                  fullTranscript += "\n\n" + transcriptText;
                }
              }
            }
          } catch (err) {
            console.error("Audio processing error for", uf.name, err);
          }
        }
      }

      setTranscript(fullTranscript);

      // 4. Get additional context from PDFs
      let additionalContext = "";
      for (const uf of uploadedFiles) {
        if (uf.type === "application/pdf" && uf.cloudStoragePath) {
          // PDF text extraction via LLM
          try {
            const pdfFile = uf.file;
            const pdfBase64 = await blobToBase64(pdfFile);
            const pdfRes = await fetch("/api/ai-ask", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                question: "Please extract and return all the text content from this PDF document. Return only the extracted text, no commentary.",
                transcript: "",
                documentTexts: [{ title: uf.name, text: `[PDF content sent as base64 for extraction]` }],
              }),
            });
            // For PDF extraction we just get the text
            if (pdfRes.ok) {
              const pdfText = await readStreamAsText(pdfRes);
              additionalContext += `\n\nDocument: ${uf.name}\n${pdfText}`;
            }
          } catch (err) {
            console.error("PDF extraction error:", err);
          }
        }
      }

      if (!fullTranscript.trim()) {
        toast.error("No transcript content found. Please provide audio, text, or paste a transcript.");
        setProcessing(false);
        setStep("input");
        return;
      }

      // 5. Summarize
      setStep("summarizing");
      await fetch("/api/meetings/" + meeting.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: fullTranscript, status: "processing" }),
      });

      const sumRes = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingId: meeting.id,
          transcript: fullTranscript,
          additionalContext,
        }),
      });

      if (sumRes.ok) {
        const reader = sumRes.body?.getReader();
        const decoder = new TextDecoder();
        if (reader) {
          let partialRead = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            partialRead += decoder.decode(value, { stream: true });
            const lines = partialRead.split("\n");
            partialRead = lines.pop() ?? "";
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const parsed = JSON.parse(line.slice(6));
                  if (parsed.status === "completed") {
                    toast.success("Meeting processed successfully!");
                    router.push(`/meeting/${meeting.id}`);
                    return;
                  }
                  if (parsed.status === "error") {
                    toast.error(parsed.message || "Summarization failed");
                  }
                } catch { /* skip */ }
              }
            }
          }
        }
      }

      // Fallback: go to meeting page even if stream didn't complete cleanly
      router.push(`/meeting/${meeting.id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? "Processing failed");
    } finally {
      setProcessing(false);
      setStep("input");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold tracking-tight">New Meeting</h2>
        <p className="text-muted-foreground mt-1">Capture meeting content from multiple sources and get AI-powered summaries.</p>
      </div>

      {/* Title */}
      <Card>
        <CardContent className="p-5">
          <Label htmlFor="title" className="text-sm font-medium">Meeting Title</Label>
          <Input
            id="title"
            placeholder="e.g. Weekly Team Standup, Q3 Planning"
            value={title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            className="mt-2"
          />
        </CardContent>
      </Card>

      {/* Live Recording */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mic className="h-4 w-4 text-primary" /> Live Recording
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Recording source selector */}
          {!recording && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRecordSource("mic")}
                className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${recordSource === "mic" ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"}`}
              >
                <Mic className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium">My microphone</p>
                  <p className="text-xs text-muted-foreground">In-person meetings &amp; personal notes</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setRecordSource("meeting")}
                className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${recordSource === "meeting" ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"}`}
              >
                <Monitor className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium">Online meeting <span className="text-muted-foreground font-normal">(Teams / Zoom / Meet)</span></p>
                  <p className="text-xs text-muted-foreground">Captures all participants + your mic</p>
                </div>
              </button>
            </div>
          )}

          {recordSource === "meeting" && !recording && (
            <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
              <Users className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>
                When you click <b>Start Recording</b>, your browser will ask what to share. Choose the <b>tab or window running your meeting</b> (or your whole screen) and make sure <b>&ldquo;Share tab audio&rdquo; / &ldquo;Share system audio&rdquo;</b> is turned ON. This records everyone&rsquo;s voices, not just yours. Works best in Chrome or Edge on desktop.
              </span>
            </div>
          )}

          <div className="flex items-center gap-3">
            {!recording ? (
              <Button onClick={() => startRecording(recordSource)} variant="outline" className="gap-2" disabled={processing}>
                {recordSource === "meeting" ? <Monitor className="h-4 w-4" /> : <Mic className="h-4 w-4" />} Start Recording
              </Button>
            ) : (
              <Button onClick={stopRecording} variant="destructive" className="gap-2">
                <Square className="h-4 w-4" /> Stop Recording
              </Button>
            )}
            {recording && (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                Recording {recordSource === "meeting" ? "meeting audio" : "microphone"}…
              </span>
            )}
            {recordedBlob && !recording && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-sm text-muted-foreground">Audio recorded ({(recordedBlob.size / 1024).toFixed(0)} KB)</span>
                <Button variant="ghost" size="sm" onClick={() => setRecordedBlob(null)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          {recording && (
            <canvas ref={canvasRef} width={600} height={80} className="w-full h-20 rounded-lg bg-card border border-border" />
          )}
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" /> Upload Files
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Upload audio, video, text, or PDF files. Multiple files can be combined.</p>
          <Input
            type="file"
            multiple
            accept=".mp3,.wav,.m4a,.webm,.mp4,.mov,.mkv,.txt,.md,.pdf"
            onChange={handleFileSelect}
            disabled={processing}
          />
          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                  <File className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm flex-1 truncate">{f.name}</span>
                  <span className="text-xs text-muted-foreground">{(f.file.size / 1024).toFixed(0)} KB</span>
                  {f.status === "uploading" && <Loader2 className="h-3 w-3 animate-spin" />}
                  {f.status === "uploaded" && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                  {f.status === "error" && <AlertCircle className="h-3 w-3 text-destructive" />}
                  <Button variant="ghost" size="sm" onClick={() => removeFile(i)} disabled={processing}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paste Transcript */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Paste Transcript
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Paste your meeting transcript here..."
            value={pastedTranscript}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPastedTranscript(e.target.value)}
            rows={6}
            disabled={processing}
          />
        </CardContent>
      </Card>

      {/* Process Button */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push("/dashboard")} disabled={processing}>
          Cancel
        </Button>
        <Button
          onClick={processMeeting}
          disabled={processing || (!pastedTranscript.trim() && !recordedBlob && files.length === 0)}
          className="gap-2"
        >
          {processing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {step === "transcribing" ? "Transcribing..." : step === "summarizing" ? "Summarizing..." : "Processing..."}
            </>
          ) : (
            <><Sparkles className="h-4 w-4" /> Process Meeting</>
          )}
        </Button>
      </div>
    </div>
  );
}

// Utils
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function transcribeAudio(base64: string, fileName: string, mimeType: string): Promise<string> {
  const res = await fetch("/api/transcribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audioBase64: base64, fileName, mimeType }),
  });
  if (!res.ok) throw new Error("Transcription failed");
  return readStreamAsText(res);
}

async function readStreamAsText(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let result = "";
  let partialRead = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    partialRead += decoder.decode(value, { stream: true });
    // Parse SSE format
    const lines = partialRead.split("\n");
    partialRead = lines.pop() ?? "";
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data);
          result += parsed?.choices?.[0]?.delta?.content ?? "";
        } catch { /* skip */ }
      }
    }
  }
  // Handle remaining
  if (partialRead) {
    const remainingLines = partialRead.split("\n");
    for (const line of remainingLines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data);
          result += parsed?.choices?.[0]?.delta?.content ?? "";
        } catch { /* skip */ }
      }
    }
  }
  return result;
}
