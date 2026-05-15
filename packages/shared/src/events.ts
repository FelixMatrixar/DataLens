export type VideoDBChannel = "transcript" | "scene_index" | "audio_index" | "alert";

export interface VideoDBEvent {
  channel: VideoDBChannel;
  data: {
    text?: string;
    timestamp_ms?: number;
    description?: string;
    label?: string;
    rtstream_id?: string;
    [key: string]: any;
  };
}
