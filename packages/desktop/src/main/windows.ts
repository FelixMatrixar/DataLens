import { BrowserWindow, screen } from "electron";
import { join } from "path";

const devRendererUrl = process.env["ELECTRON_RENDERER_URL"];

export function createControlWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 420,
    height: 640,
    minWidth: 360,
    minHeight: 500,
    title: "DataLens",
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
