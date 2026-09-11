import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { NotesContent } from "./_components/notes-content";

export default async function NotesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <NotesContent />;
}
