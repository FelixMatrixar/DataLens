import { ipcMain } from "electron";
import { execSync } from "child_process";
import { VideoDBService } from "../services/videodb";
import { AgentBus } from "../services/bus";
import { getConfig } from "../services/config";

const videodbService = new VideoDBService();
const bus = new AgentBus();
let stopEventLoop: (() => void) | null = null;
let captureClient: any = null;

function killCaptureBinary(): void {
  try {
    if (process.platform === "win32") {
      execSync("taskkill /F /IM capture.exe /T", { stdio: "ignore" });
    } else {
      execSync("pkill -f capture || true", { stdio: "ignore" });
    }
  } catch {
    // No existing process — fine
  }
}

export function registerCaptureHandlers(
  sendToControl: (channel: string, data: unknown) => void,
  sendToOverlay: (channel: string, data: unknown) => void
): void {
  ipcMain.handle("capture:start", async (_event, deviceSelection: {
    micId?: string;
    systemAudioId?: string;
    displayId?: string;
  }) => {
    try {
      const config = getConfig();
      if (!config) return { ok: false, error: "No config — sign in first." };

      sendToControl("session:status", { state: "starting" });

      // 1. Create session, connect WebSocket, get connectionId
      const { sessionId, token, startEventLoop, activateStreams } =
        await videodbService.setup(config);

      // 2. Wire AgentBus before events start flowing
      bus.setConfig(config);
      bus.start(
        (spec) => sendToOverlay("overlay:show-spec", { spec }),
        (summary) => sendToControl("summary:update", summary),
        (alert) => sendToControl("alert:fired", alert),
        (e) => sendToOverlay("overlay:telemetry", e),
      );
      stopEventLoop = startEventLoop(
        (event) => bus.route(event),
        (err) => console.warn("[DataLens] WebSocket error:", err)
      );

      // 3. Kill orphaned binary, create CaptureClient
      killCaptureBinary();
      const { CaptureClient } = require("videodb/capture");
      captureClient = new CaptureClient({ sessionToken: token, restartOnError: false });
      captureClient.on("error", (err: unknown) => {
        console.error("[DataLens] CaptureClient error:", err);
        // Binary crashed — notify UI but don't kill the WebSocket (events may still flow)
        sendToControl("session:status", { state: "stopped", error: String(err) });
      });
      captureClient.on("shutdown", () => {
        console.warn("[DataLens] capture binary shutdown, events may still arrive via WebSocket");
      });

      // 4. List channels and build config
      const channels = await captureClient.listChannels();
      console.log("[DataLens] available channels:", JSON.stringify({
        mics: channels.mics?.map((c: any) => c.name),
        systemAudio: channels.systemAudio?.map((c: any) => c.name),
        displays: channels.displays?.map((c: any) => c.name),
      }));
      const channelConfig: any[] = [];

      // Mic: only if explicitly selected by user
      if (deviceSelection.micId) {
        channelConfig.push({ channelId: deviceSelection.micId, type: "audio", store: true });
      }

      // System audio: use selection or auto-pick first available
      const sysAudioId = deviceSelection.systemAudioId ?? channels.systemAudio?.[0]?.id;
      if (sysAudioId) {
        channelConfig.push({ channelId: sysAudioId, type: "audio", store: true });
      }

      // Display: use selection or auto-pick first available
      const displayId = deviceSelection.displayId ?? channels.displays?.[0]?.id;
      if (displayId) {
        channelConfig.push({ channelId: displayId, type: "video", store: true, isPrimary: true });
      }

      // 5. Start recording
      await captureClient.startSession({ sessionId, channels: channelConfig });
      sendToControl("session:status", { state: "active", sessionId });

      // 6. After binary starts recording, activate transcript + visual index
      //    (runs async — 4s delay for server to register RTStreams)
      activateStreams().catch((e: unknown) =>
        console.warn("[DataLens] activateStreams failed:", e)
      );

      return { ok: true, sessionId };

    } catch (err) {
      sendToControl("session:status", { state: "stopped", error: String(err) });
      return { ok: false, error: String(err) };
    }
  });

  ipcMain.handle("capture:stop", async () => {
    sendToControl("session:status", { state: "stopping" });
    try {
      await captureClient?.stopSession?.();
    } catch { /* already dead — fine */ }
    try {
      await captureClient?.shutdown?.();
    } catch { /* already dead — fine */ }
    stopEventLoop?.();
    stopEventLoop = null;
    captureClient = null;
    try { bus.stop(); } catch { /* ignore */ }
    sendToControl("session:status", { state: "stopped" });
    return { ok: true };
  });

  ipcMain.handle("capture:list-devices", async () => {
    try {
      const config = getConfig();
      if (!config) return { ok: false, error: "No config" };

      const { token } = await videodbService.setup(config).catch(async () => {
        // Fallback: create a minimal session just for the token
        const { connect } = require("videodb");
        const conn = connect({ apiKey: config.videodbApiKey });
        const coll = await conn.getCollection(config.videodbCollectionId);
        const session = await coll.createCaptureSession({ endUserId: "list-devices" });
        const token = await conn.generateClientToken(300);
        return { token, sessionId: session.id };
      });

      killCaptureBinary();
      const { CaptureClient } = require("videodb/capture");
      const tempClient = new CaptureClient({ sessionToken: token, restartOnError: false });
      const channels = await tempClient.listChannels();
      await tempClient.shutdown();

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
