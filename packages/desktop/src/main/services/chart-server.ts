import http from "http";
import { getCharts, clearCharts } from "./chart-store";

export const CHART_PORT = 8735;

export function startChartServer(): http.Server {
  const server = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, DELETE, OPTIONS");
    res.setHeader("Content-Type", "application/json");

    if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

    if (req.method === "GET" && req.url === "/charts") {
      res.writeHead(200);
      res.end(JSON.stringify(getCharts()));
      return;
    }

    if (req.method === "DELETE" && req.url === "/charts") {
      clearCharts();
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: "not found" }));
  });

  server.listen(CHART_PORT, "127.0.0.1", () => {
    console.log(`[DataLens] Chart API → http://127.0.0.1:${CHART_PORT}`);
  });

  return server;
}
