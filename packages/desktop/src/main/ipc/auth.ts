import { ipcMain } from "electron";
import { startAuthFlow } from "../services/auth";
import { saveConfig, clearConfig } from "../services/config";

export function registerAuthHandlers(
  sendToControl: (channel: string, data: unknown) => void
): void {
  ipcMain.handle("auth:signin", async () => {
    try {
      sendToControl("auth:status", { state: "signing-in" });
      const config = await startAuthFlow();
      saveConfig(config);
      sendToControl("auth:status", { state: "signed-in" });
      return { ok: true, config };
    } catch (err) {
      sendToControl("auth:status", { state: "idle" });
      return { ok: false, error: String(err) };
    }
  });

  ipcMain.handle("auth:signout", () => {
    clearConfig();
    sendToControl("auth:status", { state: "idle" });
    return { ok: true };
  });
}
