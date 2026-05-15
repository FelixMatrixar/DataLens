import { callOpenRouter } from "../lib/openrouter";
import { getConfig } from "../lib/storage";
import type { SummaryUpdate } from "../types/agents";

interface TranscriptEntry {
  text: string;
  timestamp: number;
}

const SUMMARY_SYSTEM_PROMPT = `
You are a live meeting analyst. You receive a rolling transcript from a live session.
Your job: produce a structured JSON summary of what has been discussed.

Return ONLY raw JSON, no markdown:
{
  "keyPoints": ["<3-5 concise bullet points — most important takeaways>"],
  "currentTopic": "<one sentence: what is being discussed right now>",
  "dataPoints": ["<every concrete number, metric, or percentage mentioned, with context>"]
}
`.trim();

export class SummaryAgent {
  private buffer: TranscriptEntry[] = [];
  private readonly WINDOW_MS = 5 * 60 * 1_000;
  private readonly UPDATE_INTERVAL_MS = 60_000;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastSummary: SummaryUpdate | null = null;

  start(): void {
    this.intervalId = setInterval(
      () => this.generateSummary(),
      this.UPDATE_INTERVAL_MS
    );
  }

  stop(): SummaryUpdate | null {
    if (this.intervalId) clearInterval(this.intervalId);
    return this.lastSummary;
  }

  addTranscript(text: string, timestamp: number): void {
    this.buffer.push({ text, timestamp });
    const cutoff = Date.now() - this.WINDOW_MS;
    this.buffer = this.buffer.filter(e => e.timestamp * 1000 > cutoff);
  }

  private async generateSummary(): Promise<void> {
    if (this.buffer.length === 0) return;
    const config = await getConfig();
    if (!config) return;

    const transcriptText = this.buffer.map(e => e.text).join(" ");

    try {
      const raw = await callOpenRouter({
        apiKey: config.openrouterApiKey,
        model: "google/gemini-flash-1.5",
        fallbackModels: ["google/gemini-2.5-flash-lite"],
        systemPrompt: SUMMARY_SYSTEM_PROMPT,
        userMessage: `Transcript (last 5 minutes):\n"${transcriptText}"`,
        maxTokens: 400,
        temperature: 0.2,
        jsonMode: true,
      });

      if (!raw) return;
      const parsed = JSON.parse(raw);
      this.lastSummary = { ...parsed, updatedAt: Date.now() };

      chrome.runtime.sendMessage({
        type: "SUMMARY_UPDATE",
        payload: this.lastSummary,
      }).catch(() => { /* popup may be closed */ });

    } catch { /* non-critical */ }
  }

  async generateFinalSummary(): Promise<SummaryUpdate | null> {
    const config = await getConfig();
    if (!config || this.buffer.length === 0) return null;

    const FINAL_PROMPT = `
You are a post-session analyst. Produce a complete structured summary of the full session.
Return ONLY raw JSON:
{
  "keyPoints": ["<5-8 most important takeaways>"],
  "currentTopic": "<one-sentence overall session description>",
  "dataPoints": ["<every data point with full context>"],
  "actionItems": ["<any stated next steps, decisions, or commitments>"]
}`.trim();

    const fullTranscript = this.buffer.map(e => e.text).join(" ");
    const raw = await callOpenRouter({
      apiKey: config.openrouterApiKey,
      model: "google/gemini-flash-1.5",
      systemPrompt: FINAL_PROMPT,
      userMessage: `Full session transcript:\n"${fullTranscript}"`,
      maxTokens: 800,
      temperature: 0.2,
      jsonMode: true,
    });

    if (!raw) return null;
    return { ...JSON.parse(raw), updatedAt: Date.now() };
  }
}
