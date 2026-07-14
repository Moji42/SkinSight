import { Button } from "@/components/ui/button";
import { AlertCircle, Shield } from "lucide-react";

interface HeroProps {
  onGetStarted: () => void;
}

export const Hero = ({ onGetStarted }: HeroProps) => {
  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      {/* Header */}
      <header className="w-full py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">MediQuip</h1>
          </div>
        </div>
      </header>

      {/* Hero Content */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
              AI-Powered Skin Irritation
              <span className="block bg-gradient-primary bg-clip-text text-transparent">
                Analysis & Education
              </span>
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Get instant, AI-driven educational insights about common skin conditions like cuts, burns, and bug bites
            </p>
          </div>

          {/* Disclaimer Banner */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-card max-w-2xl mx-auto">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="text-left space-y-2">
                <h3 className="font-semibold text-foreground">Important Medical Disclaimer</h3>
                <p className="text-sm text-muted-foreground">
                  MediQuip provides general educational information only and is not a substitute for professional medical advice, 
                  diagnosis, or treatment. Always consult a qualified healthcare provider for medical concerns.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <div className="pt-4">
            <Button 
              onClick={onGetStarted}
              size="lg"
              className="text-lg px-8 py-6 shadow-elegant hover:shadow-xl transition-all duration-300"
            >
              Get Started
            </Button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8 max-w-3xl mx-auto">
            <div className="bg-card rounded-xl p-6 shadow-card border border-border">
              <div className="text-primary text-3xl mb-3">🔍</div>
              <h3 className="font-semibold text-foreground mb-2">AI Vision Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Advanced AI analyzes your images to provide educational insights
              </p>
            </div>
            <div className="bg-card rounded-xl p-6 shadow-card border border-border">
              <div className="text-secondary text-3xl mb-3">💬</div>
              <h3 className="font-semibold text-foreground mb-2">Interactive Chat</h3>
              <p className="text-sm text-muted-foreground">
                Ask follow-up questions and get detailed explanations
              </p>
            </div>
            <div className="bg-card rounded-xl p-6 shadow-card border border-border">
              <div className="text-accent text-3xl mb-3">🛡️</div>
              <h3 className="font-semibold text-foreground mb-2">Safe & Educational</h3>
              <p className="text-sm text-muted-foreground">
                General guidance focused on education, never medical advice
              </p>
            </div>
          </div>
        </div>
      </div>

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
