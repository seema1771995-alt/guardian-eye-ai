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
}

// Simulated camera locations
const CAMERAS = [
  { id: "CAM-01", name: "Platform A - East", location: "Metro Station Gate 3" },
  { id: "CAM-02", name: "Platform B - West", location: "Metro Station Gate 7" },
  { id: "CAM-03", name: "Main Concourse", location: "Central Hall" },
  { id: "CAM-04", name: "Exit Corridor", location: "South Wing Passage" },
  { id: "CAM-05", name: "Parking Level B1", location: "Underground Parking" },
  { id: "CAM-06", name: "Bus Stop 14", location: "Transit Hub North" },
  { id: "CAM-07", name: "Pedestrian Overpass", location: "Bridge Crossing" },
  { id: "CAM-08", name: "Ticket Counter", location: "Main Lobby" },
];

const SAFE_DESCRIPTIONS = [
  "Normal pedestrian traffic",
  "Passengers boarding vehicle",
  "Group standing in queue",
  "Individuals walking through area",
  "Maintenance personnel on site",
  "Area clear — no activity",
  "Standard foot traffic observed",
];

const ALERT_SCENARIOS: Array<{
  description: string;
  alertType: string;
  riskLevel: RiskLevel;
  personsDetected: number;
}> = [
  {
    description: "AGGRESSIVE PHYSICAL CONTACT DETECTED — Person A grabbing Person B",
    alertType: "PHYSICAL HARASSMENT",
    riskLevel: "HIGH",
    personsDetected: 2,
  },
  {
    description: "AGGRESSIVE BEHAVIOR — Pushing detected between individuals",
    alertType: "AGGRESSIVE BEHAVIOR",
    riskLevel: "HIGH",
    personsDetected: 3,
  },
  {
    description: "SUSTAINED CLOSE FOLLOWING — Pattern consistent with stalking behavior",
    alertType: "STALKING BEHAVIOR",
    riskLevel: "MEDIUM",
    personsDetected: 2,
  },
  {
    description: "PHYSICAL ALTERCATION — Fighting detected between multiple individuals",
    alertType: "FIGHTING",
    riskLevel: "HIGH",
    personsDetected: 4,
  },
  {
    description: "UNUSUAL CLOSE CONTACT — Unwanted proximity detected",
    alertType: "CLOSE CONTACT",
    riskLevel: "MEDIUM",
    personsDetected: 2,
  },
];

let eventCounter = 100;

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateSafeEvent(): CameraEvent {
  const camera = randomElement(CAMERAS);
  eventCounter++;
  return {
    id: `EVT-${eventCounter}`,
    cameraId: camera.id,
    cameraName: camera.name,
    location: camera.location,
    timestamp: new Date(),
    status: "safe",
    description: randomElement(SAFE_DESCRIPTIONS),
    personsDetected: Math.floor(Math.random() * 8) + 1,
  };
}

export function generateAlertEvent(): CameraEvent {
  const camera = randomElement(CAMERAS);
  const scenario = randomElement(ALERT_SCENARIOS);
  eventCounter++;
  const now = new Date();
  return {
    id: `EVT-${eventCounter}`,
    cameraId: camera.id,
    cameraName: camera.name,
    location: camera.location,
    timestamp: now,
    status: "alert",
    description: scenario.description,
    riskLevel: scenario.riskLevel,
    personsDetected: scenario.personsDetected,
    alertType: scenario.alertType,
    incidentTimestamp: new Date(now.getTime() - 5000),
  };
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
