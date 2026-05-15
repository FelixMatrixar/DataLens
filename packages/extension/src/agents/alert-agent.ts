import { callOpenRouter } from "../lib/openrouter";
import { getConfig } from "../lib/storage";
import type { UserAlert } from "../types/config";

export interface AlertEvent {
  label: string;
  rtstream_id: string;
  timestamp: number;
  data: { text: string };
}

const ALERT_CLASSIFIER_PROMPT = `
You are a real-time content monitor. Given a scene description or transcript segment,
determine if it matches the user's alert condition.

Return ONLY raw JSON: { "matches": true|false, "reason": "<one sentence>" }
`.trim();

export class AlertAgent {
  private userAlerts: UserAlert[] = [];
  private firedAlerts: Map<string, number> = new Map();
  private readonly ALERT_DEDUP_MS = 60_000;

  setAlerts(alerts: UserAlert[]): void {
    this.userAlerts = alerts.filter(a => a.enabled);
  }

  async handleAlert(event: AlertEvent): Promise<void> {
    const config = await getConfig();
    if (!config) return;

    const dedupKey = `${event.label}:${Math.floor(event.timestamp / 60)}`;
    if (this.firedAlerts.has(dedupKey)) return;
    this.firedAlerts.set(dedupKey, Date.now());

    for (const [k, t] of this.firedAlerts)
      if (Date.now() - t > this.ALERT_DEDUP_MS * 2) this.firedAlerts.delete(k);

    if (event.label === "data_trigger") return;

    for (const userAlert of this.userAlerts) {
      const matched = await this.classifyAlert(
        event.data.text,
        userAlert,
        config.openrouterApiKey
      );

      if (matched) {
        chrome.notifications.create({
          type: "basic",
          iconUrl: "icons/icon48.png",
          title: `DataLens: ${userAlert.description}`,
          message: event.data.text.slice(0, 100),
        });

        chrome.action.setBadgeText({ text: "!" });
        chrome.action.setBadgeBackgroundColor({ color: "#E50000" });

        chrome.runtime.sendMessage({
          type: "ALERT_FIRED",
          payload: {
            alertId: userAlert.id,
            description: userAlert.description,
            timestamp: event.timestamp,
            excerpt: event.data.text,
          },
        }).catch(() => {});
      }
    }
  }

  private async classifyAlert(
    text: string,
    alert: UserAlert,
    apiKey: string
  ): Promise<boolean> {
    try {
      const raw = await callOpenRouter({
        apiKey,
        model: "google/gemini-flash-1.5",
        systemPrompt: ALERT_CLASSIFIER_PROMPT,
        userMessage: `Alert condition: "${alert.keyword}"\nContent: "${text}"`,
        maxTokens: 100,
        temperature: 0,
        jsonMode: true,
      });
      if (!raw) return false;
      return JSON.parse(raw).matches === true;
    } catch { return false; }
  }
}
