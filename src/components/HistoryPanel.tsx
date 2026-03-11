import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CameraEvent, formatTimestamp } from "@/lib/eventData";

interface HistoryPanelProps {
  onSelectEvent: (event: CameraEvent) => void;
}

interface IncidentRow {
  id: string;
  alert_id: string;
  camera_id: string;
  camera_name: string;
  location: string;
  status: string;
  description: string;
  risk_level: string | null;
  persons_detected: number | null;
  alert_type: string | null;
  video_filename: string | null;
  frame_index: number | null;
  created_at: string;
}

const HistoryPanel = ({ onSelectEvent }: HistoryPanelProps) => {
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "alert">("all");

  const fetchIncidents = async () => {
    setLoading(true);
    let query = supabase
      .from("incidents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (filter === "alert") {
      query = query.eq("status", "alert");
    }

    const { data, error } = await query;
    if (!error && data) {
      setIncidents(data as IncidentRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchIncidents();
  }, [filter]);

  const handleSelect = (incident: IncidentRow) => {
    const event: CameraEvent = {
      id: incident.alert_id,
      cameraId: incident.camera_id,
      cameraName: incident.camera_name,
      location: incident.location,
      timestamp: new Date(incident.created_at),
      status: incident.status as "safe" | "alert",
      description: incident.description,
      riskLevel: incident.risk_level as any,
      personsDetected: incident.persons_detected ?? undefined,
      alertType: incident.alert_type ?? undefined,
    };
    onSelectEvent(event);
  };

  const alertCount = incidents.filter(i => i.status === "alert").length;

  return (
    <div className="h-full flex flex-col bg-background border-l border-border">
      {/* Header */}
      <div className="px-3 py-3 border-b border-border flex-shrink-0">
        <h2 className="font-mono text-xs font-semibold text-text-secondary tracking-widest uppercase">
          Incident History
        </h2>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="font-mono text-xs text-text-dim">
            {alertCount} alerts
          </span>
          <span className="font-mono text-xs text-text-dim">
            {incidents.length} total
          </span>
          <button
            onClick={fetchIncidents}
            className="font-mono text-[10px] text-text-dim hover:text-text-secondary ml-auto"
          >
            REFRESH
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="px-3 py-2 border-b border-border flex gap-2 flex-shrink-0">
        <button
          onClick={() => setFilter("all")}
          className={`font-mono text-[10px] px-2 py-0.5 rounded-sm ${
            filter === "all" ? "bg-surface-elevated text-text-primary" : "text-text-dim"
          }`}
        >
          ALL
        </button>
        <button
          onClick={() => setFilter("alert")}
          className={`font-mono text-[10px] px-2 py-0.5 rounded-sm ${
            filter === "alert" ? "bg-surface-elevated text-alert" : "text-text-dim"
          }`}
        >
          ALERTS ONLY
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="px-3 py-8 text-center">
            <p className="font-mono text-xs text-text-dim">LOADING...</p>
          </div>
        ) : incidents.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="font-mono text-xs text-text-dim">NO INCIDENTS RECORDED</p>
            <p className="font-body text-[10px] text-text-dim mt-1">Upload a video to start analysis</p>
          </div>
        ) : (
          incidents.map((incident) => {
            const isAlert = incident.status === "alert";
            return (
              <button
                key={incident.id}
                onClick={() => handleSelect(incident)}
                className={`w-full text-left px-3 py-2.5 border-b border-border transition-colors hover:bg-secondary/50 ${
                  isAlert ? "border-l-2 border-l-alert" : "border-l-2 border-l-transparent"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className={`font-mono text-xs ${isAlert ? "text-alert font-semibold" : "text-text-dim"}`}>
                    {incident.camera_id}
                  </span>
                  <span className="font-mono text-xs text-text-dim">
                    {formatTimestamp(new Date(incident.created_at))}
                  </span>
                </div>
                {isAlert ? (
                  <div>
                    <span className="font-mono text-xs font-bold text-alert">ALERT</span>
                    <span className="font-mono text-xs text-alert ml-2">{incident.alert_type}</span>
                  </div>
                ) : (
                  <p className="font-body text-xs text-text-dim truncate">{incident.description}</p>
                )}
                {incident.video_filename && (
                  <span className="font-mono text-[10px] text-text-dim block mt-0.5">
                    📎 {incident.video_filename}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default HistoryPanel;
