import React, { useEffect, useRef, useState } from "react";
import type { UVS } from "../types";

declare const window: Window & {
  overlayAPI: {
    setIgnoreMouse: (ignore: boolean) => void;
    onShowSpec: (cb: (payload: { spec: UVS }) => void) => void;
    removeAllListeners: (ch: string) => void;
  };
};

interface ChartCard { spec: UVS; id: number; }

export default function OverlayApp(): React.ReactElement {
  const [cards, setCards] = useState<ChartCard[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    window.overlayAPI.onShowSpec(({ spec }) => {
      const id = nextId.current++;
      const duration = (spec.duration_seconds ?? 7) * 1000;
      setCards(prev => [...prev.slice(-2), { spec, id }]);
      setTimeout(() => setCards(prev => prev.filter(c => c.id !== id)), duration);
    });
    return () => window.overlayAPI.removeAllListeners("overlay:show-spec");
  }, []);

  return (
    <div style={s.root}>
      {cards.map(card => <ChartCard key={card.id} spec={card.spec} />)}
    </div>
  );
}

function ChartCard({ spec }: { spec: UVS }): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) renderChart(canvas, spec);
  }, [spec]);

  return (
    <div style={s.card}
      onMouseEnter={() => window.overlayAPI.setIgnoreMouse(false)}
      onMouseLeave={() => window.overlayAPI.setIgnoreMouse(true)}
    >
      <canvas ref={canvasRef} width={340} height={200} style={{ display: "block" }} />
    </div>
  );
}

function renderChart(canvas: HTMLCanvasElement, spec: UVS): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width, H = canvas.height;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "rgba(15,15,20,0.92)";
  roundRect(ctx, 0, 0, W, H, 12); ctx.fill();

  ctx.fillStyle = "#e0e0e0";
  ctx.font = "bold 13px system-ui";
  ctx.fillText(spec.title ?? spec.type, 16, 22);

  if (spec.subtitle) {
    ctx.fillStyle = "#888"; ctx.font = "11px system-ui";
    ctx.fillText(spec.subtitle, 16, 37);
  }

  const top = spec.subtitle ? 48 : 34;

  switch (spec.type) {
    case "metric_card":    renderMetric(ctx, spec, W, H, top); break;
    case "bar":
    case "bar_horizontal": renderBar(ctx, spec, W, H, top); break;
    case "donut":          renderDonut(ctx, spec, W, H, top); break;
    case "progress_bar":   renderProgress(ctx, spec, W, H, top); break;
    case "line": case "line_multi": case "sparkline": case "area":
                           renderLine(ctx, spec, W, H, top); break;
    case "text_callout":   renderQuote(ctx, spec, W, H, top); break;
    default:               renderMetric(ctx, spec, W, H, top);
  }

  if (spec.source) {
    ctx.fillStyle = "#555"; ctx.font = "10px system-ui";
    ctx.fillText(`src: ${spec.source}`, 16, H - 8);
  }
}

function renderMetric(ctx: CanvasRenderingContext2D, spec: UVS, W: number, H: number, top: number): void {
  ctx.fillStyle = "#fff"; ctx.font = "bold 36px system-ui"; ctx.textAlign = "center";
  ctx.fillText(`${spec.unit ?? ""}${spec.data?.[0] ?? "—"}`, W / 2, top + 60);
  if (spec.delta !== undefined) {
    const pos = spec.delta >= 0;
    ctx.fillStyle = pos ? "#4caf50" : "#f44336"; ctx.font = "bold 14px system-ui";
    ctx.fillText(`${pos ? "▲" : "▼"} ${Math.abs(spec.delta)}${spec.delta_label ?? "%"}`, W / 2, top + 85);
  }
  ctx.textAlign = "left";
}

function renderBar(ctx: CanvasRenderingContext2D, spec: UVS, W: number, H: number, top: number): void {
  const labels = spec.labels ?? [], data = (spec.data ?? []) as number[];
  if (!data.length) return;
  const max = Math.max(...data), barH = Math.min(24, (H - top - 20) / data.length - 4), barMaxW = W - 100;
  ctx.font = "11px system-ui";
  data.forEach((val, i) => {
    const y = top + i * (barH + 6), w = max > 0 ? (val / max) * barMaxW : 0;
    ctx.fillStyle = "#1e3a5f"; roundRect(ctx, 70, y, barMaxW, barH, 3); ctx.fill();
    ctx.fillStyle = "#2196f3"; if (w > 0) { roundRect(ctx, 70, y, w, barH, 3); ctx.fill(); }
    ctx.fillStyle = "#aaa"; ctx.textAlign = "right";
    ctx.fillText((labels[i] ?? `${i + 1}`).toString().slice(0, 8), 66, y + barH - 4);
    if (spec.show_values) {
      ctx.fillStyle = "#fff"; ctx.textAlign = "left";
      ctx.fillText(`${spec.unit ?? ""}${val}`, 74 + w, y + barH - 4);
    }
  });
  ctx.textAlign = "left";
}

function renderDonut(ctx: CanvasRenderingContext2D, spec: UVS, W: number, H: number, top: number): void {
  const data = (spec.data ?? []) as number[], labels = spec.labels ?? [];
  if (!data.length) return;
  const cx = W / 2 - 30, cy = top + (H - top) / 2, r = Math.min(60, (H - top) / 2 - 10);
  const total = data.reduce((a, b) => a + b, 0);
  const colors = ["#2196f3", "#4caf50", "#ff9800", "#e91e63", "#9c27b0", "#00bcd4"];
  let angle = -Math.PI / 2;
  data.forEach((val, i) => {
    const sweep = (val / total) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, angle, angle + sweep); ctx.closePath();
    ctx.fillStyle = colors[i % colors.length]; ctx.fill(); angle += sweep;
  });
  ctx.fillStyle = "rgba(15,15,20,0.92)"; ctx.beginPath(); ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2); ctx.fill();
  ctx.font = "11px system-ui";
  data.forEach((val, i) => {
    const y = top + 10 + i * 18;
    ctx.fillStyle = colors[i % colors.length]; ctx.fillRect(cx + r + 14, y, 10, 10);
    ctx.fillStyle = "#aaa";
    ctx.fillText(`${labels[i] ?? i} ${Math.round((val / total) * 100)}%`, cx + r + 28, y + 9);
  });
}

function renderProgress(ctx: CanvasRenderingContext2D, spec: UVS, W: number, H: number, top: number): void {
  const data = (spec.data ?? [0, 100]) as number[];
  const value = data[0] ?? 0, goal = data[1] ?? 100, pct = Math.min(1, value / goal);
  const barY = top + 30, barH = 20, barW = W - 32;
  ctx.fillStyle = "#1e3a5f"; roundRect(ctx, 16, barY, barW, barH, barH / 2); ctx.fill();
  ctx.fillStyle = pct >= 1 ? "#4caf50" : "#2196f3";
  if (pct > 0) { roundRect(ctx, 16, barY, barW * pct, barH, barH / 2); ctx.fill(); }
  ctx.fillStyle = "#fff"; ctx.font = "bold 14px system-ui"; ctx.textAlign = "center";
  ctx.fillText(`${Math.round(pct * 100)}%`, W / 2, barY + barH + 20);
  ctx.fillStyle = "#888"; ctx.font = "11px system-ui";
  ctx.fillText(`${spec.unit ?? ""}${value} / ${spec.unit ?? ""}${goal}`, W / 2, barY + barH + 38);
  ctx.textAlign = "left";
}

function renderLine(ctx: CanvasRenderingContext2D, spec: UVS, W: number, H: number, top: number): void {
  const data = (spec.data ?? []) as number[];
  if (data.length < 2) return;
  const plotX = 20, plotW = W - 36, plotH = H - top - 20;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const pts = data.map((v, i) => ({ x: plotX + (i / (data.length - 1)) * plotW, y: top + plotH - ((v - min) / range) * plotH }));
  if (spec.type === "area") {
    ctx.beginPath(); ctx.moveTo(pts[0].x, top + plotH);
    pts.forEach(p => ctx.lineTo(p.x, p.y)); ctx.lineTo(pts[pts.length - 1].x, top + plotH); ctx.closePath();
    ctx.fillStyle = "rgba(33,150,243,0.15)"; ctx.fill();
  }
  ctx.beginPath(); pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = "#2196f3"; ctx.lineWidth = 2; ctx.stroke();
}

function renderQuote(ctx: CanvasRenderingContext2D, spec: UVS, W: number, _H: number, top: number): void {
  ctx.fillStyle = "#e0e0e0"; ctx.font = "italic 14px Georgia, serif";
  const text = spec.quote ?? String(spec.data?.[0] ?? "");
  const words = text.split(" ");
  let line = "", lines: string[] = [];
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > W - 32) { lines.push(line); line = word; }
    else line = test;
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(`"${i === 0 ? "" : ""}${l}${i === lines.length - 1 ? '"' : ""}`, 16, top + 20 + i * 22));
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

const s: Record<string, React.CSSProperties> = {
  root: { position: "fixed", bottom: 80, right: 40, display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-end", pointerEvents: "none" },
  card: { borderRadius: 12, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.6)", pointerEvents: "auto", cursor: "default" },
};
