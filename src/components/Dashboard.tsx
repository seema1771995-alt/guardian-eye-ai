import { useState, useEffect, useCallback } from "react";
import { CameraEvent, generateSafeEvent, generateAlertEvent } from "@/lib/eventData";
import FocusPane from "@/components/FocusPane";
import EventLog from "@/components/EventLog";
import VideoUploadPanel from "@/components/VideoUploadPanel";

type RightPanel = "log" | "video";

const Dashboard = () => {
  const [events, setEvents] = useState<CameraEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CameraEvent | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [rightPanel, setRightPanel] = useState<RightPanel>("log");

  const triggerAlert = useCallback((alertEvent: CameraEvent) => {
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);
    setSelectedEvent(alertEvent);
  }, []);

  const addEvent = useCallback((event: CameraEvent) => {
    setEvents((prev) => [event, ...prev].slice(0, 100));
  }, []);

  // Generate initial events
  useEffect(() => {
    const initial: CameraEvent[] = [];
    for (let i = 0; i < 8; i++) {
      initial.push(generateSafeEvent());
    }
    setEvents(initial);
  }, []);

  // Simulate incoming events
  useEffect(() => {
    const interval = setInterval(() => {
      const isAlert = Math.random() < 0.12;
      const newEvent = isAlert ? generateAlertEvent() : generateSafeEvent();
      addEvent(newEvent);
      if (isAlert) {
        triggerAlert(newEvent);
      }
    }, 3000 + Math.random() * 2000);

    return () => clearInterval(interval);
  }, [triggerAlert, addEvent]);

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
  };

  const handleVideoEvent = (event: CameraEvent) => {
    addEvent(event);
  };

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
            onClick={() => setRightPanel("log")}
            className={`font-mono text-[10px] px-3 py-1 rounded-sm transition-colors ${
              rightPanel === "log"
                ? "bg-surface-elevated text-text-primary"
                : "text-text-dim hover:text-text-secondary"
            }`}
          >
            EVENT LOG
          </button>
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
          {rightPanel === "log" ? (
            <EventLog
              events={events}
              selectedEventId={selectedEvent?.id ?? null}
              onSelectEvent={handleSelectEvent}
            />
          ) : (
            <VideoUploadPanel
              onAlertGenerated={handleVideoAlert}
              onEventGenerated={handleVideoEvent}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
