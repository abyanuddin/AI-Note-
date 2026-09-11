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
    const search = url.searchParams.get("search") ?? "";

    const where: any = { userId: session.user.id };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { transcript: { contains: search, mode: "insensitive" } },
        { executiveSummary: { contains: search, mode: "insensitive" } },
      ];
    }

    const meetings = await prisma.meeting.findMany({
      where,
      orderBy: { date: "desc" },
      take: limit,
      include: { _count: { select: { actionItems: true } } },
    });
    return NextResponse.json({ meetings });
  } catch (error: any) {
    console.error("Get meetings error:", error);
    return NextResponse.json({ error: "Failed to fetch meetings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    const meeting = await prisma.meeting.create({
      data: {
        title: body.title || "Untitled Meeting",
        userId: session.user.id,
        status: "draft",
      },
    });
    return NextResponse.json({ meeting });
  } catch (error: any) {
    console.error("Create meeting error:", error);
    return NextResponse.json({ error: "Failed to create meeting" }, { status: 500 });
  }
}
