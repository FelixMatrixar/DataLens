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
