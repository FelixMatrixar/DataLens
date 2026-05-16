import { Notification } from "electron";
import type { AlertFired } from "../../types";

interface UserAlert { id: string; keyword: string; description: string; enabled: boolean; }

export class AlertAgent {
  private alerts: UserAlert[] = [];
  private fired = new Map<string, number>();
  private onAlert: ((a: AlertFired) => void) | null = null;

  setAlerts(alerts: UserAlert[], onAlert: (a: AlertFired) => void): void {
    this.alerts = alerts.filter(a => a.enabled);
    this.onAlert = onAlert;
  }

  handle(text: string, timestamp: number): void {
    for (const alert of this.alerts) {
      if (!this.matches(text, alert.keyword)) continue;
      const key = `${alert.id}:${Math.floor(timestamp / 60)}`;
      if (this.fired.has(key)) continue;
      this.fired.set(key, Date.now());

      new Notification({
        title: `DataLens: ${alert.description}`,
        body: text.slice(0, 100),
      }).show();

      this.onAlert?.({
        alertId: alert.id,
        description: alert.description,
        timestamp,
        excerpt: text.slice(0, 200),
      });
    }
    for (const [k, t] of this.fired)
      if (Date.now() - t > 120_000) this.fired.delete(k);
  }

  private matches(text: string, keyword: string): boolean {
    const haystack = text.toLowerCase();
    return keyword.toLowerCase().split(/\s+/).every(w => haystack.includes(w));
  }
}
