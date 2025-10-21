import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, X, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
  onAnalysisComplete: (result: AnalysisResult) => void;
  onImageSelect: (imageUrl: string) => void;
}

export interface AnalysisResult {
  visualDescription: string;
  possibilities: string[];
  concernLevel: "Low" | "Medium";
  suggestions: string[];
  disclaimer: string;
  imageUrl: string;
}

export const ImageUpload = ({ onAnalysisComplete, onImageSelect }: ImageUploadProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

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
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      processImage(file);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  const processImage = (file: File) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      setSelectedImage(imageUrl);
      onImageSelect(imageUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    try {
      const form = new FormData();
      form.append('file', selectedFile, selectedFile.name);

      const resp = await fetch(`http://localhost:${import.meta.env.VITE_DEV_SERVER_PORT || 3000}/upload`, {
        method: 'POST',
        body: form,
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(`Analysis failed: ${resp.status} ${text}`);
      }

      const json = await resp.json();

      // Server returns { imageUrl, analysis }
      const result: AnalysisResult = {
        visualDescription: typeof json.analysis === 'string' ? json.analysis : JSON.stringify(json.analysis),
        possibilities: [],
        concernLevel: 'Medium',
        suggestions: [],
        disclaimer: 'This is not medical advice. Consult a healthcare provider for diagnosis and treatment.',
        imageUrl: json.imageUrl || selectedImage,
      };

      onAnalysisComplete(result);

      toast({
        title: "Analysis Complete",
        description: "Your image has been analyzed successfully.",
      });
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: (error instanceof Error && error.message) ? error.message : "There was an error analyzing your image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card className="p-8 border-2 border-dashed border-border bg-card shadow-card">
        {!selectedImage ? (
          <div
            className={`relative transition-colors duration-200 ${
              isDragging ? 'bg-primary/5' : ''
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="p-4 bg-primary/10 rounded-full">
                <Upload className="h-12 w-12 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-foreground">Upload an image of your skin condition</h3>
                <p className="text-sm text-muted-foreground">
                  Drag and drop an image here, or click to select
                </p>
              </div>
              <Button variant="outline" onClick={() => document.getElementById('file-input')?.click()}>
                Select Image
              </Button>
              <input
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
              <button
                onClick={handleRemoveImage}
                className="absolute top-4 right-4 p-2 bg-card rounded-full shadow-elegant hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <Button
              onClick={handleAnalyze}
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
                'Analyze Image'
              )}
            </Button>
          </div>
        )}
      </Card>

      {/* Disclaimer */}
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
    </div>
  );
};
