import { ipcMain } from "electron";
import { VideoDBService } from "../services/videodb";
import { AgentBus } from "../services/bus";
import { getConfig } from "../services/config";

const videodbService = new VideoDBService();
const bus = new AgentBus();
let stopWebSocket: (() => void) | null = null;
let captureClient: any = null;

export function registerCaptureHandlers(
  sendToControl: (channel: string, data: unknown) => void,
  sendToOverlay: (channel: string, data: unknown) => void
): void {
  // Start a session: create VideoDB CaptureSession → get token → start CaptureClient
  ipcMain.handle("capture:start", async (_event, deviceSelection: {
    micId?: string;
    systemAudioId?: string;
    displayId?: string;
  }) => {
    try {
      const config = getConfig();
      if (!config) return { ok: false, error: "No config. Set up API keys first." };

      sendToControl("session:status", { state: "starting" });

      // 1. Create session + get token from VideoDB
      const { sessionId, token } = await videodbService.createSession(config);

      // 2. Initialize CaptureClient (dynamically import to avoid early binding)
      const { CaptureClient } = require("videodb/capture");
      captureClient = new CaptureClient({ sessionToken: token });
      captureClient.on("error", (err: unknown) => {
        console.error("[DataLens] CaptureClient error:", err);
        sendToControl("session:status", { state: "stopped", error: String(err) });
      });

      // 3. List available channels
      const channels = await captureClient.listChannels();
      const channelConfig: any[] = [];

      if (deviceSelection.micId ?? channels.mics?.[0]?.id) {
        channelConfig.push({
          channelId: deviceSelection.micId ?? channels.mics[0].id,
          type: "audio",
          store: true,
          transcript: true,
        });
      }
      if (deviceSelection.systemAudioId ?? channels.systemAudio?.[0]?.id) {
        channelConfig.push({
          channelId: deviceSelection.systemAudioId ?? channels.systemAudio[0].id,
          type: "audio",
          store: true,
        });
      }
      if (deviceSelection.displayId ?? channels.displays?.[0]?.id) {
        channelConfig.push({
          channelId: deviceSelection.displayId ?? channels.displays[0].id,
          type: "video",
          store: true,
          isPrimary: true,
        });
      }

      // 4. Start capture stream
      await captureClient.startSession({ sessionId, channels: channelConfig });

      // 5. Wire AgentBus
      bus.setConfig(config);
      bus.start(
        (spec) => sendToOverlay("overlay:show-spec", { spec }),
        (summary) => sendToControl("summary:update", summary),
        (alert) => sendToControl("alert:fired", alert)
      );

      // 6. Start WebSocket event loop
      stopWebSocket = await videodbService.startWebSocketLoop(
        config,
        (event) => bus.route(event),
        (err) => console.warn("[DataLens] WebSocket error:", err)
      );

      sendToControl("session:status", { state: "active", sessionId });
      return { ok: true, sessionId };

    } catch (err) {
      sendToControl("session:status", { state: "stopped", error: String(err) });
      return { ok: false, error: String(err) };
    }
  });

  // Stop session
  ipcMain.handle("capture:stop", async () => {
    try {
      sendToControl("session:status", { state: "stopping" });
      await captureClient?.stopSession?.();
      stopWebSocket?.();
      stopWebSocket = null;
      captureClient = null;
      const finalSummary = bus.stop();
      sendToControl("session:status", { state: "stopped" });
      return { ok: true, finalSummary };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });

  // List available capture devices
  ipcMain.handle("capture:list-devices", async () => {
    try {
      const config = getConfig();
      if (!config) return { ok: false, error: "No config" };

      // Need a token to list channels
      const { token } = await videodbService.createSession(config);
      const { CaptureClient } = require("videodb/capture");
      const tempClient = new CaptureClient({ sessionToken: token });
      const channels = await tempClient.listChannels();

      return {
        ok: true,
        mics: (channels.mics ?? []).map((c: any) => ({ id: c.id, name: c.name })),
        systemAudio: (channels.systemAudio ?? []).map((c: any) => ({ id: c.id, name: c.name })),
        displays: (channels.displays ?? []).map((c: any) => ({ id: c.id, name: c.name })),
      };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  });
}
