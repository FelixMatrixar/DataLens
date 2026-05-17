"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  C, Sparkline, BarMini, DonutMini, ProgressBar,
  MultiLine, HeatmapMini, Waterfall, ScatterMini, BulletChart,
} from "./charts";

/* ─── NAV ─────────────────────────────────────────────── */
function Nav() {
  return (
    <nav className="nav-sticky">
      <div className="wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
        <a href="#top" style={{ display: "inline-flex", alignItems: "center", gap: 10, color: "var(--t-hi)", fontWeight: 600, textDecoration: "none" }}>
          <Image src="/logo.svg" alt="DataLens" width={22} height={22} style={{ borderRadius: 6, boxShadow: "0 6px 20px rgba(33,150,243,0.18)" }} />
          <span>DataLens</span>
        </a>
        <div style={{ display: "flex", gap: 22 }}>
          {(["#how", "#videodb", "#ai", "#charts", "#start"] as const).map(h => (
            <a key={h} href={h} style={{ color: "var(--t-lo)", fontSize: 13.5 }}
               onMouseEnter={e => (e.currentTarget.style.color = "var(--t-hi)")}
               onMouseLeave={e => (e.currentTarget.style.color = "var(--t-lo)")}>
              {h.slice(1)}
            </a>
          ))}
        </div>
        <Link href="/dashboard" className="btn" style={{ padding: "7px 14px", fontSize: 13 }}>
          Dashboard
        </Link>
      </div>
    </nav>
  );
}

/* ─── HERO ────────────────────────────────────────────── */
const HERO_CARDS = [
  { id: "rev",   title: "Q3 Revenue",    kind: "metric", delta: "+20.3%", value: "$14.2M", sub: "vs $11.8M Q2", color: C.green },
  { id: "arr",   title: "ARR by Quarter",kind: "line",   data: [8.2, 9.4, 10.1, 11.8, 14.2], color: C.blue },
  { id: "churn", title: "Churn rate",    kind: "spark",  delta: "-0.7pp", value: "2.4%", data: [3.4,3.2,3.1,2.9,2.6,2.4], color: C.green },
  { id: "nps",   title: "NPS",           kind: "progress",value: 62, target: 55, color: C.blue },
  { id: "mix",   title: "Revenue mix",   kind: "donut",  values: [42,28,18,12], colors: [C.blue, C.green, C.amber, C.purple] },
  { id: "pip",   title: "Pipeline funnel",kind: "bar",   data: [220,142,88,41,18], labels: ["Lead","Qual","SQL","Prop","Won"] },
];

function HeroCard({ card }: { card: typeof HERO_CARDS[number] }) {
  return (
    <div className="fade-up" style={{
      background: "var(--panel)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "8px 10px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ fontSize: 10.5, color: "var(--t-lo)" }}>{card.title}</div>
        <div style={{ fontSize: 9, color: "var(--t-vdim)", fontFamily: "var(--font-mono)" }}>{card.kind}</div>
      </div>
      {card.kind === "metric" && (
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <div style={{ fontSize: 22, fontWeight: 600, color: "var(--t-hi)", fontFamily: "var(--font-mono)", letterSpacing: "-0.02em" }}>{(card as any).value}</div>
          <div style={{ fontSize: 11, color: "#c8e6c9", fontFamily: "var(--font-mono)" }}>{(card as any).delta}</div>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 10, color: "var(--t-dim)" }}>{(card as any).sub}</div>
        </div>
      )}
      {card.kind === "line" && <Sparkline data={(card as any).data} color={C.blue} h={42} w={220} dot />}
      {card.kind === "spark" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "var(--t-hi)", fontFamily: "var(--font-mono)" }}>{(card as any).value}</div>
            <div style={{ fontSize: 10, color: "#c8e6c9", fontFamily: "var(--font-mono)" }}>{(card as any).delta}</div>
          </div>
          <div style={{ flex: 1 }}><Sparkline data={(card as any).data} color={C.green} h={32} w={120} /></div>
        </div>
      )}
      {card.kind === "progress" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--t-hi)", fontFamily: "var(--font-mono)" }}>{(card as any).value}</div>
          <div style={{ flex: 1 }}>
            <ProgressBar value={(card as any).value} max={100} color={C.blue} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 9, color: "var(--t-dim)", fontFamily: "var(--font-mono)" }}>
              <span>target {(card as any).target}</span><span>+{(card as any).value - (card as any).target}</span>
            </div>
          </div>
        </div>
      )}
      {card.kind === "donut" && (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <DonutMini values={(card as any).values} colors={(card as any).colors} size={62} label="4" sub="regions" />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
            {["Americas","EMEA","APAC","Other"].map((r, i) => (
              <div key={r} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "var(--t-md)" }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: (card as any).colors[i], flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{r}</span>
                <span className="mono" style={{ color: "var(--t-lo)" }}>{(card as any).values[i]}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {card.kind === "bar" && <BarMini data={(card as any).data} labels={(card as any).labels} color={C.blue} h={62} w={220} />}
    </div>
  );
}

function DesktopPreview({ tick }: { tick: number }) {
  const visible = [0,1,2].map(i => HERO_CARDS[(tick + i) % HERO_CARDS.length]);
  return (
    <div style={{ position: "relative" }}>
      <div style={{
        position: "relative", borderRadius: 14,
        border: "1px solid var(--line-3)",
        background: "linear-gradient(180deg, #15151f 0%, #0c0c14 100%)",
        boxShadow: "0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(33,150,243,0.06)",
        overflow: "hidden", aspectRatio: "16/11",
      }}>
        {/* Window chrome */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 12px", borderBottom: "1px solid var(--line)", background: "rgba(255,255,255,0.02)" }}>
          {[0,1,2].map(i => <span key={i} style={{ width: 10, height: 10, borderRadius: 999, background: "#3a3a44" }} />)}
          <div style={{ flex: 1, textAlign: "center", fontSize: 11, color: "var(--t-dim)", fontFamily: "var(--font-mono)" }}>
            board-review.q3-2026 — meeting share
          </div>
        </div>
        {/* Video area */}
        <div style={{ position: "absolute", top: 44, left: 10, bottom: 10, right: "calc(38% + 18px)", borderRadius: 8, overflow: "hidden", border: "1px dashed var(--line-2)", background: "#0a0a12" }}>
          <div className="stripe" style={{ position: "absolute", inset: 0, opacity: 0.7 }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <div style={{ width: 56, height: 56, borderRadius: 999, background: "rgba(12,12,20,0.7)", border: "1px solid var(--line-2)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M 7 4 L 20 12 L 7 20 Z" fill="var(--t-md)"/></svg>
            </div>
            <div style={{ fontSize: 10, color: "var(--t-dim)", fontFamily: "var(--font-mono)", letterSpacing: "0.16em", textTransform: "uppercase" }}>video / screen share</div>
          </div>
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "rgba(255,255,255,0.04)" }}>
            <div style={{ width: "32%", height: "100%", background: "var(--blue)", opacity: 0.6 }} />
          </div>
        </div>
        {/* Overlay sidebar */}
        <div style={{ position: "absolute", top: 44, right: 10, bottom: 10, width: "38%", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: "var(--panel)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="dot blue" style={{ width: 5, height: 5, boxShadow: "none" }} />
              <span style={{ fontSize: 10.5, color: "var(--t-md)", fontFamily: "var(--font-mono)" }}>DataLens · viz</span>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <span style={{ fontSize: 9, color: "var(--t-dim)" }}>⟂</span>
              <span style={{ fontSize: 9, color: "var(--t-dim)" }}>−</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
            {visible.map((c, i) => <HeroCard key={c.id + tick + i} card={c} />)}
          </div>
        </div>
        {/* Control pill */}
        <div style={{
          position: "absolute", bottom: 12, left: 12,
          display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
          background: "rgba(12,12,20,0.92)", backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.08)", borderRadius: 999,
          boxShadow: "0 6px 24px rgba(0,0,0,0.5)",
        }}>
          <span className="dot red rec-dot" />
          <span style={{ fontSize: 11.5, color: "var(--t-md)", fontFamily: "var(--font-mono)" }}>Recording</span>
          <span style={{ width: 1, height: 12, background: "var(--line)" }} />
          <button style={{ border: "1px solid rgba(244,67,54,0.35)", background: "var(--red-dim)", color: "#ffcdd2", padding: "3px 9px", borderRadius: 999, fontSize: 11, cursor: "pointer" }}>⏹ Stop</button>
          <button style={{ border: "1px solid var(--line-2)", background: "var(--bg-3)", color: "var(--t-md)", padding: "3px 9px", borderRadius: 999, fontSize: 11, cursor: "pointer" }}>⚙</button>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, justifyContent: "center", color: "var(--t-lo)", fontSize: 12 }}>
        <span className="dot" />
        Live preview · charts upsert by title, never auto-dismiss
      </div>
    </div>
  );
}

function Hero() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="hero" style={{ padding: "64px 0 80px" }} id="top">
      <div className="wrap" style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 56, alignItems: "center" }}>
        <div>
          <span className="chip">
            <span className="dot" />
            <span className="mono" style={{ fontSize: 11 }}>Now in v1.0 · Windows</span>
          </span>
          <h1 style={{ marginTop: 18 }}>
            Watches your screen.<br />
            <span style={{ color: "var(--blue)" }}>Charts the numbers.</span>
          </h1>
          <p className="lead" style={{ marginTop: 22 }}>
            DataLens is a real-time data visualization desktop app. It silently watches your display and
            listens to your system audio, detects concrete data points in what you&apos;re <em>seeing</em> and <em>hearing</em>,
            and renders live chart overlays on top of everything — without you doing anything.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
            <a href="https://github.com/FelixMatrixar/datalens/releases/download/v1.0.0/DataLens.Setup.1.0.0.exe" className="btn primary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12M6 9l6 6 6-6M5 21h14" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Download for Windows
            </a>
            <a href="#how" className="btn">
              See how it works
              <span style={{ display: "inline-block", padding: "1px 6px", borderRadius: 4, background: "rgba(255,255,255,0.06)", border: "1px solid var(--line-2)", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--t-lo)" }}>↓</span>
            </a>
          </div>
          <div style={{ marginTop: 28, display: "flex", gap: 22, flexWrap: "wrap" }}>
            {[["15","chart types"],["0","API keys to paste"],["~3s","from spoken → charted"]].map(([n,l]) => (
              <div key={l}>
                <div style={{ fontSize: 26, color: "var(--t-hi)", fontWeight: 600, letterSpacing: "-0.02em", fontFamily: "var(--font-mono)" }}>{n}</div>
                <div style={{ fontSize: 12.5, color: "var(--t-lo)" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <DesktopPreview tick={tick} />
      </div>
    </section>
  );
}

/* ─── HOW IT WORKS / PIPELINE ─────────────────────────── */
function Pipeline() {
  const groups = [
    { label: "Input", bounds: { left: 0, right: 18, top: 5, bottom: 95 } },
    { label: "VideoDB", bounds: { left: 20, right: 52, top: 5, bottom: 95 } },
    { label: "Agents", bounds: { left: 54, right: 82, top: 5, bottom: 95 } },
    { label: "Output", bounds: { left: 84, right: 100, top: 5, bottom: 95 } },
  ];

  const nodes = [
    { id: "scr", label: "Screen", sub: "display capture", x: 1, y: 30, color: "neutral" },
    { id: "aud", label: "Audio", sub: "system output", x: 1, y: 70, color: "neutral" },
    { id: "cap", label: "CaptureClient", sub: "native binary", x: 22, y: 30, color: "blue" },
    { id: "ses", label: "RTStreams", sub: "session channels", x: 22, y: 65, color: "blue" },
    { id: "tr",  label: "Transcript", sub: "startTranscript()", x: 36, y: 22, color: "blue" },
    { id: "vi",  label: "VisualIndex", sub: "indexVisuals()", x: 36, y: 55, color: "blue" },
    { id: "ws",  label: "WebSocket", sub: "AgentBus.route()", x: 36, y: 80, color: "neutral" },
    { id: "viz", label: "VizAgent", sub: "gemini-3-flash", x: 56, y: 25, color: "blue" },
    { id: "sum", label: "SummaryAgent", sub: "rolling 5-min", x: 56, y: 55, color: "green" },
    { id: "alt", label: "AlertAgent", sub: "keyword match", x: 56, y: 80, color: "red" },
    { id: "ovl", label: "Overlay", sub: "15 chart types", x: 86, y: 25, color: "blue" },
    { id: "log", label: "Control Pill", sub: "summary · status", x: 86, y: 55, color: "neutral" },
    { id: "ntf", label: "OS Notification", sub: "Electron API", x: 86, y: 80, color: "red" },
  ];
  const links = [
    ["scr","cap"],["aud","cap"],["cap","ses"],["ses","tr"],["ses","vi"],["ses","ws"],
    ["tr","ws"],["vi","ws"],["ws","viz"],["ws","sum"],["ws","alt"],
    ["viz","ovl"],["sum","log"],["alt","ntf"],
  ];
  const byId: Record<string, typeof nodes[number]> = {};
  nodes.forEach(n => { byId[n.id] = n; });

  const palette: Record<string, { bg: string; bd: string; tx: string }> = {
    blue:    { bg: "rgba(33,150,243,0.10)",  bd: "rgba(33,150,243,0.45)",  tx: "#bbdefb" },
    green:   { bg: "rgba(76,175,80,0.10)",   bd: "rgba(76,175,80,0.45)",   tx: "#c8e6c9" },
    red:     { bg: "rgba(244,67,54,0.10)",   bd: "rgba(244,67,54,0.45)",   tx: "#ffcdd2" },
    neutral: { bg: "rgba(255,255,255,0.04)", bd: "rgba(255,255,255,0.18)", tx: "#e8e8f0" },
  };

  return (
    <section id="how">
      <div className="wrap">
        <div className="eyebrow">How it works</div>
        <h2>One pipeline. Zero wiring.</h2>
        <p className="lead" style={{ marginTop: 14 }}>
          VideoDB captures your screen and audio, transcribes in real-time, runs visual scene analysis,
          and emits structured events over a WebSocket. DataLens routes those events to three AI agents — none of which ever see raw pixels or audio bytes.
        </p>
        <div style={{ position: "relative", width: "100%", height: 360, fontSize: 12, marginTop: 40, overflowX: "auto" }}>
          {groups.map(g => (
            <div key={g.label} style={{
              position: "absolute", left: `${g.bounds.left}%`, width: `${g.bounds.right - g.bounds.left}%`,
              top: `${g.bounds.top}%`, height: `${g.bounds.bottom - g.bounds.top}%`,
              border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 12, background: "rgba(255,255,255,0.015)",
            }}>
              <div style={{ position: "absolute", top: -10, left: 10, background: "var(--bg)", padding: "0 6px", fontSize: 10, color: "var(--t-dim)", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
                {g.label}
              </div>
            </div>
          ))}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }} aria-hidden>
            <defs>
              <marker id="arr" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 0 L 8 4 L 0 8 z" fill="rgba(255,255,255,0.4)" />
              </marker>
            </defs>
            {links.map(([a, b], i) => {
              const A = byId[a], B = byId[b];
              return (
                <line key={i}
                  x1={`${A.x + 9}%`} y1={`${A.y + 2}%`} x2={`${B.x - 1}%`} y2={`${B.y + 2}%`}
                  stroke="rgba(255,255,255,0.22)" strokeWidth="1.2" strokeDasharray="3 3"
                  markerEnd="url(#arr)"
                  style={{ animation: `dash-${i % 3} ${3 + (i % 3)}s linear infinite` }}
                />
              );
            })}
          </svg>
          {nodes.map(n => {
            const p = palette[n.color] || palette.neutral;
            return (
              <div key={n.id} style={{
                position: "absolute", left: `${n.x}%`, top: `${n.y}%`, transform: "translateY(-50%)",
                padding: "7px 11px", borderRadius: 10, background: p.bg, border: `1px solid ${p.bd}`,
                backdropFilter: "blur(10px)", minWidth: 90,
              }}>
                <div style={{ fontSize: 12, color: p.tx, fontWeight: 500, whiteSpace: "nowrap" }}>{n.label}</div>
                <div style={{ fontSize: 9.5, color: "var(--t-lo)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap", marginTop: 2 }}>{n.sub}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── VIDEODB SECTION ─────────────────────────────────── */
function FauxTranscript() {
  const [interim, setInterim] = useState("Q3 revenue was");
  const [finals, setFinals] = useState([
    { text: "Welcome everyone, this is the Q3 board update.", t: "00:02" },
    { text: "I want to start with the topline numbers.", t: "00:08" },
  ]);
  const drafts = ["Q3 revenue was","Q3 revenue was fourteen","Q3 revenue was 14.2","Q3 revenue was 14.2 million,","Q3 revenue was 14.2 million, up from 11.8M"];
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i++;
      if (i < drafts.length) {
        setInterim(drafts[i]);
      } else {
        setFinals(f => [...f.slice(-3), { text: drafts[drafts.length-1], t: "00:14" }]);
        setInterim("");
        i = 0;
        setTimeout(() => setInterim("Churn fell to"), 1200);
      }
    }, 700);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="panel-2" style={{ padding: 16, fontFamily: "var(--font-mono)", fontSize: 12.5, lineHeight: 1.7, minHeight: 240 }}>
      {finals.map((f, i) => (
        <div key={i} style={{ display: "flex", gap: 10, color: "var(--t-md)" }}>
          <span style={{ color: "var(--t-dim)" }}>{f.t}</span>
          <span style={{ fontSize: 9, color: "#c8e6c9", alignSelf: "center", padding: "1px 5px", border: "1px solid rgba(76,175,80,0.3)", borderRadius: 3 }}>FINAL</span>
          <span style={{ flex: 1 }}>{f.text}</span>
        </div>
      ))}
      {interim && (
        <div style={{ display: "flex", gap: 10, color: "var(--t-lo)", fontStyle: "italic" }}>
          <span style={{ color: "var(--t-dim)" }}>···</span>
          <span style={{ fontSize: 9, color: "#bbdefb", alignSelf: "center", padding: "1px 5px", border: "1px solid rgba(33,150,243,0.3)", borderRadius: 3, fontStyle: "normal" }}>DRAFT</span>
          <span>{interim}<span style={{ borderRight: "1px solid var(--t-md)", marginLeft: 1 }}>&nbsp;</span></span>
        </div>
      )}
    </div>
  );
}

function VideoDBSection() {
  const [activeStream, setActiveStream] = useState<"audio"|"screen">("audio");
  return (
    <section id="videodb">
      <div className="wrap">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 40, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 460px" }}>
            <div className="eyebrow">VideoDB · the engine room</div>
            <h2>The hard parts already solved.</h2>
            <p className="lead" style={{ marginTop: 14 }}>
              DataLens doesn&apos;t transcribe audio. It doesn&apos;t run vision models against your display.
              It doesn&apos;t manage RTSP streams or stitch frames.{" "}
              <strong style={{ color: "var(--t-hi)" }}>VideoDB does all of it</strong>, and ships the results
              back as clean, structured events over a single WebSocket.
            </p>
          </div>
          <div style={{ flex: "0 0 360px", minWidth: 280 }}>
            <div className="panel" style={{ padding: 18 }}>
              <div className="eyebrow" style={{ marginBottom: 10 }}>What you&apos;d otherwise build</div>
              {[
                ["Realtime audio transcription","Whisper · Deepgram · in-house ASR"],
                ["Visual scene indexing","YOLO + frame embeddings + captioning"],
                ["RTStream lifecycle","WebRTC · GStreamer · ffmpeg"],
                ["Rolling audio summaries","LLM summarisation pipeline"],
                ["Session persistence","Object storage + manifest DB"],
              ].map(([k,v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "7px 0", borderTop: "1px solid var(--line)" }}>
                  <span style={{ fontSize: 13, color: "var(--t-md)" }}>{k}</span>
                  <span style={{ fontSize: 11, color: "var(--t-dim)", fontFamily: "var(--font-mono)", textAlign: "right" }}>{v}</span>
                </div>
              ))}
              <div style={{ marginTop: 12, fontSize: 12, color: "var(--blue)" }}>
                → All replaced by <code>indexVisuals()</code> &amp; <code>startTranscript()</code>
              </div>
            </div>
          </div>
        </div>
        <div className="panel" style={{ marginTop: 48, padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", borderBottom: "1px solid var(--line)" }}>
            {([["audio","Audio stream","transcript events"],["screen","Screen stream","visual_index + audio_index"]] as const).map(([id,label,sub]) => (
              <button key={id} onClick={() => setActiveStream(id as any)} style={{
                flex: 1, padding: "16px 22px", textAlign: "left",
                background: activeStream === id ? "rgba(33,150,243,0.07)" : "transparent",
                border: "none", borderRight: "1px solid var(--line)",
                borderBottom: activeStream === id ? "2px solid var(--blue-2)" : "2px solid transparent",
                color: activeStream === id ? "var(--t-hi)" : "var(--t-lo)",
                cursor: "pointer", fontFamily: "inherit",
              }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
                <div style={{ fontSize: 11, color: "var(--t-dim)", fontFamily: "var(--font-mono)", marginTop: 3 }}>{sub}</div>
              </button>
            ))}
          </div>
          <div style={{ padding: 24 }}>
            {activeStream === "audio" ? (
              <div className="grid-2">
                <div>
                  <div className="eyebrow">What VideoDB sends</div>
                  <pre className="code-block" style={{ marginTop: 12 }}>{`{
  "channel": "transcript",
  "is_final": true,
  "text": "Q3 revenue was 14.2M, up from 11.8M",
  "start": 12.18,
  "end": 15.92,
  "speaker": "speaker_0"
}`}</pre>
                  <p style={{ fontSize: 13, color: "var(--t-lo)", marginTop: 14 }}>
                    DataLens only routes <code>is_final: true</code> messages to VizAgent. Interim drafts are useful for UI hints but not for committing a chart.
                  </p>
                </div>
                <div>
                  <div className="eyebrow">Live transcript</div>
                  <FauxTranscript />
                </div>
              </div>
            ) : (
              <div className="grid-2">
                <div>
                  <div className="eyebrow">visual_index event</div>
                  <pre className="code-block" style={{ marginTop: 12 }}>{`{
  "channel": "visual_index",
  "index_id": "idx_88a1f3",
  "scene": "Dashboard showing quarterly
            revenue bar chart; values
            $8.2M through $14.2M for Q3",
  "t": 14.40
}`}</pre>
                  <p style={{ fontSize: 13, color: "var(--t-lo)", marginTop: 14 }}>
                    The <code>index_id</code> is the dedup key — same scene within 20s never re-fires the AI.
                  </p>
                </div>
                <div>
                  <div className="eyebrow">audio_index event</div>
                  <pre className="code-block" style={{ marginTop: 12 }}>{`{
  "channel": "audio_index",
  "summary": "Speaker discusses Q3:
              revenue +20%, churn -0.7pp,
              NPS at 62",
  "topic": "Quarterly business review",
  "t": 51.2
}`}</pre>
                  <p style={{ fontSize: 13, color: "var(--t-lo)", marginTop: 14 }}>
                    Higher-level rolling summaries — not for charting (too lossy), but perfect for the <code>SummaryAgent</code>&apos;s 5-minute window.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── AGENTS ──────────────────────────────────────────── */
const AGENTS = {
  viz: { icon: "🧠", name: "VizAgent", tagline: "Decides what becomes a chart", color: "blue", provider: "OpenRouter · Google AI", input: "Final transcripts · visual scenes", output: "UVS chart spec → overlay" },
  sum: { icon: "📋", name: "SummaryAgent", tagline: "Rolling 5-minute brief", color: "green", provider: "(Local · no LLM call)", input: "audio_index events", output: "SummaryUpdate → control window" },
  alt: { icon: "🔔", name: "AlertAgent", tagline: "User-defined keyword tripwires", color: "red", provider: "(Local · regex match)", input: "Any event with text", output: "OS Notification" },
};
type AgentKey = keyof typeof AGENTS;

function Agents() {
  const [active, setActive] = useState<AgentKey>("viz");
  return (
    <section id="ai">
      <div className="wrap">
        <div className="eyebrow">AI agents</div>
        <h2 style={{ maxWidth: 760 }}>Three specialised brains on a shared event bus.</h2>
        <p className="lead" style={{ marginTop: 14 }}>
          Every WebSocket message from VideoDB lands in <code>AgentBus.route()</code>, which fans it out by channel
          to whichever agents subscribed. Each agent owns its own concerns — none share state.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 32, flexWrap: "wrap" }}>
          {(Object.entries(AGENTS) as [AgentKey, typeof AGENTS[AgentKey]][]).map(([id, a]) => {
            const accent = { blue: "#64b5f6", green: "#4caf50", red: "#f44336" }[a.color];
            return (
              <button key={id} onClick={() => setActive(id)} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
                background: active === id ? "rgba(33,150,243,0.06)" : "var(--bg-2)",
                border: active === id ? `1px solid ${accent}66` : "1px solid var(--line)",
                borderRadius: 12, cursor: "pointer", textAlign: "left", flex: "1 1 220px",
                transition: "all .15s", fontFamily: "inherit",
              }}>
                <span style={{ fontSize: 22 }}>{a.icon}</span>
                <div>
                  <div style={{ fontSize: 14.5, color: active === id ? "var(--t-hi)" : "var(--t-md)", fontWeight: 500 }}>{a.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--t-lo)", marginTop: 2 }}>{a.tagline}</div>
                </div>
                <span style={{ flex: 1 }} />
                <span style={{ width: 6, height: 6, borderRadius: 999, background: active === id ? accent : "var(--t-vdim)" }} />
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 20 }}>
          {active === "viz" && (
            <div className="panel" style={{ padding: 28 }}>
              <div className="grid-2">
                <div>
                  <h3>VizAgent</h3>
                  <div style={{ marginTop: 6, marginBottom: 14, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {["openrouter","google-ai","gemini-3-flash","function calling","15 chart types"].map(t => <span key={t} className="tag">{t}</span>)}
                  </div>
                  <p style={{ color: "var(--t-md)", fontSize: 14.5 }}>
                    The only agent that talks to a frontier LLM. VizAgent watches for finalised transcripts and visual
                    scene descriptions, and asks Gemini one question repeatedly:{" "}
                    <em>"Is there concrete chartable data in this sentence?"</em>
                  </p>
                  <p style={{ color: "var(--t-md)", fontSize: 14.5, marginTop: 12 }}>
                    The trick is the schema. Instead of asking for free-form JSON, VizAgent registers a single tool,{" "}
                    <code>show_chart</code>, whose parameter shape <strong>is</strong> the chart spec. The model
                    calls it or calls nothing — there is no parsing layer, no recovery from a bad reply.
                  </p>
                  <div style={{ marginTop: 16, padding: 14, background: "rgba(33,150,243,0.06)", border: "1px solid rgba(33,150,243,0.2)", borderRadius: 10, fontSize: 13, color: "var(--t-md)" }}>
                    <strong style={{ color: "var(--blue)" }}>Google AI fallback chain:</strong><br />
                    gemini-3-flash-preview → gemini-2.5-flash → gemini-2.5-flash-lite<br />
                    Rate limits skip to the next model and log to telemetry.
                  </div>
                </div>
                <div>
                  <div className="eyebrow">The show_chart schema (abbreviated)</div>
                  <pre className="code-block" style={{ marginTop: 10, fontSize: 12 }}>{`{
  "name": "show_chart",
  "description": "Render a chart when concrete,
                  quantitative data is present.",
  "parameters": {
    "type": "object",
    "properties": {
      "kind":  { "enum": [/* 15 types */] },
      "title": { "type": "string" },
      "data":  { /* shape by kind */ },
      "unit":  { "type": "string" },
      "delta": { "type": "number" }
    },
    "required": ["kind","title","data"]
  }
}`}</pre>
                  <div style={{ marginTop: 16 }}>
                    <div className="eyebrow" style={{ marginBottom: 8 }}>Cooldown gates</div>
                    {[
                      ["CALL_COOLDOWN","15s","between any two API calls"],
                      ["CHART_COOLDOWN","8s","between any two overlays"],
                      ["INDEX_COOLDOWN","20s","same visual scene (by index_id)"],
                      ["METRIC_TTL","90s","same chart title suppressed"],
                    ].map(([k,v,d]) => (
                      <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderTop: "1px solid var(--line)", fontSize: 12 }}>
                        <code style={{ fontSize: 11 }}>{k}</code>
                        <span className="mono" style={{ color: "var(--blue)", fontSize: 12 }}>{v}</span>
                        <span style={{ color: "var(--t-lo)" }}>{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {active === "sum" && (
            <div className="panel" style={{ padding: 28 }}>
              <div className="grid-2">
                <div>
                  <h3>SummaryAgent</h3>
                  <div style={{ marginTop: 6, marginBottom: 14, display: "flex", gap: 6 }}>
                    {["local","no-llm","5-min window"].map(t => <span key={t} className="tag">{t}</span>)}
                  </div>
                  <p style={{ color: "var(--t-md)", fontSize: 14.5 }}>
                    Buffers <code>audio_index</code> events (VideoDB&apos;s higher-level scene summaries) over a 5-minute rolling window.
                    Extracts key points, the current topic, and numeric data mentions. Emits a summary update every 60 seconds.
                  </p>
                  <p style={{ color: "var(--t-md)", fontSize: 14.5, marginTop: 12 }}>
                    No LLM call needed — VideoDB already produced the summary. SummaryAgent just aggregates and re-emits it to the control pill.
                  </p>
                </div>
                <div>
                  <div className="eyebrow">SummaryUpdate shape</div>
                  <pre className="code-block" style={{ marginTop: 10, fontSize: 12 }}>{`{
  "keyPoints":    ["Revenue up 20%", ...],
  "currentTopic": "Q3 board review",
  "dataPoints":   ["$14.2M", "NPS 62", ...],
  "updatedAt":    1716912000000
}`}</pre>
                </div>
              </div>
            </div>
          )}
          {active === "alt" && (
            <div className="panel" style={{ padding: 28 }}>
              <div className="grid-2">
                <div>
                  <h3>AlertAgent</h3>
                  <div style={{ marginTop: 6, marginBottom: 14, display: "flex", gap: 6 }}>
                    {["local","regex","os-notification"].map(t => <span key={t} className="tag">{t}</span>)}
                  </div>
                  <p style={{ color: "var(--t-md)", fontSize: 14.5 }}>
                    Keyword-based alerting. User-defined alerts (keyword + description) are matched against incoming event text.
                    When a keyword fires, an OS notification is shown via Electron&apos;s <code>Notification</code> API.
                  </p>
                  <p style={{ color: "var(--t-md)", fontSize: 14.5, marginTop: 12 }}>
                    Each alert is rate-limited to once per 60-second window per keyword match — no duplicate pings.
                  </p>
                </div>
                <div>
                  <div className="eyebrow">Alert definition</div>
                  <pre className="code-block" style={{ marginTop: 10, fontSize: 12 }}>{`{
  "id":          "alert_001",
  "keyword":     "churn",
  "description": "Churn rate mentioned",
  "enabled":     true
}`}</pre>
                  <p style={{ fontSize: 13, color: "var(--t-lo)", marginTop: 12 }}>
                    Alerts are stored in the same encrypted config file as your API keys. Configure them via the ⚙ button on the control pill.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ─── CHART CATALOG ───────────────────────────────────── */
function ChartsCatalog() {
  const charts = [
    { id: "metric_card",     label: "metric_card",     desc: "Single KPI with delta arrow",
      render: () => <div style={{ padding: 14 }}><div style={{ fontSize: 26, fontWeight: 600, color: "var(--t-hi)", fontFamily: "var(--font-mono)" }}>$14.2M</div><div style={{ fontSize: 12, color: "#c8e6c9", fontFamily: "var(--font-mono)" }}>+20.3%</div><div style={{ fontSize: 11, color: "var(--t-dim)", marginTop: 4 }}>vs $11.8M Q2</div></div> },
    { id: "bar",             label: "bar",             desc: "Vertical bars by category",
      render: () => <BarMini data={[42,68,55,80,36]} color={C.blue} h={70} w={160} /> },
    { id: "bar_horizontal",  label: "bar_horizontal",  desc: "Ranked horizontal bars",
      render: () => (
        <div style={{ padding: "8px 14px", width: "90%" }}>
          {[["US",85],["UK",62],["DE",44],["FR",38]].map(([l,v]) => (
            <div key={l as string} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 10, color: "var(--t-md)" }}>
              <span style={{ width: 20 }}>{l}</span>
              <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: `${v}%`, height: "100%", background: C.blue, opacity: 0.8 }} />
              </div>
              <span className="mono" style={{ fontSize: 9, color: "var(--t-lo)" }}>{v}</span>
            </div>
          ))}
        </div>
      ) },
    { id: "line",            label: "line",            desc: "Single trend over time",
      render: () => <Sparkline data={[8.2,9.4,10.1,11.8,14.2]} color={C.blue} h={60} w={180} dot /> },
    { id: "line_multi",      label: "line_multi",      desc: "Multiple trend lines",
      render: () => <MultiLine series={[{name:"A",color:C.blue,data:[40,55,48,70,65]},{name:"B",color:C.green,data:[30,28,42,38,50]}]} h={70} w={180} /> },
    { id: "area",            label: "area",            desc: "Cumulative area trend",
      render: () => <Sparkline data={[4,7,6,10,9,13,12]} color={C.blue} h={60} w={180} fill /> },
    { id: "donut",           label: "donut",           desc: "Part-of-whole proportions",
      render: () => <DonutMini values={[42,28,18,12]} colors={[C.blue,C.green,C.amber,C.purple]} size={80} label="4" sub="regions" /> },
    { id: "progress_bar",    label: "progress_bar",    desc: "Actual vs goal",
      render: () => <div style={{ padding: 14, width: "90%" }}><div style={{ fontSize: 18, fontWeight: 600, color: "var(--t-hi)", fontFamily: "var(--font-mono)" }}>62 <span style={{ fontSize: 11, color: "var(--t-lo)" }}>NPS</span></div><ProgressBar value={62} max={100} color={C.blue} height={8} /><div style={{ fontSize: 10, color: "var(--t-dim)", marginTop: 4 }}>target 55 · +7</div></div> },
    { id: "waterfall",       label: "waterfall",       desc: "Bridge decomposition",
      render: () => <Waterfall data={[{label:"Start",v:10},{label:"Rev",v:4.2},{label:"Costs",v:-1.8},{label:"End",v:0}]} h={70} w={180} /> },
    { id: "bullet",          label: "bullet",          desc: "Actual vs target per row",
      render: () => (
        <div style={{ padding: "8px 14px" }}>
          {[["Revenue","14.2","11"],["NPS","62","55"],["Churn","-0.7","0"]].map(([l,v,t]) => (
            <div key={l} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--t-lo)", marginBottom: 3 }}><span>{l}</span><span className="mono">{v}</span></div>
              <BulletChart value={Number(l === "Churn" ? 30 : v === "14.2" ? 85 : 62)} target={l === "Churn" ? 50 : Number(t)} max={100} w={160} />
            </div>
          ))}
        </div>
      ) },
    { id: "scatter",         label: "scatter",         desc: "Correlation",
      render: () => <ScatterMini h={70} w={160} /> },
    { id: "heatmap",         label: "heatmap",         desc: "Grid intensity",
      render: () => <HeatmapMini rows={4} cols={7} /> },
    { id: "sparkline",       label: "sparkline",       desc: "Minimal directional trend",
      render: () => <Sparkline data={[3.4,3.2,3.1,2.9,2.6,2.4]} color={C.green} h={40} w={160} fill={false} dot /> },
    { id: "text_callout",    label: "text_callout",    desc: "Pull quote",
      render: () => <div style={{ padding: 14 }}><div style={{ fontSize: 11, color: "var(--blue)", marginBottom: 6, fontFamily: "var(--font-mono)" }}>KEY INSIGHT</div><div style={{ fontSize: 13.5, color: "var(--t-hi)", lineHeight: 1.5, fontStyle: "italic" }}>&ldquo;Q3 marks our strongest quarter since inception.&rdquo;</div></div> },
    { id: "comparison_table",label: "comparison_table",desc: "Before/after table",
      render: () => (
        <div style={{ padding: 14, width: "90%" }}>
          <table style={{ width: "100%", fontSize: 10, color: "var(--t-md)", fontFamily: "var(--font-mono)", borderCollapse: "collapse" }}>
            <thead><tr style={{ color: "var(--t-dim)" }}><td style={{ padding: "2px 4px" }}></td><td>Before</td><td>After</td></tr></thead>
            <tbody>{[["ARR","11.8M","14.2M"],["NPS","55","62"],["Churn","3.1%","2.4%"]].map(r => (
              <tr key={r[0]} style={{ borderTop: "1px solid var(--line)" }}>
                <td style={{ padding: "3px 4px", color: "var(--t-lo)" }}>{r[0]}</td>
                <td style={{ padding: "3px 4px" }}>{r[1]}</td>
                <td style={{ padding: "3px 4px", color: "#c8e6c9" }}>{r[2]}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) },
  ];

  return (
    <section id="charts">
      <div className="wrap">
        <div className="eyebrow">Chart catalog</div>
        <h2 style={{ maxWidth: 760 }}>Fifteen kinds. The model picks the one that fits the data shape.</h2>
        <p className="lead" style={{ marginTop: 14 }}>
          Each kind has its own JSON schema slot in the <code>show_chart</code> tool spec. The model can&apos;t ask for a fictional chart type.
          New data is upserted into existing cards by title; the sidebar grows by accumulation, not repetition.
        </p>
        <div style={{ marginTop: 36, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
          {charts.map(c => (
            <div key={c.id} className="panel-2" style={{ display: "flex", flexDirection: "column", minHeight: 170 }}>
              <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="mono" style={{ fontSize: 11, color: "var(--blue)" }}>{c.label}</span>
                <span className="mono" style={{ fontSize: 9.5, color: "var(--t-dim)" }}>kind</span>
              </div>
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 100 }}>
                {c.render()}
              </div>
              <div style={{ padding: "8px 12px", borderTop: "1px solid var(--line)", fontSize: 11.5, color: "var(--t-lo)" }}>
                {c.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── GETTING STARTED ─────────────────────────────────── */
function FlowStep({ n, title, sub, children }: { n: string; title: string; sub: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
      <div style={{ flexShrink: 0 }}>
        <div className="mono" style={{ width: 32, height: 32, borderRadius: 999, background: "var(--blue-dim)", color: "#cfe6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, border: "1px solid rgba(33,150,243,0.4)" }}>{n}</div>
      </div>
      <div style={{ flex: 1, paddingTop: 4 }}>
        <h3 style={{ fontSize: 18 }}>{title}</h3>
        <div style={{ fontSize: 12, color: "var(--t-dim)", fontFamily: "var(--font-mono)", marginTop: 2, marginBottom: 10 }}>{sub}</div>
        {children}
      </div>
    </div>
  );
}

function PillIllustration({ recording }: { recording?: boolean }) {
  return (
    <div style={{ position: "relative", background: "linear-gradient(180deg,#15151f,#0a0a12)", border: "1px solid var(--line-3)", borderRadius: 12, padding: 24, minHeight: 100 }}>
      <div style={{ position: "absolute", bottom: 18, left: 22, display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "rgba(12,12,20,0.92)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 999, boxShadow: "0 8px 28px rgba(0,0,0,0.5)" }}>
        <Image src="/logo.svg" alt="" width={16} height={16} style={{ borderRadius: 4 }} />
        {recording ? (
          <>
            <span className="dot red rec-dot" />
            <span className="mono" style={{ fontSize: 11.5, color: "var(--t-md)" }}>Recording · 03:42</span>
            <span style={{ width: 1, height: 14, background: "var(--line)" }} />
            <button style={{ padding: "3px 9px", borderRadius: 999, background: "var(--red-dim)", border: "1px solid rgba(244,67,54,0.4)", color: "#ffcdd2", fontSize: 11.5, cursor: "pointer" }}>⏹ Stop</button>
          </>
        ) : (
          <>
            <span style={{ width: 1, height: 14, background: "var(--line-2)" }} />
            <button style={{ padding: "3px 12px", borderRadius: 999, background: "var(--blue-dim)", border: "1px solid rgba(33,150,243,0.45)", color: "#cfe6ff", fontSize: 12, cursor: "pointer" }}>Sign in</button>
            <button style={{ padding: "3px 9px", borderRadius: 999, background: "var(--bg-3)", border: "1px solid var(--line-2)", color: "var(--t-lo)", fontSize: 12, cursor: "pointer" }}>⚙</button>
          </>
        )}
      </div>
      <div style={{ position: "absolute", top: 10, right: 12, fontSize: 10, color: "var(--t-vdim)", fontFamily: "var(--font-mono)" }}>desktop · primary display</div>
    </div>
  );
}

const ENV_ROWS = [
  ["VIDEODB_API_KEY","required","From videodb.io dashboard"],
  ["VIDEODB_COLLECTION_ID","required","The collection to store sessions in"],
  ["OPENROUTER_API_KEY","one of","From openrouter.ai"],
  ["GOOGLE_AI_API_KEY","one of","From aistudio.google.com"],
  ["CLERK_SECRET_KEY","required","From your Clerk dashboard"],
  ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY","required","From your Clerk dashboard"],
];

function GettingStarted() {
  const [persona, setPersona] = useState<"user"|"dev"|"deploy">("user");
  const tabs = [
    { id: "user" as const,   label: "End user",  sub: "install · sign in · capture", icon: "👤" },
    { id: "dev" as const,    label: "Developer", sub: "clone · pnpm · dev",          icon: "💻" },
    { id: "deploy" as const, label: "Deployer",  sub: "vercel · clerk · share",      icon: "🚀" },
  ];
  return (
    <section id="start">
      <div className="wrap">
        <div className="eyebrow">Get started</div>
        <h2 style={{ maxWidth: 760 }}>From zero to live charts in under five minutes.</h2>
        <p className="lead" style={{ marginTop: 14 }}>Three paths, depending on who you are. Most people only need the first one.</p>
        <div style={{ marginTop: 32, display: "flex", gap: 8, background: "var(--bg-2)", border: "1px solid var(--line)", padding: 5, borderRadius: 12, maxWidth: 700 }}>
          {tabs.map(p => (
            <button key={p.id} onClick={() => setPersona(p.id)} style={{
              flex: 1, padding: "12px 14px",
              background: persona === p.id ? "rgba(33,150,243,0.10)" : "transparent",
              border: persona === p.id ? "1px solid rgba(33,150,243,0.35)" : "1px solid transparent",
              borderRadius: 8, color: persona === p.id ? "var(--t-hi)" : "var(--t-md)",
              cursor: "pointer", textAlign: "left", transition: "all .15s", fontFamily: "inherit",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>{p.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{p.label}</span>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--t-lo)", marginTop: 3, fontFamily: "var(--font-mono)" }}>{p.sub}</div>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 24 }}>
          {persona === "user" && (
            <div className="panel" style={{ padding: 28 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <FlowStep n="1" title="Download the installer" sub="No keys, no config files">
                  <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                    <a href="https://github.com/FelixMatrixar/datalens/releases/download/v1.0.0/DataLens.Setup.1.0.0.exe" className="panel-2" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", textDecoration: "none", color: "var(--t-md)", borderRadius: 10, minWidth: 230 }}>
                      <span style={{ width: 30, height: 30, borderRadius: 6, background: "var(--bg-3)", border: "1px solid var(--line-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>⊞</span>
                      <div><div style={{ fontSize: 12.5, color: "var(--t-hi)" }}>Windows</div><div style={{ fontSize: 10.5, color: "var(--t-dim)", fontFamily: "var(--font-mono)" }}>DataLens-Setup-1.0.0.exe</div></div>
                      <span style={{ flex: 1 }} /><span style={{ fontSize: 11, color: "var(--t-lo)" }}>~92 MB</span>
                    </a>
                  </div>
                </FlowStep>
                <FlowStep n="2" title="Launch — find the floating pill" sub="Bottom-left of your primary display">
                  <p style={{ margin: 0, color: "var(--t-md)", fontSize: 14 }}>A small frameless control pill appears. No dock icon to chase, no main window to manage — just a draggable pill that stays out of your way.</p>
                  <div style={{ marginTop: 16 }}><PillIllustration /></div>
                </FlowStep>
                <FlowStep n="3" title="Sign in" sub="One click — browser handles the rest">
                  <p style={{ margin: 0, color: "var(--t-md)", fontSize: 14 }}>Click <strong>Sign in</strong>. Your browser opens to your team&apos;s DataLens page. Authenticate with Clerk and the tab closes itself — the app is ready.</p>
                  <div className="panel-2" style={{ marginTop: 14, padding: 14, fontSize: 13, color: "var(--t-md)" }}>
                    <span style={{ color: "var(--blue)" }}>ⓘ</span>&nbsp; Your credentials are fetched once and stored locally in an <strong>AES-256 encrypted file</strong>. They persist across restarts.
                  </div>
                </FlowStep>
                <FlowStep n="4" title="Start a capture" sub="Pick devices · click ▶ Start">
                  <p style={{ margin: 0, color: "var(--t-md)", fontSize: 14 }}>Click <strong>▶ Start</strong>. A device picker slides up — optionally choose a display or audio source. Click <strong>▶ Start Capture</strong>. Charts begin appearing within seconds of any chartable data being spoken or shown.</p>
                  <div style={{ marginTop: 14 }}><PillIllustration recording /></div>
                </FlowStep>
                <FlowStep n="5" title="Stop when done" sub="⏹ in the pill — that's it">
                  <p style={{ margin: 0, color: "var(--t-md)", fontSize: 14 }}>Click <strong>⏹ Stop</strong>. The capture binary closes gracefully, the WebSocket disconnects, the chart context clears.</p>
                </FlowStep>
                <div className="panel-2" style={{ padding: 16, background: "rgba(33,150,243,0.04)", borderColor: "rgba(33,150,243,0.2)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 18 }}>💡</span>
                    <strong style={{ color: "var(--t-hi)", fontSize: 14 }}>Optional · Bring your own keys</strong>
                  </div>
                  <p style={{ margin: 0, color: "var(--t-md)", fontSize: 13 }}>Don&apos;t want to sign in? Click <strong>⚙</strong> → <strong>Configure manually</strong>. Paste your OpenRouter or Google AI key plus a VideoDB API key and collection ID.</p>
                </div>
              </div>
            </div>
          )}
          {persona === "dev" && (
            <div id="dev" className="panel" style={{ padding: 28 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <FlowStep n="1" title="Clone and install" sub="Node 18+ · pnpm required">
                  <pre className="code-block">{`git clone https://github.com/FelixMatrixar/datalens
pnpm install`}</pre>
                </FlowStep>
                <FlowStep n="2" title="Run in dev mode" sub="packages/desktop">
                  <pre className="code-block">{`cd packages/desktop
pnpm dev`}</pre>
                  <p style={{ margin: "10px 0 0", color: "var(--t-md)", fontSize: 13.5 }}>Opens two windows: the floating control pill (bottom-left) and the transparent overlay (full-screen, always on top).</p>
                </FlowStep>
                <FlowStep n="3" title="Configure manually" sub="⚙ on the pill → Configure manually">
                  <p style={{ margin: 0, color: "var(--t-md)", fontSize: 14 }}>Click ⚙ and choose <em>Configure manually</em>. Paste your OpenRouter or Google AI key plus a VideoDB API key and collection ID. No Vercel deployment needed for local development.</p>
                </FlowStep>
                <FlowStep n="4" title="Build the installer" sub="packages/desktop">
                  <pre className="code-block">{`pnpm package
# → release/DataLens-Setup-x.x.x.exe`}</pre>
                </FlowStep>
              </div>
            </div>
          )}
          {persona === "deploy" && (
            <div id="deploy" className="panel" style={{ padding: 28 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <FlowStep n="1" title="Deploy the frontend to Vercel" sub="packages/frontend">
                  <pre className="code-block">{`cd packages/frontend
vercel deploy`}</pre>
                  <p style={{ margin: "10px 0 0", color: "var(--t-md)", fontSize: 13.5 }}>This is the Next.js app that handles auth and serves <code>/api/config</code> — the endpoint the desktop app hits at sign-in to fetch your team&apos;s API keys.</p>
                </FlowStep>
                <FlowStep n="2" title="Set environment variables in Vercel" sub="Settings → Environment Variables">
                  <div className="panel-2" style={{ marginTop: 12, overflow: "hidden" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(260px,1.4fr) 90px 1.4fr", padding: "10px 14px", fontSize: 11, color: "var(--t-dim)", letterSpacing: "0.08em", textTransform: "uppercase", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--line)", fontFamily: "var(--font-mono)" }}>
                      <span>Variable</span><span>Required</span><span>Description</span>
                    </div>
                    {ENV_ROWS.map(([k, req, desc], i) => (
                      <div key={k} style={{ display: "grid", gridTemplateColumns: "minmax(260px,1.4fr) 90px 1.4fr", padding: "10px 14px", borderTop: i ? "1px solid var(--line)" : "none", alignItems: "center", fontSize: 12.5 }}>
                        <code style={{ background: "transparent", border: "none", padding: 0, color: req === "required" ? "#bbdefb" : "#ffe0b2" }}>{k}</code>
                        <span style={{ fontSize: 10.5, color: req === "required" ? "#c8e6c9" : "#ffe0b2", fontFamily: "var(--font-mono)" }}>{req}</span>
                        <span style={{ color: "var(--t-md)" }}>{desc}</span>
                      </div>
                    ))}
                  </div>
                  <p style={{ margin: "12px 0 0", color: "var(--t-lo)", fontSize: 12.5 }}>Provide both AI keys? OpenRouter wins. The <code>/api/config</code> endpoint delivers the appropriate set — <strong>nothing is committed in the repo</strong>.</p>
                </FlowStep>
                <FlowStep n="3" title="Control who can sign in" sub="Clerk dashboard">
                  <ul style={{ margin: "10px 0 0", paddingLeft: 18, color: "var(--t-md)", fontSize: 13.5, lineHeight: 1.85 }}>
                    <li>Disable public sign-up and invite specific users by email, <strong>or</strong></li>
                    <li>Restrict sign-up to your organisation&apos;s email domain</li>
                  </ul>
                  <div className="panel-2" style={{ marginTop: 14, padding: 14, fontSize: 13, color: "var(--t-md)", background: "rgba(244,67,54,0.04)", borderColor: "rgba(244,67,54,0.25)" }}>
                    <span style={{ color: "#ff8a80" }}>⚠</span>&nbsp; Anyone with Clerk access uses <em>your</em> API keys — only invite people you trust.
                  </div>
                </FlowStep>
                <FlowStep n="4" title="Share the repo URL" sub="That's the whole onboarding">
                  <pre className="code-block">{`pnpm install
cd packages/desktop && pnpm package
# launch the installer → Sign in`}</pre>
                  <p style={{ margin: "10px 0 0", color: "var(--t-md)", fontSize: 13.5 }}>No keys to paste, no <code>.env</code> files to share. Sign-in fetches everything they need.</p>
                </FlowStep>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ─── TECH STACK ──────────────────────────────────────── */
function TechStack() {
  const stack = [
    { name: "Electron + electron-vite", what: "app framework · build tooling",        tag: "shell" },
    { name: "React 18",                 what: "control pill · overlay UI",            tag: "view" },
    { name: "Recharts",                 what: "all 15 chart renderers",               tag: "view" },
    { name: "VideoDB SDK",              what: "capture · WebSocket · indexing",       tag: "AI", accent: true },
    { name: "OpenRouter",               what: "gemini-3-flash-preview primary",       tag: "AI", accent: true },
    { name: "Google AI REST API",       what: "three-model fallback chain",           tag: "AI", accent: true },
    { name: "electron-store",           what: "AES-256 encrypted local config",       tag: "crypto" },
    { name: "Clerk (via Vercel)",       what: "auth · secure key delivery",           tag: "auth" },
  ];
  return (
    <section id="stack">
      <div className="wrap">
        <div className="eyebrow">Tech stack</div>
        <h2 style={{ maxWidth: 760 }}>Boring choices everywhere they don&apos;t matter. Sharp choices where they do.</h2>
        <p className="lead" style={{ marginTop: 14 }}>
          The desktop side is intentionally conventional: Electron, React, Recharts. The interesting decisions live
          in the agent layer and in deferring to VideoDB for everything that would otherwise be a 10-engineer team.
        </p>
        <div className="bento" style={{ marginTop: 32 }}>
          {stack.map(s => (
            <div key={s.name} style={{
              gridColumn: "span 3", padding: "18px 18px",
              background: "var(--bg-2)", border: "1px solid var(--line)",
              borderLeft: s.accent ? "3px solid #64b5f6" : "1px solid var(--line)",
              borderRadius: 10,
            }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 14, color: "var(--t-hi)", fontWeight: 500 }}>{s.name}</span>
                <span className="mono" style={{ fontSize: 10, color: "var(--t-dim)" }}>{s.tag}</span>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--t-lo)" }}>{s.what}</div>
            </div>
          ))}
        </div>
        <div className="grid-2" style={{ marginTop: 28 }}>
          <div className="panel" style={{ padding: 22 }}>
            <h3 style={{ fontSize: 16 }}>Where your keys live</h3>
            <p style={{ margin: "8px 0 0", fontSize: 13.5, color: "var(--t-md)" }}>Nothing is in the desktop binary. After sign-in, keys are fetched from your team&apos;s Vercel deployment over TLS, then written to an AES-256 encrypted file via <code>electron-store</code>.</p>
            <ul style={{ margin: "12px 0 0", paddingLeft: 18, color: "var(--t-lo)", fontSize: 12.5, lineHeight: 1.85 }}>
              <li>No keys in the git repository</li>
              <li>No keys in the installer</li>
              <li>No keys in app memory between sessions</li>
              <li>One-line revoke via Vercel env panel</li>
            </ul>
          </div>
          <div className="panel" style={{ padding: 22 }}>
            <h3 style={{ fontSize: 16 }}>Build-time environment</h3>
            <p style={{ margin: "8px 0 0", fontSize: 13.5, color: "var(--t-md)" }}>The desktop app reads exactly one optional environment variable at build time:</p>
            <pre className="code-block" style={{ marginTop: 12, fontSize: 12 }}>{`# default
DATALENS_FRONTEND_URL=https://datalens-eosin.vercel.app`}</pre>
            <p style={{ margin: "12px 0 0", fontSize: 12.5, color: "var(--t-lo)" }}>Point this at your own Vercel deployment when you build for your team.</p>
          </div>
        </div>
        {/* CTA */}
        <div style={{ marginTop: 64, padding: "44px 36px", borderRadius: 16, background: "linear-gradient(135deg, rgba(33,150,243,0.10), rgba(76,175,80,0.06))", border: "1px solid rgba(33,150,243,0.25)", textAlign: "center" }}>
          <h2 style={{ fontSize: 36, letterSpacing: "-0.02em" }}>Stop pausing to find the number.</h2>
          <p style={{ margin: "14px auto 0", maxWidth: 620, color: "var(--t-md)", fontSize: 16 }}>
            DataLens runs in the background of every meeting, briefing, or video you watch — and quietly puts the numbers you&apos;re hearing into shape, the second they&apos;re spoken.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="https://github.com/FelixMatrixar/datalens/releases/download/v1.0.0/DataLens.Setup.1.0.0.exe" className="btn primary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12M6 9l6 6 6-6M5 21h14" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Download v1.0
            </a>
            <a href="https://github.com/FelixMatrixar/datalens" className="btn">View on GitHub</a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── FOOTER ──────────────────────────────────────────── */
function Footer() {
  return (
    <footer>
      <div className="wrap foot-grid">
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, color: "var(--t-hi)", fontWeight: 600, marginBottom: 12 }}>
            <Image src="/logo.svg" alt="DataLens" width={22} height={22} style={{ borderRadius: 6 }} />
            <span>DataLens</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--t-lo)", maxWidth: 320 }}>
            A real-time data visualization desktop app that watches your screen and listens to your audio, and quietly renders chart overlays for the numbers it finds.
          </p>
          <div style={{ marginTop: 16 }}>
            <span className="tag">v1.0.0</span>
            <span className="tag" style={{ marginLeft: 6 }}>Windows</span>
          </div>
        </div>
        <div>
          <h4>Product</h4>
          <a href="#how">How it works</a>
          <a href="#ai">AI agents</a>
          <a href="#charts">Chart catalog</a>
          <a href="#videodb">VideoDB</a>
        </div>
        <div>
          <h4>Get started</h4>
          <a href="#start">For end users</a>
          <a href="#dev">For developers</a>
          <a href="#deploy">For deployers</a>
          <a href="#stack">Tech stack</a>
        </div>
        <div>
          <h4>Resources</h4>
          <a href="https://github.com/FelixMatrixar/datalens">GitHub</a>
          <a href="https://videodb.io">VideoDB</a>
          <a href="https://openrouter.ai">OpenRouter</a>
          <a href="https://aistudio.google.com">Google AI Studio</a>
        </div>
      </div>
      <div className="wrap" style={{ display: "flex", justifyContent: "space-between", paddingTop: 28, marginTop: 28, borderTop: "1px solid var(--line)", fontSize: 12, color: "var(--t-dim)" }}>
        <span>© 2026 DataLens. Not affiliated with any third-party brand mentioned.</span>
        <span className="mono">build · 2026.05.17</span>
      </div>
    </footer>
  );
}

/* ─── ROOT ────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <>
      <Nav />
      <main id="top">
        <Hero />
        <Pipeline />
        <VideoDBSection />
        <Agents />
        <ChartsCatalog />
        <GettingStarted />
        <TechStack />
      </main>
      <Footer />
    </>
  );
}
