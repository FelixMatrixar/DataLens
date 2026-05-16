export interface UserConfig {
  videodbApiKey: string;
  openrouterApiKey: string;
  videodbCollectionId: string;
  frontendUrl: string;
  userId: string;
}

export interface UVS {
  type: string;
  title: string;
  labels?: string[];
  data?: number[];
  series?: Array<{ name: string; values: number[]; color?: string }>;
  unit?: string;
  delta?: number;
  delta_label?: string;
  quote?: string;
  subtitle?: string;
  source?: string;
  theme?: string;
  duration_seconds?: number;
  show_values?: boolean;
  current?: number;
  goal?: number;
  target?: number;
}

export interface VideoDBEvent {
  channel: "transcript" | "scene_index" | "audio_index" | "alert" | "capture_session" | string;
  data: {
    text?: string;
    status?: string;
    [key: string]: unknown;
  };
  text?: string;
  rtstream_name?: string;
}

export interface SessionStatus {
  state: "idle" | "starting" | "active" | "stopping" | "stopped";
  sessionId?: string;
  error?: string;
}

export interface SummaryUpdate {
  keyPoints: string[];
  currentTopic: string;
  dataPoints: string[];
  updatedAt: number;
  actionItems?: string[];
}

export interface AlertFired {
  alertId: string;
  description: string;
  timestamp: number;
  excerpt: string;
}

export interface OverlayPayload {
  spec: UVS;
}
