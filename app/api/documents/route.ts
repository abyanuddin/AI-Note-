export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const documents = await prisma.document.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ documents });
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
    const doc = await prisma.document.create({
      data: {
        title: body.title || body.fileName || "Untitled Document",
        fileName: body.fileName,
        contentType: body.contentType,
        cloudStoragePath: body.cloudStoragePath,
        isPublic: body.isPublic ?? false,
        extractedText: body.extractedText ?? null,
        category: body.category ?? "General",
        fileSize: body.fileSize ?? null,
        userId: session.user.id,
      },
    });
    return NextResponse.json({ document: doc });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
