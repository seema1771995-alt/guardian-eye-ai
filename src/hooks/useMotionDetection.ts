import { useRef, useCallback } from "react";

const MOTION_THRESHOLD = 30; // pixel diff threshold
const MOTION_PIXEL_PERCENT = 2; // % of pixels that must change

export function useMotionDetection() {
  const prevFrameRef = useRef<ImageData | null>(null);

  const detectMotion = useCallback((canvas: HTMLCanvasElement): boolean => {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return false;

    const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const prev = prevFrameRef.current;

    if (!prev || prev.width !== currentFrame.width || prev.height !== currentFrame.height) {
      prevFrameRef.current = currentFrame;
      return false;
    }

    let changedPixels = 0;
    const totalPixels = currentFrame.width * currentFrame.height;
    const data = currentFrame.data;
    const prevData = prev.data;

    // Sample every 4th pixel for performance
    for (let i = 0; i < data.length; i += 16) {
      const diff =
        Math.abs(data[i] - prevData[i]) +
        Math.abs(data[i + 1] - prevData[i + 1]) +
        Math.abs(data[i + 2] - prevData[i + 2]);

      if (diff > MOTION_THRESHOLD) {
        changedPixels++;
      }
    }

    prevFrameRef.current = currentFrame;

    const sampledTotal = totalPixels / 4;
    const percentChanged = (changedPixels / sampledTotal) * 100;
    return percentChanged > MOTION_PIXEL_PERCENT;
  }, []);

  const reset = useCallback(() => {
    prevFrameRef.current = null;
  }, []);

  return { detectMotion, reset };
}
