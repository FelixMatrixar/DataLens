import React, { useEffect, useState } from "react";

declare const window: Window & {
  recorderAPI: {
    startCapture: (sel: { micId?: string; systemAudioId?: string; displayId?: string }) => Promise<{ ok: boolean; error?: string }>;
    stopCapture: () => Promise<{ ok: boolean; error?: string }>;
    listDevices: () => Promise<{ ok: boolean; mics?: Device[]; systemAudio?: Device[]; displays?: Device[]; error?: string }>;
    onSessionStatus: (cb: (s: unknown) => void) => void;
    onSummaryUpdate: (cb: (s: unknown) => void) => void;
    onAlertFired: (cb: (a: unknown) => void) => void;
    removeAllListeners: (ch: string) => void;
  };
  configAPI: {
    get: () => Promise<UserConfig | null>;
  };
  authAPI: {
    signIn: () => Promise<{ ok: boolean; config?: UserConfig; error?: string }>;
    signOut: () => Promise<{ ok: boolean }>;
    onStatus: (cb: (s: unknown) => void) => void;
    removeAllListeners: (ch: string) => void;
  };
};

interface Device { id: string; name: string; }
interface UserConfig { openrouterApiKey: string; videodbApiKey: string; videodbCollectionId: string; userId?: string; }
type SessionState = "idle" | "starting" | "active" | "stopping" | "stopped";
type AuthState = "idle" | "signing-in" | "signed-in";

export default function ControlApp(): React.ReactElement {
  const [auth, setAuth] = useState<AuthState>("idle");
  const [session, setSession] = useState<SessionState>("idle");
  const [devices, setDevices] = useState<{ mics: Device[]; systemAudio: Device[]; displays: Device[] } | null>(null);
  const [selectedDisplay, setSelectedDisplay] = useState("");
  const [selectedAudio, setSelectedAudio] = useState("");
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) =>
    setLog(prev => [...prev.slice(-49), `${new Date().toLocaleTimeString()} ${msg}`]);

  useEffect(() => {
    // Check if already signed in
    window.configAPI.get().then(c => {
      if (c) setAuth("signed-in");
    });

    window.authAPI.onStatus((s: unknown) => {
      const status = s as { state: AuthState };
      setAuth(status.state);
      if (status.state === "signed-in") addLog("Signed in — keys loaded");
      if (status.state === "idle") { setDevices(null); setSession("idle"); }
    });

    window.recorderAPI.onSessionStatus((s: unknown) => {
      const status = s as { state: SessionState; error?: string };
      setSession(status.state);
      addLog(`Session: ${status.state}${status.error ? ` — ${status.error}` : ""}`);
    });
    window.recorderAPI.onSummaryUpdate(() => addLog("Summary updated"));
    window.recorderAPI.onAlertFired((a: unknown) =>
      addLog(`Alert: ${(a as { description: string }).description}`)
    );

    return () => {
      ["auth:status", "session:status", "summary:update", "alert:fired"].forEach(ch => {
        window.authAPI.removeAllListeners(ch);
        window.recorderAPI.removeAllListeners(ch);
      });
    };
  }, []);

  async function handleSignIn() {
    const res = await window.authAPI.signIn();
    if (!res.ok) addLog(`Sign-in error: ${res.error}`);
  }

  async function handleListDevices() {
    const res = await window.recorderAPI.listDevices();
    if (res.ok) {
      setDevices({ mics: res.mics ?? [], systemAudio: res.systemAudio ?? [], displays: res.displays ?? [] });
    } else {
      addLog(`Devices error: ${res.error}`);
    }
  }

  const isActive = session === "active";
  const isBusy = session === "starting" || session === "stopping";

  // ── Not signed in ────────────────────────────────────────────────
  if (auth !== "signed-in") {
    return (
      <div style={{ ...s.container, justifyContent: "center", alignItems: "center", gap: 20 }}>
        <div style={s.logo}>DataLens</div>
        <p style={s.subtitle}>Sign in to load your API keys securely</p>
        <button style={{ ...s.btn, ...s.btnBlue, width: 220 }}
          disabled={auth === "signing-in"}
          onClick={handleSignIn}>
          {auth === "signing-in" ? "Opening browser..." : "Sign in with DataLens"}
        </button>
        {auth === "signing-in" && (
          <p style={s.hint}>Complete sign-in in the browser window, then return here.</p>
        )}
      </div>
    );
  }

  // ── Signed in ────────────────────────────────────────────────────
  return (
    <div style={s.container}>
      <div style={s.header}>
        <h1 style={s.title}>DataLens</h1>
        <button style={s.signOutBtn} onClick={() => window.authAPI.signOut()}>Sign out</button>
      </div>

      <div style={{ ...s.statusBadge, background: isActive ? "#1a3a1a" : "#1a1a2e" }}>
        <span style={{ ...s.dot, background: isActive ? "#4caf50" : isBusy ? "#ff9800" : "#555" }} />
        <span>{session.toUpperCase()}</span>
      </div>

      {!devices && (
        <button style={s.btn} onClick={handleListDevices}>List Capture Devices</button>
      )}

      {devices && (
        <>
          <div style={s.field}>
            <label style={s.label}>Display</label>
            <select style={s.select} value={selectedDisplay} onChange={e => setSelectedDisplay(e.target.value)}>
              <option value="">Auto-select</option>
              {devices.displays.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div style={s.field}>
            <label style={s.label}>System Audio</label>
            <select style={s.select} value={selectedAudio} onChange={e => setSelectedAudio(e.target.value)}>
              <option value="">Auto-select</option>
              {devices.systemAudio.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </>
      )}

      <div style={s.actions}>
        {!isActive
          ? <button style={{ ...s.btn, ...s.btnGreen }} disabled={isBusy}
              onClick={() => window.recorderAPI.startCapture({
                displayId: selectedDisplay || undefined,
                systemAudioId: selectedAudio || undefined,
              })}>
              {isBusy ? "..." : "Start Capture"}
            </button>
          : <button style={{ ...s.btn, ...s.btnRed }}
              onClick={() => window.recorderAPI.stopCapture()}>
              Stop
            </button>
        }
      </div>

      <div style={s.log}>
        {log.slice().reverse().map((l, i) => <div key={i} style={s.logLine}>{l}</div>)}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { padding: 20, height: "100vh", background: "#0f0f13", color: "#e0e0e0", display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" },
  logo: { fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: -1 },
  subtitle: { fontSize: 13, color: "#666", textAlign: "center" },
  hint: { fontSize: 11, color: "#555", textAlign: "center" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 20, fontWeight: 700, color: "#fff" },
  signOutBtn: { background: "none", border: "none", color: "#555", fontSize: 12, cursor: "pointer" },
  statusBadge: { padding: "8px 12px", borderRadius: 8, display: "flex", alignItems: "center", gap: 8, fontSize: 13 },
  dot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 12, color: "#888" },
  select: { padding: "6px 10px", borderRadius: 6, border: "1px solid #333", background: "#1a1a2e", color: "#e0e0e0", fontSize: 13 },
  actions: { display: "flex", gap: 8 },
  btn: { padding: "8px 16px", borderRadius: 8, border: "none", background: "#2a2a3e", color: "#e0e0e0", cursor: "pointer", fontSize: 14, flex: 1 },
  btnBlue: { background: "#1a3a5f", color: "#64b5f6" },
  btnGreen: { background: "#1e4d1e", color: "#4caf50" },
  btnRed: { background: "#4d1e1e", color: "#f44336" },
  log: { flex: 1, overflowY: "auto", background: "#0a0a12", borderRadius: 8, padding: 10, fontSize: 11, fontFamily: "monospace" },
  logLine: { color: "#666", marginBottom: 2 },
};
