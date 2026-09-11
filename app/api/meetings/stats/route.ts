export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const [meetings, documents, notes] = await Promise.all([
      prisma.meeting.count({ where: { userId: session.user.id } }),
      prisma.document.count({ where: { userId: session.user.id } }),
      prisma.composerNote.count({ where: { userId: session.user.id } }),
    ]);
    return NextResponse.json({ meetings, documents, notes });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
