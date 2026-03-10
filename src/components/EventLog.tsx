import { CameraEvent } from "@/lib/eventData";
import EventLogItem from "./EventLogItem";
import { useRef, useEffect } from "react";

interface EventLogProps {
  events: CameraEvent[];
  selectedEventId: string | null;
  onSelectEvent: (event: CameraEvent) => void;
}

const EventLog = ({ events, selectedEventId, onSelectEvent }: EventLogProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events.length]);

  return (
    <div className="h-full flex flex-col bg-background border-l border-border">
      {/* Header */}
      <div className="px-3 py-3 border-b border-border flex-shrink-0">
        <h2 className="font-mono text-xs font-semibold text-text-secondary tracking-widest uppercase">
          Event Log
        </h2>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="font-mono text-xs text-text-dim">
            {events.filter(e => e.status === "alert").length} alerts
          </span>
          <span className="font-mono text-xs text-text-dim">
            {events.length} total
          </span>
        </div>
      </div>

      {/* Event list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {events.map((event) => (
          <EventLogItem
            key={event.id}
            event={event}
            isSelected={event.id === selectedEventId}
            onClick={() => onSelectEvent(event)}
          />
        ))}
        {events.length === 0 && (
          <div className="px-3 py-8 text-center">
            <p className="font-mono text-xs text-text-dim">NO EVENTS</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventLog;
