import type { SummaryUpdate } from "../types/agents";

interface AudioIndexEntry {
  description: string;
  timestamp: number;
}

const DATA_PATTERN = /\b\d[\d,.]*\s*(%|percent|million|billion|trillion|thousand|k|x|bps|ms|fps|px|gb|mb|tb)?\b/gi;

export class SummaryAgent {
  private audioBuffer: AudioIndexEntry[] = [];
  private readonly WINDOW_MS = 5 * 60 * 1_000;
  private readonly UPDATE_INTERVAL_MS = 60_000;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastSummary: SummaryUpdate | null = null;

  start(): void {
    this.intervalId = setInterval(() => this.generateSummary(), this.UPDATE_INTERVAL_MS);
  }

  stop(): SummaryUpdate | null {
    if (this.intervalId) clearInterval(this.intervalId);
    return this.lastSummary;
  }

  // kept for bus.ts compatibility — audio_index events are the primary input now
  addTranscript(_text: string, _timestamp: number): void {}

  addAudioIndex(description: string, timestamp: number): void {
    this.audioBuffer.push({ description, timestamp });
    const cutoff = Date.now() / 1000 - this.WINDOW_MS / 1000;
    this.audioBuffer = this.audioBuffer.filter(e => e.timestamp > cutoff);
  }

  private generateSummary(): void {
    const recent = this.recentEntries(this.WINDOW_MS);
    if (recent.length === 0) return;
    this.lastSummary = this.buildSummary(recent, false);
    chrome.runtime.sendMessage({
      type: "SUMMARY_UPDATE",
      payload: this.lastSummary,
    }).catch(() => {});
  }

  async generateFinalSummary(): Promise<SummaryUpdate | null> {
    if (this.audioBuffer.length === 0) return null;
    return this.buildSummary(this.audioBuffer, true);
  }

  private recentEntries(windowMs: number): AudioIndexEntry[] {
    const cutoff = Date.now() / 1000 - windowMs / 1000;
    return this.audioBuffer.filter(e => e.timestamp > cutoff);
  }

  private buildSummary(entries: AudioIndexEntry[], isFinal: boolean): SummaryUpdate {
    const descriptions = entries.map(e => e.description);

    const currentTopic = descriptions[descriptions.length - 1]
      ?.split(/[.!?]/)[0]?.trim() ?? "No content yet";

    const maxPoints = isFinal ? 8 : 5;
    const keyPoints = descriptions
      .flatMap(d => d.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20))
      .filter((s, i, arr) => arr.indexOf(s) === i)
      .slice(-maxPoints);

    const dataPoints: string[] = [];
    for (const desc of descriptions) {
      const matches = desc.match(DATA_PATTERN);
      if (!matches) continue;
      for (const match of matches) {
        const idx = desc.indexOf(match);
        const context = desc.slice(Math.max(0, idx - 30), Math.min(desc.length, idx + match.length + 30)).trim();
        if (!dataPoints.includes(context)) dataPoints.push(context);
      }
    }

    const result: SummaryUpdate = {
      keyPoints: keyPoints.length > 0 ? keyPoints : [currentTopic],
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
