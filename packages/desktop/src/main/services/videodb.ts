import type { UserConfig, VideoDBEvent } from "../../types";

export class VideoDBService {
  async createSession(config: UserConfig): Promise<{ sessionId: string; token: string }> {
    const { connect } = require("videodb");
    const conn = connect({ apiKey: config.videodbApiKey });
    const coll = await conn.getCollection(config.videodbCollectionId);

    const session = await coll.createCaptureSession({
      endUserId: config.userId || "datalens-user",
      metadata: { startedAt: Date.now() },
    });

    const token = await conn.generateClientToken(3600);
    return { sessionId: session.id as string, token: token as string };
  }

  async startWebSocketLoop(
    config: UserConfig,
    onEvent: (event: VideoDBEvent) => void,
    onError: (err: unknown) => void
  ): Promise<() => void> {
    const { connect } = require("videodb");
    const conn = connect({ apiKey: config.videodbApiKey });
    let active = true;

    const loop = async () => {
      try {
        const ws = await conn.connectWebsocket(config.videodbCollectionId);
        await ws.connect();

        for await (const msg of ws.receive()) {
          if (!active) break;
          const event: VideoDBEvent = {
            channel: msg.channel ?? msg.type ?? "unknown",
            data: msg.data ?? {},
            text: msg.text,
            rtstream_name: msg.rtstream_name,
          };
          onEvent(event);
        }
      } catch (err) {
        if (active) onError(err);
      }
    };

    loop();
    return () => { active = false; };
  }
}
