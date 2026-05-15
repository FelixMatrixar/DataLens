import type { UVS } from "../types/uvs";
import { getTheme } from "./theme";
import { createCanvas, drawBackground, drawSource } from "./canvas-utils";

export async function renderTextCallout(spec: UVS): Promise<OffscreenCanvas> {
  const w = spec.width ?? 480, h = spec.height ?? 200;
  const theme = getTheme(spec);
  const cc = createCanvas(w, h, theme, { top: 24, right: 28, bottom: 28, left: 48 });
  const { ctx, width, height } = cc;

  drawBackground(cc);

  // Left accent stripe
  ctx.fillStyle = theme.accent;
  ctx.beginPath();
  ctx.roundRect(12, 20, 4, height - 40, 2);
  ctx.fill();

  const text = spec.quote ?? spec.title;
  const maxW = width - 76;

  // Word-wrap
  ctx.font = `400 16px "SF Pro Display", system-ui, sans-serif`;
  ctx.fillStyle = theme.text_primary;
  ctx.textAlign = "left";
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  const lineH = 24;
  const startY = height / 2 - ((lines.length - 1) * lineH) / 2;
  lines.forEach((l, i) => ctx.fillText(l, 48, startY + i * lineH));

  // Source
  if (spec.source) {
    ctx.font = "400 10px system-ui"; ctx.fillStyle = theme.text_muted;
    ctx.textAlign = "left";
    ctx.fillText(`— ${spec.source}`, 48, height - 10);
  }

  return cc.canvas;
}
