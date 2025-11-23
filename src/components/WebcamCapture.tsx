import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, X, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WebcamCaptureProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
}

export const WebcamCapture = ({ onCapture, onCancel }: WebcamCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const startWebcam = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch (err) {
      console.error("Error accessing webcam:", err);
      setError("Could not access camera. Please ensure you have granted permission.");
      toast({
        title: "Camera Error",
        description: "Could not access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    startWebcam();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startWebcam]); // Added startWebcam to dependency array, though it's stable due to useCallback

  // Cleanup stream when component unmounts or stream changes
  useEffect(() => {
      return () => {
          if (stream) {
              stream.getTracks().forEach(track => track.stop());
          }
      }
  }, [stream])

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "webcam-capture.jpg", { type: "image/jpeg" });
            onCapture(file);
          }
        }, "image/jpeg", 0.95);
      }
    }
  };

  return (
    <Card className="p-4 border-2 border-dashed border-border bg-card shadow-card relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 z-10"
        onClick={onCancel}
      >
        <X className="h-5 w-5" />
      </Button>
      
      {error ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4 text-destructive">
          <AlertCircle className="h-12 w-12" />
          <p>{error}</p>
          <Button onClick={startWebcam} variant="outline">Retry</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex justify-center">
            <Button onClick={handleCapture} className="w-full sm:w-auto gap-2">
              <Camera className="h-4 w-4" />
              Capture & Analyze
            </Button>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </Card>
  );
};
