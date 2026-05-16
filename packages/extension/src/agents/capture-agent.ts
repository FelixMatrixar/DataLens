import { getConfig } from "../lib/storage";
import { AgentBus } from "./bus";
import type { UserConfig } from "../types/config";
import { videodbGet, uploadVideo, indexVideo } from "../lib/videodb";

export interface CaptureState {
  sessionId: string;
  videoId: string | null;
  wsConnectionId: string;
  sandboxId: null;
}

export class CaptureAgent {
  private state: CaptureState | null = null;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECTS = 5;

  async start(config: UserConfig, bus: AgentBus, tabUrl?: string): Promise<void> {
    const wsConnectionId = this.makeId();

    // Upload and index the video in the background (non-blocking)
    let videoId: string | null = null;
    if (tabUrl) {
      videoId = await this.uploadAndIndex(tabUrl, config).catch((err: unknown) => {
        console.warn("[DataLens] Video upload/index failed:", err);
        return null;
      });
    }

    // Connect WebSocket to receive events as VideoDB processes the video
    const wsUrl = await this.getWebSocketUrl(config);
    this.ws = new WebSocket(wsUrl);
    await new Promise<void>((resolve, reject) => {
      this.ws!.onopen = () => resolve();
      this.ws!.onerror = () => reject(new Error("WebSocket failed to open"));
    });

    this.state = { sessionId: wsConnectionId, videoId, wsConnectionId, sandboxId: null };
    this.listenAndRoute(bus, config);
  }

  private async uploadAndIndex(tabUrl: string, config: UserConfig): Promise<string | null> {
    // Only process YouTube URLs (or any http/https URL)
    if (!tabUrl.startsWith("http")) return null;

    console.log("[DataLens] Uploading video to VideoDB:", tabUrl);
    const videoId = await uploadVideo(tabUrl, config.videodbCollectionId, config.videodbApiKey);
    console.log("[DataLens] Video uploaded, id:", videoId, "— starting indexing...");

    // Fire-and-forget: indexing is async, events come via WebSocket
    indexVideo(videoId, config.videodbCollectionId, config.videodbApiKey)
      .then(() => console.log("[DataLens] Indexing triggered for", videoId))
      .catch(err => console.warn("[DataLens] Indexing request failed:", err));

    return videoId;
  }

  private listenAndRoute(bus: AgentBus, config: UserConfig): void {
    this.ws!.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        bus.route(msg);
      } catch { /* malformed frame */ }
    };

    this.ws!.onclose = () => {
      if (this.reconnectAttempts < this.MAX_RECONNECTS) {
        this.reconnectAttempts++;
        setTimeout(() => this.reconnectWebSocket(bus, config), 1000 * this.reconnectAttempts);
      }
    };
  }

  private async reconnectWebSocket(bus: AgentBus, _config: UserConfig): Promise<void> {
    const stored = await getConfig();
    if (!stored || !this.state) return;
    const wsUrl = await this.getWebSocketUrl(stored);
    this.ws = new WebSocket(wsUrl);
    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.listenAndRoute(bus, stored);
    };
  }

  async stop(): Promise<CaptureState | null> {
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
    const wsUrl: string = res.data?.websocket_url ?? res.data?.ws_url;
    if (!wsUrl || (!wsUrl.startsWith("ws://") && !wsUrl.startsWith("wss://"))) {
      throw new Error(`Invalid WebSocket URL from VideoDB: "${wsUrl}"`);
    }
    return wsUrl;
  }

  private makeId(): string {
    return `ext-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}
