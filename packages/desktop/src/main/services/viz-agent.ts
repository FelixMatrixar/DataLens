import type { UVS, UserConfig, TelemetryEvent } from "../../types";

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

// ── OpenRouter tool schema (OpenAI-compatible) ──────────────────────────────
const CHART_ENUM = [
  "metric_card","bar","bar_horizontal","line","line_multi","area","donut",
  "progress_bar","waterfall","bullet","scatter","heatmap","sparkline",
  "text_callout","comparison_table",
] as const;

const CHART_TYPE_DESC = [
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
].join("; ");

const OR_SHOW_CHART_TOOL = {
  type: "function",
  function: {
    name: "show_chart",
    description: "Render a data visualization overlay on screen",
    parameters: {
      type: "object",
      required: ["type", "title", "duration_seconds"],
      properties: {
        type:             { type: "string", enum: CHART_ENUM, description: CHART_TYPE_DESC },
        title:            { type: "string", description: "Max 5 words" },
        subtitle:         { type: "string" },
        labels:           { type: "array", items: { type: "string" }, description: "Category labels matching data array" },
        data:             { type: "array", items: { type: "number" }, description: "Numeric values only — no units in this array" },
        unit:             { type: "string", description: "Short unit suffix like %, $, ms, K" },
        delta:            { type: "number" },
        delta_label:      { type: "string", description: "e.g. 'pp YoY' or 'vs Q3'" },
        quote:            { type: "string", description: "For text_callout only" },
        source:           { type: "string" },
        show_values:      { type: "boolean" },
        duration_seconds: { type: "number", description: "metric_card=5, bar/donut=7, line=8, table=10" },
      },
    },
  },
};

// ── Google AI tool schema (generativelanguage format) ────────────────────────
const GOOGLE_SHOW_CHART_TOOL = {
  function_declarations: [{
    name: "show_chart",
    description: "Render a data visualization overlay on screen",
    parameters: {
      type: "OBJECT",
      required: ["type", "title", "duration_seconds"],
      properties: {
        type:             { type: "STRING", enum: CHART_ENUM, description: CHART_TYPE_DESC },
        title:            { type: "STRING", description: "Max 5 words" },
        subtitle:         { type: "STRING" },
        labels:           { type: "ARRAY", items: { type: "STRING" } },
        data:             { type: "ARRAY", items: { type: "NUMBER" } },
        unit:             { type: "STRING" },
        delta:            { type: "NUMBER" },
        delta_label:      { type: "STRING" },
        quote:            { type: "STRING" },
        source:           { type: "STRING" },
        show_values:      { type: "BOOLEAN" },
        duration_seconds: { type: "NUMBER" },
      },
    },
  }],
};

const GOOGLE_MODELS = ["gemini-3-flash-preview", "gemini-2.5-flash", "gemini-2.5-flash-lite"];

const CHART_COOLDOWN_MS = 8_000;
const CALL_COOLDOWN_MS  = 15_000;
const METRIC_TTL_MS     = 90_000;
const INDEX_COOLDOWN_MS = 20_000;

const NOISE_TITLES = /subscriber|followers|likes|views|watch.?time|retweet|shares|engagement/i;

export class VizAgent {
  private lastOverlayAt = 0;
  private lastCallAt = 0;
  private recentMetrics = new Map<string, number>();
  private indexIdLastAt = new Map<string, number>();
  private shownCharts: UVS[] = [];
  private onChart: ((spec: UVS) => void) | null = null;
  private onLog: ((e: TelemetryEvent) => void) | null = null;

  setOnChart(cb: (spec: UVS) => void): void { this.onChart = cb; }
  setOnLog(cb: (e: TelemetryEvent) => void): void { this.onLog = cb; }

  private log(e: Omit<TelemetryEvent, "ts">): void {
    this.onLog?.({ ts: Date.now(), ...e });
  }

  async consolidate(config: UserConfig): Promise<void> {
    if (this.shownCharts.length < 2) return;
    const existingList = this.shownCharts.map(c =>
      `- ${c.type} "${c.title}": labels=${JSON.stringify(c.labels)}, data=${JSON.stringify(c.data)}, unit="${c.unit ?? ""}"`
    ).join("\n");
    const prompt = `Existing charts:\n${existingList}\n\nCan any of these be merged into a single richer chart that tells a better story?`;
    const systemMsg = `You are a data storytelling consolidator. Identify data points that can be combined into a single richer chart (e.g. multiple quarterly values → one line chart). Only call show_chart if you can produce a chart MORE informative than any single existing chart. If data is already well-represented, do NOT call show_chart.`;

    try {
      let spec: UVS | null = null;
      if (config.provider === "google" && config.googleAiApiKey) {
        spec = await this.callGoogle(prompt, config.googleAiApiKey, systemMsg);
      } else if (config.openrouterApiKey) {
        spec = await this.callOpenRouter(prompt, config.openrouterApiKey, systemMsg, 1200, "google/gemini-3-flash-preview");
      }
      if (!spec) return;
      this.log({ type: "consolidate", message: `Merged → ${spec.type} "${spec.title}"` });
      const idx = this.shownCharts.findIndex(c => c.title === spec!.title);
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
    if (Date.now() - this.lastCallAt < CALL_COOLDOWN_MS) {
      this.log({ type: "cooldown", message: "Skipped — API cooldown active" });
      return;
    }
    if (Date.now() - this.lastOverlayAt < CHART_COOLDOWN_MS) {
      this.log({ type: "cooldown", message: "Skipped — chart cooldown active" });
      return;
    }
    this.lastCallAt = Date.now();
    const spec = await this.detect(text, config);
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

  private async detect(text: string, config: UserConfig): Promise<UVS | null> {
    const shownTitles = this.shownCharts.map(c => `"${c.title}"`).join(", ");
    const context = this.shownCharts.length > 0
      ? `\n\nCharts already shown — DO NOT re-generate any chart with these exact titles: ${shownTitles}.\nInstead, find a DIFFERENT data point from the segment and call show_chart with a new title. If no new chartable data exists, output nothing.\n\nExisting charts for context:\n${this.shownCharts.map(c => `- ${c.type} "${c.title}": data=${JSON.stringify(c.data)}, labels=${JSON.stringify(c.labels)}`).join("\n")}`
      : "";
    const prompt = `Segment: "${text}"${context}`;

    try {
      let spec: UVS | null;
      if (config.provider === "google" && config.googleAiApiKey) {
        spec = await this.callGoogle(prompt, config.googleAiApiKey, VIZ_SYSTEM_PROMPT);
      } else if (config.openrouterApiKey) {
        spec = await this.callOpenRouter(prompt, config.openrouterApiKey, VIZ_SYSTEM_PROMPT, 600, "google/gemini-3-flash-preview");
      } else {
        this.log({ type: "error", message: "No AI API key configured" });
        return null;
      }

      if (!spec) return null;

      if (NOISE_TITLES.test(spec.title)) {
        this.log({ type: "filtered", message: `Filtered noise: "${spec.title}"` });
        return null;
      }

      const key = `${spec.type}:${spec.title}`;
      if ((this.recentMetrics.get(key) ?? 0) > Date.now() - METRIC_TTL_MS) {
        this.log({ type: "no_chart", message: `Suppressed (TTL): "${spec.title}"` });
        return null;
      }
      this.recentMetrics.set(key, Date.now());
      for (const [k, t] of this.recentMetrics)
        if (Date.now() - t > METRIC_TTL_MS) this.recentMetrics.delete(k);

      this.log({ type: "chart", message: `${spec.type}: "${spec.title}"` });
      return spec;
    } catch (err) {
      this.log({ type: "error", message: `detect error: ${String(err)}` });
      return null;
    }
  }

  // ── OpenRouter call ─────────────────────────────────────────────────────────
  private async callOpenRouter(
    prompt: string, apiKey: string, systemContent: string,
    maxTokens: number, primaryModel: string,
  ): Promise<UVS | null> {
    const model = primaryModel;
    this.log({ type: "api_call", message: `OpenRouter → ${model}`, model });
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://datalens.app",
        "X-Title": "DataLens",
      },
      body: JSON.stringify({
        model,
        models: ["google/gemini-3-flash-preview", "google/gemini-2.5-flash", "openai/gpt-4o-mini"],
        route: "fallback",
        max_tokens: maxTokens,
        temperature: 0,
        tools: [OR_SHOW_CHART_TOOL],
        tool_choice: "auto",
        messages: [
          { role: "system", content: systemContent },
          { role: "user",   content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      this.log({ type: "error", message: `OpenRouter ${res.status}: ${errText.slice(0, 120)}`, model });
      return null;
    }

    const json = await res.json();
    const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      this.log({ type: "no_chart", message: "OpenRouter — no chartable data", model });
      return null;
    }
    return JSON.parse(toolCall.function.arguments) as UVS;
  }

  // ── Google AI call with fallback chain ──────────────────────────────────────
  private async callGoogle(
    prompt: string, apiKey: string, systemContent: string,
  ): Promise<UVS | null> {
    const fullPrompt = `${systemContent}\n\n${prompt}`;

    for (const model of GOOGLE_MODELS) {
      this.log({ type: "api_call", message: `Google AI → ${model}`, model });
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
              tools: [GOOGLE_SHOW_CHART_TOOL],
              tool_config: { function_calling_config: { mode: "AUTO" } },
              generation_config: { max_output_tokens: 600, temperature: 0 },
            }),
          },
        );

        if (res.status === 429) {
          const body = await res.text().catch(() => "");
          this.log({ type: "rate_limited", message: `Rate limited on ${model} — trying next`, model });
          console.warn(`[VizAgent] Google rate limited (${model}):`, body.slice(0, 120));
          continue; // try next model in chain
        }

        if (!res.ok) {
          const body = await res.text().catch(() => "");
          this.log({ type: "error", message: `Google ${res.status} on ${model}`, model });
          console.warn(`[VizAgent] Google error (${model}):`, res.status, body.slice(0, 120));
          continue;
        }

        const json = await res.json();
        const part = json.candidates?.[0]?.content?.parts?.[0];

        if (!part?.functionCall) {
          this.log({ type: "no_chart", message: `Google ${model} — no chartable data`, model });
          return null; // model said nothing chartable — don't try next
        }

        if (model !== GOOGLE_MODELS[0]) {
          this.log({ type: "fallback", message: `Used fallback model: ${model}`, model });
        }
        return part.functionCall.args as UVS;

      } catch (err) {
        this.log({ type: "error", message: `Google ${model} exception: ${String(err)}`, model });
        console.warn(`[VizAgent] Google exception (${model}):`, err);
        continue;
      }
    }

    this.log({ type: "error", message: "All Google models exhausted" });
    return null;
  }
}
