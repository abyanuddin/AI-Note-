export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { meetingId, transcript, additionalContext } = await request.json();
    if (!transcript) return NextResponse.json({ error: "No transcript" }, { status: 400 });

    const systemPrompt = `You are an expert meeting analyst. Analyze the following meeting transcript and any additional context documents provided. Produce a comprehensive structured analysis.

You MUST respond with valid JSON in exactly this format:
{
  "executiveSummary": "3-5 sentence high-level overview of the meeting",
  "keyPoints": ["Point 1", "Point 2", ...],
  "decisions": ["Decision 1", "Decision 2", ...],
  "actionItems": [
    {
      "task": "Description of the task",
      "assignee": "Person name or null",
      "dueDate": "Date string or null",
      "priority": "High" or "Medium" or "Low"
    }
  ],
  "openQuestions": ["Question 1", "Question 2", ...],
  "followUps": ["Follow-up meeting or action 1", ...]
}

Respond with raw JSON only. Do not include code blocks, markdown, or any other formatting.`;

    let userContent = `MEETING TRANSCRIPT:\n${transcript}`;
    if (additionalContext) {
      userContent += `\n\nADDITIONAL CONTEXT/DOCUMENTS:\n${additionalContext}`;
    }

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
          { role: "user", content: userContent },
        ],
        max_tokens: 4000,
        stream: true,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("Summarize API error:", errText);
      return NextResponse.json({ error: "Summarization failed" }, { status: 500 });
    }

    // Buffer the JSON response while streaming progress to client
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        if (!reader) { controller.close(); return; }

        let buffer = "";
        let partialRead = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            partialRead += decoder.decode(value, { stream: true });
            const lines = partialRead.split("\n");
            partialRead = lines.pop() ?? "";
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") {
                  // Parse and save
                  try {
                    const parsed = JSON.parse(buffer);
                    if (meetingId) {
                      await prisma.meeting.updateMany({
                        where: { id: meetingId, userId: session.user.id },
                        data: {
                          executiveSummary: parsed.executiveSummary ?? null,
                          keyPoints: JSON.stringify(parsed.keyPoints ?? []),
                          decisions: JSON.stringify(parsed.decisions ?? []),
                          openQuestions: JSON.stringify(parsed.openQuestions ?? []),
                          followUps: JSON.stringify(parsed.followUps ?? []),
                          transcript: transcript,
                          status: "completed",
                        },
                      });
                      // Save action items
                      if (parsed.actionItems?.length) {
                        await prisma.actionItem.deleteMany({ where: { meetingId } });
                        await prisma.actionItem.createMany({
                          data: parsed.actionItems.map((ai: any) => ({
                            task: ai.task ?? "",
                            assignee: ai.assignee ?? null,
                            dueDate: ai.dueDate ?? null,
                            priority: ai.priority ?? "Medium",
                            meetingId,
                          })),
                        });
                      }
                    }
                    const finalData = JSON.stringify({ status: "completed", result: parsed });
                    controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
                  } catch (parseErr) {
                    console.error("JSON parse error:", parseErr, "Buffer:", buffer.substring(0, 200));
                    const errData = JSON.stringify({ status: "error", message: "Failed to parse summary" });
                    controller.enqueue(encoder.encode(`data: ${errData}\n\n`));
                  }
                  controller.close();
                  return;
                }
                try {
                  const parsed = JSON.parse(data);
                  buffer += parsed?.choices?.[0]?.delta?.content ?? "";
                  const progressData = JSON.stringify({ status: "processing", message: "Analyzing meeting..." });
                  controller.enqueue(encoder.encode(`data: ${progressData}\n\n`));
                } catch { /* skip */ }
              }
            }
          }
          // If we get here without [DONE], try to parse buffer
          if (buffer) {
            try {
              const parsed = JSON.parse(buffer);
              const finalData = JSON.stringify({ status: "completed", result: parsed });
              controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
            } catch {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: "error", message: "Incomplete response" })}\n\n`));
            }
          }
        } catch (error) {
          console.error("Stream error:", error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: "error", message: "Stream failed" })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (error: any) {
    console.error("Summarize error:", error);
    return NextResponse.json({ error: "Summarization failed" }, { status: 500 });
  }
}
