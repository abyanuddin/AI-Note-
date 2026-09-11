"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/meeting/new": "New Meeting",
  "/library": "Document Library",
  "/notes": "Notes",
};

export function AppHeader() {
  const { data: session } = useSession();
  const pathname = usePathname() ?? "";
  const title = pageTitles[pathname] || (pathname?.startsWith("/meeting/") ? "Meeting" : "MeetMind");

  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="flex items-center justify-between h-14 px-6">
        <h1 className="text-lg font-display font-semibold">{title}</h1>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
            {session?.user?.name?.[0]?.toUpperCase() ?? session?.user?.email?.[0]?.toUpperCase() ?? "U"}
          </div>
        </div>
      </div>
    </header>
  );
}
