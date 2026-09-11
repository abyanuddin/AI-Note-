export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { question, transcript, documentTexts, meetingSummary } = await request.json();
    if (!question) return NextResponse.json({ error: "No question" }, { status: 400 });

    let contextStr = "";
    if (transcript) contextStr += `\n\nMEETING TRANSCRIPT:\n${transcript}`;
    if (meetingSummary) contextStr += `\n\nMEETING SUMMARY:\n${meetingSummary}`;
    if (documentTexts && Array.isArray(documentTexts)) {
      documentTexts.forEach((dt: any, i: number) => {
        contextStr += `\n\nDOCUMENT ${i + 1} (${dt?.title ?? "Untitled"}):\n${dt?.text ?? ""}`;
      });
    }

    const systemPrompt = `You are MeetMind AI, an intelligent assistant that helps compose meeting notes and answer questions about meeting content. You have access to the meeting transcript, summary, and uploaded documents as context. Be helpful, concise, and accurate. Format your response with clear markdown when appropriate.`;

    const response = await fetch("https://apps.abacus.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Context:${contextStr}\n\nQuestion/Request: ${question}` },
        ],
        max_tokens: 3000,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("AI Ask error:", errText);
      return NextResponse.json({ error: "AI request failed" }, { status: 500 });
    }

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
            controller.enqueue(encoder.encode(decoder.decode(value)));
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
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (error: any) {
    console.error("AI Ask error:", error);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
