import React, { useEffect, useRef, useState } from "react";

function Logo({ size = 20 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width={size} height={size} style={{ borderRadius: 6, flexShrink: 0 }}>
      <defs>
        <radialGradient id="dl-b" cx="30%" cy="30%" r="42%">
          <stop offset="0%" stopColor="#9ccfff" />
          <stop offset="55%" stopColor="#64b5f6" />
          <stop offset="100%" stopColor="#64b5f6" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="dl-g" cx="70%" cy="70%" r="38%">
          <stop offset="0%" stopColor="#a8e6a3" />
          <stop offset="55%" stopColor="#4caf50" />
          <stop offset="100%" stopColor="#4caf50" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="dl-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#15151f" />
          <stop offset="100%" stopColor="#0a0a12" />
        </linearGradient>
        <linearGradient id="dl-sk" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(100,181,246,0.45)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.06)" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#dl-bg)" />
      <circle cx="22" cy="22" r="22" fill="url(#dl-b)" />
      <circle cx="42" cy="42" r="20" fill="url(#dl-g)" />
      <rect x="2.5" y="2.5" width="59" height="59" rx="13.5" fill="none" stroke="url(#dl-sk)" strokeWidth="1" />
    </svg>
  );
}

declare const window: Window & {
  recorderAPI: {
    startCapture: (sel: { micId?: string; systemAudioId?: string; displayId?: string }) => Promise<{ ok: boolean; error?: string }>;
    stopCapture: () => Promise<{ ok: boolean; error?: string }>;
    listDevices: () => Promise<{ ok: boolean; mics?: Device[]; systemAudio?: Device[]; displays?: Device[]; error?: string }>;
    onSessionStatus: (cb: (s: unknown) => void) => void;
    onSummaryUpdate: (cb: (s: unknown) => void) => void;
    onAlertFired:    (cb: (a: unknown) => void) => void;
    removeAllListeners: (ch: string) => void;
  };
  configAPI: {
    get:   () => Promise<UserConfig | null>;
    save:  (c: UserConfig) => Promise<{ ok: boolean }>;
    clear: () => Promise<{ ok: boolean }>;
  };
  authAPI: {
    signIn: () => Promise<{ ok: boolean; error?: string }>;
    signOut: () => Promise<{ ok: boolean }>;
    onStatus: (cb: (s: unknown) => void) => void;
    removeAllListeners: (ch: string) => void;
  };
  windowAPI: { resize: (h: number) => void };
};

interface Device { id: string; name: string; }
interface UserConfig {
  provider: "openrouter" | "google";
  openrouterApiKey?: string;
  googleAiApiKey?: string;
  videodbApiKey: string;
  videodbCollectionId: string;
}

type Session = "idle" | "starting" | "active" | "stopping" | "stopped";

// Window heights for each state
const H_PILL   = 48;
const H_DEVICE = 48 + 160; // pill + device picker panel
const H_SETUP  = 48 + 110; // pill + account panel

export default function ControlApp(): React.ReactElement {
  const [configured, setConfigured] = useState(false);
  const [session, setSession]       = useState<Session>("idle");
  const [expanded, setExpanded]     = useState(false);   // device picker open
  const [showSetup, setShowSetup]   = useState(false);   // manual setup form
  const [signingIn, setSigningIn]   = useState(false);
  const [captureErr, setCaptureErr] = useState<string | null>(null);

  const [devices, setDevices]         = useState<{ mics: Device[]; systemAudio: Device[]; displays: Device[] } | null>(null);
  const [selDisplay, setSelDisplay]   = useState("");
  const [selAudio, setSelAudio]       = useState("");


  // Timer for recording duration display
  const [elapsed, setElapsed]  = useState(0);
  const timerRef               = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync window height whenever layout state changes
  useEffect(() => {
    let h = H_PILL;
    if (showSetup)          h = H_SETUP;
    else if (expanded)      h = H_DEVICE;
    window.windowAPI.resize(h);
  }, [showSetup, expanded]);

  useEffect(() => {
    window.configAPI.get().then(c => { if (c) setConfigured(true); });

    window.authAPI.onStatus((s: unknown) => {
      const st = s as { state: string };
      if (st.state === "signed-in") setConfigured(true);
      if (st.state === "idle")      { setConfigured(false); resetSession(); }
    });

    window.recorderAPI.onSessionStatus((s: unknown) => {
      const st = s as { state: Session; error?: string };
      setSession(st.state);
      if (st.state === "active") { startTimer(); setCaptureErr(null); }
      else { stopTimer(); if (st.error) setCaptureErr(st.error); }
    });

    return () => {
      ["auth:status", "session:status", "summary:update", "alert:fired"].forEach(ch => {
        window.authAPI.removeAllListeners(ch);
        window.recorderAPI.removeAllListeners(ch);
      });
    };
  }, []);

  function startTimer() {
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
  }
  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }
  function resetSession() {
    setSession("idle"); setDevices(null); setExpanded(false); stopTimer();
  }

  async function handleExpand() {
    if (!devices) {
      const res = await window.recorderAPI.listDevices();
      if (res.ok) setDevices({ mics: res.mics ?? [], systemAudio: res.systemAudio ?? [], displays: res.displays ?? [] });
    }
    setExpanded(e => !e);
    setShowSetup(false);
  }

  async function handleStart() {
    setExpanded(false);
    await window.recorderAPI.startCapture({
      displayId: selDisplay || undefined,
      systemAudioId: selAudio || undefined,
    });
  }

  async function handleStop() {
    await window.recorderAPI.stopCapture();
  }

  async function handleSignIn() {
    setSigningIn(true);
    const res = await window.authAPI.signIn();
    setSigningIn(false);
    if (!res.ok) console.error("Sign-in failed:", res.error);
  }

  async function handleSignOut() {
    await window.authAPI.signOut();
    await window.configAPI.clear();
    setConfigured(false);
    resetSession();
    setShowSetup(false);
    setExpanded(false);
  }

  const isActive  = session === "active";
  const isBusy    = session === "starting" || session === "stopping";

  function fmtElapsed(s: number): string {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  return (
    <div style={s.root}>

      {/* ── Setup panel (slides in above pill) ─────────────────────── */}
      {showSetup && (
        <div style={s.panel}>
          <div style={s.panelTitle}>Configure DataLens</div>
          <button style={{ ...s.actionBtn, background: "#4d1e1e", color: "#f44336" }}
            onClick={handleSignOut}>
            Sign out
          </button>
          <button style={{ ...s.actionBtn, marginTop: 0, color: "#555" }}
            onClick={() => setShowSetup(false)}>
            Cancel
          </button>
        </div>
      )}

      {/* ── Device picker panel (slides in above pill) ─────────────── */}
      {expanded && !showSetup && configured && (
        <div style={s.panel}>
          <div style={s.fieldRow}>
            <span style={s.fieldLabel}>🖥</span>
            <select style={s.select}
              value={selDisplay} onChange={e => setSelDisplay(e.target.value)}>
              <option value="">Auto-select display</option>
              {devices?.displays.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div style={s.fieldRow}>
            <span style={s.fieldLabel}>🔊</span>
            <select style={s.select}
              value={selAudio} onChange={e => setSelAudio(e.target.value)}>
              <option value="">Auto-select audio</option>
              {devices?.systemAudio.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <button style={{ ...s.actionBtn, background: "#1e4d1e", color: "#4caf50" }}
            disabled={isBusy} onClick={handleStart}>
            {isBusy ? "Starting…" : "▶  Start Capture"}
          </button>
          {captureErr && (
            <div style={{ fontSize: 10, color: "#f44336", padding: "4px 2px", wordBreak: "break-all" }}>
              {captureErr}
            </div>
          )}
        </div>
      )}

      {/* ── Pill bar ────────────────────────────────────────────────── */}
      <div style={s.pill}>
        {/* drag handle */}
        <span style={s.drag}>⠿</span>

        {/* left content */}
        <Logo size={20} />
        {isActive ? (
          <>
            <span style={s.recDot} />
            <span style={s.recLabel}>Recording</span>
            <span style={s.recSep}>·</span>
            <span style={s.timer}>{fmtElapsed(elapsed)}</span>
          </>
        ) : (
          <span style={s.logo}>DataLens</span>
        )}

        <div style={s.spacer} />

        {/* right actions */}
        {!configured ? (
          <>
            <button style={{ ...s.pillBtn, ...s.pillBtnBlue }}
              disabled={signingIn}
              onClick={handleSignIn}>
              {signingIn ? "…" : "Sign in"}
            </button>
            <button style={s.pillIconBtn}
              title="Configure manually"
              onClick={() => { setShowSetup(s => !s); setExpanded(false); }}>
              ⚙
            </button>
          </>
        ) : isActive ? (
          <button style={s.stopBtn} onClick={handleStop}>
            ■ Stop
          </button>
        ) : (
          <>
            <button style={{ ...s.pillBtn, ...s.pillBtnGreen }}
              disabled={isBusy}
              onClick={handleExpand}>
              {isBusy ? "…" : expanded ? "▾ Close" : "▶ Start"}
            </button>
            <button style={s.pillIconBtn} title="Settings"
              onClick={() => { setShowSetup(s => !s); setExpanded(false); }}>
              ⚙
            </button>
            <button style={s.pillIconBtn} title="Sign out" onClick={handleSignOut}>
              ×
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: {
    display: "flex", flexDirection: "column", gap: 6,
    padding: "0 0 0 0",
    // no background — fully transparent root
  },

  // ── Pill ──────────────────────────────────────────────────────────
  pill: {
    height: 48, display: "flex", alignItems: "center", gap: 6,
    padding: "0 10px 0 8px",
    background: "rgba(12,12,20,0.92)",
    backdropFilter: "blur(16px)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 14,
    boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
    // make the whole pill draggable; buttons override with no-drag
    WebkitAppRegion: "drag",
  } as React.CSSProperties,

  drag: {
    fontSize: 13, color: "#333", letterSpacing: 1,
    WebkitAppRegion: "drag", cursor: "grab",
  } as React.CSSProperties,

  logo: { fontSize: 13, fontWeight: 600, color: "#666", letterSpacing: 0.3 },
  spacer: { flex: 1 },

  recDot: {
    width: 7, height: 7, borderRadius: "50%", background: "#f44336", flexShrink: 0,
    boxShadow: "0 0 6px #f44336",
    animation: "pulse 1.2s ease-in-out infinite",
  } as React.CSSProperties,
  recLabel: { fontSize: 12, fontWeight: 500, color: "#e0e0e0" },
  recSep:   { fontSize: 12, color: "#444" },
  timer:    { fontSize: 12, color: "#aaa", fontFamily: "monospace" },

  stopBtn: {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "5px 14px", borderRadius: 8, border: "none",
    background: "#b71c1c", color: "#fff",
    fontSize: 12, fontWeight: 600, cursor: "pointer",
    WebkitAppRegion: "no-drag",
  } as React.CSSProperties,

  pillBtn: {
    padding: "5px 12px", borderRadius: 8, border: "none",
    fontSize: 12, fontWeight: 600, cursor: "pointer",
    WebkitAppRegion: "no-drag",
  } as React.CSSProperties,
  pillBtnGreen: { background: "#1e4d1e", color: "#4caf50" },
  pillBtnRed:   { background: "#4d1e1e", color: "#f44336" },
  pillBtnBlue:  { background: "#1a3a5f", color: "#64b5f6" },

  pillIconBtn: {
    background: "none", border: "none", color: "#444", fontSize: 14,
    cursor: "pointer", padding: "2px 4px", lineHeight: 1,
    WebkitAppRegion: "no-drag",
  } as React.CSSProperties,

  // ── Floating panel above pill ─────────────────────────────────────
  panel: {
    background: "rgba(12,12,20,0.95)",
    backdropFilter: "blur(16px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: "12px 12px 10px",
    display: "flex", flexDirection: "column", gap: 7,
    boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
  },
  panelTitle: { fontSize: 11, fontWeight: 700, color: "#555", letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 },

  row: { display: "flex", gap: 6 },
  chip: {
    flex: 1, padding: "5px 0", borderRadius: 7, border: "1px solid #2a2a3e",
    background: "#1a1a2e", color: "#555", cursor: "pointer", fontSize: 11, fontWeight: 600,
  },
  chipOn: { background: "#1a3a5f", color: "#64b5f6", borderColor: "#2196f3" },

  input: {
    padding: "6px 9px", borderRadius: 7, border: "1px solid #2a2a3e",
    background: "#0f0f18", color: "#ccc", fontSize: 11, outline: "none",
  } as React.CSSProperties,
  hint: { fontSize: 10, color: "#333" },
  errMsg: { fontSize: 10, color: "#f44336" },

  actionBtn: {
    padding: "7px 0", borderRadius: 8, border: "none",
    background: "#1a1a2e", color: "#888",
    cursor: "pointer", fontSize: 12, fontWeight: 600, marginTop: 2,
  },

  fieldRow: { display: "flex", alignItems: "center", gap: 6 },
  fieldLabel: { fontSize: 13, flexShrink: 0 },
  select: {
    flex: 1, padding: "5px 8px", borderRadius: 7, border: "1px solid #2a2a3e",
    background: "#0f0f18", color: "#ccc", fontSize: 11,
  },
};
