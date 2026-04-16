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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const { toast } = useToast();

  // Start or restart webcam when facingMode changes
  const startWebcam = useCallback(async () => {
    // Stop current stream if exists before starting new one
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }

    setLoading(true);
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // try to play if needed (some browsers require user action)
        try {
          await videoRef.current.play();
        } catch {
          // ignore
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
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
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
        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
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
          if (stream) {
            stream.getTracks().forEach((t) => t.stop());
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
                if (stream) {
                  stream.getTracks().forEach(t => t.stop());
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
