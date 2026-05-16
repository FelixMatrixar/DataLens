import { CaptureAgent } from "./agents/capture-agent";
import { AgentBus }     from "./agents/bus";
import { getConfig }    from "./lib/storage";

const bus = new AgentBus();
const captureAgent = new CaptureAgent();

chrome.runtime.onMessageExternal.addListener(async (msg, _sender, sendResponse) => {
  if (msg.type === "SAVE_CONFIG") {
    await chrome.storage.sync.set({ userConfig: msg.payload });
    sendResponse({ ok: true });
  }
});

chrome.runtime.onMessage.addListener(async (msg, _sender, sendResponse) => {

  if (msg.type === "START_SESSION") {
    const config = await getConfig();
    if (!config) {
      chrome.runtime.sendMessage({ type: "SESSION_ERROR", error: "No API keys configured" });
      return;
    }

    try {
      await captureAgent.start(config, bus);
      bus.summary.start();

      const state = captureAgent.getState()!;
      (globalThis as any).__captureState = state;
      (globalThis as any).__overlayCount = 0;

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) bus.setActiveTab(tab.id);

      chrome.action.setBadgeText({ text: "●" });
      chrome.action.setBadgeBackgroundColor({ color: "#E50000" });

      chrome.runtime.sendMessage({ type: "SESSION_STARTED" });

    } catch (err) {
      chrome.runtime.sendMessage({ type: "SESSION_ERROR", error: String(err) });
    }
  }

  if (msg.type === "STOP_SESSION") {
    const captureState = await captureAgent.stop();
    const finalSummary = bus.summary.stop();

    chrome.action.setBadgeText({ text: "" });
    (globalThis as any).__captureState = null;

    if (captureState) {
      bus.memory.finalize(captureState, finalSummary).catch(console.error);
    }

    chrome.runtime.sendMessage({
      type: "SESSION_STOPPED",
      finalSummary,
      overlayCount: (globalThis as any).__overlayCount ?? 0,
    });
  }

  if (msg.type === "SAVE_CONFIG") {
    await chrome.storage.sync.set({ userConfig: msg.payload });
    sendResponse({ ok: true });
  }

  if (msg.type === "OVERLAY_RENDERED") {
    (globalThis as any).__overlayCount = ((globalThis as any).__overlayCount ?? 0) + 1;
  }
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  bus.setActiveTab(tabId);
});
