import type { UVS, UserConfig } from "../../types";

const VIZ_SYSTEM_PROMPT = `
You are a Director of Visual Storytelling embedded in a live AI agent.
You receive short transcript segments or scene descriptions from a live session.

Call show_chart ONLY when there is CONCRETE, chartable data:
✓ Specific numbers: "revenue hit $2.4 million"
✓ Percentages: "conversion rate dropped to 3.2%"
✓ Comparisons: "from 340ms to 85ms latency"
✓ Distributions: "44% organic, 28% paid, 18% direct"
✓ Trends: "Q1: 42K, Q2: 58K, Q3: 51K, Q4: 72K"
✓ Goals: "we're at 73% of our Q3 target"

Do NOT call show_chart on vague or qualitative-only statements.
Do NOT call show_chart on social media engagement metrics (likes, views, subscribers, followers, shares, watch time).
Do NOT call show_chart on UI element counts or interface statistics visible in screen captures.
If the segment has no chartable data, output nothing (no tool call).
`.trim();

const SHOW_CHART_TOOL = {
  type: "function",
  function: {
    name: "show_chart",
    description: "Render a data visualization overlay on screen",
    parameters: {
      type: "object",
      required: ["type", "title", "duration_seconds"],
      properties: {
        type: {
          type: "string",
          enum: ["metric_card","bar","bar_horizontal","line","line_multi","area","donut",
                 "progress_bar","waterfall","bullet","scatter","heatmap","sparkline",
                 "text_callout","comparison_table"],
          description: [
            "metric_card=single KPI + delta arrow",
            "bar=vertical bars by category",
            "bar_horizontal=ranked horizontal bars",
            "line=trend over time",
            "line_multi=multiple trend lines (use series[])",
            "area=cumulative area trend",
            "donut=part-of-whole proportions",
            "progress_bar=actual vs goal (data=[actual,goal])",
            "waterfall=bridge decomposition — positive/negative deltas (data=signed values)",
            "bullet=actual vs target per row (data=[actual,target,...], labels=row names)",
            "scatter=correlation — labels=x values as strings, data=y values",
            "heatmap=grid intensity — labels=column headers, series=[{name,values}] rows",
            "sparkline=minimal directional trend, no axes",
            "text_callout=pull quote (use quote field)",
            "comparison_table=before/after table (labels=metrics, series=[{name,values}])",
          ].join("; "),
        },
        title:          { type: "string", description: "Max 5 words" },
        subtitle:       { type: "string" },
        labels:         { type: "array", items: { type: "string" }, description: "Category labels matching data array" },
        data:           { type: "array", items: { type: "number" }, description: "Numeric values only — no units in this array" },
        unit:           { type: "string", description: "Short unit suffix like %, $, ms, K — shown before/after the number" },
        delta:          { type: "number", description: "Change vs prior period as a plain number (positive=up, negative=down)" },
        delta_label:    { type: "string", description: "Context for delta, e.g. 'pp YoY' or 'vs Q3'" },
        quote:          { type: "string", description: "For text_callout only — the exact quote" },
        source:         { type: "string", description: "Data source attribution" },
        show_values:    { type: "boolean" },
        duration_seconds: { type: "number", description: "How long to show the chart: metric_card=5, bar/donut=7, line=8, table=10" },
      },
    },
  },
};

const CHART_COOLDOWN_MS  = 8_000;   // min gap between showing any chart
const CALL_COOLDOWN_MS   = 15_000;  // min gap between OpenRouter calls
const METRIC_TTL_MS      = 90_000;  // how long same title is suppressed
const INDEX_COOLDOWN_MS  = 20_000;  // same visual scene fires at most once per 20s

export class VizAgent {
  private lastOverlayAt = 0;
  private lastCallAt = 0;
  private recentMetrics = new Map<string, number>();   // title → last shown timestamp
  private indexIdLastAt = new Map<string, number>();   // index_id → last triggered timestamp
  private shownCharts: UVS[] = [];
  private onChart: ((spec: UVS) => void) | null = null;

  setOnChart(cb: (spec: UVS) => void): void { this.onChart = cb; }

  // Called periodically — looks at all accumulated charts and upgrades them if possible
  async consolidate(apiKey: string): Promise<void> {
    if (this.shownCharts.length < 2) return;
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "https://datalens.app",
          "X-Title": "DataLens",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          models: ["google/gemini-2.5-flash", "google/gemini-flash-1.5", "openai/gpt-4o-mini"],
          route: "fallback",
          max_tokens: 1200,
          temperature: 0,
          tools: [SHOW_CHART_TOOL],
          tool_choice: "auto",
          messages: [
            {
              role: "system",
              content: `You are a data storytelling consolidator. You receive a list of individual data points already shown as charts. Your job is to identify data points that can be combined into a single richer chart (e.g. multiple quarterly values → one line chart, multiple categories → one bar chart). Only call show_chart if you can produce a chart that is MORE informative than any single existing chart. If the data is already well-represented, do NOT call show_chart.`,
            },
            {
              role: "user",
              content: `Existing charts:\n${this.shownCharts.map(c =>
                `- ${c.type} "${c.title}": labels=${JSON.stringify(c.labels)}, data=${JSON.stringify(c.data)}, unit="${c.unit ?? ""}"`
              ).join("\n")}\n\nCan any of these be merged into a single richer chart that tells a better story?`,
            },
          ],
        }),
      });
      if (!res.ok) return;
      const json = await res.json();
      const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) return;
      const spec = JSON.parse(toolCall.function.arguments) as UVS;
      console.log("[VizAgent] consolidate →", spec.type, spec.title);
      // Upsert by title
      const idx = this.shownCharts.findIndex(c => c.title === spec.title);
      if (idx !== -1) this.shownCharts[idx] = spec;
      else this.shownCharts.push(spec);
      this.onChart?.(spec);
    } catch (err) {
      console.warn("[VizAgent] consolidate error:", err);
    }
  }

  clearContext(): void {
    this.shownCharts = [];
    this.recentMetrics.clear();
    this.indexIdLastAt.clear();
    this.lastCallAt = 0;
    this.lastOverlayAt = 0;
  }

  async handleTranscript(text: string, config: UserConfig): Promise<void> {
    if (Date.now() - this.lastCallAt < CALL_COOLDOWN_MS) return;
    if (Date.now() - this.lastOverlayAt < CHART_COOLDOWN_MS) return;
    this.lastCallAt = Date.now();
    const spec = await this.detect(text, config.openrouterApiKey);
    if (!spec) return;
    this.lastOverlayAt = Date.now();
    const idx = this.shownCharts.findIndex(c => c.title === spec.title);
    if (idx !== -1) this.shownCharts[idx] = spec;
    else this.shownCharts.push(spec);
    this.onChart?.(spec);
  }

  async handleScene(description: string, config: UserConfig, indexId?: string): Promise<void> {
    if (indexId) {
      const last = this.indexIdLastAt.get(indexId) ?? 0;
      if (Date.now() - last < INDEX_COOLDOWN_MS) return;
      this.indexIdLastAt.set(indexId, Date.now());
      for (const [k, t] of this.indexIdLastAt)
        if (Date.now() - t > INDEX_COOLDOWN_MS * 3) this.indexIdLastAt.delete(k);
    }
    await this.handleTranscript(`[VISUAL SCENE]: ${description}`, config);
  }

  private async detect(text: string, apiKey: string): Promise<UVS | null> {
    const shownTitles = this.shownCharts.map(c => `"${c.title}"`).join(", ");
    const context = this.shownCharts.length > 0
      ? `\n\nCharts already shown — DO NOT re-generate any chart with these exact titles: ${shownTitles}.\nInstead, find a DIFFERENT data point from the segment (a different metric, a comparison, a second figure) and call show_chart with a new title. If no new chartable data exists, output nothing.\n\nExisting charts for context:\n${this.shownCharts.map(c => `- ${c.type} "${c.title}": data=${JSON.stringify(c.data)}, labels=${JSON.stringify(c.labels)}`).join("\n")}`
      : "";
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "https://datalens.app",
          "X-Title": "DataLens",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          models: ["google/gemini-2.5-flash", "google/gemini-flash-1.5", "openai/gpt-4o-mini"],
          route: "fallback",
          max_tokens: 600,
          temperature: 0,
          tools: [SHOW_CHART_TOOL],
          tool_choice: "auto",
          messages: [
            { role: "system", content: VIZ_SYSTEM_PROMPT },
            { role: "user", content: `Segment: "${text}"${context}` },
          ],
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.warn("[VizAgent] OpenRouter error", res.status, errText.slice(0, 200));
        return null;
      }

      const json = await res.json();
      const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) return null; // model chose not to call show_chart — no chartable data

      const spec = JSON.parse(toolCall.function.arguments) as UVS;

      const NOISE_TITLES = /subscriber|followers|likes|views|watch.?time|retweet|shares|engagement/i;
      if (NOISE_TITLES.test(spec.title)) {
        console.log("[VizAgent] filtered noise chart:", spec.title);
        return null;
      }

      console.log("[VizAgent] chart spec:", spec.type, spec.title);

      const key = `${spec.type}:${spec.title}`;
      if ((this.recentMetrics.get(key) ?? 0) > Date.now() - METRIC_TTL_MS) return null;
      this.recentMetrics.set(key, Date.now());
      for (const [k, t] of this.recentMetrics)
        if (Date.now() - t > METRIC_TTL_MS) this.recentMetrics.delete(k);

      return spec;
    } catch (err) {
      console.warn("[VizAgent] detect error:", err);
      return null;
    }
  }
}
