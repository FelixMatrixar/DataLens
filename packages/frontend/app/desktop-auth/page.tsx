"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth, SignIn } from "@clerk/nextjs";

export default function DesktopAuthPage() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const [status, setStatus] = useState<"waiting" | "sending" | "done" | "error">("waiting");
  const [error, setError] = useState("");
  const sent = useRef(false);

  const params =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const port = params.get("port");
  const state = params.get("state");

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !port || !state || sent.current) return;
    sent.current = true;
    setStatus("sending");

    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("No Clerk token available");

        // Send token to the local Electron callback server
        await fetch(`http://127.0.0.1:${port}/callback?token=${encodeURIComponent(token)}&state=${encodeURIComponent(state)}`);
        setStatus("done");
      } catch (err) {
        setError(String(err));
        setStatus("error");
      }
    })();
  }, [isLoaded, isSignedIn, port, state, getToken]);

  if (!port || !state) {
    return <Centered>Invalid request — open DataLens app and click Sign in.</Centered>;
  }

  if (!isLoaded) return <Centered>Loading...</Centered>;

  if (!isSignedIn) {
    return (
      <div style={css.page}>
        <h1 style={css.title}>Sign in to DataLens</h1>
        <p style={css.sub}>Your API keys will be sent securely to the desktop app.</p>
        <SignIn routing="hash" />
      </div>
    );
  }

  if (status === "sending") return <Centered>Sending keys to DataLens...</Centered>;

  if (status === "done") {
    return (
      <Centered>
        <span style={{ color: "#4caf50", fontSize: 32 }}>✓</span>
        <br />
        Signed in! Return to the DataLens desktop app.
        <br />
        <small style={{ color: "#666" }}>You can close this tab.</small>
      </Centered>
    );
  }

  if (status === "error") {
    return (
      <Centered>
        <span style={{ color: "#f44336" }}>Sign-in failed</span>
        <br />
        <small style={{ color: "#666" }}>{error}</small>
        <br />
        <small>Close this tab and try again from the app.</small>
      </Centered>
    );
  }

  return null;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...css.page, justifyContent: "center", alignItems: "center", textAlign: "center", gap: 12 }}>
      {children}
    </div>
  );
}

const css: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#0f0f13", color: "#e0e0e0", fontFamily: "system-ui", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 80, gap: 16 },
  title: { fontSize: 24, fontWeight: 700, color: "#fff" },
  sub: { fontSize: 14, color: "#888" },
};
