"use client";

import { useEffect, useRef, useState } from "react";

const CHART_API = "http://127.0.0.1:8735";

interface UVS {
  type: string;
  title: string;
  subtitle?: string;
  data?: number[];
  labels?: string[];
  unit?: string;
  delta?: number;
  delta_label?: string;
  quote?: string;
  series?: { name: string; color?: string; values: number[] }[];
}

interface SavedChart {
  id: string;
  spec: UVS;
  ts: number;
}

// ── Mini renderers ────────────────────────────────────────────────────────────

function MiniChart({ spec }: { spec: UVS }) {
  const data = spec.data ?? [];
  const labels = spec.labels ?? data.map((_, i) => String(i + 1));
  const unit = spec.unit ?? "";

  if (spec.type === "metric_card") {
    const v = data[0];
    const deltaPos = (spec.delta ?? 0) >= 0;
    return (
      <div style={{ textAlign: "center", padding: "12px 0 8px" }}>
        <div style={{ fontSize: 36, fontWeight: 700, color: "var(--t-hi)", lineHeight: 1 }}>
          {v !== undefined ? `${unit}${v}` : "—"}
        </div>
        {spec.delta !== undefined && (
          <div style={{ marginTop: 6, fontSize: 12, color: deltaPos ? "var(--green)" : "var(--red)" }}>
            {deltaPos ? "▲" : "▼"} {Math.abs(spec.delta)}{spec.delta_label ?? ""}
          </div>
        )}
      </div>
    );
  }

  if (spec.type === "text_callout") {
    return (
      <div style={{ padding: "8px 0 4px 10px", color: "var(--t-md)", fontStyle: "italic", fontSize: 12, lineHeight: 1.55, borderLeft: "2px solid var(--blue)" }}>
        "{spec.quote ?? String(data[0] ?? "")}"
      </div>
    );
  }

  if (spec.type === "progress_bar") {
    const val = data[0] ?? 0, goal = data[1] ?? 100;
    const pct = Math.min(100, Math.round((val / goal) * 100));
    return (
      <div style={{ padding: "8px 0" }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: "var(--t-hi)", marginBottom: 8 }}>{pct}%</div>
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 999, height: 6, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "var(--blue)", borderRadius: 999 }} />
        </div>
        <div style={{ fontSize: 11, color: "var(--t-lo)", marginTop: 5 }}>{unit}{val} / {unit}{goal}</div>
      </div>
    );
  }

  if (spec.type === "donut") {
    const total = data.reduce((a, b) => a + b, 0) || 1;
    const colors = ["#2196f3", "#4caf50", "#ff9800", "#e91e63", "#9c27b0"];
    const r = 28, cx = 36, size = 72;
    let acc = 0;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 0" }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
          {data.map((v, i) => {
            const frac = v / total;
            const dash = frac * 2 * Math.PI * r;
            const rest = 2 * Math.PI * r - dash;
            const rot = (acc / total) * 360 - 90;
            acc += v;
            return <circle key={i} cx={cx} cy={cx} r={r} fill="none" stroke={colors[i % colors.length]}
              strokeWidth="10" strokeDasharray={`${dash} ${rest}`} transform={`rotate(${rot} ${cx} ${cx})`} />;
          })}
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 0 }}>
          {labels.slice(0, 4).map((l, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--t-lo)" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors[i % colors.length], flexShrink: 0 }} />
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l}</span>
              <span style={{ color: "var(--t-md)", fontWeight: 500 }}>{Math.round((data[i] / total) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // bar / bar_horizontal / line / area / sparkline / waterfall / bullet / scatter / heatmap / comparison_table / line_multi
  if (data.length > 0) {
    const max = Math.max(...data) || 1;
    const min = Math.min(0, ...data);
    const range = max - min || 1;
    const w = 240, h = 70;
    const bw = Math.max(4, (w - 4 * (data.length - 1)) / data.length);

    if (spec.type === "bar" || spec.type === "bar_horizontal" || spec.type === "waterfall") {
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden style={{ overflow: "visible" }}>
          {data.map((v, i) => {
            const bh = ((v - min) / range) * (h - 10);
            const x = i * (bw + 4);
            const y = h - bh - 2;
            const col = spec.type === "waterfall" ? (i === 0 ? "#2196f3" : v >= 0 ? "#4caf50" : "#f44336") : "#2196f3";
            return (
              <g key={i}>
                <rect x={x} y={y} width={bw} height={Math.max(2, bh)} rx="2" fill={col} opacity={0.85} />
                {labels[i] && data.length <= 8 && (
                  <text x={x + bw / 2} y={h + 10} textAnchor="middle" fontSize="8" fill="#555" fontFamily="monospace">{labels[i]}</text>
                )}
              </g>
            );
          })}
        </svg>
      );
    }

    // line / sparkline / area
    const pts = data.map((v, i) => [i * (w / (data.length - 1 || 1)), h - 4 - ((v - min) / range) * (h - 8)]);
    const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
    const area = `${path} L ${w} ${h} L 0 ${h} Z`;
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
        <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2196f3" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#2196f3" stopOpacity="0" />
        </linearGradient></defs>
        <path d={area} fill="url(#ag)" />
        <path d={path} fill="none" stroke="#2196f3" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    );
  }

  if (spec.series?.length) {
    const colors = ["#2196f3", "#4caf50", "#ff9800", "#e91e63"];
    const all = spec.series.flatMap(s => s.values);
    const min = Math.min(...all), max = Math.max(...all);
    const range = (max - min) || 1;
    const len = Math.max(...spec.series.map(s => s.values.length));
    const w = 240, h = 70;
    const sx = w / (len - 1 || 1);
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
        {spec.series.map((s, si) => {
          const pts = s.values.map((v, i) => [i * sx, h - 6 - ((v - min) / range) * (h - 12)]);
          const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
          return <path key={si} d={path} fill="none" stroke={s.color ?? colors[si % colors.length]} strokeWidth="1.6" strokeLinejoin="round" />;
        })}
      </svg>
    );
  }

  return <div style={{ color: "var(--t-dim)", fontSize: 12, padding: "12px 0" }}>No data</div>;
}

// ── Type badge ────────────────────────────────────────────────────────────────

const TYPE_ICON: Record<string, string> = {
  metric_card: "◈", bar: "▬", bar_horizontal: "≡", line: "∿", line_multi: "⋮∿",
  area: "◠", donut: "◎", progress_bar: "▷", waterfall: "⌇", bullet: "⊟",
  scatter: "⁚", heatmap: "⊞", sparkline: "∿", text_callout: "❝", comparison_table: "⊟",
};

function fmt(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ChartDashboard() {
  const [charts, setCharts] = useState<SavedChart[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "offline">("loading");
  const [order, setOrder] = useState<string[]>([]);
  const dragId = useRef<string | null>(null);
  const dragOver = useRef<string | null>(null);

  useEffect(() => {
    fetch(`${CHART_API}/charts`)
      .then(r => r.json())
      .then((data: SavedChart[]) => {
        setCharts(data);
        setOrder(data.map(c => c.id));
        setStatus("ok");
      })
      .catch(() => setStatus("offline"));
  }, []);

  function handleClear() {
    fetch(`${CHART_API}/charts`, { method: "DELETE" })
      .then(() => { setCharts([]); setOrder([]); })
      .catch(() => {});
  }

  function onDragStart(id: string) { dragId.current = id; }
  function onDragEnter(id: string) { dragOver.current = id; }
  function onDragEnd() {
    if (!dragId.current || !dragOver.current || dragId.current === dragOver.current) return;
    setOrder(prev => {
      const next = [...prev];
      const from = next.indexOf(dragId.current!);
      const to   = next.indexOf(dragOver.current!);
      next.splice(from, 1);
      next.splice(to, 0, dragId.current!);
      return next;
    });
    dragId.current = null;
    dragOver.current = null;
  }

  const ordered = order
    .map(id => charts.find(c => c.id === id))
    .filter(Boolean) as SavedChart[];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 32px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--t-lo)", marginBottom: 8 }}>Dashboard</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--t-hi)", margin: 0, letterSpacing: "-0.02em" }}>
            Captured Charts
          </h1>
        </div>
        {status === "ok" && charts.length > 0 && (
          <button onClick={handleClear} style={{ background: "none", border: "1px solid var(--line)", borderRadius: 8, color: "var(--t-lo)", fontSize: 12, padding: "6px 14px", cursor: "pointer" }}>
            Clear all
          </button>
        )}
      </div>

      {/* States */}
      {status === "loading" && (
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--t-dim)" }}>Connecting to DataLens…</div>
      )}

      {status === "offline" && (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>⬡</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--t-hi)", marginBottom: 8 }}>Desktop app not running</div>
          <div style={{ fontSize: 13, color: "var(--t-lo)" }}>Open DataLens and start a session — charts will appear here automatically.</div>
        </div>
      )}

      {status === "ok" && charts.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>◎</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--t-hi)", marginBottom: 8 }}>No charts yet</div>
          <div style={{ fontSize: 13, color: "var(--t-lo)" }}>Start a capture session — every detected chart is saved here automatically.</div>
        </div>
      )}

      {/* Grid */}
      {status === "ok" && ordered.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: "var(--t-dim)", marginBottom: 16 }}>
            {charts.length} chart{charts.length !== 1 ? "s" : ""} · drag to reorder
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {ordered.map(({ id, spec, ts }) => (
              <div key={id}
                draggable
                onDragStart={() => onDragStart(id)}
                onDragEnter={() => onDragEnter(id)}
                onDragEnd={onDragEnd}
                onDragOver={e => e.preventDefault()}
                style={{
                  background: "var(--panel)", border: "1px solid var(--line)",
                  borderRadius: 14, padding: "16px 18px",
                  cursor: "grab", userSelect: "none",
                  transition: "border-color .15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--line-2)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--line)")}
              >
                {/* Card header */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 14, color: "var(--blue)", marginTop: 1 }}>{TYPE_ICON[spec.type] ?? "◈"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t-hi)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {spec.title}
                    </div>
                    {spec.subtitle && (
                      <div style={{ fontSize: 11, color: "var(--t-lo)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {spec.subtitle}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 10, color: "var(--t-dim)", flexShrink: 0 }}>{fmt(ts)}</span>
                </div>

                {/* Chart */}
                <div style={{ overflow: "hidden" }}>
                  <MiniChart spec={spec} />
                </div>

                {/* Type tag */}
                <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                  <span style={{ fontSize: 10, color: "var(--t-dim)", background: "rgba(255,255,255,0.04)", border: "1px solid var(--line)", borderRadius: 999, padding: "2px 7px", fontFamily: "var(--font-mono), monospace" }}>
                    {spec.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
