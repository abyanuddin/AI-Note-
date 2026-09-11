import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { LibraryContent } from "./_components/library-content";

export default async function LibraryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return <LibraryContent />;
}
