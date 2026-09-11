import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { NewMeetingContent } from "./_components/new-meeting-content";

export default async function NewMeetingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <NewMeetingContent />;
}
