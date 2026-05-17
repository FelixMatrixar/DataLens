import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, RadialBarChart, RadialBar,
  ScatterChart, Scatter, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { UVS, TelemetryEvent } from "../types";

declare const window: Window & {
  overlayAPI: {
    setIgnoreMouse: (ignore: boolean) => void;
    onShowSpec: (cb: (payload: { spec: UVS }) => void) => void;
    onTelemetry: (cb: (e: TelemetryEvent) => void) => void;
    removeAllListeners: (ch: string) => void;
  };
};

const COLORS = ["#2196f3", "#4caf50", "#ff9800", "#e91e63", "#9c27b0", "#00bcd4", "#ff5722"];
const H = 120;
const PANEL_W = 280;
const MAX_LOGS = 60;

interface ChartEntry { spec: UVS; id: number; ts: number; }
type Pos = { x: number; y: number };

// ── Draggable panel wrapper ──────────────────────────────────────────────────

interface PanelProps {
  pos: Pos;
  locked: boolean;
  minimized: boolean;
  onDragStart: (e: React.MouseEvent) => void;
  onLock: () => void;
  onMinimize: () => void;
  onClear?: () => void;
  label: string;
  icon: string;
  minContent: React.ReactNode;
  children: React.ReactNode;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  maxHeight?: number;
}

function Panel({
  pos, locked, minimized, onDragStart, onLock, onMinimize, onClear,
  label, icon, minContent, children, onMouseEnter, onMouseLeave, maxHeight = 520,
}: PanelProps) {
  return (
    <div
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: PANEL_W,
        background: "rgba(10,10,18,0.91)",
        backdropFilter: "blur(14px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        pointerEvents: "auto",
        userSelect: "none",
        zIndex: 9999,
        overflow: "hidden",
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* drag handle / header */}
      <div
        onMouseDown={locked ? undefined : onDragStart}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "8px 10px 7px",
          borderBottom: minimized ? "none" : "1px solid rgba(255,255,255,0.06)",
          cursor: locked ? "default" : "grab",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <span style={{ fontSize: 11, opacity: 0.4, marginRight: 2, letterSpacing: 2 }}>⠿</span>
        <span style={{ fontSize: 10, color: "#2196f3", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", flex: 1 }}>
          {icon} {label}
        </span>
        {minimized && (
          <span style={{ fontSize: 10, color: "#555", flex: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {minContent}
          </span>
        )}
        <button onClick={onLock} style={btnStyle} title={locked ? "Unlock position" : "Lock position"}>
          {locked ? "🔒" : "🔓"}
        </button>
        <button onClick={onMinimize} style={btnStyle} title={minimized ? "Expand" : "Minimize"}>
          {minimized ? "□" : "–"}
        </button>
        {onClear && !minimized && (
          <button onClick={onClear} style={btnStyle} title="Clear">✕</button>
        )}
      </div>

      {!minimized && (
        <div style={{ maxHeight, overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: "#2a2a3a transparent" } as React.CSSProperties}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Root component ───────────────────────────────────────────────────────────

export default function OverlayApp(): React.ReactElement {
  const [charts, setCharts] = useState<ChartEntry[]>([]);
  const [logs, setLogs] = useState<TelemetryEvent[]>([]);

  const [vizMin, setVizMin] = useState(false);
  const [logMin, setLogMin] = useState(false);
  const [vizLocked, setVizLocked] = useState(true);
  const [logLocked, setLogLocked] = useState(true);

  const [vizPos, setVizPos] = useState<Pos>({ x: window.innerWidth - PANEL_W - 10, y: 30 });
  const [logPos, setLogPos] = useState<Pos>({ x: window.innerWidth - PANEL_W - 10, y: window.innerHeight - 220 });

  const nextId = useRef(0);
  const hovering = useRef(false);
  const isDragging = useRef(false);

  const vizDefault = useCallback((): Pos => ({ x: window.innerWidth - PANEL_W - 10, y: 30 }), []);
  const logDefault = useCallback((): Pos => ({ x: window.innerWidth - PANEL_W - 10, y: window.innerHeight - 220 }), []);

  const resolvedViz = vizLocked ? vizDefault() : vizPos;
  const resolvedLog = logLocked ? logDefault() : logPos;

  useEffect(() => {
    window.overlayAPI.onShowSpec(({ spec }) => {
      setCharts(prev => {
        const idx = prev.findIndex(c => c.spec.title === spec.title);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], spec, ts: Date.now() };
          return updated;
        }
        return [{ spec, id: nextId.current++, ts: Date.now() }, ...prev];
      });
    });
    window.overlayAPI.onTelemetry((e: TelemetryEvent) => {
      setLogs(prev => [e, ...prev].slice(0, MAX_LOGS));
    });
    return () => {
      window.overlayAPI.removeAllListeners("overlay:show-spec");
      window.overlayAPI.removeAllListeners("overlay:telemetry");
    };
  }, []);

  const onEnter = useCallback(() => {
    hovering.current = true;
    window.overlayAPI.setIgnoreMouse(false);
  }, []);

  const onLeave = useCallback(() => {
    hovering.current = false;
    if (!isDragging.current) window.overlayAPI.setIgnoreMouse(true);
  }, []);

  function startDrag(e: React.MouseEvent, which: "viz" | "log") {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const init = which === "viz" ? { ...resolvedViz } : { ...resolvedLog };
    isDragging.current = true;

    const onMove = (ev: MouseEvent) => {
      const nx = Math.max(0, Math.min(window.innerWidth - PANEL_W - 4, init.x + ev.clientX - startX));
      const ny = Math.max(0, Math.min(window.innerHeight - 50, init.y + ev.clientY - startY));
      if (which === "viz") setVizPos({ x: nx, y: ny });
      else setLogPos({ x: nx, y: ny });
    };

    const onUp = () => {
      isDragging.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      if (!hovering.current) window.overlayAPI.setIgnoreMouse(true);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function toggleVizLock() {
    if (!vizLocked) setVizPos(vizDefault());
    setVizLocked(v => !v);
  }

  function toggleLogLock() {
    if (!logLocked) setLogPos(logDefault());
    setLogLocked(v => !v);
  }

  const latestChart = charts[0];
  const latestLog = logs[0];

  return (
    <>
      {/* ── Viz panel ────────────────────────── */}
      {charts.length > 0 && (
        <Panel
          pos={resolvedViz}
          locked={vizLocked}
          minimized={vizMin}
          onDragStart={(e) => startDrag(e, "viz")}
          onLock={toggleVizLock}
          onMinimize={() => setVizMin(v => !v)}
          onClear={() => setCharts([])}
          label="DataLens"
          icon="📊"
          minContent={latestChart?.spec.title}
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
          maxHeight={520}
        >
          {charts.map(({ spec, id, ts }) => (
            <div key={id} style={s.card}>
              <div style={s.cardHeader}>
                <span style={s.cardTitle}>{spec.title}</span>
                {spec.subtitle && <span style={s.cardSub}>{spec.subtitle}</span>}
                <span style={s.cardTime}>{formatTime(ts)}</span>
              </div>
              <ChartBody spec={spec} />
              {spec.source && <div style={s.source}>src: {spec.source}</div>}
            </div>
          ))}
        </Panel>
      )}

      {/* ── Telemetry panel ──────────────────── */}
      {logs.length > 0 && (
        <Panel
          pos={resolvedLog}
          locked={logLocked}
          minimized={logMin}
          onDragStart={(e) => startDrag(e, "log")}
          onLock={toggleLogLock}
          onMinimize={() => setLogMin(v => !v)}
          label="Telemetry"
          icon="📡"
          minContent={latestLog ? `${logIcon(latestLog.type)} ${latestLog.message}` : ""}
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
          maxHeight={200}
        >
          <div style={{ padding: "4px 0" }}>
            {logs.map((e, i) => (
              <div key={i} style={s.logRow}>
                <span style={{ ...s.logIcon, color: logColor(e.type) }}>{logIcon(e.type)}</span>
                <span style={s.logTime}>{formatTime(e.ts)}</span>
                <span style={{ ...s.logMsg, color: logColor(e.type) }}>{e.message}</span>
                {e.model && <span style={s.logModel}>{e.model.split("/").pop()?.slice(0, 12)}</span>}
              </div>
            ))}
          </div>
        </Panel>
      )}
    </>
  );
}

// ── Telemetry helpers ────────────────────────────────────────────────────────

function logIcon(type: TelemetryEvent["type"]): string {
  switch (type) {
    case "chart":        return "✓";
    case "no_chart":     return "○";
    case "api_call":     return "→";
    case "fallback":     return "↷";
    case "rate_limited": return "⚠";
    case "error":        return "✗";
    case "filtered":     return "⊘";
    case "cooldown":     return "⏱";
    case "consolidate":  return "⟳";
    default:             return "·";
  }
}

function logColor(type: TelemetryEvent["type"]): string {
  switch (type) {
    case "chart":        return "#4caf50";
    case "rate_limited": return "#ff9800";
    case "error":        return "#f44336";
    case "fallback":     return "#ffeb3b";
    case "api_call":     return "#2196f3";
    case "consolidate":  return "#9c27b0";
    default:             return "#555";
  }
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ── Chart renderers ──────────────────────────────────────────────────────────

function ChartBody({ spec }: { spec: UVS }): React.ReactElement {
  const data = (spec.data ?? []) as number[];
  const labels = spec.labels ?? data.map((_, i) => String(i + 1));
  const chartData = labels.map((label, i) => ({ name: label, value: data[i] ?? 0 }));

  switch (spec.type) {
    case "metric_card":      return <MetricCard spec={spec} />;
    case "text_callout":     return <TextCallout spec={spec} />;
    case "bar":
    case "bar_horizontal":   return <BarChartView spec={spec} data={data} labels={labels} chartData={chartData} />;
    case "line":
    case "sparkline":        return <LineChartView spec={spec} chartData={chartData} />;
    case "area":             return <AreaChartView spec={spec} chartData={chartData} />;
    case "line_multi":       return <LineMultiView spec={spec} labels={labels} />;
    case "donut":            return <DonutView spec={spec} data={data} chartData={chartData} />;
    case "progress_bar":     return <ProgressBarView spec={spec} data={data} />;
    case "waterfall":        return <WaterfallView spec={spec} data={data} labels={labels} />;
    case "bullet":           return <BulletView spec={spec} data={data} labels={labels} />;
    case "scatter":          return <ScatterView spec={spec} data={data} labels={labels} />;
    case "heatmap":          return <HeatmapView spec={spec} labels={labels} />;
    case "comparison_table": return <ComparisonTable spec={spec} labels={labels} />;
    default:                 return <MetricCard spec={spec} />;
  }
}

function MetricCard({ spec }: { spec: UVS }): React.ReactElement {
  const value = (spec.data as number[] | undefined)?.[0];
  const display = value !== undefined ? `${spec.unit ?? ""}${value}` : "—";
  const deltaPos = (spec.delta ?? 0) >= 0;
  return (
    <div style={{ textAlign: "center", padding: "10px 0 6px" }}>
      <div style={{ fontSize: 34, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{display}</div>
      {spec.delta !== undefined && (
        <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: deltaPos ? "#4caf50" : "#f44336" }}>
          {deltaPos ? "▲" : "▼"} {Math.abs(spec.delta)}{spec.delta_label ?? ""}
        </div>
      )}
    </div>
  );
}

function TextCallout({ spec }: { spec: UVS }): React.ReactElement {
  return (
    <div style={{ padding: "8px 4px 8px 10px", color: "#ccc", fontStyle: "italic", fontSize: 12, fontFamily: "Georgia, serif", lineHeight: 1.5, borderLeft: "2px solid #2196f3" }}>
      &ldquo;{spec.quote ?? String((spec.data as number[])?.[0] ?? "")}&rdquo;
    </div>
  );
}

function BarChartView({ spec, data, labels, chartData }: { spec: UVS; data: number[]; labels: string[]; chartData: { name: string; value: number }[] }): React.ReactElement {
  const isH = spec.type === "bar_horizontal";
  return (
    <ResponsiveContainer width="100%" height={H}>
      <BarChart data={chartData} layout={isH ? "vertical" : "horizontal"} margin={{ top: 2, right: 8, left: isH ? 48 : 0, bottom: 2 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
        {isH
          ? <><YAxis dataKey="name" type="category" tick={{ fill: "#999", fontSize: 10 }} width={46} /><XAxis type="number" tick={{ fill: "#777", fontSize: 9 }} tickFormatter={v => `${spec.unit ?? ""}${v}`} /></>
          : <><XAxis dataKey="name" tick={{ fill: "#999", fontSize: 10 }} /><YAxis tick={{ fill: "#777", fontSize: 9 }} tickFormatter={v => `${spec.unit ?? ""}${v}`} width={28} /></>
        }
        <Tooltip formatter={(v) => [`${spec.unit ?? ""}${v}`, ""]} contentStyle={tooltipStyle} />
        <Bar dataKey="value" fill="#2196f3" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function LineChartView({ spec, chartData }: { spec: UVS; chartData: { name: string; value: number }[] }): React.ReactElement {
  return (
    <ResponsiveContainer width="100%" height={H}>
      <LineChart data={chartData} margin={{ top: 2, right: 8, left: 0, bottom: 2 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
        <XAxis dataKey="name" tick={{ fill: "#999", fontSize: 10 }} />
        <YAxis tick={{ fill: "#777", fontSize: 9 }} tickFormatter={v => `${spec.unit ?? ""}${v}`} width={28} />
        <Tooltip formatter={(v) => [`${spec.unit ?? ""}${v}`, ""]} contentStyle={tooltipStyle} />
        <Line type="monotone" dataKey="value" stroke="#2196f3" strokeWidth={2} dot={spec.type !== "sparkline"} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function AreaChartView({ spec, chartData }: { spec: UVS; chartData: { name: string; value: number }[] }): React.ReactElement {
  return (
    <ResponsiveContainer width="100%" height={H}>
      <AreaChart data={chartData} margin={{ top: 2, right: 8, left: 0, bottom: 2 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
        <XAxis dataKey="name" tick={{ fill: "#999", fontSize: 10 }} />
        <YAxis tick={{ fill: "#777", fontSize: 9 }} tickFormatter={v => `${spec.unit ?? ""}${v}`} width={28} />
        <Tooltip formatter={(v) => [`${spec.unit ?? ""}${v}`, ""]} contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey="value" stroke="#2196f3" fill="rgba(33,150,243,0.12)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function LineMultiView({ spec, labels }: { spec: UVS; labels: string[] }): React.ReactElement {
  const series = spec.series ?? [];
  const multiData = (series[0]?.values ?? []).map((_, i) => {
    const pt: Record<string, unknown> = { name: labels[i] ?? i };
    series.forEach(s => { pt[s.name] = s.values[i]; });
    return pt;
  });
  return (
    <ResponsiveContainer width="100%" height={H}>
      <LineChart data={multiData} margin={{ top: 2, right: 8, left: 0, bottom: 2 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
        <XAxis dataKey="name" tick={{ fill: "#999", fontSize: 10 }} />
        <YAxis tick={{ fill: "#777", fontSize: 9 }} width={28} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ color: "#999", fontSize: 10 }} />
        {series.map((s, i) => (
          <Line key={s.name} type="monotone" dataKey={s.name} stroke={s.color ?? COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function DonutView({ spec, data, chartData }: { spec: UVS; data: number[]; chartData: { name: string; value: number }[] }): React.ReactElement {
  const total = data.reduce((a, b) => a + b, 0);
  return (
    <ResponsiveContainer width="100%" height={H}>
      <PieChart>
        <Pie data={chartData} dataKey="value" cx="38%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={2}>
          {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Legend layout="vertical" align="right" verticalAlign="middle"
          formatter={(value, entry: any) => (
            <span style={{ color: "#999", fontSize: 10 }}>{value} {Math.round((entry.payload.value / total) * 100)}%</span>
          )}
        />
        <Tooltip formatter={(v: number) => [`${Math.round((v / total) * 100)}%`, ""]} contentStyle={tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function ProgressBarView({ spec, data }: { spec: UVS; data: number[] }): React.ReactElement {
  const value = data[0] ?? 0, goal = data[1] ?? 100;
  const pct = Math.min(100, Math.round((value / goal) * 100));
  const radialData = [{ name: "progress", value: pct, fill: pct >= 100 ? "#4caf50" : "#2196f3" }];
  return (
    <ResponsiveContainer width="100%" height={H}>
      <RadialBarChart cx="50%" cy="65%" innerRadius="55%" outerRadius="85%" data={radialData} startAngle={180} endAngle={0} barSize={10}>
        <RadialBar dataKey="value" cornerRadius={4} background={{ fill: "#1e3a5f" }} />
        <text x="50%" y="58%" textAnchor="middle" fill="#fff" fontSize={22} fontWeight="bold">{pct}%</text>
        <text x="50%" y="74%" textAnchor="middle" fill="#777" fontSize={10}>{spec.unit ?? ""}{value} / {spec.unit ?? ""}{goal}</text>
      </RadialBarChart>
    </ResponsiveContainer>
  );
}

function WaterfallView({ spec, data, labels }: { spec: UVS; data: number[]; labels: string[] }): React.ReactElement {
  const wData = labels.map((name, i) => {
    const runningBase = data.slice(0, i).reduce((a, b) => a + b, 0);
    const v = data[i] ?? 0;
    return { name, base: v >= 0 ? runningBase : runningBase + v, value: Math.abs(v), isNeg: v < 0 };
  });
  return (
    <ResponsiveContainer width="100%" height={H}>
      <BarChart data={wData} margin={{ top: 2, right: 8, left: 0, bottom: 2 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
        <XAxis dataKey="name" tick={{ fill: "#999", fontSize: 10 }} />
        <YAxis tick={{ fill: "#777", fontSize: 9 }} width={28} tickFormatter={v => `${spec.unit ?? ""}${v}`} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => name === "value" ? [`${spec.unit ?? ""}${v}`, ""] : [null, ""]} />
        <Bar dataKey="base" stackId="w" fill="transparent" />
        <Bar dataKey="value" stackId="w" radius={[2, 2, 0, 0]}>
          {wData.map((entry, i) => <Cell key={i} fill={entry.isNeg ? "#f44336" : "#4caf50"} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function BulletView({ spec, data, labels }: { spec: UVS; data: number[]; labels: string[] }): React.ReactElement {
  const actual = data[0] ?? 0, target = data[1] ?? 0;
  const max = Math.max(actual, target) * 1.25;
  const rows = labels.length > 1
    ? labels.map((name, i) => ({ name, actual: data[i * 2] ?? 0, target: data[i * 2 + 1] ?? 0 }))
    : [{ name: labels[0] ?? "Value", actual, target }];
  return (
    <ResponsiveContainer width="100%" height={Math.max(H, rows.length * 36)}>
      <ComposedChart data={rows} layout="vertical" margin={{ top: 2, right: 32, left: 44, bottom: 2 }}>
        <XAxis type="number" domain={[0, max]} tick={{ fill: "#777", fontSize: 9 }} tickFormatter={v => `${spec.unit ?? ""}${v}`} />
        <YAxis dataKey="name" type="category" tick={{ fill: "#999", fontSize: 10 }} width={42} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${spec.unit ?? ""}${v}`, ""]} />
        <Bar dataKey="actual" fill="#2196f3" barSize={12} radius={[0, 2, 2, 0]} />
        <Bar dataKey="target" fill="transparent" barSize={12} stroke="#ff9800" strokeWidth={2} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function ScatterView({ spec, data, labels }: { spec: UVS; data: number[]; labels: string[] }): React.ReactElement {
  const points = data.map((y, i) => ({ x: parseFloat(labels[i] ?? String(i)), y }));
  return (
    <ResponsiveContainer width="100%" height={H}>
      <ScatterChart margin={{ top: 2, right: 8, left: 0, bottom: 2 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
        <XAxis dataKey="x" type="number" name="X" tick={{ fill: "#999", fontSize: 10 }} />
        <YAxis dataKey="y" type="number" name="Y" tick={{ fill: "#777", fontSize: 9 }} width={28} tickFormatter={v => `${spec.unit ?? ""}${v}`} />
        <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={tooltipStyle} formatter={(v) => [`${spec.unit ?? ""}${v}`, ""]} />
        <Scatter data={points} fill="#2196f3" />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

function HeatmapView({ spec, labels }: { spec: UVS; labels: string[] }): React.ReactElement {
  const series = spec.series ?? [];
  if (!series.length) return <MetricCard spec={spec} />;
  const allVals = series.flatMap(s => s.values);
  const min = Math.min(...allVals), max = Math.max(...allVals), range = max - min || 1;
  const heat = (v: number): string => {
    const t = (v - min) / range;
    return `rgb(${Math.round(33 + t * 211)},${Math.round(150 - t * 83)},${Math.round(243 - t * 189)})`;
  };
  return (
    <div style={{ fontSize: 9, color: "#999", overflowX: "auto", padding: "4px 0" }}>
      <div style={{ display: "grid", gridTemplateColumns: `52px repeat(${labels.length}, 1fr)`, gap: 2 }}>
        <div />
        {labels.map(l => <div key={l} style={{ textAlign: "center", color: "#777" }}>{l}</div>)}
        {series.map(s => (
          <React.Fragment key={s.name}>
            <div style={{ display: "flex", alignItems: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</div>
            {s.values.map((v, i) => {
              const intensity = (v - min) / range;
              return (
                <div key={i} style={{ background: heat(v), borderRadius: 2, height: 18, display: "flex", alignItems: "center", justifyContent: "center", color: intensity > 0.55 ? "#000" : "#fff", fontSize: 8 }}>
                  {v}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function ComparisonTable({ spec, labels }: { spec: UVS; labels: string[] }): React.ReactElement {
  const series = spec.series ?? [];
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, color: "#ccc" }}>
        <thead>
          <tr>
            <th style={thStyle}>Metric</th>
            {series.map(s => <th key={s.name} style={thStyle}>{s.name}</th>)}
            {series.length === 2 && <th style={thStyle}>Δ</th>}
          </tr>
        </thead>
        <tbody>
          {labels.map((label, i) => {
            const vals = series.map(s => s.values[i] ?? 0);
            const delta = series.length === 2 ? vals[1] - vals[0] : null;
            return (
              <tr key={label} style={{ borderTop: "1px solid #1e1e2e" }}>
                <td style={tdStyle}>{label}</td>
                {vals.map((v, j) => <td key={j} style={{ ...tdStyle, textAlign: "right" }}>{spec.unit ?? ""}{v}</td>)}
                {delta !== null && (
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: delta >= 0 ? "#4caf50" : "#f44336" }}>
                    {delta >= 0 ? "+" : ""}{delta.toFixed(1)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const tooltipStyle: React.CSSProperties = {
  background: "#12121c", border: "1px solid #2a2a3a", borderRadius: 6,
  color: "#e0e0e0", fontSize: 11, padding: "4px 8px",
};
const thStyle: React.CSSProperties = { padding: "4px 6px", textAlign: "left", color: "#777", fontWeight: 600, borderBottom: "1px solid #2a2a3a" };
const tdStyle: React.CSSProperties = { padding: "3px 6px" };
const btnStyle: React.CSSProperties = {
  background: "none", border: "none", color: "#444", fontSize: 12,
  cursor: "pointer", padding: "1px 3px", lineHeight: 1, flexShrink: 0,
};

const s: Record<string, React.CSSProperties> = {
  card: { padding: "8px 12px 6px", borderBottom: "1px solid rgba(255,255,255,0.05)" },
  cardHeader: { marginBottom: 4, display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 4 },
  cardTitle: { fontSize: 12, fontWeight: 700, color: "#e0e0e0", flex: 1, minWidth: 0 },
  cardSub: { fontSize: 10, color: "#666" },
  cardTime: { fontSize: 9, color: "#444", flexShrink: 0 },
  source: { fontSize: 9, color: "#444", marginTop: 2 },
  logRow: { display: "flex", alignItems: "center", gap: 4, padding: "2px 10px", fontFamily: "monospace", fontSize: 10 },
  logIcon: { flexShrink: 0, width: 10 },
  logTime: { color: "#444", flexShrink: 0, fontSize: 9 },
  logMsg: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  logModel: { color: "#333", fontSize: 9, flexShrink: 0, fontFamily: "monospace" },
};
