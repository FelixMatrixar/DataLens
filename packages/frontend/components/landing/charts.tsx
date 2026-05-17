"use client";
import React from "react";

export const C = {
  blue:    "#64b5f6",
  blueDim: "#1a3a5f",
  green:   "#4caf50",
  greenDim:"#1e4d1e",
  red:     "#f44336",
  redDim:  "#4d1e1e",
  amber:   "#ffb74d",
  purple:  "#b39ddb",
  grid:    "rgba(255,255,255,0.06)",
  text:    "#aaaab5",
  textHi:  "#e8e8f0",
  textLo:  "#666677",
};

export function Sparkline({ data, color = C.blue, h = 38, w = 120, fill = true, dot = false }: {
  data: number[]; color?: string; h?: number; w?: number; fill?: boolean; dot?: boolean;
}) {
  if (!data?.length) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = (max - min) || 1;
  const sx = w / (data.length - 1);
  const pts = data.map((v, i) => [i * sx, h - 4 - ((v - min) / range) * (h - 8)]);
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${path} L ${w} ${h} L 0 ${h} Z`;
  const last = pts[pts.length - 1];
  const gid = `sg-${color.replace("#", "")}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      {fill && <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.25" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient></defs>}
      {fill && <path d={area} fill={`url(#${gid})`} />}
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {dot && <circle cx={last[0]} cy={last[1]} r="2.5" fill={color} />}
    </svg>
  );
}

export function BarMini({ data, color = C.blue, h = 80, w = 200, labels }: {
  data: number[]; color?: string; h?: number; w?: number; labels?: string[];
}) {
  const max = Math.max(...data) || 1;
  const gap = 6;
  const bw = (w - gap * (data.length - 1)) / data.length;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      {data.map((v, i) => {
        const bh = (v / max) * (h - 14);
        const x = i * (bw + gap);
        const y = h - bh - 2;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={bh} rx="2" fill={color} opacity={0.8} />
            {labels && <text x={x + bw / 2} y={h + 7} textAnchor="middle" fontSize="8" fill={C.textLo} fontFamily="var(--font-mono)">{labels[i]}</text>}
          </g>
        );
      })}
    </svg>
  );
}

export function DonutMini({ values, colors: cols, size = 70, label, sub }: {
  values: number[]; colors: string[]; size?: number; label?: string; sub?: string;
}) {
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const r = size / 2 - 6;
  const cx = size / 2;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
      {values.map((v, i) => {
        const frac = v / total;
        const dash = frac * 2 * Math.PI * r;
        const rest = 2 * Math.PI * r - dash;
        const rot = (acc / total) * 360 - 90;
        acc += v;
        return (
          <circle key={i} cx={cx} cy={cx} r={r} fill="none"
            stroke={cols[i % cols.length]} strokeWidth="8"
            strokeDasharray={`${dash} ${rest}`}
            transform={`rotate(${rot} ${cx} ${cx})`} strokeLinecap="butt" />
        );
      })}
      {label && <text x={cx} y={cx - 1} textAnchor="middle" fontSize="13" fontWeight="600" fill={C.textHi}>{label}</text>}
      {sub && <text x={cx} y={cx + 11} textAnchor="middle" fontSize="8" fill={C.textLo}>{sub}</text>}
    </svg>
  );
}

export function ProgressBar({ value, max = 100, color = C.green, height = 6 }: {
  value: number; max?: number; color?: string; height?: number;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div style={{ width: "100%", height, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999 }} />
    </div>
  );
}

export function MultiLine({ series, h = 90, w = 240 }: {
  series: { name: string; color: string; data: number[] }[]; h?: number; w?: number;
}) {
  const all = series.flatMap(s => s.data);
  const min = Math.min(...all), max = Math.max(...all);
  const range = (max - min) || 1;
  const len = Math.max(...series.map(s => s.data.length));
  const sx = w / (len - 1);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      {[0.25, 0.5, 0.75].map((t, i) => (
        <line key={i} x1="0" x2={w} y1={h * t} y2={h * t} stroke={C.grid} strokeDasharray="2 4" />
      ))}
      {series.map((s, si) => {
        const pts = s.data.map((v, i) => [i * sx, h - 6 - ((v - min) / range) * (h - 12)]);
        const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
        return <path key={si} d={path} fill="none" stroke={s.color} strokeWidth="1.6" strokeLinejoin="round" />;
      })}
    </svg>
  );
}

export function HeatmapMini({ rows = 5, cols = 8, seed = 1, color = C.blue }: {
  rows?: number; cols?: number; seed?: number; color?: string;
}) {
  function rng(i: number) { const x = Math.sin(i * 9301 + seed * 49297) * 233280; return x - Math.floor(x); }
  const cw = 22, ch = 14, gap = 3;
  return (
    <svg width={(cw + gap) * cols} height={(ch + gap) * rows} aria-hidden>
      {Array.from({ length: rows * cols }, (_, idx) => {
        const r = Math.floor(idx / cols), c = idx % cols;
        return <rect key={idx} x={c * (cw + gap)} y={r * (ch + gap)} width={cw} height={ch} rx="2"
          fill={color} opacity={0.1 + rng(idx + 1) * 0.7} />;
      })}
    </svg>
  );
}

export function Waterfall({ data, h = 80, w = 240 }: {
  data: { label: string; v: number }[]; h?: number; w?: number;
}) {
  const cum: [number, number][] = [];
  let s = 0;
  data.forEach((d, i) => {
    if (i === 0) { s = d.v; cum.push([0, s]); }
    else { const prev = s; s += d.v; cum.push([prev, s]); }
  });
  const all = cum.flat();
  const min = Math.min(0, ...all), max = Math.max(...all);
  const range = (max - min) || 1;
  const bw = (w - 6 * (data.length - 1)) / data.length;
  return (
    <svg width={w} height={h} aria-hidden>
      {data.map((d, i) => {
        const [a, b] = cum[i];
        const y1 = h - ((a - min) / range) * (h - 10) - 2;
        const y2 = h - ((b - min) / range) * (h - 10) - 2;
        const top = Math.min(y1, y2), bh = Math.abs(y2 - y1);
        const x = i * (bw + 6);
        const color = i === 0 ? C.blue : d.v >= 0 ? C.green : C.red;
        return <rect key={i} x={x} y={top} width={bw} height={Math.max(2, bh)} rx="2" fill={color} opacity={0.85} />;
      })}
    </svg>
  );
}

export function ScatterMini({ h = 80, w = 200, color = C.blue, seed = 3, n = 18 }: {
  h?: number; w?: number; color?: string; seed?: number; n?: number;
}) {
  function rng(i: number) { const x = Math.sin(i * 9301 + seed * 49297) * 233280; return x - Math.floor(x); }
  const pts = Array.from({ length: n }, (_, i) => {
    const x = rng(i * 2) * w;
    const noise = (rng(i * 2 + 1) - 0.5) * 20;
    const y = Math.max(4, Math.min(h - 4, h - (x / w) * h * 0.7 + noise));
    return [x, y];
  });
  return (
    <svg width={w} height={h} aria-hidden>
      <line x1="0" x2={w} y1={h * 0.5} y2={h * 0.5} stroke={C.grid} strokeDasharray="2 4" />
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill={color} opacity={0.85} />)}
    </svg>
  );
}

export function BulletChart({ value, target, max, color = C.blue, w = 180 }: {
  value: number; target: number; max: number; color?: string; w?: number;
}) {
  return (
    <svg width={w} height="18" aria-hidden>
      <rect x="0" y="6" width={w} height="6" rx="3" fill="rgba(255,255,255,0.06)" />
      <rect x="0" y="6" width={(value / max) * w} height="6" rx="3" fill={color} />
      <line x1={(target / max) * w} x2={(target / max) * w} y1="2" y2="16" stroke={C.textHi} strokeWidth="1.5" />
    </svg>
  );
}
