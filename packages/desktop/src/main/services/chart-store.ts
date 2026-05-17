import Store from "electron-store";
import type { UVS } from "../../types";

export interface SavedChart {
  id: string;
  spec: UVS;
  ts: number;
}

const store = new Store<{ charts: SavedChart[] }>({ name: "datalens-charts" });

export function getCharts(): SavedChart[] {
  return store.get("charts", []);
}

export function saveChart(spec: UVS): void {
  const charts = getCharts();
  const idx = charts.findIndex(c => c.spec.title === spec.title);
  const item: SavedChart = {
    id: idx !== -1 ? charts[idx].id : `c${Date.now()}`,
    spec,
    ts: Date.now(),
  };
  if (idx !== -1) charts[idx] = item;
  else charts.unshift(item);
  store.set("charts", charts.slice(0, 50));
}

export function clearCharts(): void {
  store.set("charts", []);
}
