import { ipcMain } from "electron";
import type { BrowserWindow } from "electron";

export function registerOverlayHandlers(overlayWindow: BrowserWindow): void {
  // Renderer signals mouse is over an active card → make overlay interactive
  ipcMain.on("overlay:ignore-mouse", (_event, ignore: boolean) => {
    if (!overlayWindow.isDestroyed()) {
      overlayWindow.setIgnoreMouseEvents(ignore, { forward: true });
    }
  });
}
