import { VizAgent }     from "./viz-agent";
import { SummaryAgent } from "./summary-agent";
import { MemoryAgent }  from "./memory-agent";
import { AlertAgent }   from "./alert-agent";

export interface VideoDBEvent {
  channel: "transcript" | "scene_index" | "audio_index" | "alert";
  data: {
    text?: string;
    timestamp_ms?: number;
    description?: string;
    label?: string;
    rtstream_id?: string;
    [key: string]: any;
  };
}

export class AgentBus {
  readonly viz     = new VizAgent();
  readonly summary = new SummaryAgent();
  readonly memory  = new MemoryAgent();
  readonly alert   = new AlertAgent();

  private activeTabId: number | null = null;

  setActiveTab(tabId: number): void { this.activeTabId = tabId; }

  async route(event: VideoDBEvent): Promise<void> {
    const ts = (event.data.timestamp_ms ?? 0) / 1000;
    const tabId = this.activeTabId ?? 0;

    switch (event.channel) {
      case "transcript":
        if (!event.data.text) return;
        await Promise.allSettled([
          this.viz.handleTranscript(event.data.text, ts, tabId),
          Promise.resolve(this.summary.addTranscript(event.data.text, ts)),
        ]);
        break;

      case "scene_index":
        if (!event.data.description) return;
        await this.viz.handleScene(event.data.description, ts, tabId);
        break;

      case "alert":
        await this.alert.handleAlert(event.data as any);
        break;
    }
  }
}
