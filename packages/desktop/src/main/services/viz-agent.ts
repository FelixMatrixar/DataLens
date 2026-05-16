import type { UVS, UserConfig } from "../../types";

const VIZ_SYSTEM_PROMPT = `
You are a Director of Visual Storytelling embedded in a live AI agent.
You receive short transcript segments or scene descriptions from a live session.

TRIGGER only on CONCRETE, chartable data:
✓ Specific numbers: "revenue hit $2.4 million"
✓ Percentages: "conversion rate dropped to 3.2%"
✓ Comparisons: "from 340ms to 85ms latency"
✓ Distributions: "44% organic, 28% paid, 18% direct"
✓ Trends: "Q1: 42K, Q2: 58K, Q3: 51K, Q4: 72K"
✓ Goals: "we're at 73% of our Q3 target"

DO NOT TRIGGER on vague language or qualitative-only statements.

CHART TYPE GUIDE:
- metric_card   → single KPI + delta. duration: 5-6s
- bar           → magnitude across categories. duration: 7-8s
- bar_horizontal→ ranked list. duration: 7-8s
- line          → trend over time. duration: 7-8s
- line_multi    → two parallel trends. duration: 8-9s
- area          → cumulative volume. duration: 7-8s
- donut         → part-to-whole (must sum ~100%). duration: 7-8s
- comparison_table → before/after multi-metric. duration: 9-11s
- progress_bar  → current vs goal. duration: 5-6s
- waterfall     → bridge/decomposition. duration: 9-11s
- bullet        → actual vs target. duration: 6-7s
- scatter       → correlation. duration: 8-9s
- heatmap       → time×category frequency. duration: 10-12s
- sparkline     → directional trend only. duration: 5s
- text_callout  → the quote IS the data. duration: 5-6s

Return ONLY raw JSON or the string "null". No markdown. No explanation.
Schema: { type, title (max 5 words), labels?, data?, series?, unit?, delta?,
          delta_label?, quote?, subtitle?, source?, theme: "dark", duration_seconds, show_values? }
`.trim();

export class VizAgent {
  private lastOverlayAt = 0;
  private readonly COOLDOWN_MS = 8_000;
  private recentMetrics = new Map<string, number>();
  private onChart: ((spec: UVS) => void) | null = null;

  setOnChart(cb: (spec: UVS) => void): void { this.onChart = cb; }

  async handleTranscript(text: string, config: UserConfig): Promise<void> {
    if (Date.now() - this.lastOverlayAt < this.COOLDOWN_MS) return;
    const spec = await this.detect(text, config.openrouterApiKey);
    if (!spec) return;
    this.lastOverlayAt = Date.now();
    this.onChart?.(spec);
  }

  async handleScene(description: string, config: UserConfig): Promise<void> {
    await this.handleTranscript(`[VISUAL SCENE]: ${description}`, config);
  }

  private async detect(text: string, apiKey: string): Promise<UVS | null> {
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
          models: ["google/gemini-3-flash-preview", "google/gemini-3.1-flash-lite-preview", "google/gemini-2.5-flash"],
          max_tokens: 600,
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: VIZ_SYSTEM_PROMPT },
            { role: "user", content: `Segment: "${text}"` },
          ],
        }),
      });

      if (!res.ok) return null;
      const json = await res.json();
      const raw: string = json.choices?.[0]?.message?.content?.trim();
      if (!raw || raw === "null") return null;

      const spec = JSON.parse(raw) as UVS;
      const key = `${spec.type}:${spec.title}`;
      if ((this.recentMetrics.get(key) ?? 0) > Date.now() - 30_000) return null;
      this.recentMetrics.set(key, Date.now());
      for (const [k, t] of this.recentMetrics)
        if (Date.now() - t > 30_000) this.recentMetrics.delete(k);

      return spec;
    } catch { return null; }
  }
}
