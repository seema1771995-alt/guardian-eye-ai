import { CameraEvent, formatTimestamp } from "@/lib/eventData";

interface EventLogItemProps {
  event: CameraEvent;
  isSelected: boolean;
  onClick: () => void;
}

const EventLogItem = ({ event, isSelected, onClick }: EventLogItemProps) => {
  const isAlert = event.status === "alert";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 border-b border-border transition-colors duration-150 log-entry-enter ${
        isSelected
          ? "bg-secondary"
          : "hover:bg-secondary/50"
      } ${isAlert ? "border-l-2 border-l-alert" : "border-l-2 border-l-transparent"}`}
    >
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <span className={`font-mono text-xs ${isAlert ? "text-alert font-semibold" : "text-text-dim"}`}>
          {event.cameraId}
        </span>
        <span className="font-mono text-xs text-text-dim">
          {formatTimestamp(event.timestamp)}
        </span>
      </div>

      {isAlert ? (
        <div>
          <span className="font-mono text-xs font-bold text-alert alert-pulse">
            ALERT
          </span>
          <span className="font-mono text-xs text-alert ml-2">
            {event.alertType}
          </span>
        </div>
      ) : (
        <p className="font-body text-xs text-text-dim truncate">
          {event.description}
        </p>
      )}
    </button>
  );
};

export default EventLogItem;
