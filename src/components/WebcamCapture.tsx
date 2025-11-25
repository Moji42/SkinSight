import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, X, AlertCircle, Repeat, Download, RefreshCw, RotateCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WebcamCaptureProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
}

export const WebcamCapture = ({ onCapture, onCancel }: WebcamCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  // Keep a ref to the current MediaStream to avoid stale closures when
  // stopping/starting tracks from inside callbacks.
  const currentStreamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const { toast } = useToast();

  // Start or restart webcam when facingMode changes
  const startWebcam = useCallback(async () => {
    // Stop any existing stream (use ref to avoid stale closure problems)
    if (currentStreamRef.current) {
      currentStreamRef.current.getTracks().forEach((t) => t.stop());
      currentStreamRef.current = null;
      setStream(null);
    }

    setLoading(true);
    setError(null);
    try {
      // request camera with facing mode preference
      const constraints: MediaStreamConstraints = {
        video: { facingMode },
        audio: false,
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      // store on ref and state
      currentStreamRef.current = mediaStream;
      setStream(mediaStream);

      // attach to video element immediately
      if (videoRef.current) {
        try {
          // some browsers require direct assignment
          // and playing only after srcObject is set
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play();
        } catch (playErr) {
          // If autoplay is blocked, keep the stream attached and
          // the UI shows the user can manually allow play.
          // We'll not throw here; instead rely on visible error if needed.
          // console.debug('Auto-play blocked or play failed', playErr);
        }
      }
      setError(null);
    } catch (err) {
      console.error("Error accessing webcam:", err);
      setError("Could not access camera. Please ensure permissions are granted and try again.");
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]); // only restart when facingMode toggles

  // start webcam on mount and when facingMode changes
  useEffect(() => {
    startWebcam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startWebcam]);

  // Cleanup when unmounting
  useEffect(() => {
    return () => {
      if (currentStreamRef.current) {
        currentStreamRef.current.getTracks().forEach((track) => track.stop());
        currentStreamRef.current = null;
        setStream(null);
      }
    };
    // run only on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ensure the video element is attached to the current stream and try to play
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // attach srcObject when stream state changes
    if (stream) {
      try {
        if (video.srcObject !== stream) {
          video.srcObject = stream;
        }
      } catch (err) {
        // ignore
      }

      const onLoaded = async () => {
        try {
          await video.play();
        } catch {
          // autoplay might be blocked; userStart fallback exists
        }
      };

      video.addEventListener("loadedmetadata", onLoaded);
      return () => {
        video.removeEventListener("loadedmetadata", onLoaded);
      };
    }
  }, [stream]);

  const handleCaptureToPreview = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas to video dimensions
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    canvas.width = w;
    canvas.height = h;

    ctx.drawImage(video, 0, 0, w, h);

    // Create preview data URL and pause stream visually by showing preview
    try {
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      setPreviewDataUrl(dataUrl);
      // pause video element so preview is shown instead of moving video underneath
      video.pause();
      // we intentionally do not stop the camera tracks so user can retake quickly
    } catch (err) {
      console.error("Preview error:", err);
      setError("Failed to create preview. Try again.");
    }
  };

  const confirmCapture = () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob(
      (blob) => {
        if (!blob) {
          setError("Failed to create image file.");
          return;
        }
        const file = new File([blob], `webcam-capture-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        // call parent callback that will likely upload / analyze
        onCapture(file);
        // clear preview and stop camera
        setPreviewDataUrl(null);
        if (currentStreamRef.current) {
          currentStreamRef.current.getTracks().forEach((t) => t.stop());
          currentStreamRef.current = null;
          setStream(null);
        }
      },
      "image/jpeg",
      0.95
    );
  };

  const retake = () => {
    setPreviewDataUrl(null);
    if (videoRef.current) {
      // resume video playback
      try {
        videoRef.current.play();
      } catch {
        // ignore
      }
    }
  };

  // Debug info to help identify why video might be blank in some environments.
  const [debugInfo, setDebugInfo] = useState({ active: false, tracks: 0, width: 0, height: 0 });
  useEffect(() => {
    const id = setInterval(() => {
      const s = currentStreamRef.current;
      const active = !!s?.active;
      const tracks = s ? s.getTracks().length : 0;
      const width = videoRef.current?.videoWidth || 0;
      const height = videoRef.current?.videoHeight || 0;
      setDebugInfo((prev) => {
        if (prev.active === active && prev.tracks === tracks && prev.width === width && prev.height === height)
          return prev;
        return { active, tracks, width, height };
      });
    }, 500);
    return () => clearInterval(id);
  }, []);

  // Show a user-initiated start button when stream is active but video has no frames
  const [showStartButton, setShowStartButton] = useState(false);
  useEffect(() => {
    // if stream is active but video dimensions are zero, suggest user action
    if (debugInfo.active && debugInfo.tracks > 0 && debugInfo.width === 0 && debugInfo.height === 0) {
      setShowStartButton(true);
    } else {
      setShowStartButton(false);
    }
  }, [debugInfo]);

  const handleUserStart = async () => {
    try {
      if (videoRef.current) {
        await videoRef.current.play();
      }
      // re-attach/play by restarting webcam as a fallback
      if ((!videoRef.current || (videoRef.current && (videoRef.current.videoWidth === 0 && videoRef.current.videoHeight === 0))) && currentStreamRef.current) {
        // try re-assigning srcObject and play
        if (videoRef.current) videoRef.current.srcObject = currentStreamRef.current;
        try {
          await videoRef.current?.play();
        } catch {
          // if still failing, try to re-request camera
          await startWebcam();
        }
      }
    } catch (err) {
      // best-effort: if play fails, try restarting webcam which will trigger permission prompts again
      // eslint-disable-next-line no-console
      console.debug("User start failed, attempting restart:", err);
      try {
        await startWebcam();
      } catch {
        // ignore
      }
    }
  };

  const downloadPreview = () => {
    if (!previewDataUrl) return;
    // create anchor and click
    const a = document.createElement("a");
    a.href = previewDataUrl;
    a.download = `webcam-preview-${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleFlip = () => {
    setFacingMode((f) => (f === "user" ? "environment" : "user"));
    setPreviewDataUrl(null);
  };

  const handleRetry = () => {
    setError(null);
    startWebcam();
  };

  return (
    <Card className="p-4 border-2 border-dashed border-border bg-card shadow-card relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 z-10"
        onClick={() => {
          // ensure tracks are stopped when closing
          if (currentStreamRef.current) {
            currentStreamRef.current.getTracks().forEach((t) => t.stop());
            currentStreamRef.current = null;
            setStream(null);
          }
          onCancel();
        }}
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
              <Button
                onClick={() => {
                  // small convenience: re-start webcam in case it froze
                  startWebcam();
                }}
                variant="outline"
                size="sm"
                title="Restart camera"
                aria-label="Restart camera"
              >
                <Repeat className="h-4 w-4 mr-2" />
                Restart
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              {loading ? "Starting camera..." : facingMode === "user" ? "Front camera" : "Back camera"}
            </div>
          </div>

          <div className="relative rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center">
            {/* Debug overlay: shows stream/video state to help diagnose blank video */}
            <div
              aria-hidden
              className="absolute top-2 left-2 z-20 pointer-events-none"
            >
              <div className="bg-black/60 text-white text-xs rounded px-2 py-1">
                <div>stream: {debugInfo.active ? "active" : "inactive"}</div>
                <div>tracks: {debugInfo.tracks}</div>
                <div>video: {debugInfo.width}x{debugInfo.height}</div>
              </div>
            </div>

            {/* User-start button (appears when stream is active but video has no frames) */}
            {showStartButton && (
              <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-auto">
                <button
                  onClick={handleUserStart}
                  className="bg-white/90 text-black px-4 py-2 rounded shadow"
                >
                  Click to start camera
                </button>
              </div>
            )}
            {/* Video or preview */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <svg
                  className="animate-spin h-8 w-8"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="mt-2">Starting camera...</div>
              </div>
            ) : previewDataUrl ? (
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
                <Button variant="ghost" onClick={downloadPreview} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download
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
              <Button variant="ghost" onClick={() => {
                if (currentStreamRef.current) {
                  currentStreamRef.current.getTracks().forEach(t => t.stop());
                  currentStreamRef.current = null;
                  setStream(null);
                }
                onCancel();
              }}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </Card>
  );
};
