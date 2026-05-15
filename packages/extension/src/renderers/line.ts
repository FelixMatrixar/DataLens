import type { UVS } from "../types/uvs";
import { getTheme } from "./theme";
import {
  createCanvas, drawBackground, drawTitle, drawGrid,
  drawXLabels, drawSource, linearScale, niceTickValues,
  formatCompact, hexToRgba,
} from "./canvas-utils";

export async function renderLine(spec: UVS): Promise<OffscreenCanvas> {
  const w = spec.width ?? 560, h = spec.height ?? 320;
  const theme = getTheme(spec);
  const cc = createCanvas(w, h, theme);
  const { ctx, margin, chartWidth, chartHeight } = cc;

  drawBackground(cc);
  drawTitle(cc, spec.title, spec.subtitle);

  const isMulti = spec.type === "line_multi" && spec.series && spec.series.length > 1;
  const allValues = isMulti
    ? spec.series!.flatMap(s => s.values)
    : (spec.data ?? []);
  const labels = spec.labels ?? allValues.map((_, i) => String(i + 1));
  const max = Math.max(...allValues, 0);
  const min = Math.min(...allValues, 0);
  const ticks = niceTickValues(Math.min(min, 0), max, 4);
  const maxTick = Math.max(...ticks);
  const minTick = Math.min(...ticks, 0);

  const yScale = linearScale([minTick, maxTick], [chartHeight, 0]);
  const xStep = chartWidth / Math.max(labels.length - 1, 1);

  drawGrid(cc, yScale, ticks);
  drawXLabels(cc, labels, labels.map((_, i) => i * xStep));

  function drawSeries(values: number[], color: string, filled = false) {
    if (values.length === 0) return;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";

    values.forEach((v, i) => {
      const x = margin.left + i * xStep;
      const y = margin.top + yScale(v);
      if (i === 0) ctx.moveTo(x, y);
      else {
        const px = margin.left + (i - 1) * xStep;
        const py = margin.top + yScale(values[i - 1]);
        const cpx = (px + x) / 2;
        ctx.bezierCurveTo(cpx, py, cpx, y, x, y);
      }
    });
    ctx.stroke();

    if (filled) {
      const lastX = margin.left + (values.length - 1) * xStep;
      const baseY = margin.top + chartHeight;
      ctx.lineTo(lastX, baseY);
      ctx.lineTo(margin.left, baseY);
      ctx.closePath();
      ctx.fillStyle = hexToRgba(color, 0.15);
      ctx.fill();
    }

    if (spec.show_values) {
      values.forEach((v, i) => {
        const x = margin.left + i * xStep;
        const y = margin.top + yScale(v);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.font = "500 9px system-ui"; ctx.fillStyle = theme.text_primary;
        ctx.textAlign = "center";
        ctx.fillText(formatCompact(v, spec.unit), x, y - 6);
      });
    }
  }

  if (isMulti) {
    spec.series!.forEach((s, idx) => {
      const color = s.color ?? theme.palette[idx % theme.palette.length];
      drawSeries(s.values, color, false);
    });

    // Legend
    if (spec.show_legend !== false) {
      let lx = margin.left;
      spec.series!.forEach((s, idx) => {
        const color = s.color ?? theme.palette[idx % theme.palette.length];
        ctx.fillStyle = color;
        ctx.fillRect(lx, 38, 12, 3);
        ctx.font = "400 10px system-ui"; ctx.fillStyle = theme.text_secondary;
        ctx.textAlign = "left";
        ctx.fillText(s.name, lx + 16, 42);
        lx += ctx.measureText(s.name).width + 32;
      });
    }
  } else {
    drawSeries(spec.data ?? [], theme.accent, false);
  }

  if (spec.source) drawSource(cc, spec.source);
  return cc.canvas;
}
