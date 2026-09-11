export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getFileUrl } from "@/lib/s3";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { cloudStoragePath, contentType, isPublic } = await request.json();
    if (!cloudStoragePath) return NextResponse.json({ error: "No file path" }, { status: 400 });

    // Get the file URL
    const fileUrl = await getFileUrl(cloudStoragePath, contentType || "audio/mpeg", isPublic ?? false);

    // Use FFmpeg to extract audio as wav
    const createResponse = await fetch("https://apps.abacus.ai/api/createRunFfmpegCommandRequest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({
        input_files: { in_1: fileUrl },
        output_files: { out_1: "extracted_audio.mp3" },
        ffmpeg_command: "-i {{in_1}} -vn -acodec libmp3lame -ab 128k -ar 44100 {{out_1}}",
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.json().catch(() => ({ error: "FFmpeg request failed" }));
      return NextResponse.json({ success: false, error: error?.error ?? "FFmpeg request failed" }, { status: 500 });
    }

    const { request_id } = await createResponse.json();
    if (!request_id) return NextResponse.json({ success: false, error: "No request ID" }, { status: 500 });

    // Poll for status
    let attempts = 0;
    const maxAttempts = 300;
    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const statusResponse = await fetch("https://apps.abacus.ai/api/getRunFfmpegCommandStatus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.ABACUSAI_API_KEY}`,
        },
        body: JSON.stringify({ request_id }),
      });
      const statusResult = await statusResponse.json();
      const status = statusResult?.status ?? "FAILED";
      const result = statusResult?.result ?? null;

      if (status === "SUCCESS") {
        if (result?.result) {
          return NextResponse.json({ success: true, outputUrl: result.result.out_1 ?? Object.values(result.result)[0] });
        }
        return NextResponse.json({ success: false, error: "No output" }, { status: 500 });
      }
      if (status === "FAILED") {
        return NextResponse.json({ success: false, error: result?.error ?? "FFmpeg failed" }, { status: 500 });
      }
      attempts++;
    }
    return NextResponse.json({ success: false, error: "Processing timed out" }, { status: 500 });
  } catch (error: any) {
    console.error("FFmpeg error:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
