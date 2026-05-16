import { VizAgent } from "./viz-agent";
import { SummaryAgent } from "./summary-agent";
import { AlertAgent } from "./alert-agent";
import type { VideoDBEvent, UVS, SummaryUpdate, AlertFired, UserConfig } from "../../types";

export class AgentBus {
  readonly viz     = new VizAgent();
  readonly summary = new SummaryAgent();
  readonly alert   = new AlertAgent();

  private config: UserConfig | null = null;
  private consolidateTimer: ReturnType<typeof setInterval> | null = null;

  setConfig(config: UserConfig): void { this.config = config; }

  start(
    onChart: (spec: UVS) => void,
    onSummary: (s: SummaryUpdate) => void,
    onAlert: (a: AlertFired) => void
  ): void {
    this.viz.setOnChart(onChart);
    this.summary.start(onSummary);
    this.alert.setAlerts(this.config?.userAlerts ?? [], onAlert);

    // Every 60s, try to upgrade accumulated charts into richer combined views
    this.consolidateTimer = setInterval(() => {
      if (this.config) this.viz.consolidate(this.config.openrouterApiKey);
    }, 60_000);
  }

  stop(): SummaryUpdate | null {
    if (this.consolidateTimer) { clearInterval(this.consolidateTimer); this.consolidateTimer = null; }
    this.viz.clearContext();
    return this.summary.stop();
  }

  async route(event: VideoDBEvent): Promise<void> {
    if (!event?.channel) return;

    const text = event.data?.text ?? event.text ?? "";
    const ts   = (typeof event.data?.timestamp_ms === "number" ? event.data.timestamp_ms : Date.now()) / 1000;

    switch (event.channel) {
      case "transcript": {
        if (!text || !this.config) return;
        const isFinal = event.data?.is_final !== false; // treat missing as final
        await Promise.allSettled([
          isFinal ? this.viz.handleTranscript(text, this.config) : Promise.resolve(),
          Promise.resolve(this.summary.addTranscript(text, ts)),
        ]);
        break;
      }

      case "scene_index":
        if (!text || !this.config) return;
        await this.viz.handleScene(text, this.config, event.data?.index_id as string | undefined);
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
