export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { html_content, css_stylesheet } = await request.json();
    const createResponse = await fetch("https://apps.abacus.ai/api/createConvertHtmlToPdfRequest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({
        html_content,
        pdf_options: { format: "A4", print_background: true },
        css_stylesheet,
      }),
    });
    if (!createResponse.ok) {
      return NextResponse.json({ success: false, error: "Failed to create PDF request" }, { status: 500 });
    }
    const { request_id } = await createResponse.json();
    if (!request_id) return NextResponse.json({ success: false, error: "No request ID" }, { status: 500 });
    return NextResponse.json({ success: true, request_id });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
