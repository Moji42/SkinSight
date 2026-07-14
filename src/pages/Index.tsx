import { useState } from "react";
import { Hero } from "@/components/Hero";
import { ImageUpload, AnalysisResult } from "@/components/ImageUpload";
import { AnalysisResults } from "@/components/AnalysisResults";
import { ChatInterface } from "@/components/ChatInterface";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";

type AppState = "hero" | "upload" | "results" | "chat";

const Index = () => {
  const [appState, setAppState] = useState<AppState>("hero");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [currentImage, setCurrentImage] = useState<string>("");

  const handleGetStarted = () => {
    setAppState("upload");
  };

  const handleAnalysisComplete = (result: AnalysisResult) => {
    setAnalysisResult(result);
    setAppState("results");
  };

  const handleImageSelect = (imageUrl: string) => {
    setCurrentImage(imageUrl);
  };

  const handleBack = () => {
    if (appState === "results" || appState === "chat") {
      setAppState("upload");
      setAnalysisResult(null);
    } else if (appState === "upload") {
      setAppState("hero");
    }
  };

  const handleAskQuestions = () => {
    setAppState("chat");
  };

  if (appState === "hero") {
    return <Hero onGetStarted={handleGetStarted} />;
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      {/* Header */}
      <header className="w-full py-6 px-4 sm:px-6 lg:px-8 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="hover:bg-primary/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">SkinSight</h1>
            </div>
          </div>
          {appState === "results" && (
            <Button onClick={handleAskQuestions} variant="outline">
              Ask Questions
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
        {appState === "upload" && (
          <ImageUpload
            onAnalysisComplete={handleAnalysisComplete}
            onImageSelect={handleImageSelect}
          />
        )}
        {appState === "results" && analysisResult && (
          <AnalysisResults result={analysisResult} />
        )}
        {appState === "chat" && (
          <ChatInterface imageContext={analysisResult?.visualDescription} />
        )}
      </main>

      <footer className="w-full py-6 px-4 sm:px-6 lg:px-8 border-t border-border bg-card/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto text-center space-y-2 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">An AI Society project for the Maker Space at Arizona State University</p>
          <p className="flex flex-wrap justify-center gap-x-3 gap-y-1">
            <a href="mailto:yhmohame@asu.edu" className="hover:text-primary transition-colors">yhmohame@asu.edu</a>
            <a href="mailto:sambari1@asu.edu" className="hover:text-primary transition-colors">sambari1@asu.edu</a>
            <a href="mailto:knazarov@asu.edu" className="hover:text-primary transition-colors">knazarov@asu.edu</a>
            <a href="mailto:nrmohame@asu.edu" className="hover:text-primary transition-colors">nrmohame@asu.edu</a>
          </p>
          <p>
            <a href="https://github.com/PandaCoder123/SkinSight" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">
              github.com/PandaCoder123/SkinSight
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
