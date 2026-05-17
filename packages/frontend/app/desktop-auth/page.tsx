"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth, SignIn } from "@clerk/nextjs";

export default function DesktopAuthPage() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const [status, setStatus] = useState<"waiting" | "sending" | "done" | "error">("waiting");
  const [error, setError] = useState("");
  const sent = useRef(false);

  // Read params from the URL (stable — doesn't change after mount)
  const [port, state] = (() => {
    if (typeof window === "undefined") return [null, null];
    const p = new URLSearchParams(window.location.search);
    return [p.get("port"), p.get("state")];
  })();

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !port || !state || sent.current) return;
    sent.current = true;
    setStatus("sending");

    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("No session token");

        const res = await fetch(
          `http://127.0.0.1:${port}/callback?token=${encodeURIComponent(token)}&state=${encodeURIComponent(state)}`
        );
        if (!res.ok) throw new Error(`Callback failed: ${res.status}`);
        setStatus("done");
      } catch (err) {
        setError(String(err));
        setStatus("error");
      }
    })();
  }, [isLoaded, isSignedIn, port, state, getToken]);

  if (!port || !state) {
    return <Centered>Open the DataLens desktop app and click &ldquo;Sign in&rdquo;.</Centered>;
  }

  if (!isLoaded) return <Centered>Loading…</Centered>;

  if (!isSignedIn) {
    // After sign-in, Clerk should redirect back to this same URL (port + state intact)
    const redirectUrl = typeof window !== "undefined" ? window.location.href : "/desktop-auth";
    return (
      <div style={css.page}>
        <h1 style={css.title}>Sign in to DataLens</h1>
        <p style={css.sub}>Your API keys will be securely sent to the desktop app.</p>
        <SignIn routing="hash" fallbackRedirectUrl={redirectUrl} />
      </div>
    );
  }

  if (status === "sending") return <Centered>Connecting to DataLens…</Centered>;

  if (status === "done") {
    return (
      <Centered>
        <span style={{ color: "#4caf50", fontSize: 40, lineHeight: 1 }}>✓</span>
        <strong>Signed in!</strong>
        <span style={{ color: "#666", fontSize: 13 }}>Return to DataLens — you can close this tab.</span>
      </Centered>
    );
  }

  // error
  return (
    <Centered>
      <span style={{ color: "#f44336", fontSize: 16 }}>Sign-in failed</span>
      <span style={{ color: "#666", fontSize: 12 }}>{error}</span>
      <span style={{ color: "#555", fontSize: 12 }}>Close this tab and try again from the app.</span>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...css.page, justifyContent: "center", alignItems: "center", textAlign: "center", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
        {children}
      </div>
    </div>
  );
}

const css: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0f0f13",
    color: "#e0e0e0",
    fontFamily: "system-ui, 'Segoe UI', sans-serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    paddingTop: 80,
    gap: 16,
  },
  title: { fontSize: 24, fontWeight: 700, color: "#fff", margin: 0 },
  sub: { fontSize: 14, color: "#888", margin: 0 },
};
