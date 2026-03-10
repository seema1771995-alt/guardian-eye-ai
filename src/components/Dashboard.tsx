import { useState, useEffect, useCallback } from "react";
import { CameraEvent, generateSafeEvent, generateAlertEvent } from "@/lib/eventData";
import FocusPane from "@/components/FocusPane";
import EventLog from "@/components/EventLog";

const Dashboard = () => {
  const [events, setEvents] = useState<CameraEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CameraEvent | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);

  const triggerAlert = useCallback((alertEvent: CameraEvent) => {
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);
    setSelectedEvent(alertEvent);
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
      const isAlert = Math.random() < 0.12; // ~12% chance of alert
      const newEvent = isAlert ? generateAlertEvent() : generateSafeEvent();

      setEvents((prev) => [newEvent, ...prev].slice(0, 100));

      if (isAlert) {
        triggerAlert(newEvent);
      }
    }, 3000 + Math.random() * 2000);

    return () => clearInterval(interval);
  }, [triggerAlert]);

  const handleSelectEvent = (event: CameraEvent) => {
    if (event.status === "alert") {
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 200);
    }
    setSelectedEvent(event);
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-background">
      {/* Focus Pane - 70% */}
      <div className="flex-[7] min-w-0">
        <FocusPane event={selectedEvent} isFlashing={isFlashing} />
      </div>

      {/* Event Log - 30% */}
      <div className="flex-[3] min-w-0">
        <EventLog
          events={events}
          selectedEventId={selectedEvent?.id ?? null}
          onSelectEvent={handleSelectEvent}
        />
      </div>
    </div>
  );
};

export default Dashboard;
