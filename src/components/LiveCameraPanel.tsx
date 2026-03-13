import { useRef, useState, useCallback, useEffect } from "react";
import { CameraEvent } from "@/lib/eventData";
import { useMotionDetection } from "@/hooks/useMotionDetection";
import { supabase } from "@/integrations/supabase/client";

interface LiveCameraPanelProps {
  onAlertGenerated: (event: CameraEvent) => void;
  onEventGenerated: (event: CameraEvent) => void;
  cameraId: string;
  cameraName: string;
}

const COOLDOWN_MS = 12000; // 12 seconds between analyses
const MOTION_CHECK_MS = 1000; // check for motion every 1s

let liveEventCounter = 1000;

const LiveCameraPanel = ({
  onAlertGenerated,
  onEventGenerated,
  cameraId,
  cameraName,
}: LiveCameraPanelProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const motionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastAnalysisRef = useRef<number>(0);
  const analyzingRef = useRef(false);

  const [isStreaming, setIsStreaming] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [motionDetected, setMotionDetected] = useState(false);
  const [lastAnalysisTime, setLastAnalysisTime] = useState<Date | null>(null);
  const [analysisCount, setAnalysisCount] = useState(0);
  const [alertCount, setAlertCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const { detectMotion, reset: resetMotion } = useMotionDetection();

  const captureFrame = useCallback((): { dataUrl: string; base64: string } | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    canvas.width = Math.min(video.videoWidth, 640);
    canvas.height = Math.min(video.videoHeight, 480);
    const scale = Math.min(640 / video.videoWidth, 480 / video.videoHeight);
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    const base64 = dataUrl.split(",")[1];
    return { dataUrl, base64 };
  }, []);

  const analyzeCurrentFrame = useCallback(async () => {
    if (analyzingRef.current) return;

    const now = Date.now();
    if (now - lastAnalysisRef.current < COOLDOWN_MS) return;

    const frame = captureFrame();
    if (!frame) return;

    analyzingRef.current = true;
    setIsAnalyzing(true);
    lastAnalysisRef.current = now;

    try {
      const { data, error: fnError } = await supabase.functions.invoke("analyze-frame", {
        body: { frameBase64: frame.base64, frameIndex: 0, totalFrames: 1 },
      });

      if (fnError) throw new Error(fnError.message || "Analysis failed");
      if (data?.error) throw new Error(data.error);

      const analysis = data.analysis;
      liveEventCounter++;

      const event: CameraEvent = {
        id: `LIVE-${cameraId}-${liveEventCounter}`,
        cameraId,
        cameraName: `${cameraName} — Live`,
        location: "Live Feed",
        timestamp: new Date(),
        status: analysis.overallStatus === "alert" ? "alert" : "safe",
        description: analysis.summary,
        riskLevel: analysis.riskLevel,
        personsDetected: analysis.personsDetected,
        alertType: analysis.alertType,
        frameImageUrl: frame.dataUrl,
        confidence: analysis.confidence,
        interactionContext: analysis.interactionContext,
      };

      setAnalysisCount((c) => c + 1);
      setLastAnalysisTime(new Date());

      if (event.status === "alert") {
        setAlertCount((c) => c + 1);
        onAlertGenerated(event);
      } else {
        onEventGenerated(event);
      }
    } catch (err) {
      console.error("Live analysis error:", err);
      // Don't show error for rate limits, just skip
    } finally {
      analyzingRef.current = false;
      setIsAnalyzing(false);
    }
  }, [captureFrame, cameraId, cameraName, onAlertGenerated, onEventGenerated]);

  // Motion check loop
  useEffect(() => {
    if (!isStreaming) return;

    motionIntervalRef.current = setInterval(() => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video || video.readyState < 2) return;

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      // Draw current frame for motion comparison
      const scale = Math.min(640 / video.videoWidth, 480 / video.videoHeight);
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const hasMotion = detectMotion(canvas);
      setMotionDetected(hasMotion);

      if (hasMotion) {
        analyzeCurrentFrame();
      }

      // Update cooldown display
      const remaining = Math.max(0, COOLDOWN_MS - (Date.now() - lastAnalysisRef.current));
      setCooldownRemaining(Math.ceil(remaining / 1000));
    }, MOTION_CHECK_MS);

    return () => {
      if (motionIntervalRef.current) clearInterval(motionIntervalRef.current);
    };
  }, [isStreaming, detectMotion, analyzeCurrentFrame]);

  const startStream = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsStreaming(true);
      resetMotion();
    } catch (err) {
      setError("Camera access denied. Please allow camera permissions.");
      console.error("Camera error:", err);
    }
  };

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setMotionDetected(false);
    resetMotion();
  }, [resetMotion]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (motionIntervalRef.current) clearInterval(motionIntervalRef.current);
    };
  }, []);

  return (
    <div className="h-full flex flex-col bg-background border-l border-border">
      {/* Header */}
      <div className="px-3 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-xs font-semibold text-text-secondary tracking-widest uppercase">
            Live Camera
          </h2>
          <div className="flex items-center gap-2">
            {isStreaming && (
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${motionDetected ? "bg-alert alert-pulse" : "bg-green-500"}`} />
                <span className="font-mono text-[10px] text-text-dim">
                  {motionDetected ? "MOTION" : "IDLE"}
                </span>
              </div>
            )}
          </div>
        </div>
        {isStreaming && (
          <div className="flex items-center gap-3 mt-1">
            <span className="font-mono text-[10px] text-text-primary font-semibold">{cameraId}</span>
            <span className="font-mono text-[10px] text-text-dim">🔴 LIVE</span>
          </div>
        )}
      </div>

      {/* Video feed */}
      <div className="p-3 border-b border-border flex-shrink-0">
        {!isStreaming ? (
          <button
            onClick={startStream}
            className="w-full border border-dashed border-border rounded-sm p-6 flex flex-col items-center gap-2 hover:border-foreground/30 transition-colors"
          >
            <div className="w-8 h-8 border border-border rounded-sm flex items-center justify-center">
              <span className="font-mono text-xs text-text-dim">📹</span>
            </div>
            <span className="font-mono text-xs text-text-dim">START LIVE CAMERA</span>
            <span className="font-body text-[10px] text-text-dim">
              Motion-triggered analysis every ~12s
            </span>
          </button>
        ) : (
          <div className="space-y-2">
            <div className="relative rounded-sm overflow-hidden border border-border">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-auto"
              />
              {isAnalyzing && (
                <div className="absolute top-2 right-2 bg-background/80 px-2 py-0.5 rounded-sm">
                  <span className="font-mono text-[10px] text-text-secondary animate-pulse">
                    ANALYZING...
                  </span>
                </div>
              )}
              {cooldownRemaining > 0 && !isAnalyzing && (
                <div className="absolute bottom-2 right-2 bg-background/80 px-2 py-0.5 rounded-sm">
                  <span className="font-mono text-[10px] text-text-dim">
                    NEXT IN {cooldownRemaining}s
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={stopStream}
              className="font-mono text-xs text-text-dim hover:text-alert transition-colors"
            >
              ■ STOP CAMERA
            </button>
          </div>
        )}

        {error && (
          <p className="font-mono text-xs text-alert mt-2">{error}</p>
        )}
      </div>

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Stats */}
      <div className="px-3 py-3 border-b border-border flex-shrink-0">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <span className="font-mono text-[10px] text-text-dim block">ANALYZED</span>
            <span className="font-mono text-sm text-text-secondary">{analysisCount}</span>
          </div>
          <div>
            <span className="font-mono text-[10px] text-text-dim block">ALERTS</span>
            <span className={`font-mono text-sm ${alertCount > 0 ? "text-alert font-bold" : "text-text-secondary"}`}>
              {alertCount}
            </span>
          </div>
          <div>
            <span className="font-mono text-[10px] text-text-dim block">LAST</span>
            <span className="font-mono text-[10px] text-text-dim">
              {lastAnalysisTime
                ? lastAnalysisTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
                : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-green-500" />
            <span className="font-body text-[10px] text-text-dim">Motion detection active</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-text-secondary" />
            <span className="font-body text-[10px] text-text-dim">12s cooldown between analyses</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-text-secondary" />
            <span className="font-body text-[10px] text-text-dim">Frames sent only when motion detected</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveCameraPanel;
