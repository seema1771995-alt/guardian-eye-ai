import { useState, useCallback } from "react";
import { CameraEvent } from "@/lib/eventData";
import FocusPane from "@/components/FocusPane";
import EventLog from "@/components/EventLog";
import VideoUploadPanel from "@/components/VideoUploadPanel";
import HistoryPanel from "@/components/HistoryPanel";
import { toast } from "sonner";

type RightPanel = "video" | "log" | "history";

const Dashboard = () => {
  const [events, setEvents] = useState<CameraEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CameraEvent | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [rightPanel, setRightPanel] = useState<RightPanel>("video");

  const triggerAlert = useCallback((alertEvent: CameraEvent) => {
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);
    setSelectedEvent(alertEvent);

    // Notification toast
    toast.error(`⚠ ALERT: ${alertEvent.alertType}`, {
      description: `${alertEvent.cameraId} — ${alertEvent.location}\n${alertEvent.description}`,
      duration: 8000,
    });

    // Browser notification
    if (Notification.permission === "granted") {
      new Notification("⚠ HARASSMENT ALERT", {
        body: `${alertEvent.alertType} detected at ${alertEvent.location}`,
        icon: "/favicon.ico",
      });
    }
  }, []);

  const addEvent = useCallback((event: CameraEvent) => {
    setEvents((prev) => [event, ...prev].slice(0, 200));
  }, []);

  const handleSelectEvent = (event: CameraEvent) => {
    if (event.status === "alert") {
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 200);
    }
    setSelectedEvent(event);
  };

  const handleVideoAlert = (event: CameraEvent) => {
    addEvent(event);
    triggerAlert(event);
    // Auto-switch to event log when alerts come in
    if (rightPanel === "video") {
      // Stay on video panel
    }
  };

  const handleVideoEvent = (event: CameraEvent) => {
    addEvent(event);
  };

  const handleAnalysisComplete = () => {
    // Switch to log view after analysis completes if there are events
    if (events.length > 0) {
      setRightPanel("log");
    }
  };

  // Request notification permission on mount
  useState(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  });

  const hasEvents = events.length > 0;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      {/* Top bar with panel toggle */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-text-dim" />
          <span className="font-mono text-xs font-semibold text-text-primary tracking-widest">
            VIGILANCE
          </span>
          <span className="font-mono text-[10px] text-text-dim ml-2">
            AI HARASSMENT DETECTION SYSTEM
          </span>
        </div>
        <div className="flex items-center gap-1 bg-secondary rounded-sm p-0.5">
          <button
            onClick={() => setRightPanel("video")}
            className={`font-mono text-[10px] px-3 py-1 rounded-sm transition-colors ${
              rightPanel === "video"
                ? "bg-surface-elevated text-text-primary"
                : "text-text-dim hover:text-text-secondary"
            }`}
          >
            VIDEO ANALYSIS
          </button>
          {hasEvents && (
            <button
              onClick={() => setRightPanel("log")}
              className={`font-mono text-[10px] px-3 py-1 rounded-sm transition-colors ${
                rightPanel === "log"
                  ? "bg-surface-elevated text-text-primary"
                  : "text-text-dim hover:text-text-secondary"
              }`}
            >
              EVENT LOG
              {events.filter(e => e.status === "alert").length > 0 && (
                <span className="ml-1.5 text-alert font-bold">
                  {events.filter(e => e.status === "alert").length}
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => setRightPanel("history")}
            className={`font-mono text-[10px] px-3 py-1 rounded-sm transition-colors ${
              rightPanel === "history"
                ? "bg-surface-elevated text-text-primary"
                : "text-text-dim hover:text-text-secondary"
            }`}
          >
            HISTORY
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Focus Pane - 70% */}
        <div className="flex-[7] min-w-0">
          <FocusPane event={selectedEvent} isFlashing={isFlashing} />
        </div>

        {/* Right Panel - 30% */}
        <div className="flex-[3] min-w-0">
          {rightPanel === "video" ? (
            <VideoUploadPanel
              onAlertGenerated={handleVideoAlert}
              onEventGenerated={handleVideoEvent}
              onAnalysisComplete={handleAnalysisComplete}
            />
          ) : rightPanel === "log" ? (
            <EventLog
              events={events}
              selectedEventId={selectedEvent?.id ?? null}
              onSelectEvent={handleSelectEvent}
            />
          ) : (
            <HistoryPanel onSelectEvent={handleSelectEvent} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
