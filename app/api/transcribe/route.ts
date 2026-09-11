export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { audioBase64, fileName, mimeType } = body;

    if (!audioBase64) {
      return NextResponse.json({ error: "No audio data provided" }, { status: 400 });
    }

    // Use LLM API to transcribe via audio analysis
    const response = await fetch("https://apps.abacus.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gemini-3.8-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "file",
                file: {
                  filename: fileName || "audio.webm",
                  file_data: `data:${mimeType || "audio/webm"};base64,${audioBase64}`,
                },
              },
              {
                type: "text",
                text: "Please transcribe this audio recording completely and accurately. Include speaker labels if you can detect different speakers (Speaker 1, Speaker 2, etc.). Output ONLY the transcript text, nothing else. If the audio is unclear or silent, say '[inaudible]' for those parts.",
              },
            ],
          },
        ],
        max_tokens: 8000,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "Unknown error");
      console.error("Transcription API error:", errText);
      return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
    }

    // Stream the response back
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        if (!reader) { controller.close(); return; }
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            controller.enqueue(encoder.encode(chunk));
          }
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Transcribe error:", error);
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
  }
}
