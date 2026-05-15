document.addEventListener("DOMContentLoaded", async () => {
  const startBtn    = document.getElementById("start-btn")! as HTMLButtonElement;
  const stopBtn     = document.getElementById("stop-btn")!  as HTMLButtonElement;
  const statusEl    = document.getElementById("status")!;
  const summaryEl   = document.getElementById("summary-keypoints")!;
  const topicEl     = document.getElementById("current-topic")!;
  const dataEl      = document.getElementById("data-points")!;
  const overlayCount = document.getElementById("overlay-count")!;
  const alertFeed   = document.getElementById("alert-feed")!;
  const memoryStatus = document.getElementById("memory-status")!;

  const { sessionActive, overlayCountVal, lastSummary } =
    await chrome.storage.session.get(["sessionActive", "overlayCountVal", "lastSummary"]);

  updateUI(!!sessionActive, lastSummary ?? null, overlayCountVal ?? 0);

  startBtn.addEventListener("click", async () => {
    startBtn.disabled = true;
    statusEl.textContent = "Starting...";
    chrome.runtime.sendMessage({ type: "START_SESSION" });
  });

  stopBtn.addEventListener("click", () => {
    stopBtn.disabled = true;
    statusEl.textContent = "Stopping...";
    chrome.runtime.sendMessage({ type: "STOP_SESSION" });
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "SESSION_STARTED") {
      chrome.storage.session.set({ sessionActive: true });
      updateUI(true, null, 0);
    }
    if (msg.type === "SESSION_STOPPED") {
      chrome.storage.session.set({ sessionActive: false });
      updateUI(false, msg.finalSummary, msg.overlayCount);
    }
    if (msg.type === "SUMMARY_UPDATE") {
      chrome.storage.session.set({ lastSummary: msg.payload });
      renderSummary(msg.payload, summaryEl, topicEl, dataEl);
    }
    if (msg.type === "OVERLAY_RENDERED") {
      const count = parseInt(overlayCount.textContent ?? "0") + 1;
      overlayCount.textContent = String(count);
      chrome.storage.session.set({ overlayCountVal: count });
    }
    if (msg.type === "ALERT_FIRED") {
      renderAlert(msg.payload, alertFeed);
    }
    if (msg.type === "MEMORY_STATUS") {
      memoryStatus.textContent = ({
        exporting: "⏳ Exporting session...",
        indexing:  "⏳ Indexing for search...",
        ready:     "✅ Session ready to search",
        error:     "❌ Export failed",
      } as Record<string, string>)[msg.status] ?? "";
    }
    if (msg.type === "SESSION_ERROR") {
      statusEl.textContent = `Error: ${msg.error}`;
      startBtn.disabled = false;
      startBtn.style.display = "block";
      stopBtn.style.display = "none";
    }
  });
});

function updateUI(active: boolean, summary: any, count: number) {
  const startBtn = document.getElementById("start-btn")! as HTMLButtonElement;
  const stopBtn  = document.getElementById("stop-btn")!  as HTMLButtonElement;
  const statusEl = document.getElementById("status")!;

  startBtn.style.display = active ? "none" : "block";
  stopBtn.style.display  = active ? "block" : "none";
  startBtn.disabled = false;
  stopBtn.disabled = false;

  statusEl.textContent = active ? "● Recording" : "Ready";
  statusEl.className = active ? "status recording" : "status";

  document.getElementById("overlay-count")!.textContent = String(count);

  if (summary) {
    renderSummary(
      summary,
      document.getElementById("summary-keypoints")!,
      document.getElementById("current-topic")!,
      document.getElementById("data-points")!
    );
  }
}

function renderSummary(s: any, keyEl: Element, topicEl: Element, dataEl: Element) {
  topicEl.textContent = s.currentTopic ?? "—";
  keyEl.innerHTML = (s.keyPoints ?? [])
    .map((p: string) => `<li>${p}</li>`)
    .join("");
  dataEl.innerHTML = (s.dataPoints ?? [])
    .map((p: string) => `<li>${p}</li>`)
    .join("");
}

function renderAlert(alert: any, feed: Element) {
  const item = document.createElement("div");
  item.className = "alert-item";
  const time = new Date(alert.timestamp * 1000).toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit",
  });
  item.textContent = `[${time}] ${alert.description}`;
  feed.insertBefore(item, feed.firstChild);
}
