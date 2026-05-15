import type { UVS } from "../types/uvs";
import { renderBar }             from "./bar";
import { renderLine }            from "./line";
import { renderArea }            from "./area";
import { renderMetricCard }      from "./metric-card";
import { renderDonut }           from "./donut";
import { renderScatter }         from "./scatter";
import { renderTextCallout }     from "./text-callout";
import { renderComparisonTable } from "./comparison-table";
import { renderSparkline }       from "./sparkline";
import { renderProgressBar }     from "./progress-bar";
import { renderHeatmap }         from "./heatmap";
import { renderWaterfall }       from "./waterfall";
import { renderBullet }          from "./bullet";

const RENDERERS: Record<string, (spec: UVS) => Promise<OffscreenCanvas>> = {
  bar:              renderBar,
  bar_horizontal:   (s) => renderBar({ ...s, _horizontal: true } as any),
  line:             renderLine,
  line_multi:       renderLine,
  area:             renderArea,
  metric_card:      renderMetricCard,
  donut:            renderDonut,
  scatter:          renderScatter,
  text_callout:     renderTextCallout,
  comparison_table: renderComparisonTable,
  sparkline:        renderSparkline,
  progress_bar:     renderProgressBar,
  heatmap:          renderHeatmap,
  waterfall:        renderWaterfall,
  bullet:           renderBullet,
};

export async function renderCanvas(spec: UVS): Promise<Blob> {
  const renderer = RENDERERS[spec.type];
  if (!renderer) throw new Error(`Unknown chart type: ${spec.type}`);
  const canvas = await renderer(spec);
  return canvas.convertToBlob({ type: "image/png" });
}
