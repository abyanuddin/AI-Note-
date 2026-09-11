export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { request_id } = await request.json();
    const statusResponse = await fetch("https://apps.abacus.ai/api/getConvertHtmlToPdfStatus", {
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

    if (status === "SUCCESS" && result?.result) {
      return NextResponse.json({ status, pdf_base64: result.result });
    }
    if (status === "FAILED") {
      return NextResponse.json({ status, error: result?.error ?? "PDF generation failed" });
    }
    return NextResponse.json({ status });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ status: "FAILED", error: "Failed" }, { status: 500 });
  }
}
