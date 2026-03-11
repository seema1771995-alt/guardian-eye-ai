import { useRef, useState } from "react";
import { useVideoProcessor, FrameAnalysis } from "@/hooks/useVideoProcessor";
import { CameraEvent } from "@/lib/eventData";
import { supabase } from "@/integrations/supabase/client";

interface VideoUploadPanelProps {
  onAlertGenerated: (event: CameraEvent) => void;
  onEventGenerated: (event: CameraEvent) => void;
  onAnalysisComplete?: () => void;
}

let uploadEventCounter = 500;

const VideoUploadPanel = ({ onAlertGenerated, onEventGenerated, onAnalysisComplete }: VideoUploadPanelProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    status,
    progress,
    totalFrames,
    currentFrame,
    results,
    errorMessage,
    videoUrl,
    processVideo,
    reset,
  } = useVideoProcessor();
  const [selectedFrame, setSelectedFrame] = useState<FrameAnalysis | null>(null);
  const [currentFilename, setCurrentFilename] = useState<string>("");

  const persistIncident = async (event: CameraEvent, filename: string, frameIndex: number) => {
    try {
      await supabase.from("incidents").insert({
        alert_id: event.id,
        camera_id: event.cameraId,
        camera_name: event.cameraName,
        location: event.location,
        status: event.status,
        description: event.description,
        risk_level: event.riskLevel || null,
        persons_detected: event.personsDetected || 0,
        alert_type: event.alertType || null,
        video_filename: filename,
        frame_index: frameIndex,
      });
    } catch (err) {
      console.error("Failed to persist incident:", err);
    }
  };

  const persistFrameAnalysis = async (result: FrameAnalysis, filename: string) => {
    try {
      await supabase.from("frame_analyses").insert({
        video_filename: filename,
        frame_index: result.frameIndex,
        persons_detected: result.analysis.personsDetected,
        behaviors: result.analysis.behaviors as any,
        overall_status: result.analysis.overallStatus,
        risk_level: result.analysis.riskLevel,
        alert_type: result.analysis.alertType || null,
        summary: result.analysis.summary,
      });
    } catch (err) {
      console.error("Failed to persist frame analysis:", err);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      alert("Please select a video file");
      return;
    }

    setCurrentFilename(file.name);
    const analysisResults = await processVideo(file);

    // Generate dashboard events and persist
    if (analysisResults) {
      for (const result of analysisResults) {
        uploadEventCounter++;
        const event: CameraEvent = {
          id: `VID-${uploadEventCounter}`,
          cameraId: "UPLOAD",
          cameraName: "Video Upload",
          location: `Frame ${result.frameIndex + 1}`,
          timestamp: new Date(),
          status: result.analysis.overallStatus === "alert" ? "alert" : "safe",
          description: result.analysis.summary,
          riskLevel: result.analysis.overallStatus === "alert" ? result.analysis.riskLevel : undefined,
          personsDetected: result.analysis.personsDetected,
          alertType: result.analysis.alertType,
        };

        if (event.status === "alert") {
          onAlertGenerated(event);
        } else {
          onEventGenerated(event);
        }

        // Persist to database
        await persistIncident(event, file.name, result.frameIndex);
        await persistFrameAnalysis(result, file.name);
      }

      onAnalysisComplete?.();
    }
  };

  const alertCount = results.filter(r => r.analysis.overallStatus === "alert").length;
  const suspiciousCount = results.filter(r => r.analysis.overallStatus === "suspicious").length;

  return (
    <div className="h-full flex flex-col bg-background border-l border-border">
      {/* Header */}
      <div className="px-3 py-3 border-b border-border flex-shrink-0">
        <h2 className="font-mono text-xs font-semibold text-text-secondary tracking-widest uppercase">
          Video Analysis
        </h2>
        {currentFilename && status !== "idle" && (
          <p className="font-mono text-[10px] text-text-dim mt-0.5 truncate">📎 {currentFilename}</p>
        )}
      </div>

      {/* Upload area */}
      <div className="p-3 border-b border-border flex-shrink-0">
        {status === "idle" ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full border border-dashed border-border rounded-sm p-6 flex flex-col items-center gap-2 hover:border-foreground/30 transition-colors"
          >
            <div className="w-8 h-8 border border-border rounded-sm flex items-center justify-center">
              <span className="font-mono text-xs text-text-dim">▶</span>
            </div>
            <span className="font-mono text-xs text-text-dim">UPLOAD VIDEO</span>
            <span className="font-body text-[10px] text-text-dim">
              MP4, WebM, AVI — Max 15 frames analyzed
            </span>
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-text-secondary">
                {status === "extracting"
                  ? "EXTRACTING FRAMES"
                  : status === "analyzing"
                  ? `ANALYZING FRAME ${currentFrame}/${totalFrames}`
                  : status === "complete"
                  ? "ANALYSIS COMPLETE"
                  : "ERROR"}
              </span>
              {status !== "error" && (
                <span className="font-mono text-xs text-text-dim">{progress}%</span>
              )}
            </div>

            <div className="h-1 bg-secondary rounded-sm overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  status === "error" ? "bg-alert" : status === "complete" ? "bg-foreground" : "bg-text-secondary"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>

            {status === "error" && errorMessage && (
              <p className="font-mono text-xs text-alert">{errorMessage}</p>
            )}

            {status === "complete" && (
              <div className="flex items-center gap-3 pt-1">
                <span className="font-mono text-xs text-text-dim">
                  {results.length} frames
                </span>
                {alertCount > 0 && (
                  <span className="font-mono text-xs text-alert font-bold">
                    {alertCount} ALERT{alertCount > 1 ? "S" : ""}
                  </span>
                )}
                {suspiciousCount > 0 && (
                  <span className="font-mono text-xs text-text-secondary">
                    {suspiciousCount} suspicious
                  </span>
                )}
                <span className="font-mono text-[10px] text-text-dim ml-auto">
                  ✓ SAVED
                </span>
              </div>
            )}

            {(status === "complete" || status === "error") && (
              <button
                onClick={() => {
                  reset();
                  setSelectedFrame(null);
                  setCurrentFilename("");
                }}
                className="font-mono text-xs text-text-dim hover:text-text-secondary transition-colors"
              >
                ← NEW VIDEO
              </button>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Frame results */}
      <div className="flex-1 overflow-y-auto">
        {results.map((result) => (
          <button
            key={result.frameIndex}
            onClick={() => setSelectedFrame(result)}
            className={`w-full text-left px-3 py-2 border-b border-border transition-colors hover:bg-secondary/50 ${
              selectedFrame?.frameIndex === result.frameIndex ? "bg-secondary" : ""
            } ${
              result.analysis.overallStatus === "alert"
                ? "border-l-2 border-l-alert"
                : result.analysis.overallStatus === "suspicious"
                ? "border-l-2 border-l-text-secondary"
                : "border-l-2 border-l-transparent"
            }`}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="font-mono text-xs text-text-dim">
                FRAME {result.frameIndex + 1}
              </span>
              <span
                className={`font-mono text-[10px] font-bold ${
                  result.analysis.overallStatus === "alert"
                    ? "text-alert"
                    : result.analysis.overallStatus === "suspicious"
                    ? "text-text-secondary"
                    : "text-text-dim"
                }`}
              >
                {result.analysis.overallStatus.toUpperCase()}
              </span>
            </div>
            <p className="font-body text-[11px] text-text-dim truncate">
              {result.analysis.summary}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-[10px] text-text-dim">
                {result.analysis.personsDetected} person{result.analysis.personsDetected !== 1 ? "s" : ""}
              </span>
              {result.analysis.alertType && (
                <span className="font-mono text-[10px] text-alert">
                  {result.analysis.alertType}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Selected frame detail */}
      {selectedFrame && (
        <div className="border-t border-border p-3 flex-shrink-0 max-h-[40%] overflow-y-auto">
          <div className="mb-2">
            <img
              src={selectedFrame.frameDataUrl}
              alt={`Frame ${selectedFrame.frameIndex + 1}`}
              className={`w-full rounded-sm border ${
                selectedFrame.analysis.overallStatus === "alert"
                  ? "border-alert"
                  : "border-safe-border"
              }`}
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-text-dim">RISK</span>
              <span
                className={`font-mono text-xs font-bold ${
                  selectedFrame.analysis.riskLevel === "HIGH"
                    ? "text-alert"
                    : "text-text-secondary"
                }`}
              >
                {selectedFrame.analysis.riskLevel}
              </span>
            </div>
            <p className="font-mono text-[11px] text-text-secondary leading-relaxed">
              {selectedFrame.analysis.summary}
            </p>
            {selectedFrame.analysis.behaviors.length > 0 && (
              <div className="pt-1 space-y-0.5">
                {selectedFrame.analysis.behaviors.map((b, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span
                      className={`w-1 h-1 rounded-full ${
                        b.isSuspicious ? "bg-alert" : "bg-text-dim"
                      }`}
                    />
                    <span className="font-body text-[10px] text-text-dim">
                      {b.description}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoUploadPanel;
