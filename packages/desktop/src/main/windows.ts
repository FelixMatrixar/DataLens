import { BrowserWindow, screen } from "electron";
import { join } from "path";

const devRendererUrl = process.env["ELECTRON_RENDERER_URL"];

export const PILL_W = 244;
export const PILL_H = 48;

export function createControlWindow(): BrowserWindow {
  const { height: screenH } = screen.getPrimaryDisplay().workAreaSize;

  const win = new BrowserWindow({
    width: PILL_W,
    height: PILL_H,
    x: 24,
    y: screenH - PILL_H - 24,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: false,
    hasShadow: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (devRendererUrl) {
    win.loadURL(devRendererUrl);
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return win;
}

export function createOverlayWindow(): BrowserWindow {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const win = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    hasShadow: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setIgnoreMouseEvents(true, { forward: true });

  if (devRendererUrl) {
    win.loadURL(`${devRendererUrl}?window=overlay`);
  } else {
    win.loadFile(join(__dirname, "../renderer/index.html"), { query: { window: "overlay" } });
  }

  return win;
}
