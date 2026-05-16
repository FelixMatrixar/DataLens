import { videodbPost, stopSandbox } from "../lib/videodb";
import { getConfig } from "../lib/storage";
import type { CaptureState } from "./capture-agent";
import type { SummaryUpdate } from "../types/agents";

export class MemoryAgent {
  async finalize(
    captureState: CaptureState,
    finalSummary: SummaryUpdate | null
  ): Promise<void> {
    const config = await getConfig();
    if (!config) return;

    chrome.runtime.sendMessage({ type: "MEMORY_STATUS", status: "exporting" })
      .catch(() => {});

    try {
      // 1. Export RTStream as permanent Video asset
      const exportRes = await videodbPost(
        `/rtstream/${captureState.rtstreamId}/export/`,
        config.videodbApiKey,
        {}
      );
      const videoId: string = exportRes.data.video_id;

      chrome.runtime.sendMessage({ type: "MEMORY_STATUS", status: "indexing" })
        .catch(() => {});

      // 2. Index spoken words for transcript search
      await videodbPost(
        `/video/${videoId}/index/spoken_words/`,
        config.videodbApiKey,
        { language_code: "en" }
      );

      // 3. Index scenes using sandbox-backed GEMMA_4_31B for high-quality visual understanding
      await videodbPost(
        `/video/${videoId}/index/scene/`,
        config.videodbApiKey,
        {
          extraction_type: "time_based",
          extraction_config: { time: 10, select_frames: ["first"], frame_count: 1 },
          model_name: "gemma-4-31b",
          sandbox_id: captureState.sandboxId,
          prompt: "Describe what is visible on screen including any text, charts, slides, or data.",
        }
      );

      // 4. Save session record to Supabase via Vercel
      await fetch(`${config.frontendUrl}/api/session/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          captureSessionId: captureState.sessionId,
          rtstreamId: captureState.rtstreamId,
          videoId,
          summary: finalSummary,
          endedAt: new Date().toISOString(),
        }),
      });

      // 5. Stop sandbox to conserve credits
      await stopSandbox(config.videodbApiKey, captureState.sandboxId).catch(console.warn);

      chrome.runtime.sendMessage({ type: "MEMORY_STATUS", status: "ready", videoId })
        .catch(() => {});

    } catch (err) {
      // Still try to stop the sandbox on error
      stopSandbox(config.videodbApiKey, captureState.sandboxId).catch(console.warn);

      chrome.runtime.sendMessage({
        type: "MEMORY_STATUS",
        status: "error",
        error: String(err),
      }).catch(() => {});
    }
  }
}
