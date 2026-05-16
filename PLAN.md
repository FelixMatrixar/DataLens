# DataLens Desktop — Live Data Visualization via VideoDB

## Executive Summary

**DataLens Desktop** is an Electron app (Windows + macOS) that captures system audio and screen via VideoDB's `CaptureClient` SDK, receives real-time AI analysis events from VideoDB (transcription, scene indexing, audio indexing), and overlays intelligently chosen data visualizations directly on top of **any application** — YouTube, Zoom, Teams, PowerPoint, anything — the moment the content warrants it.

The Chrome extension is **deprecated**. The desktop app is the product.

---

## Why Desktop (not Extension)

| Constraint | Chrome Extension | Electron Desktop |
|---|---|---|
| Real-time audio ingest to VideoDB | ✗ No RTMP/WebRTC browser API | ✓ `CaptureClient` SDK (VideoDB's own) |
| System audio capture | ✗ Tab audio only, no meetings | ✓ WASAPI loopback (all apps) |
| Works on Zoom, Teams, PowerPoint | ✗ No | ✓ Overlay on any window |
| VideoDB streaming latency | N/A | ~2s to first transcript event |
| VideoDB `CaptureSession` + RTStream | Requires relay server | ✓ Direct via `videodb/capture` |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  ELECTRON MAIN PROCESS (Node.js)                                 │
│                                                                  │
│  VideoDBService                                                  │
│    createCaptureSession() → session.id                           │
│    generateClientToken()  → token                                │
│    connectWebsocket()     → async iterator of events            │
│                                                                  │
│  CaptureClient (videodb/capture)                                 │
│    listChannels()  → { mics, displays, systemAudio }            │
│    startSession()  → streams audio+video to VideoDB             │
│    stopSession()   → ends stream                                 │
│                                                                  │
│  AgentBus                                                        │
│    ├── transcript  → VizAgent (Gemini 3 Flash)                   │
│    ├── scene_index → VizAgent                                    │
│    ├── audio_index → SummaryAgent                               │
│    └── alert       → AlertAgent                                  │
│                                                                  │
│  VizAgent                                                        │
│    callOpenRouter() → UVS JSON                                   │
│    renderCanvas()   → PNG blob                                   │
│    uploadToR2()     → chart URL                                  │
│    → IPC → overlay window                                        │
└──────────────┬───────────────────────────────────────────────────┘
               │ IPC (contextBridge)
    ┌──────────┴───────────────┐
    │                          │
┌───▼────────────────┐  ┌──────▼─────────────────────────────────┐
│  CONTROL WINDOW    │  │  OVERLAY WINDOW                         │
│  (normal window)   │  │  transparent: true                      │
│                    │  │  frame: false                           │
│  Start / Stop      │  │  alwaysOnTop: true                      │
│  Device picker     │  │  skipTaskbar: true                      │
│  Live summary      │  │  setIgnoreMouseEvents(true, forward)    │
│  Alert feed        │  │                                         │
│  Session status    │  │  Shows chart cards on top of ANY app    │
└────────────────────┘  │  (YouTube, Zoom, Teams, slides…)        │
                        └─────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  VERCEL BACKEND (Next.js — existing, minor additions)            │
│  POST /api/capture/session  → createCaptureSession + token       │
│  POST /api/capture/webhook  → session lifecycle events           │
│  POST /api/session/overlay  → save chart to Supabase             │
│  GET  /api/r2/presign       → chart PNG upload URL               │
│  (auth, dashboard, search — unchanged)                           │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  VIDEODB CLOUD                                                   │
│  CaptureSession → RTStream                                       │
│    ├── transcript events  (1-2s latency)                         │
│    ├── scene_index events (2-5s latency)                         │
│    └── audio_index events (30s batches, Qwen 9B)                 │
│  WebSocket → Main process event loop                             │
└──────────────────────────────────────────────────────────────────┘
```

---

## Monorepo Structure (after pivot)

```
datalens/
├── package.json                    pnpm workspace root
├── pnpm-workspace.yaml
│
├── packages/
│   │
│   ├── desktop/                    ← NEW — Electron app
│   │   ├── src/
│   │   │   ├── main/               Main process (Node.js)
│   │   │   │   ├── index.ts        App entry, BrowserWindow creation
│   │   │   │   ├── windows.ts      createControlWindow(), createOverlayWindow()
│   │   │   │   ├── services/
│   │   │   │   │   ├── videodb.ts  VideoDBService (session, token, WS)
│   │   │   │   │   ├── bus.ts      AgentBus (routes WS events to agents)
│   │   │   │   │   ├── viz-agent.ts   Gemini 3 Flash + renderCanvas + R2
│   │   │   │   │   ├── summary-agent.ts  Rolling summary (unchanged logic)
│   │   │   │   │   └── alert-agent.ts    Keyword alerts (unchanged logic)
│   │   │   │   └── ipc/
│   │   │   │       ├── capture.ts  CaptureClient handlers (start/stop/devices)
│   │   │   │       ├── overlay.ts  Show/hide/position chart overlay
│   │   │   │       └── session.ts  Session lifecycle IPC
│   │   │   │
│   │   │   ├── preload/
│   │   │   │   └── index.ts        contextBridge: recorderAPI, overlayAPI, configAPI
│   │   │   │
│   │   │   └── renderer/           React UI (Vite)
│   │   │       ├── control/        Start/Stop, device picker, live summary
│   │   │       └── overlay/        Transparent chart card display
│   │   │
│   │   ├── package.json
│   │   ├── electron-builder.yml    Windows NSIS + macOS DMG config
│   │   └── vite.config.ts          Renderer build
│   │
│   ├── shared/                     Types shared across packages
│   │   └── src/
│   │       ├── uvs.ts              Universal Visual Spec
│   │       ├── events.ts           VideoDB WebSocket event types
│   │       └── config.ts           UserConfig interface
│   │
│   ├── frontend/                   Vercel (auth + dashboard — mostly unchanged)
│   │   └── app/api/
│   │       ├── capture/
│   │       │   ├── session/route.ts    NEW: createCaptureSession + generateClientToken
│   │       │   └── webhook/route.ts   NEW: VideoDB session lifecycle webhook
│   │       └── ... (existing routes unchanged)
│   │
│   └── extension/                  DEPRECATED — parked, not deleted
```

---

## Key Dependencies (`packages/desktop/package.json`)

```json
{
  "dependencies": {
    "videodb": "^0.2.4",
    "electron-store": "^8.1.0"
  },
  "devDependencies": {
    "electron": "^39.7.0",
    "electron-builder": "^24.6.4",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

Note: `CaptureClient` is imported from `videodb/capture` (entry point inside the `videodb` package) — not a separate `@videodb/recorder` package.

---

## Exact VideoDB API Calls

### Backend (`/api/capture/session` — Next.js route)
```typescript
import { connect } from "videodb";

const conn = connect({ apiKey: process.env.VIDEODB_API_KEY! });
const coll = await conn.getCollection(process.env.VIDEODB_COLLECTION_ID!);

// Create session
const session = await coll.createCaptureSession({
  endUserId: userId,
  metadata: { startedAt: Date.now() }
});

// Generate short-lived token for desktop client
const token = await conn.generateClientToken(3600); // 1 hour

return Response.json({ sessionId: session.id, token });
```

### Desktop Main Process (capture.ts IPC handler)
```typescript
import { CaptureClient } from "videodb/capture";

const client = new CaptureClient({ sessionToken: token });
const channels = await client.listChannels();
// channels: { mics: [...], displays: [...], systemAudio: [...] }

await client.startSession({
  sessionId,
  channels: [
    { channelId: channels.mics[0].id,        type: "audio", store: true },
    { channelId: channels.systemAudio[0].id,  type: "audio", store: true },
    { channelId: channels.displays[0].id,     type: "video", store: true, isPrimary: true },
  ]
});
```

### WebSocket Event Loop (videodb.ts service)
```typescript
const ws = await conn.connectWebsocket(collectionId);
await ws.connect();

for await (const msg of ws.receive()) {
  // msg: { channel, data: { text?, status? }, rtstream_name? }
  bus.route(msg); // → VizAgent / SummaryAgent / AlertAgent
}
```

### WebSocket Event Shape
```typescript
{
  channel: "transcript" | "scene_index" | "audio_index" | "alert" | "capture_session",
  data: {
    text?: string;      // transcript / scene / audio_index text
    status?: string;    // for capture_session events
    [key: string]: any;
  },
  rtstream_name?: string; // e.g. "Capture mic - cap-xxx"
}
```

---

## Overlay Window (always-on-top, transparent)

```typescript
// windows.ts
overlayWindow = new BrowserWindow({
  width: 360,
  height: 800,
  x: screenWidth - 380,
  y: 100,
  transparent: true,
  frame: false,
  resizable: false,
  alwaysOnTop: true,
  hasShadow: false,
  skipTaskbar: true,
  focusable: false,
  webPreferences: { preload: PRELOAD_PATH, contextIsolation: true },
});
overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
overlayWindow.setIgnoreMouseEvents(true, { forward: true });
overlayWindow.loadFile("renderer/overlay/index.html");
```

Chart cards animate in/out in the overlay renderer exactly as the extension's `content.ts` did — same CSS slide-in/out, same dismiss-on-click, same auto-dismiss after `duration_seconds`.

---

## preload/index.ts — Context Bridge

```typescript
contextBridge.exposeInMainWorld("recorderAPI", {
  listDevices:     ()          => ipcRenderer.invoke("capture:list-devices"),
  startSession:    (opts)      => ipcRenderer.invoke("capture:start", opts),
  stopSession:     ()          => ipcRenderer.invoke("capture:stop"),
  onOverlay:       (cb)        => ipcRenderer.on("overlay:show", (_, d) => cb(d)),
  onSummaryUpdate: (cb)        => ipcRenderer.on("summary:update", (_, d) => cb(d)),
  onSessionStatus: (cb)        => ipcRenderer.on("session:status", (_, d) => cb(d)),
  setIgnoreMouse:  (ignore)    => ipcRenderer.send("overlay:ignore-mouse", ignore),
});

contextBridge.exposeInMainWorld("configAPI", {
  get:  ()     => ipcRenderer.invoke("config:get"),
  save: (data) => ipcRenderer.invoke("config:save", data),
});
```

---

## Agent Reuse Strategy

All agent logic is **pure TypeScript with no browser APIs** — it can be moved to the main process unchanged:

| Agent | Reuse | Change needed |
|---|---|---|
| `VizAgent` | ✓ Copy as-is | Replace `chrome.storage` calls with `electron-store`; replace `chrome.tabs.sendMessage` with IPC |
| `SummaryAgent` | ✓ Copy as-is | Replace `chrome.runtime.sendMessage` with IPC |
| `AlertAgent` | ✓ Copy as-is | Replace `chrome.notifications` with `new Notification()` (Node.js) |
| `AgentBus` | ✓ Copy as-is | No browser APIs used |
| `renderers/` | ✓ Copy as-is | `OffscreenCanvas` works in Node.js 18+ via `canvas` npm package |
| `lib/openrouter.ts` | ✓ Copy as-is | `fetch` available in Node.js 18+ |
| `lib/upload.ts` | ✓ Copy as-is | `fetch` available |

---

## Frontend Changes (Vercel — minimal)

Two new API routes:

### `POST /api/capture/session`
```typescript
// Returns sessionId + short-lived token for the desktop client
// Desktop app polls this on "Start" click
```

### `POST /api/capture/webhook`
```typescript
// VideoDB calls this when session status changes
// (active → exporting → exported)
// Updates Supabase sessions table
```

Settings page: replace "Sync to Extension" button with a QR code or copy-paste flow for the desktop app to get its initial config (or just enter API keys directly in the app's settings window).

---

## Implementation Phases

### Phase 1 — Scaffold (`packages/desktop/`)
- [ ] `pnpm create electron-app desktop --template=vite-ts` or manual scaffold
- [ ] Install `videodb`, `electron-store`
- [ ] `main/index.ts`: create control window + hidden overlay window
- [ ] `preload/index.ts`: expose `recorderAPI` + `configAPI`
- [ ] `renderer/control/`: React app with Start / Stop / Status only (no devices yet)
- [ ] Verify Electron launches with two windows

### Phase 2 — VideoDB Session
- [ ] `main/services/videodb.ts`: `createSession()` → calls `/api/capture/session`
- [ ] `main/ipc/capture.ts`: `capture:start` handler → `CaptureClient.startSession()`
- [ ] `main/ipc/capture.ts`: `capture:list-devices` → `client.listChannels()`
- [ ] Frontend: `POST /api/capture/session` route (createCaptureSession + generateClientToken)
- [ ] Smoke test: click Start → session created → CaptureClient streams → session active in VideoDB dashboard

### Phase 3 — WebSocket Event Loop + AgentBus
- [ ] `main/services/videodb.ts`: `connectWebsocket()` → `for await` loop
- [ ] Port `bus.ts`, `summary-agent.ts`, `alert-agent.ts` to `main/services/`
- [ ] `bus.route()` → IPC events to renderer (`summary:update`, overlay payloads)
- [ ] Console-log all incoming events to verify shape
- [ ] Smoke test: speak "revenue is 42 million" → transcript event logged in console

### Phase 4 — VizAgent + Overlay
- [ ] Port `viz-agent.ts` + all 15 renderers to `main/services/`
- [ ] `OffscreenCanvas` in Node.js: install `@napi-rs/canvas` as fallback if needed
- [ ] `overlay:show` IPC message → overlay renderer receives chart URL + duration
- [ ] Overlay renderer: same slide-in/slide-out animation as old content.ts
- [ ] `setIgnoreMouseEvents(true)` so overlay clicks pass through to app behind
- [ ] Smoke test: speak data → chart appears over YouTube in browser

### Phase 5 — Device Picker + Settings
- [ ] Control window: dropdown for mic, system audio, display selection
- [ ] Settings window: API key input (stored in `electron-store`, encrypted)
- [ ] Config pushes to main process before session starts
- [ ] Auto-login: open frontend URL in default browser for Clerk auth, then copy token back

### Phase 6 — Session Export + Dashboard
- [ ] On stop: `MemoryAgent.finalize()` → VideoDB export → index → save to Supabase
- [ ] Frontend dashboard: sessions list (unchanged)
- [ ] Smoke test: full session → stop → dashboard shows session with overlays

### Phase 7 — Packaging
- [ ] `electron-builder.yml`: Windows NSIS installer + macOS DMG
- [ ] Code signing (Windows: self-signed for now; macOS: Apple Developer)
- [ ] Auto-update via `electron-updater` pointing to GitHub Releases
- [ ] `pnpm build:desktop` → produces `DataLens-Setup.exe` + `DataLens.dmg`

---

## Environment Variables

```bash
# Vercel (frontend) — additions to existing
VIDEODB_API_KEY=          # already set
VIDEODB_COLLECTION_ID=    # already set
OPENROUTER_API_KEY=       # already set

# Desktop app (electron-store, local)
# User enters these in the settings window on first run:
#   - VideoDB API Key (pre-filled if synced from frontend)
#   - OpenRouter API Key
#   - VideoDB Collection ID
#   - Frontend URL (for R2 presign + session export)
```

---

## Technology Decisions

| Layer | Choice | Reason |
|---|---|---|
| Desktop framework | **Electron 39** | Same as Bloom reference; `videodb/capture` tested against it |
| Capture SDK | **`videodb/capture` (CaptureClient)** | Official SDK; handles RTMP relay internally |
| Node canvas | **`OffscreenCanvas` (Node 18+)** | Built-in; test first; fallback to `@napi-rs/canvas` |
| Config storage | **`electron-store`** | Encrypted key-value, persists across sessions |
| Renderer build | **Vite + React** | Reuses existing UI component knowledge |
| IPC | **contextBridge + ipcRenderer.invoke** | Same pattern as Bloom |
| Chart delivery | **R2 via presign** (unchanged) | Same as extension; zero egress cost |

---

## Success Metrics (updated)

- **Transcript-to-overlay latency:** < 5s from spoken data to chart visible on screen
- **Works on:** YouTube, Google Meet, Zoom, Teams, PowerPoint, any app
- **System audio capture:** Works without user needing to configure anything
- **Session export:** Video indexed and searchable in dashboard within 3 minutes of stop
- **Installer size:** < 120MB (Electron base ~80MB + app)
