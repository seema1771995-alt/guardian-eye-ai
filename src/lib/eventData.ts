export type EventStatus = "safe" | "alert";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface CameraEvent {
  id: string;
  cameraId: string;
  cameraName: string;
  location: string;
  timestamp: Date;
  status: EventStatus;
  description: string;
  riskLevel?: RiskLevel;
  personsDetected?: number;
  alertType?: string;
  incidentTimestamp?: Date;
  frameImageUrl?: string;
  confidence?: number;
  interactionContext?: string;
}

export function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
