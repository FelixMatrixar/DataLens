# DataLens — Live Data Visualization Pipeline
## Complete Project Plan & Implementation Spec

---

## Executive Summary

**DataLens** is a Chrome extension that captures live screen + audio via VideoDB's `CaptureSession` and `RTStream` APIs and deploys a team of specialized AI agents — all running inside the extension's service worker — that perceive, reason about, and act on continuous media in real-time.

When you watch a YouTube earnings call, scroll a research paper, or attend a live demo, DataLens overlays intelligently chosen data visualizations directly onto any tab at the exact moment the content warrants it. After the session, the full recording is indexed and searchable.

The **Vercel frontend** is the public landing page, auth gateway, and post-session dashboard.

**No server. No Docker. No external backend.** All agent compute runs in the browser.

---

## The Agent Team

The extension runs **five specialized agents**, each with a distinct role. They communicate through a shared message bus inside `background.ts`. This is the A2A (Agent-to-Agent) architecture.

```
┌─────────────────────────────────────────────────────────────────────┐
│  BACKGROUND SERVICE WORKER — Agent Orchestration Bus                │
│                                                                     │
│  ┌──────────────┐  transcript  ┌──────────────┐                    │
│  │  CAPTURE     │─────────────►│  VIZ AGENT   │ → OffscreenCanvas  │
│  │  AGENT       │              │              │   PNG → R2          │
│  │              │  scene alert │  (15 chart   │   overlay on tab    │
│  │  Manages     │─────────────►│   types)     │                    │
│  │  CaptureSession             └──────────────┘                    │
│  │  + RTStream  │  transcript  ┌──────────────┐                    │
│  │  + WebSocket │─────────────►│  SUMMARY     │ → live running     │
│  └──────────────┘              │  AGENT       │   summary panel    │
│                                └──────────────┘                    │
│                                ┌──────────────┐                    │
│                                │  MEMORY      │ → post-session     │
│                                │  AGENT       │   search index     │
│                                └──────────────┘                    │
│                                ┌──────────────┐                    │
│                                │  ALERT       │ → browser          │
│                                │  AGENT       │   notifications    │
│                                └──────────────┘                    │
└─────────────────────────────────────────────────────────────────────┘
```

| Agent | Input | Output | Model |
|---|---|---|---|
| **Capture Agent** | User action (start/stop) | CaptureSession, RTStream, WebSocket stream | — (API calls only) |
| **Viz Agent** | Transcript chunk / scene alert | Chart PNG overlaid on active tab | `google/gemini-3-flash` via OpenRouter |
| **Summary Agent** | Rolling transcript buffer | Live running summary, key points list | `google/gemini-3-flash` via OpenRouter |
| **Memory Agent** | Full session transcript + scenes | Indexed, searchable Video asset in VideoDB | — (VideoDB SDK) |
| **Alert Agent** | Scene index events | Browser notification + badge count | `google/gemini-3-flash` via OpenRouter |

---

## Full Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CLIENT SIDE                                  │
│  Any browser tab (YouTube, Google Docs, PDFs, Zoom, etc.)            │
│  content.ts injected → floating overlay div                          │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │ screen + mic → RTSP
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        VIDEODB CLOUD                                 │
│  CaptureSession ──► RTStream                                         │
│    ├── index_spoken_words() → transcript channel (1-2s latency)      │
│    ├── index_scenes()       → scene_index channel (2-5s latency)     │
│    └── create_alert(event)  → alert channel (< 1s latency)           │
│  WebSocket pushes all channels to background.ts                      │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │ WebSocket (ws://)
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│               CHROME EXTENSION — background.ts                       │
│                                                                      │
│  AgentBus — routes WebSocket events to the right agent               │
│  ├── transcript event ──► VizAgent.handle(text, ts)                  │
│  ├── transcript event ──► SummaryAgent.handle(text, ts)              │
│  ├── transcript event ──► MemoryAgent.buffer(text, ts)               │
│  ├── scene_index event ──► VizAgent.handleScene(description, ts)     │
│  ├── alert event      ──► AlertAgent.handle(alert)                   │
│  └── session stop     ──► MemoryAgent.finalize()                     │
│                                                                      │
│  content.ts — overlay renderer                                       │
│  popup.ts   — start/stop UI + live summary panel                     │
└──────────────────────────────────────────────────────────────────────┘
                                 │
                    user saves API keys
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     VERCEL — Next.js App                             │
│  /              Landing page (marketing)                             │
│  /login         Clerk Auth (Google + email allowlist)                │
│  /dashboard     Session archive + usage stats                        │
│  /session/[id]  Post-session search + enriched replay                │
│  /settings      API key management                                   │
│                                                                      │
│  /api/webhooks/clerk          Domain enforcement + Supabase sync     │
│  /api/settings/save-keys      Encrypt + store API keys               │
│  /api/r2/presign              Presigned PUT URL for chart upload      │
│  /api/session/export          RTStream export + index trigger        │
│  /api/search                  VideoDB semantic search proxy          │
└──────────────────────────────────────────────────────────────────────┘
                                 │
                    session data + encrypted keys
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                  SUPABASE — Database only                            │
│  profiles  { clerk_user_id, videodb_key_enc, openrouter_key_enc }    │
│  sessions  { id, clerk_user_id, rtstream_id, overlay_count, ... }    │
│  overlays  { id, session_id, timestamp, chart_type, chart_url }      │
│  alerts    { id, session_id, timestamp, label, description }         │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Monorepo Structure

```
videodb-a2a/
├── package.json                         # pnpm workspace root
├── pnpm-workspace.yaml
├── .env.example
│
├── packages/
│   │
│   ├── extension/                       # Chrome Extension (MV3)
│   │   ├── src/
│   │   │   │
│   │   │   ├── background.ts            # Service worker entry — AgentBus
│   │   │   ├── content.ts               # Injected into every tab — overlay
│   │   │   │
│   │   │   ├── popup/
│   │   │   │   ├── popup.html
│   │   │   │   ├── popup.ts             # Start/Stop + live summary panel
│   │   │   │   └── popup.css
│   │   │   │
│   │   │   ├── agents/
│   │   │   │   ├── bus.ts               # AgentBus — event router
│   │   │   │   ├── capture-agent.ts     # CaptureSession + RTStream + WebSocket
│   │   │   │   ├── viz-agent.ts         # Detect + Render + Overlay
│   │   │   │   ├── summary-agent.ts     # Rolling transcript summarization
│   │   │   │   ├── memory-agent.ts      # Post-session export + indexing
│   │   │   │   └── alert-agent.ts       # Scene-based browser notifications
│   │   │   │
│   │   │   ├── renderers/               # Viz Agent internals
│   │   │   │   ├── index.ts             # renderCanvas(spec) → Blob
│   │   │   │   ├── theme.ts             # Color palettes, tokens
│   │   │   │   ├── canvas-utils.ts      # OffscreenCanvas helpers
│   │   │   │   ├── bar.ts
│   │   │   │   ├── line.ts
│   │   │   │   ├── area.ts
│   │   │   │   ├── metric-card.ts
│   │   │   │   ├── donut.ts
│   │   │   │   ├── scatter.ts
│   │   │   │   ├── text-callout.ts
│   │   │   │   ├── comparison-table.ts
│   │   │   │   ├── sparkline.ts
│   │   │   │   ├── progress-bar.ts
│   │   │   │   ├── heatmap.ts
│   │   │   │   ├── waterfall.ts
│   │   │   │   └── bullet.ts
│   │   │   │
│   │   │   ├── lib/
│   │   │   │   ├── storage.ts           # chrome.storage.sync read/write
│   │   │   │   ├── cache.ts             # chrome.storage.local chart cache
│   │   │   │   ├── upload.ts            # PNG Blob → R2 via presign
│   │   │   │   ├── openrouter.ts        # OpenRouter fetch wrapper
│   │   │   │   └── videodb.ts           # VideoDB REST + WebSocket helpers
│   │   │   │
│   │   │   └── types/
│   │   │       ├── uvs.ts               # Universal Visual Spec
│   │   │       ├── agents.ts            # Agent event types
│   │   │       └── config.ts            # UserConfig interface
│   │   │
│   │   ├── manifest.json
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── frontend/                        # Vercel — Next.js
│   │   ├── app/
│   │   │   ├── page.tsx                 # Landing page
│   │   │   ├── login/page.tsx           # Clerk <SignIn />
│   │   │   ├── dashboard/page.tsx       # Session archive
│   │   │   ├── session/[id]/page.tsx    # Search + replay
│   │   │   ├── settings/page.tsx        # API key management
│   │   │   └── api/
│   │   │       ├── webhooks/clerk/route.ts
│   │   │       ├── settings/save-keys/route.ts
│   │   │       ├── r2/presign/route.ts
│   │   │       ├── session/export/route.ts
│   │   │       └── search/route.ts
│   │   ├── components/
│   │   │   ├── landing/
│   │   │   │   ├── Hero.tsx
│   │   │   │   ├── HowItWorks.tsx
│   │   │   │   ├── AgentTeam.tsx        # Explains the 5 agents visually
│   │   │   │   ├── Features.tsx
│   │   │   │   └── InstallCTA.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── SessionCard.tsx
│   │   │   │   ├── OverlayTimeline.tsx  # Visual timeline of chart triggers
│   │   │   │   └── SearchResults.tsx
│   │   │   └── ui/                      # shadcn/ui
│   │   ├── lib/
│   │   │   ├── clerk.ts
│   │   │   ├── supabase/server.ts
│   │   │   └── crypto.ts
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   └── vercel.json
│   │
│   └── shared/
│       ├── src/
│       │   ├── uvs.ts                   # Universal Visual Spec types
│       │   ├── events.ts                # VideoDB WebSocket event types
│       │   └── agents.ts                # Shared agent message types
│       └── package.json
│
└── pnpm-workspace.yaml
```

---

## Agent 1 — Capture Agent (`capture-agent.ts`)

The Capture Agent owns the entire VideoDB session lifecycle. It is the first agent activated when the user clicks "Start" and the last to finish when they click "Stop."

### Responsibilities
- Create and start a `CaptureSession` with screen + mic channels
- Retrieve the RTSP URL and create an `RTStream` for live indexing
- Open and maintain the WebSocket connection to VideoDB
- Wire detection alerts on the RTStream
- On stop: stop the capture session and hand off to the Memory Agent

### Implementation

```typescript
// packages/extension/src/agents/capture-agent.ts
import { videodbPost, videodbGet } from "../lib/videodb";
import { getConfig } from "../lib/storage";
import { AgentBus } from "./bus";
import type { UserConfig } from "../types/config";

export interface CaptureState {
  sessionId: string;
  rtstreamId: string;
  wsConnectionId: string;
}

export class CaptureAgent {
  private state: CaptureState | null = null;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECTS = 5;

  async start(config: UserConfig, bus: AgentBus): Promise<void> {
    // 1. Open WebSocket first — we need the connection_id for the session
    const wsUrl = await this.getWebSocketUrl(config);
    this.ws = new WebSocket(wsUrl);

    await new Promise<void>((resolve, reject) => {
      this.ws!.onopen = () => resolve();
      this.ws!.onerror = () => reject(new Error("WebSocket failed to open"));
    });

    const wsConnectionId = this.extractConnectionId(this.ws);

    // 2. Create CaptureSession
    const sessionRes = await videodbPost(
      `/collection/${config.videodbCollectionId}/capture/session`,
      config.videodbApiKey,
      {
        end_user_id: config.userId,
        ws_connection_id: wsConnectionId,
      }
    );
    const sessionId: string = sessionRes.data.session_id;

    // 3. Start with screen + mic channels
    await videodbPost("/capture/session/start", config.videodbApiKey, {
      session_id: sessionId,
      channels: [
        { channel_id: "screen", type: "video", store: true },
        { channel_id: "mic",    type: "audio", store: true },
      ],
      ws_connection_id: wsConnectionId,
    });

    // 4. Get RTSP URL from streaming session
    const streamingRes = await videodbGet(
      `/capture/session/${sessionId}/streaming`,
      config.videodbApiKey
    );
    const rtspUrl: string = streamingRes.data.rtsp_url;

    // 5. Create RTStream on top of the RTSP feed
    const rtstreamRes = await videodbPost("/rtstream/", config.videodbApiKey, {
      url: rtspUrl,
      name: `session-${sessionId}`,
      media_types: ["video", "audio"],
      store: true,
      enable_transcript: true,
      ws_connection_id: wsConnectionId,
    });
    const rtstreamId: string = rtstreamRes.data.id;

    this.state = { sessionId, rtstreamId, wsConnectionId };

    // 6. Wire detection alert for data triggers
    await this.wireAlerts(config, rtstreamId);

    // 7. Start listening and routing events to AgentBus
    this.listenAndRoute(bus);
  }

  private async wireAlerts(config: UserConfig, rtstreamId: string): Promise<void> {
    // Create reusable event rule
    const eventRes = await videodbPost("/rtstream/event/", config.videodbApiKey, {
      event_prompt: [
        "Detect when a speaker mentions a specific number, percentage, financial figure, or metric",
        "Detect when visible text on screen contains numerical data, charts, graphs, or tables",
        "Detect when a slide or document with data visualization appears on screen",
      ].join(". "),
      label: "data_trigger",
    });

    // Wire alert to RTStream
    await videodbPost(
      `/rtstream/${rtstreamId}/scene_index/alert/`,
      config.videodbApiKey,
      {
        event_id: eventRes.data.id,
        ws_connection_id: this.state!.wsConnectionId,
      }
    );
  }

  private listenAndRoute(bus: AgentBus): void {
    this.ws!.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        bus.route(msg);
      } catch { /* malformed frame, skip */ }
    };

    this.ws!.onclose = () => {
      if (this.reconnectAttempts < this.MAX_RECONNECTS) {
        this.reconnectAttempts++;
        setTimeout(() => this.reconnectWebSocket(bus), 1000 * this.reconnectAttempts);
      }
    };
  }

  private async reconnectWebSocket(bus: AgentBus): Promise<void> {
    const config = await getConfig();
    if (!config || !this.state) return;
    const wsUrl = await this.getWebSocketUrl(config);
    this.ws = new WebSocket(wsUrl);
    this.ws.onopen = () => { this.reconnectAttempts = 0; this.listenAndRoute(bus); };
  }

  async stop(): Promise<CaptureState | null> {
    if (!this.state) return null;
    const config = await getConfig();
    if (config) {
      await videodbPost("/capture/session/stop", config.videodbApiKey, {
        session_id: this.state.sessionId,
      });
    }
    this.ws?.close();
    const state = this.state;
    this.state = null;
    return state;
  }

  getState(): CaptureState | null { return this.state; }

  private async getWebSocketUrl(config: UserConfig): Promise<string> {
    const res = await videodbGet(
      `/collection/${config.videodbCollectionId}/websocket`,
      config.videodbApiKey
    );
    return res.data.ws_url;
  }

  private extractConnectionId(ws: WebSocket): string {
    // VideoDB sends the connection_id as the first message after open
    // For now, use a generated ID — VideoDB accepts any string
    return `ext-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}
```

---

## Agent 2 — Viz Agent (`viz-agent.ts` + `renderers/`)

The Viz Agent is the most complex. It receives transcript chunks and scene descriptions, runs LLM detection, renders charts on `OffscreenCanvas`, uploads to R2, and pushes overlays to the active tab and the VideoDB timeline simultaneously.

### Data Storytelling Principles Applied

Every design decision in the renderers follows two frameworks:

**Colin Ware — Preattentive Attributes:** The human visual system processes color, position, and length in under 250ms before conscious attention engages. Every renderer encodes the key insight in one of these three. Delta indicators use color (green/red) not just a `+18%` text label. Waterfall contributions are green/red immediately. The tallest bar communicates magnitude through length alone — no annotation needed.

**Edward Tufte — Data-Ink Ratio:** The overlay appears on top of live video content. Every non-data pixel competes with the underlying content. This justifies: near-invisible gridlines (`#1E1E1E`), no chart border box, no markers on line charts unless `show_values: true`, and `text_callout` as a first-class chart type — sometimes the right visualization is just the number printed large with no axes at all.

**Bret Victor — Scrollytelling Moment:** Charts fire at the exact timestamp the speaker utters the data point. `duration_seconds` is calibrated to cognitive load: simple metric cards show for 5–6s, comparison tables for 9–11s. A chart that disappears before the viewer finishes reading it is a distraction, not an aid.

### Universal Visual Spec (UVS)

```typescript
// packages/extension/src/types/uvs.ts

export type ChartType =
  | "bar" | "bar_horizontal"
  | "line" | "line_multi" | "area"
  | "metric_card"
  | "donut"
  | "scatter"
  | "text_callout"
  | "comparison_table"
  | "sparkline"
  | "progress_bar"
  | "heatmap"
  | "waterfall"
  | "bullet";

export type Theme = "dark" | "light" | "midnight" | "amber";

export interface SeriesData {
  name: string;
  values: number[];
  color?: string;
}

export interface HeatmapCell {
  row: string;
  col: string;
  value: number;
}

export interface UVS {
  // Required
  type: ChartType;
  title: string;

  // Data
  labels?: string[];
  data?: number[];
  series?: SeriesData[];
  cells?: HeatmapCell[];        // heatmap only
  target?: number;              // bullet chart
  current?: number;             // progress_bar, bullet
  goal?: number;                // progress_bar

  // Metadata
  subtitle?: string;
  unit?: string;                // $, %, ms, K, M, B, users…
  delta?: number;               // signed percentage for metric_card
  delta_label?: string;         // "vs last quarter"
  quote?: string;               // text_callout
  source?: string;              // speaker / document attribution

  // Appearance
  theme?: Theme;                // default: "dark"
  accent_color?: string;        // hex override
  width?: number;               // default: 560
  height?: number;              // default: 320
  duration_seconds?: number;    // overlay display time, default: 7

  // Behavior
  show_grid?: boolean;          // default: true
  show_legend?: boolean;        // default: true if series
  show_values?: boolean;        // data labels on bars
}
```

### Theme System

```typescript
// packages/extension/src/renderers/theme.ts

export interface ColorTheme {
  background: string;
  surface: string;
  border: string;
  text_primary: string;
  text_secondary: string;
  text_muted: string;
  accent: string;
  palette: string[];
  grid: string;
  positive: string;
  negative: string;
}

export const THEMES: Record<string, ColorTheme> = {
  dark: {
    background:    "#0B0B0B",
    surface:       "#141414",
    border:        "#2A2A2A",
    text_primary:  "#F0F0F0",
    text_secondary:"#A0A0A0",
    text_muted:    "#555555",
    accent:        "#E50000",
    palette: ["#E50000","#FF6B35","#FFD700","#00D4AA","#4FC3F7","#CE93D8"],
    grid:          "#1E1E1E",
    positive:      "#00D4AA",
    negative:      "#E50000",
  },
  light: {
    background:    "#FAFAFA",
    surface:       "#FFFFFF",
    border:        "#E0E0E0",
    text_primary:  "#111111",
    text_secondary:"#555555",
    text_muted:    "#AAAAAA",
    accent:        "#C00000",
    palette: ["#C00000","#E65C00","#B8860B","#007A5E","#1565C0","#6A1B9A"],
    grid:          "#F0F0F0",
    positive:      "#007A5E",
    negative:      "#C00000",
  },
  midnight: {
    background:    "#05050F",
    surface:       "#0D0D1F",
    border:        "#1A1A3A",
    text_primary:  "#E8E8FF",
    text_secondary:"#8888CC",
    text_muted:    "#333366",
    accent:        "#7C6FFF",
    palette: ["#7C6FFF","#FF6B9D","#00CFFF","#FFD166","#06D6A0","#EF476F"],
    grid:          "#111128",
    positive:      "#06D6A0",
    negative:      "#EF476F",
  },
  amber: {
    background:    "#0F0A00",
    surface:       "#1A1000",
    border:        "#3A2800",
    text_primary:  "#FFE4A0",
    text_secondary:"#CC9933",
    text_muted:    "#664400",
    accent:        "#FF9900",
    palette: ["#FF9900","#FF6600","#FFCC00","#FF3300","#FFAA44","#CC6600"],
    grid:          "#1F1500",
    positive:      "#FFCC00",
    negative:      "#FF3300",
  },
};

export function getTheme(spec: UVS): ColorTheme {
  const base = THEMES[spec.theme ?? "dark"];
  return spec.accent_color ? { ...base, accent: spec.accent_color } : base;
}
```

### Renderer Index (Router)

```typescript
// packages/extension/src/renderers/index.ts
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
```

### Canvas Utilities (shared by all renderers)

```typescript
// packages/extension/src/renderers/canvas-utils.ts
import type { ColorTheme } from "./theme";

export interface CanvasContext {
  canvas: OffscreenCanvas;
  ctx: OffscreenCanvasRenderingContext2D;
  width: number; height: number;
  theme: ColorTheme;
  margin: { top: number; right: number; bottom: number; left: number };
  chartWidth: number; chartHeight: number;
}

export function createCanvas(
  width: number, height: number, theme: ColorTheme,
  margin = { top: 52, right: 28, bottom: 44, left: 56 }
): CanvasContext {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;
  return {
    canvas, ctx, width, height, theme, margin,
    chartWidth:  width  - margin.left - margin.right,
    chartHeight: height - margin.top  - margin.bottom,
  };
}

export function drawBackground(cc: CanvasContext, radius = 16) {
  const { ctx, width, height, theme } = cc;
  ctx.clearRect(0, 0, width, height);
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, radius);
  ctx.fillStyle = theme.background;
  ctx.fill();
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = 1;
  ctx.stroke();
}

export function drawTitle(cc: CanvasContext, title: string, subtitle?: string) {
  const { ctx, theme } = cc;
  ctx.textAlign = "left";
  ctx.font = `600 15px "SF Pro Display", system-ui, sans-serif`;
  ctx.fillStyle = theme.text_primary;
  ctx.fillText(title, cc.margin.left, 28);
  if (subtitle) {
    ctx.font = `400 11px "SF Pro Text", system-ui, sans-serif`;
    ctx.fillStyle = theme.text_secondary;
    ctx.fillText(subtitle, cc.margin.left, 42);
  }
}

export function drawGrid(cc: CanvasContext, yScale: (v: number) => number, ticks: number[]) {
  const { ctx, margin, chartWidth, theme } = cc;
  ctx.strokeStyle = theme.grid;
  ctx.lineWidth = 1;
  ticks.forEach(tick => {
    const y = margin.top + yScale(tick);
    ctx.beginPath(); ctx.moveTo(margin.left, y); ctx.lineTo(margin.left + chartWidth, y); ctx.stroke();
    ctx.font = "400 10px system-ui"; ctx.fillStyle = theme.text_muted;
    ctx.textAlign = "right";
    ctx.fillText(formatCompact(tick), margin.left - 6, y + 3.5);
  });
}

export function drawXLabels(cc: CanvasContext, labels: string[], xPositions: number[]) {
  const { ctx, margin, height, theme } = cc;
  ctx.font = "400 10px system-ui"; ctx.fillStyle = theme.text_secondary; ctx.textAlign = "center";
  labels.forEach((l, i) => ctx.fillText(l, margin.left + xPositions[i], height - margin.bottom + 14));
}

export function drawSource(cc: CanvasContext, source: string) {
  const { ctx, width, height, theme } = cc;
  ctx.font = "400 9px system-ui"; ctx.fillStyle = theme.text_muted; ctx.textAlign = "right";
  ctx.fillText(`Source: ${source}`, width - 12, height - 6);
}

// Scale helpers — no D3 dependency needed for this
export function linearScale(domain: [number,number], range: [number,number]) {
  const [d0,d1] = domain, [r0,r1] = range;
  return (v: number) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
}

export function bandScale(cats: string[], range: [number,number], padding = 0.25) {
  const step = (range[1] - range[0]) / cats.length;
  const bw = step * (1 - padding);
  const off = (step - bw) / 2;
  const map = new Map(cats.map((c,i) => [c, range[0] + i * step + off]));
  return { scale: (c: string) => map.get(c) ?? 0, bandwidth: bw };
}

export function niceTickValues(min: number, max: number, count: number): number[] {
  const step = Math.ceil(max / count / 10) * 10 || 1;
  return Array.from({length: count + 1}, (_,i) => Math.round(min + i * step))
    .filter(v => v <= max * 1.1);
}

export function formatCompact(v: number, unit?: string): string {
  const a = Math.abs(v);
  let s = a >= 1e9 ? (v/1e9).toFixed(1)+"B"
        : a >= 1e6 ? (v/1e6).toFixed(1)+"M"
        : a >= 1e3 ? (v/1e3).toFixed(1)+"K"
        : v.toLocaleString();
  return unit ? `${unit}${s}` : s;
}

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
}
```

### All 15 Renderers — Summary Spec

Each renderer follows the same contract: `(spec: UVS) => Promise<OffscreenCanvas>`. Full implementations are in `viz-agent-spec.md`. Here is the complete list with design rationale:

| Renderer | Key preattentive encoding | Tufte: what's removed | Cognitive load band |
|---|---|---|---|
| `bar.ts` | Length (bar height) | No 3D, no tick extensions, gradient reinforces magnitude | 7–8s |
| `bar_horizontal.ts` | Length (horizontal) | Same — for long category names | 7–8s |
| `line.ts` | Position (y) + smooth curve | No markers unless `show_values: true` | 7–8s |
| `line_multi.ts` | Position + Color per series | Legend only when > 1 series | 8–9s |
| `area.ts` | Position + fill volume | Fill alpha 0.35 emphasizes accumulation | 7–8s |
| `metric-card.ts` | Color (delta) + big number | No axes — number IS the story | 5–6s |
| `donut.ts` | Arc length + Color | Labels only on slices > 5% | 7–8s |
| `scatter.ts` | Position (x,y) + dashed trend | Faint grid only, no outer box | 8–9s |
| `text-callout.ts` | None — text is the encoding | No chart axes (Tufte: remove what adds nothing) | 5–6s |
| `comparison-table.ts` | Color (delta pills) | No redundant value+bar combos | 9–11s |
| `sparkline.ts` | Position + fill | No axes, no labels — pure directional signal | 5s |
| `progress-bar.ts` | Length (fill) + gradient | No tick marks on track | 5–6s |
| `heatmap.ts` | Color saturation | Cell labels only when cell > 30px wide | 10–12s |
| `waterfall.ts` | Color (pos/neg) + Position | Dashed connectors (navigational, not data) | 9–11s |
| `bullet.ts` | Length (actual vs target line) | No tick marks, qualitative ranges via alpha only | 6–7s |

### Chart Type → Trigger Mapping

| Spoken pattern | → Chart type | Preattentive principle applied |
|---|---|---|
| "grew/fell X%" | `metric_card` + `delta` | Color (green/red) encodes direction instantly |
| "from X to Y" | `comparison_table` or `bar` | Color delta pills; length on bar |
| "Q1, Q2, Q3, Q4…" | `line` or `bar` | Position for trend; length for comparison |
| "X% organic, Y% paid…" | `donut` | Arc length + slice color |
| "at X% of our goal" | `progress_bar` | Fill length |
| "X contributed, Y caused loss" | `waterfall` | Color (green/red) makes sign preattentive |
| Multiple entities ranked | `bar_horizontal` | Length (horizontal scan matches reading direction) |
| Single big number | `metric_card` | Color + position |
| Time × category pattern | `heatmap` | Color saturation |
| Actual vs benchmark | `bullet` | Length + qualitative range bands |
| Key quoted statement | `text_callout` | Text itself — removing the chart removes noise |
| Two variables correlated | `scatter` | Position (x,y) |
| Directional trend only | `sparkline` | Position + area fill |

### Viz Agent Orchestration

```typescript
// packages/extension/src/agents/viz-agent.ts
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
  private recentMetrics = new Map<string, number>(); // dedup within 30s

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
    // Scene index fires when visual content (slides, charts on screen) is detected
    // Feed the scene description to the detector the same way as transcript
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
        model: "google/gemini-3-flash",
        fallbackModels: ["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"],
        systemPrompt: VIZ_SYSTEM_PROMPT,
        userMessage: `Segment: "${text}"`,
        maxTokens: 600,
        temperature: 0,
        jsonMode: true,
      });

      if (!raw || raw.trim() === "null") return null;
      const spec = JSON.parse(raw) as UVS;

      // Dedup: same title+type within 30s → skip
      const key = `${spec.type}:${spec.title}`;
      const lastSeen = this.recentMetrics.get(key);
      if (lastSeen && Date.now() - lastSeen < 30_000) return null;
      this.recentMetrics.set(key, Date.now());

      // Prune stale entries
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

    // Push to active tab overlay
    chrome.tabs.sendMessage(tabId, {
      type: "SHOW_CHART",
      chartUrl,
      title: spec.title,
      duration: spec.duration_seconds ?? 7,
    });

    // Overlay on VideoDB timeline for post-session enriched replay
    const captureState = (globalThis as any).__captureState;
    if (captureState) {
      await this.overlayOnTimeline(chartUrl, timestamp, spec, config, captureState.rtstreamId);
    }

    // Persist to Supabase overlays table via Vercel
    await fetch(`${config.frontendUrl}/api/session/overlay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: captureState?.sessionId,
        timestamp,
        chartType: spec.type,
        chartUrl,
        title: spec.title,
      }),
    }).catch(() => { /* non-critical — don't block */ });
  }

  private async overlayOnTimeline(
    chartUrl: string,
    timestamp: number,
    spec: UVS,
    config: any,
    rtstreamId: string
  ): Promise<void> {
    // Upload chart to VideoDB as an image asset
    const uploaded = await fetch("https://api.videodb.io/upload/", {
      method: "POST",
      headers: {
        "x-access-token": config.videodbApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: chartUrl, media_type: "image" }),
    }).then(r => r.json());

    // Queue overlay on the RTStream timeline
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
```

---

## Agent 3 — Summary Agent (`summary-agent.ts`)

The Summary Agent maintains a rolling window of transcript text and periodically generates a live summary of what has been discussed so far. It pushes updates to the extension popup so the user can glance at a live "key points" list without switching tabs.

### Responsibilities
- Buffer all incoming transcript chunks in a sliding window (last 5 minutes)
- Every 60 seconds (or on demand), call the LLM for a structured summary
- Emit `SUMMARY_UPDATE` to popup via `chrome.runtime.sendMessage`
- On session end, generate a full structured summary saved to Supabase

```typescript
// packages/extension/src/agents/summary-agent.ts
import { callOpenRouter } from "../lib/openrouter";
import { getConfig } from "../lib/storage";

interface TranscriptEntry {
  text: string;
  timestamp: number;
}

interface SummaryUpdate {
  keyPoints: string[];       // 3-5 bullet points
  currentTopic: string;      // one-line description of what's being discussed right now
  dataPoints: string[];      // all concrete numbers/metrics mentioned so far
  updatedAt: number;
}

const SUMMARY_SYSTEM_PROMPT = `
You are a live meeting analyst. You receive a rolling transcript from a live session.
Your job: produce a structured JSON summary of what has been discussed.

Return ONLY raw JSON, no markdown:
{
  "keyPoints": ["<3-5 concise bullet points — most important takeaways>"],
  "currentTopic": "<one sentence: what is being discussed right now>",
  "dataPoints": ["<every concrete number, metric, or percentage mentioned, with context>"]
}
`.trim();

export class SummaryAgent {
  private buffer: TranscriptEntry[] = [];
  private readonly WINDOW_MS = 5 * 60 * 1_000;   // 5-minute rolling window
  private readonly UPDATE_INTERVAL_MS = 60_000;    // summarize every 60s
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastSummary: SummaryUpdate | null = null;

  start(): void {
    this.intervalId = setInterval(() => this.generateSummary(), this.UPDATE_INTERVAL_MS);
  }

  stop(): SummaryUpdate | null {
    if (this.intervalId) clearInterval(this.intervalId);
    return this.lastSummary;
  }

  addTranscript(text: string, timestamp: number): void {
    this.buffer.push({ text, timestamp });
    // Prune entries outside the rolling window
    const cutoff = Date.now() - this.WINDOW_MS;
    this.buffer = this.buffer.filter(e => e.timestamp * 1000 > cutoff);
  }

  private async generateSummary(): Promise<void> {
    if (this.buffer.length === 0) return;
    const config = await getConfig();
    if (!config) return;

    const transcriptText = this.buffer
      .map(e => e.text)
      .join(" ");

    try {
      const raw = await callOpenRouter({
        apiKey: config.openrouterApiKey,
        model: "google/gemini-3-flash",
        fallbackModels: ["google/gemini-2.5-flash-lite"],
        systemPrompt: SUMMARY_SYSTEM_PROMPT,
        userMessage: `Transcript (last 5 minutes):\n"${transcriptText}"`,
        maxTokens: 400,
        temperature: 0.2,
        jsonMode: true,
      });

      if (!raw) return;
      const parsed = JSON.parse(raw);
      this.lastSummary = { ...parsed, updatedAt: Date.now() };

      // Push to popup
      chrome.runtime.sendMessage({
        type: "SUMMARY_UPDATE",
        payload: this.lastSummary,
      }).catch(() => { /* popup may be closed */ });

    } catch { /* non-critical */ }
  }

  async generateFinalSummary(): Promise<SummaryUpdate | null> {
    const config = await getConfig();
    if (!config || this.buffer.length === 0) return null;

    const FINAL_PROMPT = `
You are a post-session analyst. Produce a complete structured summary of the full session.
Return ONLY raw JSON:
{
  "keyPoints": ["<5-8 most important takeaways>"],
  "currentTopic": "<one-sentence overall session description>",
  "dataPoints": ["<every data point with full context>"],
  "actionItems": ["<any stated next steps, decisions, or commitments>"]
}`.trim();

    const fullTranscript = this.buffer.map(e => e.text).join(" ");
    const raw = await callOpenRouter({
      apiKey: config.openrouterApiKey,
      model: "google/gemini-3-flash",
      systemPrompt: FINAL_PROMPT,
      userMessage: `Full session transcript:\n"${fullTranscript}"`,
      maxTokens: 800,
      temperature: 0.2,
      jsonMode: true,
    });

    if (!raw) return null;
    return { ...JSON.parse(raw), updatedAt: Date.now() };
  }
}
```

---

## Agent 4 — Memory Agent (`memory-agent.ts`)

The Memory Agent handles everything that happens after the session ends. It exports the RTStream as a permanent Video asset, indexes it for semantic search, and saves the structured summary and overlay metadata to Supabase so the dashboard can display it.

### Responsibilities
- On `session.stop`: call `export_rtstream` → get a permanent Video asset ID
- Run `index_spoken_words()` on the exported video (enables transcript search)
- Run `index_scenes()` on the exported video (enables visual search)
- Save session record + final summary to Supabase via Vercel API route
- Track indexing completion and notify popup when search is ready

```typescript
// packages/extension/src/agents/memory-agent.ts
import { videodbPost } from "../lib/videodb";
import { getConfig } from "../lib/storage";
import type { CaptureState } from "./capture-agent";
import type { SummaryUpdate } from "./summary-agent";

export class MemoryAgent {

  async finalize(
    captureState: CaptureState,
    finalSummary: SummaryUpdate | null
  ): Promise<void> {
    const config = await getConfig();
    if (!config) return;

    chrome.runtime.sendMessage({ type: "MEMORY_STATUS", status: "exporting" })
      .catch(() => {});

    try {
      // 1. Export RTStream as a permanent Video asset
      const exportRes = await videodbPost(
        `/rtstream/${captureState.rtstreamId}/export/`,
        config.videodbApiKey,
        {}
      );
      const videoId: string = exportRes.data.video_id;

      chrome.runtime.sendMessage({ type: "MEMORY_STATUS", status: "indexing" })
        .catch(() => {});

      // 2. Index spoken words (enables transcript search)
      await videodbPost(
        `/video/${videoId}/index/spoken_words/`,
        config.videodbApiKey,
        { language_code: "en" }
      );

      // 3. Index scenes (enables visual content search)
      await videodbPost(
        `/video/${videoId}/index/scene/`,
        config.videodbApiKey,
        {
          extraction_type: "shot",  // shot-based segmentation
          extraction_config: { threshold: 0.5 },
          prompt: "Describe what is visible on screen including any text, charts, slides, or data",
        }
      );

      // 4. Save to Supabase via Vercel API route
      await fetch(`${config.frontendUrl}/api/session/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          captureSessionId: captureState.sessionId,
          rtstreamId: captureState.rtstreamId,
          videoId,
          summary: finalSummary,
          endedAt: new Date().toISOString(),
        }),
      });

      chrome.runtime.sendMessage({ type: "MEMORY_STATUS", status: "ready", videoId })
        .catch(() => {});

    } catch (err) {
      chrome.runtime.sendMessage({
        type: "MEMORY_STATUS",
        status: "error",
        error: String(err),
      }).catch(() => {});
    }
  }
}
```

---

## Agent 5 — Alert Agent (`alert-agent.ts`)

The Alert Agent watches the VideoDB `alert` channel for scene-based events. Unlike the Viz Agent (which processes every transcript chunk), the Alert Agent only fires when a pre-configured detection rule triggers — things the user explicitly wants to be notified about that may not warrant a visualization.

### Use cases
- "Notify me when a competitor's name appears on screen or is spoken"
- "Alert me if a slide with pricing information appears"
- "Ping me when someone mentions a deadline or action item"
- Custom user-defined keyword alerts

### Implementation

```typescript
// packages/extension/src/agents/alert-agent.ts
import { callOpenRouter } from "../lib/openrouter";
import { getConfig } from "../lib/storage";

export interface AlertEvent {
  label: string;
  rtstream_id: string;
  timestamp: number;
  data: { text: string };
}

export interface UserAlert {
  id: string;
  keyword: string;        // what to watch for
  description: string;    // human-readable label
  enabled: boolean;
}

const ALERT_CLASSIFIER_PROMPT = `
You are a real-time content monitor. Given a scene description or transcript segment,
determine if it matches the user's alert condition.

Return ONLY raw JSON: { "matches": true|false, "reason": "<one sentence>" }
`.trim();

export class AlertAgent {
  private userAlerts: UserAlert[] = [];
  private firedAlerts: Map<string, number> = new Map(); // dedup by label+minute
  private readonly ALERT_DEDUP_MS = 60_000;

  setAlerts(alerts: UserAlert[]): void {
    this.userAlerts = alerts.filter(a => a.enabled);
  }

  async handleAlert(event: AlertEvent): Promise<void> {
    const config = await getConfig();
    if (!config) return;

    // Dedup — don't fire same alert twice within 60s
    const dedupKey = `${event.label}:${Math.floor(event.timestamp / 60)}`;
    if (this.firedAlerts.has(dedupKey)) return;
    this.firedAlerts.set(dedupKey, Date.now());

    // Prune old entries
    for (const [k, t] of this.firedAlerts)
      if (Date.now() - t > this.ALERT_DEDUP_MS * 2) this.firedAlerts.delete(k);

    // Standard data_trigger alert → already handled by VizAgent
    // Only process user-defined custom alerts here
    if (event.label === "data_trigger") return;

    // Check custom user alerts
    for (const userAlert of this.userAlerts) {
      const matched = await this.classifyAlert(
        event.data.text,
        userAlert,
        config.openrouterApiKey
      );

      if (matched) {
        // Browser notification
        chrome.notifications.create({
          type: "basic",
          iconUrl: "icons/icon48.png",
          title: `DataLens: ${userAlert.description}`,
          message: event.data.text.slice(0, 100),
        });

        // Update popup badge
        chrome.action.setBadgeText({ text: "!" });
        chrome.action.setBadgeBackgroundColor({ color: "#E50000" });

        // Log to popup
        chrome.runtime.sendMessage({
          type: "ALERT_FIRED",
          payload: {
            alertId: userAlert.id,
            description: userAlert.description,
            timestamp: event.timestamp,
            excerpt: event.data.text,
          },
        }).catch(() => {});
      }
    }
  }

  private async classifyAlert(
    text: string,
    alert: UserAlert,
    apiKey: string
  ): Promise<boolean> {
    try {
      const raw = await callOpenRouter({
        apiKey,
        model: "google/gemini-3-flash",
        systemPrompt: ALERT_CLASSIFIER_PROMPT,
        userMessage: `Alert condition: "${alert.keyword}"\nContent: "${text}"`,
        maxTokens: 100,
        temperature: 0,
        jsonMode: true,
      });
      if (!raw) return false;
      return JSON.parse(raw).matches === true;
    } catch { return false; }
  }
}
```

---

## Agent Bus (`bus.ts`)

The AgentBus is the central nervous system. All WebSocket events from VideoDB flow into it and get routed to the appropriate agent(s). It holds the singleton instances of all agents.

```typescript
// packages/extension/src/agents/bus.ts
import { VizAgent }     from "./viz-agent";
import { SummaryAgent } from "./summary-agent";
import { MemoryAgent }  from "./memory-agent";
import { AlertAgent }   from "./alert-agent";

export interface VideoDBEvent {
  channel: "transcript" | "scene_index" | "audio_index" | "alert";
  data: {
    text?: string;
    timestamp_ms?: number;
    description?: string;
    label?: string;
    rtstream_id?: string;
    [key: string]: any;
  };
}

export class AgentBus {
  readonly viz     = new VizAgent();
  readonly summary = new SummaryAgent();
  readonly memory  = new MemoryAgent();
  readonly alert   = new AlertAgent();

  private activeTabId: number | null = null;

  setActiveTab(tabId: number): void { this.activeTabId = tabId; }

  async route(event: VideoDBEvent): Promise<void> {
    const ts = (event.data.timestamp_ms ?? 0) / 1000;
    const tabId = this.activeTabId ?? 0;

    switch (event.channel) {
      case "transcript":
        if (!event.data.text) return;
        // Fan out to three agents simultaneously — don't await serially
        await Promise.allSettled([
          this.viz.handleTranscript(event.data.text, ts, tabId),
          this.summary.addTranscript(event.data.text, ts),
          // MemoryAgent just buffers — no async needed here
        ]);
        (this.memory as any).buffer?.push(event.data.text);
        break;

      case "scene_index":
        if (!event.data.description) return;
        await this.viz.handleScene(event.data.description, ts, tabId);
        break;

      case "alert":
        await this.alert.handleAlert(event.data as any);
        break;
    }
  }
}
```

---

## OpenRouter Wrapper (`lib/openrouter.ts`)

Single place where all LLM calls go. Handles fallback chains, JSON mode, and error logging.

```typescript
// packages/extension/src/lib/openrouter.ts

interface OpenRouterRequest {
  apiKey: string;
  model: string;
  fallbackModels?: string[];
  systemPrompt: string;
  userMessage: string;
  maxTokens: number;
  temperature?: number;
  jsonMode?: boolean;
}

export async function callOpenRouter(req: OpenRouterRequest): Promise<string | null> {
  const models = [req.model, ...(req.fallbackModels ?? [])];

  const body: Record<string, any> = {
    models,                 // OpenRouter tries them in order
    max_tokens: req.maxTokens,
    temperature: req.temperature ?? 0,
    messages: [
      { role: "system", content: req.systemPrompt },
      { role: "user",   content: req.userMessage  },
    ],
  };

  if (req.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${req.apiKey}`,
        "HTTP-Referer":  "https://datalens.app",
        "X-Title":       "DataLens",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.warn(`[OpenRouter] ${res.status}`, await res.text());
      return null;
    }

    const json = await res.json();
    return json.choices?.[0]?.message?.content?.trim() ?? null;

  } catch (err) {
    console.warn("[OpenRouter] fetch error:", err);
    return null;
  }
}
```

---

## Content Script (`content.ts`)

Injected into every tab. Receives chart events from background and renders them as a floating overlay. Handles dismiss, tab navigation re-injection, and multiple concurrent overlays.

```typescript
// packages/extension/src/content.ts

// ── Inject overlay container once ──────────────────────────────
let container = document.getElementById("datalens-overlay");
if (!container) {
  container = document.createElement("div");
  container.id = "datalens-overlay";
  container.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    pointer-events: none;
    display: flex;
    flex-direction: column-reverse;
    gap: 10px;
    max-width: 320px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  `;
  document.body.appendChild(container);
}

// ── Message handler ─────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "SHOW_CHART")   showChart(msg);
  if (msg.type === "HIDE_CHARTS")  clearCharts();
});

function showChart(msg: {
  chartUrl: string;
  title: string;
  duration: number;
}): void {
  const card = document.createElement("div");
  card.style.cssText = `
    background: rgba(11,11,11,0.95);
    border: 1px solid rgba(229,0,0,0.4);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0,0,0,0.6);
    animation: datalens-slide-in 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards;
    pointer-events: auto;
  `;

  const titleEl = document.createElement("div");
  titleEl.style.cssText = `
    padding: 8px 12px 4px;
    font-size: 11px;
    font-weight: 600;
    color: #A0A0A0;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  `;
  titleEl.textContent = msg.title;

  const img = document.createElement("img");
  img.src = msg.chartUrl;
  img.style.cssText = `
    display: block;
    width: 100%;
    max-width: 300px;
    height: auto;
    padding: 0 8px 8px;
  `;

  // Dismiss on click
  card.addEventListener("click", () => dismissCard(card));

  card.appendChild(titleEl);
  card.appendChild(img);
  container!.appendChild(card);

  // Auto-dismiss after duration
  setTimeout(() => dismissCard(card), msg.duration * 1000);
}

function dismissCard(card: HTMLElement): void {
  card.style.animation = "datalens-slide-out 0.25s ease-in forwards";
  setTimeout(() => card.remove(), 250);
}

function clearCharts(): void {
  container!.innerHTML = "";
}

// ── Inject animation keyframes once ────────────────────────────
if (!document.getElementById("datalens-styles")) {
  const style = document.createElement("style");
  style.id = "datalens-styles";
  style.textContent = `
    @keyframes datalens-slide-in {
      from { opacity: 0; transform: translateY(16px) scale(0.96); }
      to   { opacity: 1; transform: translateY(0)   scale(1); }
    }
    @keyframes datalens-slide-out {
      from { opacity: 1; transform: translateY(0)   scale(1); }
      to   { opacity: 0; transform: translateY(8px)  scale(0.97); }
    }
  `;
  document.head.appendChild(style);
}
```

---

## Popup (`popup/popup.ts`)

The extension popup is the user's control panel. It shows session status, live summary, overlay count, alert feed, and a one-click start/stop.

```typescript
// packages/extension/src/popup/popup.ts

document.addEventListener("DOMContentLoaded", async () => {
  const startBtn    = document.getElementById("start-btn")!;
  const stopBtn     = document.getElementById("stop-btn")!;
  const statusEl    = document.getElementById("status")!;
  const summaryEl   = document.getElementById("summary-keypoints")!;
  const topicEl     = document.getElementById("current-topic")!;
  const dataEl      = document.getElementById("data-points")!;
  const overlayCount = document.getElementById("overlay-count")!;
  const alertFeed   = document.getElementById("alert-feed")!;
  const memoryStatus = document.getElementById("memory-status")!;

  // ── Load current session state ──────────────────────────────
  const { sessionActive, overlayCountVal, lastSummary } =
    await chrome.storage.session.get(["sessionActive","overlayCountVal","lastSummary"]);

  updateUI(sessionActive, lastSummary, overlayCountVal ?? 0);

  // ── Start session ───────────────────────────────────────────
  startBtn.addEventListener("click", async () => {
    startBtn.disabled = true;
    statusEl.textContent = "Starting...";
    chrome.runtime.sendMessage({ type: "START_SESSION" });
  });

  // ── Stop session ────────────────────────────────────────────
  stopBtn.addEventListener("click", () => {
    stopBtn.disabled = true;
    statusEl.textContent = "Stopping...";
    chrome.runtime.sendMessage({ type: "STOP_SESSION" });
  });

  // ── Listen for updates from background ──────────────────────
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "SESSION_STARTED") {
      updateUI(true, null, 0);
    }
    if (msg.type === "SESSION_STOPPED") {
      updateUI(false, msg.finalSummary, msg.overlayCount);
    }
    if (msg.type === "SUMMARY_UPDATE") {
      renderSummary(msg.payload, summaryEl, topicEl, dataEl);
    }
    if (msg.type === "OVERLAY_RENDERED") {
      const count = parseInt(overlayCount.textContent ?? "0") + 1;
      overlayCount.textContent = String(count);
    }
    if (msg.type === "ALERT_FIRED") {
      renderAlert(msg.payload, alertFeed);
    }
    if (msg.type === "MEMORY_STATUS") {
      memoryStatus.textContent = {
        exporting: "⏳ Exporting session...",
        indexing:  "⏳ Indexing for search...",
        ready:     "✅ Session ready to search",
        error:     "❌ Export failed",
      }[msg.status] ?? "";
    }
  });
});

function updateUI(active: boolean, summary: any, count: number) {
  document.getElementById("start-btn")!.style.display = active ? "none" : "block";
  document.getElementById("stop-btn")!.style.display  = active ? "block" : "none";
  document.getElementById("status")!.textContent = active ? "● Recording" : "Ready";
  document.getElementById("overlay-count")!.textContent = String(count);
  if (summary) renderSummary(summary,
    document.getElementById("summary-keypoints")!,
    document.getElementById("current-topic")!,
    document.getElementById("data-points")!
  );
}

function renderSummary(s: any, keyEl: Element, topicEl: Element, dataEl: Element) {
  topicEl.textContent = s.currentTopic ?? "";
  keyEl.innerHTML = (s.keyPoints ?? []).map((p: string) => `<li>${p}</li>`).join("");
  dataEl.innerHTML = (s.dataPoints ?? []).map((p: string) => `<li>${p}</li>`).join("");
}

function renderAlert(alert: any, feed: Element) {
  const item = document.createElement("div");
  item.className = "alert-item";
  item.textContent = `[${new Date(alert.timestamp * 1000).toLocaleTimeString()}] ${alert.description}`;
  feed.insertBefore(item, feed.firstChild);
}
```

---

## Cache Layer (`lib/cache.ts`)

```typescript
// packages/extension/src/lib/cache.ts
const PREFIX = "vdb_chart_";
const TTL_MS = 4 * 60 * 60 * 1_000; // 4 hours

export async function getCached(key: string): Promise<string | null> {
  try {
    const r = await chrome.storage.local.get(PREFIX + key);
    const entry = r[PREFIX + key];
    if (!entry || Date.now() > entry.expiresAt) { await chrome.storage.local.remove(PREFIX + key); return null; }
    return entry.url;
  } catch { return null; }
}

export async function setCached(key: string, url: string): Promise<void> {
  try {
    await chrome.storage.local.set({ [PREFIX + key]: { url, expiresAt: Date.now() + TTL_MS } });
  } catch { /* non-critical */ }
}

// FNV-1a hash — fast, no crypto needed for cache keys
export function hashSpec(spec: object): string {
  const s = JSON.stringify(spec);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
  return h.toString(16);
}
```

---

## Upload Layer (`lib/upload.ts`)

R2 credentials never touch the extension. The presign route on Vercel generates a short-lived PUT URL.

```typescript
// packages/extension/src/lib/upload.ts
import type { UserConfig } from "../types/config";

export async function uploadToR2(blob: Blob, config: UserConfig): Promise<string> {
  const filename = `chart-${Date.now()}.png`;

  const presign = await fetch(
    `${config.frontendUrl}/api/r2/presign?filename=${encodeURIComponent(filename)}`,
    { headers: { "x-clerk-user-id": config.userId } }
  ).then(r => r.json());

  await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/png" },
    body: blob,
  });

  return presign.publicUrl;
}
```

---

## `background.ts` — Full Entry Point

```typescript
// packages/extension/src/background.ts
import { CaptureAgent } from "./agents/capture-agent";
import { AgentBus }     from "./agents/bus";
import { getConfig }    from "./lib/storage";

const bus = new AgentBus();
const captureAgent = new CaptureAgent();

chrome.runtime.onMessage.addListener(async (msg, _sender, sendResponse) => {

  if (msg.type === "START_SESSION") {
    const config = await getConfig();
    if (!config) {
      chrome.runtime.sendMessage({ type: "SESSION_ERROR", error: "No API keys configured" });
      return;
    }

    try {
      await captureAgent.start(config, bus);
      bus.summary.start();

      const state = captureAgent.getState()!;
      (globalThis as any).__captureState = state;

      // Track active tab for overlay routing
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) bus.setActiveTab(tab.id);

      // Update badge
      chrome.action.setBadgeText({ text: "●" });
      chrome.action.setBadgeBackgroundColor({ color: "#E50000" });

      chrome.runtime.sendMessage({ type: "SESSION_STARTED" });

    } catch (err) {
      chrome.runtime.sendMessage({ type: "SESSION_ERROR", error: String(err) });
    }
  }

  if (msg.type === "STOP_SESSION") {
    const captureState = await captureAgent.stop();
    const finalSummary = bus.summary.stop();

    chrome.action.setBadgeText({ text: "" });
    (globalThis as any).__captureState = null;

    if (captureState) {
      // Memory Agent runs asynchronously — don't await
      bus.memory.finalize(captureState, finalSummary).catch(console.error);
    }

    chrome.runtime.sendMessage({
      type: "SESSION_STOPPED",
      finalSummary,
      overlayCount: (globalThis as any).__overlayCount ?? 0,
    });
  }

  if (msg.type === "SAVE_CONFIG") {
    await chrome.storage.sync.set({ userConfig: msg.payload });
    sendResponse({ ok: true });
  }

  // Keep active tab current as user switches
  if (msg.type === "TAB_ACTIVATED") {
    bus.setActiveTab(msg.tabId);
  }
});

// Track tab switches for overlay routing
chrome.tabs.onActivated.addListener(({ tabId }) => {
  bus.setActiveTab(tabId);
  chrome.runtime.sendMessage({ type: "TAB_ACTIVATED", tabId }).catch(() => {});
});
```

---

## Auth & API Key Flow

### 1. Clerk Auth (Google + email allowlist)

```typescript
// packages/frontend/app/login/page.tsx
import { SignIn } from "@clerk/nextjs";
export default function LoginPage() {
  return <SignIn appearance={{ elements: { rootBox: "mx-auto mt-20" } }} />;
}

// packages/frontend/app/layout.tsx
import { ClerkProvider } from "@clerk/nextjs";
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <ClerkProvider><html><body>{children}</body></html></ClerkProvider>;
}

// packages/frontend/middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
const isPublic = createRouteMatcher(["/", "/login(.*)"]);
export default clerkMiddleware((auth, req) => { if (!isPublic(req)) auth().protect(); });
export const config = { matcher: ["/((?!_next|.*\\..*).*)"] };
```

**Clerk webhook — domain enforcement + Supabase profile creation:**
```typescript
// packages/frontend/app/api/webhooks/clerk/route.ts
import { Webhook } from "svix";
import { clerkClient } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const ALLOWED_DOMAINS = ["gmail.com","outlook.com","hotmail.com","yahoo.com","ymail.com"];

export async function POST(req: Request) {
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  const evt = wh.verify(await req.text(), Object.fromEntries(req.headers)) as any;

  if (evt.type === "user.created") {
    const email = evt.data.email_addresses?.[0]?.email_address ?? "";
    const domain = email.split("@")[1]?.toLowerCase();

    if (!ALLOWED_DOMAINS.includes(domain)) {
      await clerkClient.users.deleteUser(evt.data.id);
      return new Response("Domain not allowed", { status: 403 });
    }
    await supabaseAdmin.from("profiles").insert({ clerk_user_id: evt.data.id, email });
  }
  return new Response("OK");
}
```

### 2. Settings Page — Key Management

```typescript
// packages/frontend/app/settings/page.tsx
"use client";
import { useUser } from "@clerk/nextjs";
import { useState } from "react";

export default function SettingsPage() {
  const { user } = useUser();
  const [videodbKey, setVideodbKey] = useState("");
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [saved, setSaved] = useState(false);

  async function saveKeys() {
    const res = await fetch("/api/settings/save-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videodbKey, openrouterKey }),
    });

    if (res.ok) {
      // Push to extension if installed
      if (typeof chrome !== "undefined" && chrome.runtime?.id) {
        chrome.runtime.sendMessage(process.env.NEXT_PUBLIC_EXTENSION_ID!, {
          type: "SAVE_CONFIG",
          payload: {
            videodbApiKey: videodbKey,
            openrouterApiKey: openrouterKey,
            userId: user?.id,
            frontendUrl: window.location.origin,
            videodbCollectionId: "default",
          },
        });
      }
      setSaved(true);
    }
  }

  return (
    <div className="space-y-6 max-w-md mx-auto py-12">
      <h1 className="text-2xl font-semibold">API Keys</h1>
      <div className="space-y-2">
        <label className="text-sm font-medium">VideoDB API Key</label>
        <input type="password" placeholder="sk-..." value={videodbKey}
          onChange={e => setVideodbKey(e.target.value)}
          className="w-full border rounded px-3 py-2" />
        <a href="https://console.videodb.io" target="_blank"
           className="text-xs text-blue-500 hover:underline">Get your VideoDB key →</a>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">OpenRouter API Key</label>
        <input type="password" placeholder="sk-or-..." value={openrouterKey}
          onChange={e => setOpenrouterKey(e.target.value)}
          className="w-full border rounded px-3 py-2" />
        <a href="https://openrouter.ai/keys" target="_blank"
           className="text-xs text-blue-500 hover:underline">
          Get your OpenRouter key — enables Gemini 3 Flash + 400+ models →
        </a>
        <p className="text-xs text-gray-400">
          ~$0.70/month for daily 1-hour sessions. Your keys never touch our servers in plaintext.
        </p>
      </div>
      <button onClick={saveKeys} className="w-full bg-black text-white py-2 rounded">
        {saved ? "✓ Saved & pushed to extension" : "Save & Push to Extension"}
      </button>
    </div>
  );
}
```

---

## Supabase Schema

```sql
-- profiles — one row per user, owns encrypted API keys
create table public.profiles (
  clerk_user_id       text primary key,
  email               text not null,
  videodb_key_enc     text,
  openrouter_key_enc  text,
  created_at          timestamptz default now()
);

-- sessions — one row per capture session
create table public.sessions (
  id              uuid default gen_random_uuid() primary key,
  clerk_user_id   text references public.profiles(clerk_user_id) on delete cascade,
  rtstream_id     text not null,
  capture_session_id text not null,
  video_id        text,                   -- set after Memory Agent exports
  overlay_count   int default 0,
  duration_secs   int,
  summary_json    jsonb,                  -- final summary from Summary Agent
  created_at      timestamptz default now(),
  ended_at        timestamptz,
  search_ready    boolean default false   -- true after Memory Agent indexes
);

-- overlays — one row per chart rendered during a session
create table public.overlays (
  id          uuid default gen_random_uuid() primary key,
  session_id  uuid references public.sessions(id) on delete cascade,
  timestamp   float not null,
  chart_type  text not null,
  chart_url   text not null,
  title       text,
  created_at  timestamptz default now()
);

-- alerts — one row per Alert Agent notification fired
create table public.alerts (
  id          uuid default gen_random_uuid() primary key,
  session_id  uuid references public.sessions(id) on delete cascade,
  timestamp   float not null,
  label       text not null,
  description text,
  excerpt     text,
  created_at  timestamptz default now()
);
```

---

## Phase Breakdown

### Phase 0 — Monorepo Bootstrap (Day 1)
```bash
mkdir datalens && cd datalens
pnpm init
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - "packages/*"
EOF
mkdir -p packages/{extension/src/{agents,renderers,lib,types,popup},frontend/app,shared/src}

# Frontend
cd packages/frontend
pnpm create next-app . --typescript --tailwind --app --no-src-dir
pnpm add @clerk/nextjs svix @supabase/supabase-js @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Extension
cd ../extension && pnpm init
pnpm add -D vite @crxjs/vite-plugin typescript vitest
pnpm add d3-array d3-scale d3-shape
pnpm add -D @types/chrome @types/d3-array @types/d3-scale @types/d3-shape

# Shared
cd ../shared && pnpm init
```

- [ ] Vercel: connect `packages/frontend`, add env vars
- [ ] Clerk: create app, enable Google, set email allowlist, add webhook
- [ ] Supabase: create project, run schema SQL above
- [ ] R2: create bucket, set CORS `AllowedOrigins: ["*"]` for public read

---

### Phase 1 — Auth + Settings (Day 1–2)
- [ ] Clerk `<ClerkProvider>` + `middleware.ts` protecting `/dashboard`, `/settings`, `/session`
- [ ] `/login` page with `<SignIn />` — Google + email domain allowlist working
- [ ] `webhooks/clerk`: domain enforcement (delete banned users) + insert Supabase profile
- [ ] `/settings` page: VideoDB key + OpenRouter key inputs
- [ ] `save-keys` API route: AES-256 encrypt → Supabase upsert
- [ ] `r2/presign` API route: returns 120s-live PUT URL
- [ ] Extension `storage.ts`: `getConfig()` / `saveConfig()` in `chrome.storage.sync`
- [ ] Settings page "Save & Push to Extension" message passing
- [ ] Extension popup: shows "Configure at app.datalens.app" if no keys

---

### Phase 2 — Landing Page (Day 2–3)
- [ ] Hero: headline + "Install Extension" CTA
- [ ] Agent Team section: visual diagram of the 5 agents + their roles
- [ ] How It Works: 3-step (Capture → Detect → Visualize)
- [ ] Features grid: live overlay, summary panel, post-session search, custom alerts, any tab
- [ ] Demo section: screen recording of the overlay in action
- [ ] Responsive, polished with Tailwind + shadcn/ui
- [ ] Footer: GitHub, VideoDB credit

---

### Phase 3 — Capture Agent (Day 3–4)
- [ ] `capture-agent.ts`: `start()` creates CaptureSession + RTStream + WebSocket
- [ ] `bus.ts`: AgentBus routing table working, events printing to console
- [ ] `background.ts`: `START_SESSION` / `STOP_SESSION` message handlers wired
- [ ] Tab activation listener routing `tabId` to bus
- [ ] Smoke test: speak "revenue is 42 percent" → transcript event received in bus

---

### Phase 4 — Viz Agent Renderers (Day 4–6)
- [ ] `canvas-utils.ts`: all helpers — `createCanvas`, `drawBackground`, `drawTitle`, `drawGrid`, `drawXLabels`, `drawSource`, `linearScale`, `bandScale`, `formatCompact`, `hexToRgba`
- [ ] `theme.ts`: all 4 themes
- [ ] `bar.ts`: vertical + horizontal via `_horizontal` flag
- [ ] `line.ts`: single + multi-series, smooth Bezier curves, area fill
- [ ] `area.ts`: wrapper over `line.ts` with stronger fill alpha
- [ ] `metric-card.ts`: big number, delta indicator, mini sparkline inset
- [ ] `donut.ts`: center label, percentage callouts, right-side legend
- [ ] `scatter.ts`: x/y scatter + dashed linear regression trend line
- [ ] `text-callout.ts`: word-wrapped text, left accent stripe
- [ ] `comparison-table.ts`: alternating rows, colored delta pills
- [ ] `sparkline.ts`: compact, no axes, filled area
- [ ] `progress-bar.ts`: gradient fill, percentage label
- [ ] `heatmap.ts`: color saturation intensity, row/col labels
- [ ] `waterfall.ts`: pos/neg color coding, dashed connectors, running total
- [ ] `bullet.ts`: actual bar, target marker, qualitative range bands
- [ ] `renderers/index.ts`: router — all 15 types wired
- [ ] Smoke tests: all 15 types render PNG blob > 1KB

---

### Phase 5 — Viz Agent Detection + Overlay (Day 5–7)
- [ ] `lib/openrouter.ts`: `callOpenRouter()` with fallback model chain
- [ ] `viz-agent.ts`: `detect()` → `renderAndOverlay()` full flow
- [ ] `cache.ts` + `upload.ts`: hash → R2 → URL chain
- [ ] `content.ts`: slide-in/slide-out overlay card, dismiss on click, auto-dismiss
- [ ] Full end-to-end test: speak → detect → render → overlay appears on tab < 6s
- [ ] 8-second cooldown between overlays working
- [ ] 30-second dedup by `type:title` key working
- [ ] Timeline overlay via VideoDB (`/rtstream/{id}/overlay/`) working

---

### Phase 6 — Summary + Alert Agents (Day 6–8)
- [ ] `summary-agent.ts`: 5-minute rolling buffer, 60s interval, `SUMMARY_UPDATE` to popup
- [ ] `summary-agent.ts`: `generateFinalSummary()` with action items
- [ ] Popup: live key-points list, current topic, data points panel
- [ ] `alert-agent.ts`: dedup by label+minute, browser notification, badge count
- [ ] Alert classifier using `google/gemini-3-flash` via OpenRouter
- [ ] Popup: alert feed with timestamp and excerpt
- [ ] Settings page: user-defined custom alert keywords (stored in `chrome.storage.sync`)

---

### Phase 7 — Memory Agent + Dashboard (Day 7–9)
- [ ] `memory-agent.ts`: `finalize()` → `export_rtstream` → `index_spoken_words` → `index_scenes`
- [ ] Popup: memory status messages (exporting → indexing → ready)
- [ ] `/api/session/export`: save session + overlays + alerts to Supabase
- [ ] `/dashboard`: list sessions per Clerk user, overlay count, summary preview
- [ ] `/session/[id]`: search box → `/api/search` → VideoDB semantic search → playable clips
- [ ] `/session/[id]`: enriched replay player (HLS stream with overlays baked in)
- [ ] `OverlayTimeline` component: visual timeline of when charts fired

---

### Phase 8 — Hardening + Polish (Day 9–10)
- [ ] WebSocket reconnect (exponential backoff, max 5 attempts)
- [ ] All agent errors caught + reported to popup — no silent failures
- [ ] Extension popup fully styled and polished
- [ ] `manifest.json` permissions minimized and reviewed
- [ ] README with complete install + setup instructions
- [ ] Landing page demo GIF/video recorded
- [ ] Cost estimate shown in settings page

---

## Extension Build Config

**`manifest.json`**
```json
{
  "manifest_version": 3,
  "name": "DataLens",
  "version": "1.0.0",
  "description": "Live data visualization powered by AI agents",
  "permissions": ["activeTab", "storage", "notifications", "tabs"],
  "host_permissions": ["<all_urls>"],
  "background": { "service_worker": "src/background.ts", "type": "module" },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["src/content.ts"],
    "run_at": "document_end"
  }],
  "action": {
    "default_popup": "src/popup/popup.html",
    "default_icon": { "16": "icons/icon16.png", "48": "icons/icon48.png" }
  },
  "icons": { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" }
}
```

**`vite.config.ts`**
```typescript
import { defineConfig } from "vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.json";

export default defineConfig({
  plugins: [crx({ manifest })],
  build: { outDir: "dist", target: "esnext" },
});
```

**Build + load unpacked:**
```bash
cd packages/extension
pnpm build
# Chrome → chrome://extensions → Developer Mode ON → Load unpacked → select dist/
```

---

## Environment Variables

```bash
# packages/frontend/.env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...

NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

ENCRYPTION_SECRET=<32-char random string>
NEXT_PUBLIC_EXTENSION_ID=<from chrome://extensions after first load>

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=datalens-charts
R2_PUBLIC_URL=https://pub-xxx.r2.dev

# packages/extension — no .env file
# All runtime secrets in chrome.storage.sync, pushed from settings page
```

---

## Technology Decisions

| Layer | Choice | Rationale |
|---|---|---|
| Extension build | **Vite + CRXJS** | Hot reload in dev, MV3 output, TypeScript support |
| Chart rendering | **OffscreenCanvas + D3 (math only)** | Native browser API; no external process; D3-scale/shape for math only |
| Detection LLM | **Gemini 3 Flash via OpenRouter** (`google/gemini-3-flash`) | Purpose-built for agentic workflows; near-Pro reasoning; < 1s latency; fallback chain via OpenRouter |
| Auth | **Clerk** | Drop-in `<SignIn />`, Google OAuth, email domain allowlist, Svix webhook enforcement |
| Database | **Supabase Postgres** | Free tier, service-role-only access, no anon key exposed |
| API key encryption | **AES-256 (Web Crypto API)** | Server-side only; derived from userId + ENCRYPTION_SECRET |
| Frontend | **Next.js on Vercel** | SSR for dashboard, Edge Functions for auth middleware, zero config |
| Chart cache | **chrome.storage.local** | Sandboxed, fast, replaces Redis entirely |
| Storage | **Cloudflare R2** | Zero egress fees critical for PNG-heavy chart uploads |
| Job queue | **None needed** | Everything async-await in service worker; no queue overhead |
| Monorepo | **pnpm workspaces** | Shared types across extension + frontend; single `pnpm install` |

---

## Security Notes

- API keys flow: browser → server-side Next.js route (Clerk JWT verified) → AES-256 encrypted → Supabase. Never plaintext in transit or storage on server.
- `chrome.storage.sync` is sandboxed to the extension — no webpage, no other extension can read it.
- R2 credentials never touch the extension. Presign route on Vercel returns a 120-second PUT URL only.
- Email domain restriction: double-enforced via Clerk dashboard allowlist AND `user.created` webhook (server-side delete). Cannot be bypassed by API manipulation.
- Extension manifest permissions are minimal: `activeTab`, `storage`, `notifications`, `tabs`. No `webRequest` or `cookies`.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `OffscreenCanvas` unavailable in MV3 service worker | Low | High | Test Phase 4 day 1; fallback: render in offscreen document via `chrome.offscreen` |
| VideoDB WS connection drops mid-session | Medium | Medium | Exponential backoff reconnect; Summary Agent buffers locally |
| Gemini 3 Flash rate-limited on OpenRouter | Low | Medium | Fallback chain: `gemini-3-flash` → `gemini-2.5-flash` → `gemini-2.5-flash-lite` |
| Content script not re-injected after navigation | Medium | Medium | `chrome.tabs.onUpdated` listener re-injects on `complete` status |
| R2 CORS blocking PNG load in content script | Medium | Medium | R2 bucket CORS: `AllowedOrigins: ["*"]` for public read |
| Summary Agent calling LLM every 60s on long sessions | Low | Low | Skip call if buffer hasn't changed since last summary |
| `chrome.storage.sync` quota (100KB) exceeded by large config | Low | Low | Store only API keys in sync; large state goes in `storage.local` |

---

## Success Metrics

- **Alert-to-overlay latency:** < 6s from spoken trigger to chart visible on tab
- **Detection precision:** > 80% of overlays on genuinely relevant data moments
- **Cross-tab:** overlay appears on YouTube, Google Docs, Notion, Zoom — any site
- **Summary freshness:** popup key-points updated within 70s of spoken content
- **Alert Agent recall:** > 90% of custom keyword matches caught within 5s
- **Post-session search:** correct clip returned in top 3 results for natural-language queries
- **Memory Agent:** indexing complete within 3 minutes of session stop
- **Cost per 30-min session:** < $0.02 in LLM costs (Gemini 3 Flash at $1.50/M output)