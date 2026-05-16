import { app, ipcMain } from "electron";
import { createControlWindow, createOverlayWindow } from "./windows";
import { registerCaptureHandlers } from "./ipc/capture";
import { registerOverlayHandlers } from "./ipc/overlay";
import { registerAuthHandlers } from "./ipc/auth";
import { getConfig } from "./services/config";
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

  controlWindow.on("closed", () => {
    overlayWindow?.destroy();
    app.quit();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
