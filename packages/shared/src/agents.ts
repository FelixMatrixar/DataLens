export interface SummaryUpdate {
  keyPoints: string[];
  currentTopic: string;
  dataPoints: string[];
  actionItems?: string[];
  updatedAt: number;
}

export interface AlertPayload {
  alertId: string;
  description: string;
  timestamp: number;
  excerpt: string;
}

export type AgentMessage =
  | { type: "START_SESSION" }
  | { type: "STOP_SESSION" }
  | { type: "SESSION_STARTED" }
  | { type: "SESSION_STOPPED"; finalSummary: SummaryUpdate | null; overlayCount: number }
  | { type: "SESSION_ERROR"; error: string }
  | { type: "SUMMARY_UPDATE"; payload: SummaryUpdate }
  | { type: "OVERLAY_RENDERED"; chartUrl: string; title: string }
  | { type: "ALERT_FIRED"; payload: AlertPayload }
  | { type: "MEMORY_STATUS"; status: "exporting" | "indexing" | "ready" | "error"; videoId?: string; error?: string }
  | { type: "SAVE_CONFIG"; payload: any }
  | { type: "TAB_ACTIVATED"; tabId: number }
  | { type: "SHOW_CHART"; chartUrl: string; title: string; duration: number }
  | { type: "HIDE_CHARTS" };
