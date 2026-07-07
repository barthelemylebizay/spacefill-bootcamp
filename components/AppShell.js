"use client";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";

// Pages that use their own full-screen layout (no sidebar)
const STANDALONE_PREFIXES = ["/import", "/clients"];

export default function AppShell({ children }) {
  const pathname = usePathname();
  const isStandalone = STANDALONE_PREFIXES.some(p => pathname.startsWith(p));

  if (isStandalone) return <>{children}</>;

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">{children}</div>
    </div>
  );
}
