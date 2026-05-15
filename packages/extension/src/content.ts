let container = document.getElementById("datalens-overlay");
if (!container) {
  container = document.createElement("div");
  container.id = "datalens-overlay";
  container.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    pointer-events: none;
    display: flex;
    flex-direction: column-reverse;
    gap: 10px;
    max-width: 320px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  `;
  document.body.appendChild(container);
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "SHOW_CHART")  showChart(msg);
  if (msg.type === "HIDE_CHARTS") clearCharts();
});

function showChart(msg: { chartUrl: string; title: string; duration: number }): void {
  const card = document.createElement("div");
  card.style.cssText = `
    background: rgba(11,11,11,0.95);
    border: 1px solid rgba(229,0,0,0.4);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0,0,0,0.6);
    animation: datalens-slide-in 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards;
    pointer-events: auto;
  `;

  const titleEl = document.createElement("div");
  titleEl.style.cssText = `
    padding: 8px 12px 4px;
    font-size: 11px;
    font-weight: 600;
    color: #A0A0A0;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  `;
  titleEl.textContent = msg.title;

  const img = document.createElement("img");
  img.src = msg.chartUrl;
  img.style.cssText = `
    display: block;
    width: 100%;
    max-width: 300px;
    height: auto;
    padding: 0 8px 8px;
  `;

  card.addEventListener("click", () => dismissCard(card));
  card.appendChild(titleEl);
  card.appendChild(img);
  container!.appendChild(card);

  setTimeout(() => dismissCard(card), msg.duration * 1000);
}

function dismissCard(card: HTMLElement): void {
  card.style.animation = "datalens-slide-out 0.25s ease-in forwards";
  setTimeout(() => card.remove(), 250);
}

function clearCharts(): void {
  container!.innerHTML = "";
}

if (!document.getElementById("datalens-styles")) {
  const style = document.createElement("style");
  style.id = "datalens-styles";
  style.textContent = `
    @keyframes datalens-slide-in {
      from { opacity: 0; transform: translateY(16px) scale(0.96); }
      to   { opacity: 1; transform: translateY(0)   scale(1); }
    }
    @keyframes datalens-slide-out {
      from { opacity: 1; transform: translateY(0)   scale(1); }
      to   { opacity: 0; transform: translateY(8px)  scale(0.97); }
    }
  `;
  document.head.appendChild(style);
}
