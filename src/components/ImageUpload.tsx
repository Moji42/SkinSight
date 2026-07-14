import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Loader2, AlertCircle, Camera, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { WebcamCapture } from "./WebcamCapture";

interface ImageUploadProps {
  onAnalysisComplete: (result: AnalysisResult) => void;
  onImageSelect: (imageUrl: string) => void;
}

interface PossibleCondition {
  condition: string;
  description: string;
}

export interface AnalysisResult {
  visualDescription: string;
  possibilities: PossibleCondition[];
  concernLevel: "Low" | "Medium" | "High";
  suggestions: string[];
  disclaimer: string;
  imageUrl: string;
}

export const ImageUpload = ({ onAnalysisComplete, onImageSelect }: ImageUploadProps) => {
  const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB cap
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  // --- helpers ---
  const showError = (title: string, description?: string) =>
    toast({ title, description, variant: "destructive" });

  const validateFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      showError("Unsupported file type", "Please upload an image — JPG, PNG, WEBP, and most other image formats work.");
      return false;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      showError("Image is too large", `Please upload an image under ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.`);
      return false;
    }
    return true;
  };

  // client-side compression: if image > 2MB, downscale to lower quality
  const compressIfNeeded = async (file: File) : Promise<Blob> => {
    if (file.size <= 2 * 1024 * 1024) return file; // under 2MB: skip
    return new Promise<Blob>((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 1600; // clamp large images
        let w = img.width;
        let h = img.height;
        if (Math.max(w, h) > maxDim) {
          const scale = maxDim / Math.max(w, h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("Canvas not supported"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (!blob) {
            reject(new Error("Compression failed"));
            return;
          }
          resolve(blob);
        }, "image/jpeg", 0.85);
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(new Error("Image load error"));
      };
      img.src = url;
    });
  };

  // convert blob/dataURL to File for upload
  const blobToFile = (blob: Blob, name = `upload-${Date.now()}.jpg`) =>
    new File([blob], name, { type: blob.type || "image/jpeg" });

  // read file as dataURL and set preview
  const setPreviewFromFile = (file: File | Blob) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      setSelectedImage(imageUrl);
      onImageSelect(imageUrl);
    };
    reader.onerror = () => showError("Preview failed", "Couldn't show a preview of that image. Please try a different file.");
    reader.readAsDataURL(file);
  };

  // process image chosen either by file input/drop/webcam
  const processImage = async (file: File) => {
    if (!validateFile(file)) return;
    try {
      // compress if needed (returns Blob)
      const blob = await compressIfNeeded(file);
      const finalFile = blob instanceof File ? blob : blobToFile(blob, file.name);
      setSelectedFile(finalFile);
      setPreviewFromFile(finalFile);
    } catch (err) {
      console.error("Process image error:", err);
      showError("Image processing failed", "Something went wrong while preparing your image. Please try a different file.");
    }
  };

  // --- drag & drop handlers ---
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processImage(file);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
  };

  // --- analysis with upload progress via XHR ---
  const analyzeFile = async (file: File) => {
    setIsAnalyzing(true);
    setUploadProgress(0);
    try {
      const form = new FormData();
      form.append("file", file, file.name);

      // prefer XHR to report upload progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const apiBase = import.meta.env.VITE_API_URL ?? `http://localhost:${import.meta.env.VITE_DEV_SERVER_PORT ?? 3000}`;
        xhr.open("POST", `${apiBase}/upload`, true);

        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            const pct = Math.round((ev.loaded / ev.total) * 100);
            setUploadProgress(pct);
          }
        };

        xhr.onload = () => {
          setUploadProgress(null);
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const json = JSON.parse(xhr.responseText);
              // build AnalysisResult from server response
              const result: AnalysisResult = {
                visualDescription: json.visualDescription || json.fullAnalysis || "No description provided.",
                possibilities: json.possibilities || [],
                concernLevel: json.concernLevel,
                suggestions: json.suggestions || [],
                disclaimer: "This is not medical advice. Please consult a healthcare provider.",
                imageUrl: json.imageUrl || selectedImage || "",
              };
              onAnalysisComplete(result);
              toast({ title: "Analysis complete", description: "Image analyzed successfully." });
              resolve();
              //console.log(json.concernLevel)
            } catch (err) {
              reject(new Error("Invalid server response"));
            }
          } else {
            reject(new Error(`Server returned ${xhr.status}: ${xhr.responseText}`));
          }
        };

        xhr.onerror = () => {
          setUploadProgress(null);
          reject(new Error("Upload failed due to network error"));
        };

        xhr.send(form);
      });
    } catch (err) {
      console.error("Analysis error:", err);
      showError("Analysis failed", "Couldn't analyze the image. Please check your connection and try again.");
    } finally {
      setIsAnalyzing(false);
      setUploadProgress(null);
    }
  };

  // called when webcam returns a file
  const handleWebcamCapture = (file: File) => {
    setShowWebcam(false);
    processImage(file);
    // if autoAnalyze is true, processImage does analyze
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setSelectedFile(null);
    setUploadProgress(null);
  };
  

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {showWebcam ? (
        <div className="w-full max-w-4xl mx-auto space-y-6">
          <WebcamCapture onCapture={handleWebcamCapture} onCancel={() => setShowWebcam(false)} />
        </div>
      ) : (
        <>
          <Card className="p-4 sm:p-8 border-2 border-dashed border-border bg-card shadow-card">
            {!selectedImage ? (
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    fileInputRef.current?.click();
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative transition-colors duration-200 rounded-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary p-6 ${isDragging ? "bg-primary/5" : ""}`}
              >
                <div className="flex flex-col items-center justify-center py-8 sm:py-12 space-y-4">
                  <div className="p-4 bg-primary/10 rounded-full">
                    <Upload className="h-12 w-12 text-primary" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">Upload an image of your skin condition</h3>
                    <p className="text-sm text-muted-foreground">
                      Drag and drop an image here, or click to select
                    </p>
                  </div>
                  <div className="grid w-full max-w-xl grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    <Button className="w-full" variant="outline" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                      Select Image
                    </Button>
                    <Button className="w-full" variant="outline" onClick={(e) => { e.stopPropagation(); setShowWebcam(true); }}>
                      <Camera className="mr-2 h-4 w-4" />
                      Use Webcam
                    </Button>
                  </div>
                  <input
                    ref={fileInputRef}
                    id="file-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-lg overflow-hidden bg-muted">
                  <img
                    src={selectedImage}
                    alt="Selected skin condition"
                    className="w-full h-auto max-h-96 object-contain"
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button variant="destructive" onClick={handleRemoveImage} title="Remove image">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </div>

                <div className="flex items-center justify-end">
                  <div className="text-sm text-muted-foreground">
                    {uploadProgress !== null ? `Uploading: ${uploadProgress}%` : isAnalyzing ? "Analyzing..." : ""}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => selectedFile && analyzeFile(selectedFile)}
                    disabled={isAnalyzing}
                    className="w-full"
                    size="lg"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      "Analyze Image"
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => { setSelectedImage(null); setSelectedFile(null); }}>
                    Replace
                  </Button>
                </div>

                {uploadProgress !== null && (
                  <div className="w-full bg-muted rounded h-2 overflow-hidden">
                    <div className="h-2 bg-primary transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card className="p-6 bg-warning/5 border-warning/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-foreground">Before you proceed:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• This tool provides educational information only</li>
                  <li>• Not a substitute for professional medical advice</li>
                  <li>• For serious concerns, consult a healthcare provider immediately</li>
                  <li>• Your images are analyzed securely and not permanently stored</li>
                </ul>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
