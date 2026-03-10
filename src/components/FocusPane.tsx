import { CameraEvent, formatTimestamp, formatDate } from "@/lib/eventData";
import { useState, useEffect } from "react";

interface FocusPaneProps {
  event: CameraEvent | null;
  isFlashing: boolean;
}

const FocusPane = ({ event, isFlashing }: FocusPaneProps) => {
  const [timelinePosition, setTimelinePosition] = useState(0);

  useEffect(() => {
    if (!event || event.status !== "alert") {
      setTimelinePosition(0);
      return;
    }

    setTimelinePosition(0);
    const interval = setInterval(() => {
      setTimelinePosition((prev) => {
        if (prev >= 100) return 0;
        return prev + 1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [event?.id]);

  const isAlert = event?.status === "alert";

  return (
    <div className="h-full flex flex-col relative">
      {/* Alert flash overlay */}
      {isFlashing && (
        <div className="absolute inset-0 bg-alert z-50 alert-flash pointer-events-none" />
      )}

      {/* Header */}
      <div className="px-5 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${isAlert ? "bg-alert alert-pulse" : "bg-text-dim"}`} />
          <h1 className="font-mono text-sm font-semibold text-text-primary tracking-wide">
            {event ? event.cameraId : "VIGILANCE"}
          </h1>
          {event && (
            <span className="font-body text-xs text-text-dim">{event.cameraName}</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-text-dim">
            {formatDate(new Date())}
          </span>
          <span className="font-mono text-xs text-text-secondary">
            {formatTimestamp(new Date())}
          </span>
        </div>
      </div>

      {/* Main video area */}
      <div className="flex-1 flex items-center justify-center p-5">
        {event ? (
          <div className={`w-full h-full border ${isAlert ? "border-alert" : "border-safe-border"} rounded-sm relative overflow-hidden`}>
            {/* Simulated video feed */}
            <div className="absolute inset-0 bg-surface-elevated flex items-center justify-center">
              <SimulatedFeed event={event} />
            </div>

            {/* Camera overlay info */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${isAlert ? "bg-alert alert-pulse" : "bg-green-500"}`} />
              <span className="font-mono text-xs text-text-primary/70">
                {event.cameraId} — LIVE
              </span>
            </div>

            <div className="absolute top-3 right-3">
              <span className="font-mono text-xs text-text-primary/70">
                {formatTimestamp(event.timestamp)}
              </span>
            </div>

            {/* Alert overlay */}
            {isAlert && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/95 to-transparent p-4 pt-12">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-xs font-bold text-alert alert-pulse">
                    ⚠ ALERT
                  </span>
                  <span className="font-mono text-xs text-alert">
                    {event.riskLevel}
                  </span>
                </div>
                <p className="font-mono text-xs text-text-primary leading-relaxed">
                  {event.description}
                </p>
              </div>
            )}
          </div>
        ) : (
          <IdleState />
        )}
      </div>

      {/* Timeline (only for alerts) */}
      {isAlert && event && (
        <div className="px-5 pb-4 flex-shrink-0">
          <div className="relative h-8 bg-secondary rounded-sm overflow-hidden">
            {/* Timeline background */}
            <div className="absolute inset-0 flex items-center px-3">
              <div className="w-full h-px bg-border" />
            </div>

            {/* Incident marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-alert"
              style={{ left: "33%" }}
            />

            {/* Scrubber */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-text-primary transition-none"
              style={{ left: `${timelinePosition}%` }}
            />

            {/* Labels */}
            <div className="absolute inset-0 flex items-center justify-between px-3">
              <span className="font-mono text-[10px] text-text-dim">-10s</span>
              <span className="font-mono text-[10px] text-alert">INCIDENT</span>
              <span className="font-mono text-[10px] text-text-dim">NOW</span>
            </div>
          </div>
        </div>
      )}

      {/* Event details bar */}
      {event && (
        <div className="px-5 py-3 border-t border-border flex items-center gap-6 flex-shrink-0">
          <Detail label="ALERT ID" value={event.id} />
          <Detail label="LOCATION" value={event.location} />
          <Detail label="TIME" value={formatTimestamp(event.timestamp)} />
          <Detail label="PERSONS" value={String(event.personsDetected || "—")} />
          {isAlert && event.riskLevel && (
            <Detail label="RISK" value={event.riskLevel} isAlert />
          )}
        </div>
      )}
    </div>
  );
};

function Detail({ label, value, isAlert = false }: { label: string; value: string; isAlert?: boolean }) {
  return (
    <div>
      <span className="font-mono text-[10px] text-text-dim tracking-widest block">{label}</span>
      <span className={`font-mono text-xs ${isAlert ? "text-alert font-bold" : "text-text-secondary"}`}>
        {value}
      </span>
    </div>
  );
}

function IdleState() {
  return (
    <div className="text-center">
      <div className="w-16 h-16 border border-border rounded-sm mx-auto mb-4 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-text-dim" />
      </div>
      <p className="font-mono text-xs text-text-dim tracking-widest">MONITORING ACTIVE</p>
      <p className="font-body text-xs text-text-dim mt-1">Select an event from the log</p>
    </div>
  );
}

function SimulatedFeed({ event }: { event: CameraEvent }) {
  const isAlert = event.status === "alert";

  return (
    <div className="w-full h-full relative">
      {/* Simulated scene with figures */}
      <svg viewBox="0 0 640 360" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        {/* Background - dark environment */}
        <rect width="640" height="360" fill="#0a0c0e" />

        {/* Ground plane */}
        <rect x="0" y="260" width="640" height="100" fill="#12151a" />
        <line x1="0" y1="260" x2="640" y2="260" stroke="#1a1f27" strokeWidth="1" />

        {/* Grid lines for depth */}
        {[100, 200, 320, 440, 540].map((x) => (
          <line key={x} x1={x} y1="260" x2={x * 0.8 + 64} y2="360" stroke="#14181e" strokeWidth="0.5" />
        ))}

        {/* Distant structures */}
        <rect x="50" y="140" width="80" height="120" fill="#11141a" stroke="#1a1f27" strokeWidth="0.5" />
        <rect x="500" y="160" width="100" height="100" fill="#11141a" stroke="#1a1f27" strokeWidth="0.5" />

        {/* Simulated people */}
        {isAlert ? (
          <>
            {/* Two figures in confrontation */}
            <g>
              {/* Person A - aggressor */}
              <ellipse cx="290" cy="195" rx="8" ry="8" fill="#2a3040" />
              <line x1="290" y1="203" x2="290" y2="240" stroke="#2a3040" strokeWidth="3" />
              <line x1="290" y1="215" x2="320" y2="210" stroke="#2a3040" strokeWidth="2.5" />
              <line x1="290" y1="215" x2="270" y2="230" stroke="#2a3040" strokeWidth="2.5" />
              <line x1="290" y1="240" x2="280" y2="260" stroke="#2a3040" strokeWidth="2.5" />
              <line x1="290" y1="240" x2="300" y2="260" stroke="#2a3040" strokeWidth="2.5" />

              {/* Person B - target */}
              <ellipse cx="330" cy="200" rx="8" ry="8" fill="#2a3040" />
              <line x1="330" y1="208" x2="325" y2="245" stroke="#2a3040" strokeWidth="3" />
              <line x1="330" y1="220" x2="350" y2="235" stroke="#2a3040" strokeWidth="2.5" />
              <line x1="330" y1="220" x2="310" y2="215" stroke="#2a3040" strokeWidth="2.5" />
              <line x1="325" y1="245" x2="315" y2="260" stroke="#2a3040" strokeWidth="2.5" />
              <line x1="325" y1="245" x2="335" y2="260" stroke="#2a3040" strokeWidth="2.5" />

              {/* Detection box */}
              <rect x="265" y="185" x2="355" width="90" height="80" fill="none" stroke="#FF3B30" strokeWidth="1.5" strokeDasharray="4,2" />
              <text x="268" y="182" fill="#FF3B30" fontSize="9" fontFamily="Roboto Mono">DETECTED</text>
            </g>

            {/* Bystander */}
            <g opacity="0.4">
              <ellipse cx="450" cy="220" rx="6" ry="6" fill="#1e2430" />
              <line x1="450" y1="226" x2="450" y2="255" stroke="#1e2430" strokeWidth="2" />
              <line x1="450" y1="255" x2="443" y2="265" stroke="#1e2430" strokeWidth="2" />
              <line x1="450" y1="255" x2="457" y2="265" stroke="#1e2430" strokeWidth="2" />
            </g>
          </>
        ) : (
          <>
            {/* Normal scene - people walking */}
            {[180, 300, 420, 500].map((x, i) => (
              <g key={i} opacity={0.3 + i * 0.1}>
                <ellipse cx={x} cy={220 + i * 5} rx="6" ry="6" fill="#1e2430" />
                <line x1={x} y1={226 + i * 5} x2={x} y2={250 + i * 5} stroke="#1e2430" strokeWidth="2" />
                <line x1={x} y1={250 + i * 5} x2={x - 7} y2={262 + i * 5} stroke="#1e2430" strokeWidth="2" />
                <line x1={x} y1={250 + i * 5} x2={x + 7} y2={262 + i * 5} stroke="#1e2430" strokeWidth="2" />
              </g>
            ))}
          </>
        )}

        {/* Scan lines effect */}
        {Array.from({ length: 36 }, (_, i) => (
          <line
            key={`scan-${i}`}
            x1="0"
            y1={i * 10}
            x2="640"
            y2={i * 10}
            stroke="rgba(255,255,255,0.015)"
            strokeWidth="1"
          />
        ))}
      </svg>
    </div>
  );
}

export default FocusPane;
