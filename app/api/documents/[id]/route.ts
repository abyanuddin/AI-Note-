export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { deleteFile } from "@/lib/s3";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const doc = await prisma.document.findFirst({ where: { id, userId: session.user.id } });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    try { await deleteFile(doc.cloudStoragePath); } catch (e) { console.error("S3 delete error:", e); }
    await prisma.document.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
