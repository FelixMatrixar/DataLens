import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("recorderAPI", {
  startCapture: (deviceSelection: { micId?: string; systemAudioId?: string; displayId?: string }) =>
    ipcRenderer.invoke("capture:start", deviceSelection),
  stopCapture: () =>
    ipcRenderer.invoke("capture:stop"),
  listDevices: () =>
    ipcRenderer.invoke("capture:list-devices"),
  onSessionStatus: (cb: (status: unknown) => void) =>
    ipcRenderer.on("session:status", (_e, status) => cb(status)),
  onSummaryUpdate: (cb: (summary: unknown) => void) =>
    ipcRenderer.on("summary:update", (_e, summary) => cb(summary)),
  onAlertFired: (cb: (alert: unknown) => void) =>
    ipcRenderer.on("alert:fired", (_e, alert) => cb(alert)),
  removeAllListeners: (channel: string) =>
    ipcRenderer.removeAllListeners(channel),
});

contextBridge.exposeInMainWorld("configAPI", {
  get: () => ipcRenderer.invoke("config:get"),
  save: (config: unknown) => ipcRenderer.invoke("config:save", config),
  clear: () => ipcRenderer.invoke("config:clear"),
});

contextBridge.exposeInMainWorld("authAPI", {
  signIn: () => ipcRenderer.invoke("auth:signin"),
  signOut: () => ipcRenderer.invoke("auth:signout"),
  onStatus: (cb: (status: unknown) => void) =>
    ipcRenderer.on("auth:status", (_e, status) => cb(status)),
  removeAllListeners: (channel: string) =>
    ipcRenderer.removeAllListeners(channel),
});

contextBridge.exposeInMainWorld("overlayAPI", {
  setIgnoreMouse: (ignore: boolean) =>
    ipcRenderer.send("overlay:ignore-mouse", ignore),
  onShowSpec: (cb: (payload: unknown) => void) =>
    ipcRenderer.on("overlay:show-spec", (_e, payload) => cb(payload)),
  removeAllListeners: (channel: string) =>
    ipcRenderer.removeAllListeners(channel),
});
