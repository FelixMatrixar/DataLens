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
    const wsUrl = await this.getWebSocketUrl(config);
    this.ws = new WebSocket(wsUrl);

    await new Promise<void>((resolve, reject) => {
      this.ws!.onopen = () => resolve();
      this.ws!.onerror = () => reject(new Error("WebSocket failed to open"));
    });

    const wsConnectionId = this.extractConnectionId(this.ws);

    const sessionRes = await videodbPost(
      `/collection/${config.videodbCollectionId}/capture/session`,
      config.videodbApiKey,
      {
        end_user_id: config.userId,
        ws_connection_id: wsConnectionId,
      }
    );
    const sessionId: string = sessionRes.data.session_id;

    await videodbPost("/capture/session/start", config.videodbApiKey, {
      session_id: sessionId,
      channels: [
        { channel_id: "screen", type: "video", store: true },
        { channel_id: "mic",    type: "audio", store: true },
      ],
      ws_connection_id: wsConnectionId,
    });

    const streamingRes = await videodbGet(
      `/capture/session/${sessionId}/streaming`,
      config.videodbApiKey
    );
    const rtspUrl: string = streamingRes.data.rtsp_url;

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

    await this.wireAlerts(config, rtstreamId);
    this.listenAndRoute(bus);
  }

  private async wireAlerts(config: UserConfig, rtstreamId: string): Promise<void> {
    const eventRes = await videodbPost("/rtstream/event/", config.videodbApiKey, {
      event_prompt: [
        "Detect when a speaker mentions a specific number, percentage, financial figure, or metric",
        "Detect when visible text on screen contains numerical data, charts, graphs, or tables",
        "Detect when a slide or document with data visualization appears on screen",
      ].join(". "),
      label: "data_trigger",
    });

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
      } catch { /* malformed frame */ }
    };

    this.ws!.onclose = () => {
      if (this.reconnectAttempts < this.MAX_RECONNECTS) {
        this.reconnectAttempts++;
        setTimeout(
          () => this.reconnectWebSocket(bus),
          1000 * this.reconnectAttempts
        );
      }
    };
  }

  private async reconnectWebSocket(bus: AgentBus): Promise<void> {
    const config = await getConfig();
    if (!config || !this.state) return;
    const wsUrl = await this.getWebSocketUrl(config);
    this.ws = new WebSocket(wsUrl);
    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.listenAndRoute(bus);
    };
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

  private extractConnectionId(_ws: WebSocket): string {
    return `ext-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}
