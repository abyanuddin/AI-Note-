export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") ?? "50");
    const notes = await prisma.composerNote.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });
    return NextResponse.json({ notes });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const note = await prisma.composerNote.create({
      data: {
        title: body.title || "Untitled Note",
        content: body.content ?? "",
        meetingId: body.meetingId ?? null,
        userId: session.user.id,
      },
    });
    return NextResponse.json({ note });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
