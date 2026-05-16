import { VizAgent } from "./viz-agent";
import { SummaryAgent } from "./summary-agent";
import { AlertAgent } from "./alert-agent";
import type { VideoDBEvent, UVS, SummaryUpdate, AlertFired, UserConfig } from "../../types";

export class AgentBus {
  readonly viz     = new VizAgent();
  readonly summary = new SummaryAgent();
  readonly alert   = new AlertAgent();

  private config: UserConfig | null = null;

  setConfig(config: UserConfig): void { this.config = config; }

  start(
    onChart: (spec: UVS) => void,
    onSummary: (s: SummaryUpdate) => void,
    onAlert: (a: AlertFired) => void
  ): void {
    this.viz.setOnChart(onChart);
    this.summary.start(onSummary);
    this.alert.setAlerts(this.config?.userAlerts ?? [], onAlert);
  }

  stop(): SummaryUpdate | null {
    return this.summary.stop();
  }

  async route(event: VideoDBEvent): Promise<void> {
    if (!event?.channel) return;

    const text = event.data?.text ?? event.text ?? "";
    const ts   = (typeof event.data?.timestamp_ms === "number" ? event.data.timestamp_ms : Date.now()) / 1000;

    switch (event.channel) {
      case "transcript":
        if (!text || !this.config) return;
        await Promise.allSettled([
          this.viz.handleTranscript(text, this.config),
          Promise.resolve(this.summary.addTranscript(text, ts)),
        ]);
        break;

      case "scene_index":
        if (!text || !this.config) return;
        await this.viz.handleScene(text, this.config);
        break;

      case "audio_index":
        if (!text) return;
        this.summary.addAudioIndex(text, ts);
        break;

      case "alert":
        this.alert.handle(text, ts);
        break;
    }
  }
}
