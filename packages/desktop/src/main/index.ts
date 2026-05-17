import { app, ipcMain, screen } from "electron";
import { execSync } from "child_process";
import { createControlWindow, createOverlayWindow } from "./windows";
import { registerCaptureHandlers } from "./ipc/capture";
import { registerOverlayHandlers } from "./ipc/overlay";
import { registerAuthHandlers } from "./ipc/auth";
import { getConfig, saveConfig, clearConfig } from "./services/config";
import type { BrowserWindow } from "electron";

let controlWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;

function sendToControl(channel: string, data: unknown): void {
  if (controlWindow && !controlWindow.isDestroyed()) {
    controlWindow.webContents.send(channel, data);
  }
}

function sendToOverlay(channel: string, data: unknown): void {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send(channel, data);
  }
}

app.whenReady().then(() => {
  controlWindow = createControlWindow();
  overlayWindow = createOverlayWindow();

  registerCaptureHandlers(sendToControl, sendToOverlay);
  registerOverlayHandlers(overlayWindow);
  registerAuthHandlers(sendToControl);

  ipcMain.handle("config:get", () => getConfig());

  // Keep pill anchored to bottom-left when height changes
  ipcMain.on("window:resize", (_e, height: number) => {
    if (!controlWindow || controlWindow.isDestroyed()) return;
    const { height: screenH } = screen.getPrimaryDisplay().workAreaSize;
    const [x] = controlWindow.getPosition();
    controlWindow.setSize(244, height);
    controlWindow.setPosition(x, screenH - height - 24);
  });
  ipcMain.handle("config:save", (_e, config: unknown) => { saveConfig(config as any); return { ok: true }; });
  ipcMain.handle("config:clear", () => { clearConfig(); return { ok: true }; });

  controlWindow.on("closed", () => {
    overlayWindow?.destroy();
    app.quit();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  try {
    if (process.platform === "win32") {
      execSync("taskkill /F /IM capture.exe /T", { stdio: "ignore" });
    } else {
      execSync("pkill -f capture || true", { stdio: "ignore" });
    }
  } catch {
    // Binary wasn't running — fine
  }
});
