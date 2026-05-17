import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/ui/LogoutButton";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--t-md)", fontFamily: "var(--font-inter), 'Segoe UI', sans-serif" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", height: 60, borderBottom: "1px solid var(--line)", background: "rgba(7,7,13,0.6)", backdropFilter: "blur(14px)" }}>
        <Link href="/" style={{ fontWeight: 700, color: "var(--t-hi)", fontSize: 15, textDecoration: "none" }}>DataLens</Link>
        <LogoutButton />
      </nav>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "64px 32px" }}>
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--t-lo)", marginBottom: 10 }}>Dashboard</div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: "var(--t-hi)", margin: 0, letterSpacing: "-0.02em" }}>Welcome back</h1>
          <p style={{ marginTop: 10, color: "var(--t-lo)", fontSize: 14 }}>User ID: <code style={{ fontFamily: "var(--font-mono), monospace", fontSize: 12, background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 6, padding: "1px 6px" }}>{userId}</code></p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
          <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: "24px 24px 22px" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--t-lo)", marginBottom: 12 }}>Status</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", boxShadow: "0 0 0 3px rgba(76,175,80,0.18)" }} />
              <span style={{ color: "var(--t-hi)", fontWeight: 600, fontSize: 14 }}>Signed in</span>
            </div>
            <p style={{ marginTop: 10, fontSize: 13, color: "var(--t-lo)", lineHeight: 1.55 }}>
              Your credentials are securely synced to the desktop app via Clerk.
            </p>
          </div>

          <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: "24px 24px 22px" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--t-lo)", marginBottom: 12 }}>Desktop App</div>
            <div style={{ color: "var(--t-hi)", fontWeight: 600, fontSize: 14, marginBottom: 10 }}>Open DataLens</div>
            <p style={{ fontSize: 13, color: "var(--t-lo)", lineHeight: 1.55 }}>
              Launch the desktop app and click <strong style={{ color: "var(--t-md)" }}>Sign in</strong> — your API keys will be delivered automatically.
            </p>
          </div>
        </div>

        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 14, padding: "24px 24px 22px" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--t-lo)", marginBottom: 16 }}>How it works</div>
          <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              "Open the DataLens desktop app",
              "Click Sign in — a browser window will open",
              "You'll be redirected back automatically with your keys loaded",
              "Open a YouTube video or any screen with data",
              "Click ▶ Start in the DataLens pill — charts will appear as overlays",
            ].map((step, i) => (
              <li key={i} style={{ fontSize: 13, color: "var(--t-md)", lineHeight: 1.55 }}>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </main>
  );
}
