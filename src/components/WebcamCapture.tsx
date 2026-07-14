import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, X, AlertCircle, RefreshCw, RotateCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WebcamCaptureProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
}

export const WebcamCapture = ({ onCapture, onCancel }: WebcamCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Store the active MediaStream in a ref so stopStream() never needs to
  // declare `stream` as a dependency. Keeping it only in state caused a
  // circular dep chain: stream -> stopStream -> startWebcam -> effect ->
  // startWebcam fires again -> infinite loop.
  const streamRef = useRef<MediaStream | null>(null);

  // Mirror the ref in state purely to drive re-renders (e.g. showing
  // "camera active" indicators). Never read this in callbacks.
  const [stream, setStream] = useState<MediaStream | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const { toast } = useToast();

  // Stable: reads from the ref so it has no dependencies and never changes
  // identity between renders. Safe to use in any other callback or effect.
  const stopStream = useCallback(() => {
    if (!streamRef.current) return;
    streamRef.current.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  const getUserFriendlyCameraError = (err: unknown) => {
    if (err instanceof DOMException) {
      if (err.name === "NotAllowedError") {
        return "Camera access was blocked. Please click 'Allow' when your browser asks for camera permission, then try again.";
      }
      if (err.name === "NotFoundError") {
        return "No camera was found on your device. Please connect a webcam and try again.";
      }
      if (err.name === "NotReadableError") {
        return "Your camera is being used by another app or browser tab. Close those and try again.";
      }
      if (err.name === "OverconstrainedError") {
        return "Your camera doesn't support the selected settings — we'll try again with different settings.";
      }
    }
    return "We couldn't start your camera. Make sure your browser has camera permission and try again.";
  };

  const startWebcam = useCallback(async () => {
    stopStream();
    setLoading(true);
    setError(null);

    // Defined inside the callback so it always closes over the current
    // facingMode value. If it were defined at module level it would read
    // the stale value from the first render's closure.
    const requestCameraStream = async (): Promise<MediaStream> => {
      const commonVideoSettings = {
        width: { ideal: 1280 },
        height: { ideal: 720 },
      };

      // Try progressively looser constraints so we degrade gracefully on
      // browsers / devices that do not support all options.
      const attempts: MediaStreamConstraints[] = [
        { video: { ...commonVideoSettings, facingMode: { ideal: facingMode } }, audio: false },
        { video: { ...commonVideoSettings, facingMode }, audio: false },
        { video: true, audio: false },
      ];

      let lastError: unknown = null;
      for (const constraints of attempts) {
        try {
          return await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
          lastError = err;
        }
      }
      throw lastError;
    };

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Your browser doesn't support camera access. Please try Chrome or Firefox.");
      }

      const mediaStream = await requestCameraStream();

      // Write to the ref first so stopStream() can always see the live stream,
      // then update state to trigger a re-render.
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setError(null);
    } catch (err) {
      console.error("Error accessing webcam:", err);
      const message = getUserFriendlyCameraError(err);
      setError(message);
      toast({
        title: "Camera Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [facingMode, stopStream, toast]);

  // Bind the stream to the video element whenever a new stream arrives.
  // Also handles transient autoplay blocks gracefully.
  useEffect(() => {
    if (!videoRef.current || !stream) return;
    const videoEl = videoRef.current;
    videoEl.srcObject = stream;

    const tryPlay = async () => {
      try {
        await videoEl.play();
      } catch (err) {
        console.warn("Autoplay was blocked temporarily:", err);
      }
    };

    // Attempt play immediately and also on metadata load as a fallback
    // for browsers that are not ready to play right away.
    const onLoadedMetadata = () => void tryPlay();
    videoEl.addEventListener("loadedmetadata", onLoadedMetadata);
    void tryPlay();

    return () => {
      videoEl.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
  }, [stream]);

  // Start the webcam on mount and whenever facingMode changes.
  useEffect(() => {
    startWebcam();
    // startWebcam is stable except when facingMode changes, which is the
    // intended trigger for restarting the camera with the new facing mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startWebcam]);

  // Always stop the camera tracks when the component unmounts.
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  const handleCaptureToPreview = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = video.videoWidth;
    const h = video.videoHeight;

    if (!w || !h) {
      setError("The camera is still warming up — give it a second and try again.");
      return;
    }

    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(video, 0, 0, w, h);

    try {
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      setPreviewDataUrl(dataUrl);
      // Pause the video element so the static preview is visible. We do not
      // stop the camera tracks here so retaking is instant.
      video.pause();
    } catch (err) {
      console.error("Preview error:", err);
      setError("Couldn't create the photo preview. Please try capturing again.");
    }
  };

  const confirmCapture = () => {
    if (!canvasRef.current) return;

    canvasRef.current.toBlob(
      (blob) => {
        if (!blob) {
          setError("Couldn't save your photo. Please try again.");
          return;
        }
        const file = new File([blob], `webcam-capture-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        onCapture(file);
        setPreviewDataUrl(null);
        // Stop camera tracks now that we are done with them.
        stopStream();
      },
      "image/jpeg",
      0.95
    );
  };

  const retake = () => {
    setPreviewDataUrl(null);
    setError(null);
    startWebcam();
  };

  const handleFlip = () => {
    // Toggling facingMode will cause startWebcam to re-run via its effect.
    setFacingMode((f) => (f === "user" ? "environment" : "user"));
    setPreviewDataUrl(null);
  };

  const handleRetry = () => {
    setError(null);
    startWebcam();
  };

  const handleCancel = () => {
    stopStream();
    onCancel();
  };

  return (
    <Card className="p-4 border-2 border-dashed border-border bg-card shadow-card relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 z-10"
        onClick={handleCancel}
        aria-label="Close webcam"
      >
        <X className="h-5 w-5" />
      </Button>

      {error ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4 text-destructive">
          <AlertCircle className="h-12 w-12" />
          <p>{error}</p>
          <div className="flex gap-2">
            <Button onClick={handleRetry} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
            <Button onClick={onCancel} variant="ghost">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                onClick={handleFlip}
                variant="outline"
                size="sm"
                title="Flip camera"
                aria-label="Flip camera"
              >
                <RotateCw className="h-4 w-4 mr-2" />
                Flip
              </Button>
            </div>

            <div className="text-sm text-muted-foreground mr-8">
              {loading
                ? "Starting camera..."
                : facingMode === "user"
                ? "Front camera"
                : "Back camera"}
            </div>
          </div>

          <div className="relative rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <svg
                  className="animate-spin h-8 w-8"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="mt-2">Starting camera...</div>
              </div>
            ) : previewDataUrl ? (
              // Show the captured still while the user decides to confirm or retake.
              <img src={previewDataUrl} alt="Preview" className="w-full h-full object-contain" />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2">
            {previewDataUrl ? (
              <>
                <Button onClick={confirmCapture} className="flex-1 sm:flex-none gap-2">
                  <Camera className="h-4 w-4" />
                  Use Photo
                </Button>
                <Button variant="outline" onClick={retake} className="gap-2">
                  Retake
                </Button>
              </>
            ) : (
              <>
                <Button onClick={handleCaptureToPreview} className="w-full sm:w-auto gap-2">
                  <Camera className="h-4 w-4" />
                  Capture & Preview
                </Button>
                <Button onClick={startWebcam} variant="outline" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Restart Camera
                </Button>
              </>
            )}

            <div className="ml-auto flex gap-2">
              <Button variant="ghost" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden canvas used only for frame capture. Never rendered visibly. */}
      <canvas ref={canvasRef} className="hidden" />
    </Card>
  );
};