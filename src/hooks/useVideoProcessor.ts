import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FrameAnalysis {
  frameIndex: number;
  frameDataUrl: string;
  analysis: {
    personsDetected: number;
    behaviors: Array<{
      type: string;
      description: string;
      isSuspicious: boolean;
    }>;
    overallStatus: "safe" | "suspicious" | "alert";
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    alertType?: string;
    summary: string;
  };
}

export type ProcessingStatus = "idle" | "extracting" | "analyzing" | "complete" | "error";

export function useVideoProcessor() {
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [results, setResults] = useState<FrameAnalysis[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const abortRef = useRef(false);

  const extractFrames = useCallback(
    async (file: File, frameInterval: number = 2): Promise<Array<{ index: number; dataUrl: string; base64: string }>> => {
      return new Promise((resolve, reject) => {
        const video = document.createElement("video");
        video.preload = "auto";
        video.muted = true;

        const url = URL.createObjectURL(file);
        setVideoUrl(url);

        video.onloadedmetadata = () => {
          const duration = video.duration;
          const frameCount = Math.min(Math.floor(duration / frameInterval), 15); // Max 15 frames
          setTotalFrames(frameCount);

          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d")!;
          const frames: Array<{ index: number; dataUrl: string; base64: string }> = [];
          let currentIdx = 0;

          const captureFrame = () => {
            if (currentIdx >= frameCount || abortRef.current) {
              resolve(frames);
              return;
            }

            const time = currentIdx * frameInterval;
            video.currentTime = time;
          };

          video.onseeked = () => {
            canvas.width = Math.min(video.videoWidth, 640);
            canvas.height = Math.min(video.videoHeight, 480);
            const scale = Math.min(640 / video.videoWidth, 480 / video.videoHeight);
            canvas.width = video.videoWidth * scale;
            canvas.height = video.videoHeight * scale;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
            const base64 = dataUrl.split(",")[1];

            frames.push({ index: currentIdx, dataUrl, base64 });
            setProgress(Math.round(((currentIdx + 1) / frameCount) * 50));
            currentIdx++;
            captureFrame();
          };

          captureFrame();
        };

        video.onerror = () => {
          reject(new Error("Failed to load video file"));
        };

        video.src = url;
      });
    },
    []
  );

  const analyzeFrame = useCallback(
    async (base64: string, frameIndex: number, total: number): Promise<FrameAnalysis["analysis"]> => {
      const maxRetries = 3;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const { data, error } = await supabase.functions.invoke("analyze-frame", {
          body: { frameBase64: base64, frameIndex, totalFrames: total },
        });

        if (error) {
          const msg = error.message || "";
          if ((msg.includes("429") || msg.includes("Rate")) && attempt < maxRetries - 1) {
            const wait = (attempt + 1) * 5000;
            console.warn(`Rate limited on frame ${frameIndex}, retrying in ${wait}ms...`);
            await new Promise((r) => setTimeout(r, wait));
            continue;
          }
          throw new Error(msg || "Analysis failed");
        }

        if (data?.error) {
          if ((data.error.includes("Rate") || data.error.includes("429")) && attempt < maxRetries - 1) {
            const wait = (attempt + 1) * 5000;
            console.warn(`Rate limited on frame ${frameIndex}, retrying in ${wait}ms...`);
            await new Promise((r) => setTimeout(r, wait));
            continue;
          }
          throw new Error(data.error);
        }

        return data.analysis;
      }
      throw new Error("Max retries exceeded");
    },
    []
  );

  const processVideo = useCallback(
    async (file: File) => {
      abortRef.current = false;
      setStatus("extracting");
      setProgress(0);
      setResults([]);
      setErrorMessage(null);

      try {
        // Step 1: Extract frames
        const frames = await extractFrames(file);

        if (frames.length === 0) {
          throw new Error("No frames extracted from video");
        }

        // Step 2: Analyze each frame
        setStatus("analyzing");
        const analysisResults: FrameAnalysis[] = [];

        for (let i = 0; i < frames.length; i++) {
          if (abortRef.current) break;

          setCurrentFrame(i + 1);
          setProgress(50 + Math.round(((i + 1) / frames.length) * 50));

          try {
            const analysis = await analyzeFrame(frames[i].base64, i, frames.length);
            const result: FrameAnalysis = {
              frameIndex: i,
              frameDataUrl: frames[i].dataUrl,
              analysis,
            };
            analysisResults.push(result);
            setResults((prev) => [...prev, result]);
          } catch (err) {
            console.error(`Frame ${i} analysis failed:`, err);
            // Continue with other frames
            analysisResults.push({
              frameIndex: i,
              frameDataUrl: frames[i].dataUrl,
              analysis: {
                personsDetected: 0,
                behaviors: [],
                overallStatus: "safe",
                riskLevel: "LOW",
                summary: "Analysis failed for this frame",
              },
            });
          }

          // Small delay to avoid rate limits
          if (i < frames.length - 1) {
            await new Promise((r) => setTimeout(r, 3000));
          }
        }

        setStatus("complete");
        return analysisResults;
      } catch (err) {
        console.error("Video processing error:", err);
        setErrorMessage(err instanceof Error ? err.message : "Processing failed");
        setStatus("error");
        return [];
      }
    },
    [extractFrames, analyzeFrame]
  );

  const reset = useCallback(() => {
    abortRef.current = true;
    setStatus("idle");
    setProgress(0);
    setTotalFrames(0);
    setCurrentFrame(0);
    setResults([]);
    setErrorMessage(null);
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }
  }, [videoUrl]);

  return {
    status,
    progress,
    totalFrames,
    currentFrame,
    results,
    errorMessage,
    videoUrl,
    processVideo,
    reset,
  };
}
