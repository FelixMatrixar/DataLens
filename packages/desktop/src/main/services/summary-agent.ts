import type { SummaryUpdate } from "../../types";

interface Entry { description: string; timestamp: number; }
const DATA_PATTERN = /\b\d[\d,.]*\s*(%|percent|million|billion|trillion|thousand|k|x|bps|ms|fps|gb|mb|tb)?\b/gi;

export class SummaryAgent {
  private buffer: Entry[] = [];
  private readonly WINDOW_MS = 5 * 60_000;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastSummary: SummaryUpdate | null = null;
  private onUpdate: ((s: SummaryUpdate) => void) | null = null;

  start(onUpdate: (s: SummaryUpdate) => void): void {
    this.onUpdate = onUpdate;
    this.intervalId = setInterval(() => this.emit(), 60_000);
  }

  stop(): SummaryUpdate | null {
    if (this.intervalId) clearInterval(this.intervalId);
    return this.lastSummary;
  }

  addTranscript(_text: string, _ts: number): void {}

  addAudioIndex(description: string, timestamp: number): void {
    this.buffer.push({ description, timestamp });
    const cutoff = Date.now() / 1000 - this.WINDOW_MS / 1000;
    this.buffer = this.buffer.filter(e => e.timestamp > cutoff);
  }

  private emit(): void {
    if (this.buffer.length === 0) return;
    this.lastSummary = this.build(this.buffer, false);
    this.onUpdate?.(this.lastSummary);
  }

  private build(entries: Entry[], isFinal: boolean): SummaryUpdate {
    const descriptions = entries.map(e => e.description);
    const currentTopic = descriptions.at(-1)?.split(/[.!?]/)[0]?.trim() ?? "";
    const keyPoints = descriptions
      .flatMap(d => d.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20))
      .filter((s, i, a) => a.indexOf(s) === i)
      .slice(-(isFinal ? 8 : 5));
    const dataPoints: string[] = [];
    for (const desc of descriptions) {
      for (const match of desc.match(DATA_PATTERN) ?? []) {
        const idx = desc.indexOf(match);
        const ctx = desc.slice(Math.max(0, idx - 30), idx + match.length + 30).trim();
        if (!dataPoints.includes(ctx)) dataPoints.push(ctx);
      }
    }
    const result: SummaryUpdate = {
      keyPoints: keyPoints.length ? keyPoints : [currentTopic],
      currentTopic,
      dataPoints,
      updatedAt: Date.now(),
    };
    if (isFinal) {
      result.actionItems = descriptions
        .flatMap(d => d.split(/[.!?]+/).map(s => s.trim()))
        .filter(s => /\b(will|should|need to|next step|action|follow.?up|decide|commit)\b/i.test(s) && s.length > 15)
        .slice(0, 5);
    }
    return result;
  }
}
