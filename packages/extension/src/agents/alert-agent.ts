import type { UserAlert } from "../types/config";

export interface AlertEvent {
  label: string;
  rtstream_id: string;
  timestamp: number;
  data: { text: string };
}

export class AlertAgent {
  private userAlerts: UserAlert[] = [];
  private firedAlerts: Map<string, number> = new Map();
  private readonly ALERT_DEDUP_MS = 60_000;

  setAlerts(alerts: UserAlert[]): void {
    this.userAlerts = alerts.filter(a => a.enabled);
  }

  async handleAlert(event: AlertEvent): Promise<void> {
    const dedupKey = `${event.label}:${Math.floor(event.timestamp / 60)}`;
    if (this.firedAlerts.has(dedupKey)) return;
    this.firedAlerts.set(dedupKey, Date.now());

    for (const [k, t] of this.firedAlerts)
      if (Date.now() - t > this.ALERT_DEDUP_MS * 2) this.firedAlerts.delete(k);

    if (event.label === "data_trigger") return;

    const text = event.data.text;
    for (const userAlert of this.userAlerts) {
      if (!this.matchesKeyword(text, userAlert.keyword)) continue;

      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon48.png",
        title: `DataLens: ${userAlert.description}`,
        message: text.slice(0, 100),
      });

      chrome.action.setBadgeText({ text: "!" });
      chrome.action.setBadgeBackgroundColor({ color: "#E50000" });

      chrome.runtime.sendMessage({
        type: "ALERT_FIRED",
        payload: {
          alertId: userAlert.id,
          description: userAlert.description,
          timestamp: event.timestamp,
          excerpt: text,
        },
      }).catch(() => {});
    }
  }

  private matchesKeyword(text: string, keyword: string): boolean {
    const haystack = text.toLowerCase();
    return keyword.toLowerCase().split(/\s+/).every(word => haystack.includes(word));
  }
}
