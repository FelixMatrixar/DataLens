import { renderCanvas } from "../renderers";
import { getCached, setCached, hashSpec } from "../lib/cache";
import { uploadToR2 } from "../lib/upload";
import { callOpenRouter } from "../lib/openrouter";
import { getConfig } from "../lib/storage";
import type { UVS } from "../types/uvs";

const VIZ_SYSTEM_PROMPT = `
You are a Director of Visual Storytelling embedded in a live screen-capture agent.
You receive short transcript segments or scene descriptions from a live session.

Your role: decide WHETHER a visual is warranted, WHAT type best encodes the data
using preattentive attributes (color, position, length), and HOW LONG it should
stay visible based on cognitive load.

TRIGGER only on CONCRETE, chartable data:
✓ Specific numbers: "revenue hit $2.4 million"
✓ Percentages: "conversion rate dropped to 3.2%"
✓ Comparisons: "from 340ms to 85ms latency"
✓ Distributions: "44% organic, 28% paid, 18% direct"
✓ Trends: "Q1: 42K, Q2: 58K, Q3: 51K, Q4: 72K"
✓ Goals: "we're at 73% of our Q3 target"

DO NOT TRIGGER on:
✗ Vague language: "we grew a lot", "things improved"
✗ Qualitative only: "customer satisfaction is high"
✗ Forecasts/projections unless clearly labeled

CHART TYPE GUIDE (encode key insight in preattentive attribute):
- metric_card   → single KPI + delta color. duration: 5-6s
- bar           → magnitude across categories. duration: 7-8s
- bar_horizontal→ ranked list or long labels. duration: 7-8s
- line          → trend over time. duration: 7-8s
- line_multi    → two parallel trends. duration: 8-9s
- area          → cumulative volume. duration: 7-8s
- donut         → part-to-whole (must sum to 100%). duration: 7-8s
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
          delta_label?, quote?, subtitle?, source?, theme: "dark", duration_seconds,
          show_values? }
`.trim();

export class VizAgent {
  private lastOverlayAt = 0;
  private readonly COOLDOWN_MS = 8_000;
  private recentMetrics = new Map<string, number>();

  async handleTranscript(
    text: string,
    timestamp: number,
    tabId: number
  ): Promise<void> {
    if (Date.now() - this.lastOverlayAt < this.COOLDOWN_MS) return;

    const config = await getConfig();
    if (!config) return;

    const spec = await this.detect(text, config.openrouterApiKey);
    if (!spec) return;

    await this.renderAndOverlay(spec, timestamp, tabId, config);
  }

  async handleScene(
    description: string,
    timestamp: number,
    tabId: number
  ): Promise<void> {
    await this.handleTranscript(
      `[VISUAL SCENE]: ${description}`,
      timestamp,
      tabId
    );
  }

  private async detect(
    text: string,
    openrouterApiKey: string
  ): Promise<UVS | null> {
    try {
      const raw = await callOpenRouter({
        apiKey: openrouterApiKey,
        model: "google/gemini-flash-1.5",
        fallbackModels: ["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"],
        systemPrompt: VIZ_SYSTEM_PROMPT,
        userMessage: `Segment: "${text}"`,
        maxTokens: 600,
        temperature: 0,
        jsonMode: true,
      });

      if (!raw || raw.trim() === "null") return null;
      const spec = JSON.parse(raw) as UVS;

      const key = `${spec.type}:${spec.title}`;
      const lastSeen = this.recentMetrics.get(key);
      if (lastSeen && Date.now() - lastSeen < 30_000) return null;
      this.recentMetrics.set(key, Date.now());

      for (const [k, t] of this.recentMetrics)
        if (Date.now() - t > 30_000) this.recentMetrics.delete(k);

      return spec;
    } catch { return null; }
  }

  private async renderAndOverlay(
    spec: UVS,
    timestamp: number,
    tabId: number,
    config: any
  ): Promise<void> {
    const hash = hashSpec(spec);
    let chartUrl = await getCached(hash);

    if (!chartUrl) {
      const blob = await renderCanvas(spec);
      chartUrl = await uploadToR2(blob, config);
      await setCached(hash, chartUrl);
    }

    this.lastOverlayAt = Date.now();

    chrome.tabs.sendMessage(tabId, {
      type: "SHOW_CHART",
      chartUrl,
      title: spec.title,
      duration: spec.duration_seconds ?? 7,
    });

    chrome.runtime.sendMessage({ type: "OVERLAY_RENDERED", chartUrl, title: spec.title })
      .catch(() => {});

    const captureState = (globalThis as any).__captureState;
    if (captureState) {
      await this.overlayOnTimeline(chartUrl, timestamp, spec, config, captureState.rtstreamId)
        .catch(() => {});
    }

    fetch(`${config.frontendUrl}/api/session/overlay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: captureState?.sessionId,
        timestamp,
        chartType: spec.type,
        chartUrl,
        title: spec.title,
      }),
    }).catch(() => {});
  }

  private async overlayOnTimeline(
    chartUrl: string,
    timestamp: number,
    spec: UVS,
    config: any,
    rtstreamId: string
  ): Promise<void> {
    const uploaded = await fetch("https://api.videodb.io/upload/", {
      method: "POST",
      headers: {
        "x-access-token": config.videodbApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: chartUrl, media_type: "image" }),
    }).then(r => r.json());

    await fetch(`https://api.videodb.io/rtstream/${rtstreamId}/overlay/`, {
      method: "POST",
      headers: {
        "x-access-token": config.videodbApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        asset_id: uploaded.data.id,
        timestamp,
        duration: spec.duration_seconds ?? 7,
        position: { x: "center", y: "bottom" },
      }),
    });
  }
}
