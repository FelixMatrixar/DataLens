import { videodbPost } from "../lib/videodb";
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
      const exportRes = await videodbPost(
        `/rtstream/${captureState.rtstreamId}/export/`,
        config.videodbApiKey,
        {}
      );
      const videoId: string = exportRes.data.video_id;

      chrome.runtime.sendMessage({ type: "MEMORY_STATUS", status: "indexing" })
        .catch(() => {});

      await videodbPost(
        `/video/${videoId}/index/spoken_words/`,
        config.videodbApiKey,
        { language_code: "en" }
      );

      await videodbPost(
        `/video/${videoId}/index/scene/`,
        config.videodbApiKey,
        {
          extraction_type: "shot",
          extraction_config: { threshold: 0.5 },
          prompt: "Describe what is visible on screen including any text, charts, slides, or data",
        }
      );

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

      chrome.runtime.sendMessage({ type: "MEMORY_STATUS", status: "ready", videoId })
        .catch(() => {});

    } catch (err) {
      chrome.runtime.sendMessage({
        type: "MEMORY_STATUS",
        status: "error",
        error: String(err),
      }).catch(() => {});
    }
  }
}
