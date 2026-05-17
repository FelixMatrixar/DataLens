import type { UserConfig, VideoDBEvent } from "../../types";

export class VideoDBService {
  async setup(config: UserConfig): Promise<{
    sessionId: string;
    token: string;
    wsConnectionId: string;
    startEventLoop: (onEvent: (e: VideoDBEvent) => void, onError: (e: unknown) => void) => () => void;
    activateStreams: () => Promise<void>;
  }> {
    const { connect } = require("videodb");
    const conn = connect({ apiKey: config.videodbApiKey });
    const coll = await conn.getCollection(config.videodbCollectionId);

    // 1. Create capture session
    const session = await coll.createCaptureSession({
      endUserId: config.userId || "datalens-user",
      metadata: { startedAt: Date.now() },
    });
    const sessionId = session.id as string;
    const token = await conn.generateClientToken(3600);

    // 2. Connect WebSocket first — we need connectionId for startTranscript
    const ws = await conn.connectWebsocket(config.videodbCollectionId);
    await ws.connect();
    // Suppress MaxListeners warning — ws.receive() adds one close listener per message internally
    (ws as any).setMaxListeners?.(0);
    (ws as any)._connection?.setMaxListeners?.(0);
    const wsConnectionId: string = ws.connectionId ?? "";
    console.log("[DataLens] WebSocket connected, id:", wsConnectionId);

    // 3. Return an activateStreams fn to call after binary starts recording
    const activateStreams = async () => {
      // Give the server a moment to register the capture session channels
      await new Promise(r => setTimeout(r, 4000));
      await session.refresh();

      // Log all available RTStreams so we can see what VideoDB named them
      const allStreams: any[] = (session as any).rtstreams ?? (session as any)._rtstreams ?? [];
      console.log("[DataLens] all RTStreams:", JSON.stringify(allStreams.map((s: any) => ({ id: s.id, name: s.name, type: s.type ?? s.stream_type }))));

      // Start transcript on system audio (screen sound) — try both possible names
      for (const streamType of ["system_audio", "audio", "mic"] as const) {
        const streams = session.getRTStream(streamType);
        if (streams.length > 0) {
          console.log(`[DataLens] starting transcript on ${streamType} RTStream:`, streams[0].id);
          await streams[0].startTranscript(wsConnectionId).catch((e: unknown) =>
            console.warn(`[DataLens] startTranscript(${streamType}) failed:`, e)
          );
          break; // use first available audio source
        }
      }

      // Start visual index on screen RTStream
      const screens = session.getRTStream("screen");
      if (screens.length > 0) {
        console.log("[DataLens] starting visual index on screen RTStream:", screens[0].id);
        await screens[0].indexVisuals({ socketId: wsConnectionId }).catch((e: unknown) =>
          console.warn("[DataLens] indexVisuals failed:", e)
        );
      } else {
        console.warn("[DataLens] no screen RTStream found after refresh");
      }
    };

    // 4. Event loop factory — uses the already-connected ws
    const startEventLoop = (
      onEvent: (e: VideoDBEvent) => void,
      onError: (e: unknown) => void
    ): (() => void) => {
      let active = true;

      (async () => {
        try {
          for await (const msg of ws.receive()) {
            if (!active) break;
            const isFinalOrNonTranscript = msg.channel !== "transcript" || (msg.data as any)?.is_final === true;
            if (isFinalOrNonTranscript) {
              console.log("[DataLens] WS event:", msg.channel, JSON.stringify(msg.data));
            }
            const data = (msg.data ?? {}) as Record<string, unknown>;
            // visual_index → scene_index; extract text from wherever it lives
            const rawChannel = (msg.channel ?? msg.type ?? "unknown") as string;
            const channel = rawChannel === "visual_index" ? "scene_index" : rawChannel;
            const text =
              (msg.text as string | undefined) ??
              (data.text as string | undefined) ??
              (data.description as string | undefined) ??
              (data.content as string | undefined) ??
              ((data.scenes as any[])?.[0]?.description as string | undefined);
            const event: VideoDBEvent = {
              channel,
              data: { ...data, text },
              text,
              rtstream_name: msg.rtstream_name as string | undefined,
            };
            onEvent(event);
          }
        } catch (err) {
          if (active) onError(err);
        }
      })();

      return () => {
        active = false;
        ws.close().catch(() => {});
      };
    };

    return { sessionId, token, wsConnectionId, startEventLoop, activateStreams };
  }
}
