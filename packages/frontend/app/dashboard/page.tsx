import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/ui/LogoutButton";
import ChartDashboard from "./ChartDashboard";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/login");
  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--t-md)", fontFamily: "var(--font-inter), 'Segoe UI', sans-serif" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", height: 60, borderBottom: "1px solid var(--line)", background: "rgba(7,7,13,0.6)", backdropFilter: "blur(14px)", position: "sticky", top: 0, zIndex: 50 }}>
        <Link href="/" style={{ fontWeight: 700, color: "var(--t-hi)", fontSize: 15, textDecoration: "none" }}>DataLens</Link>
        <LogoutButton />
      </nav>
      <ChartDashboard />
    </main>
  );
}
