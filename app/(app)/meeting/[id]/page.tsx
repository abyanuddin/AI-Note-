import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { MeetingDetailContent } from "./_components/meeting-detail-content";

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;
  return <MeetingDetailContent meetingId={id} />;
}
