import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { AnalysisResult } from "./ImageUpload";

interface AnalysisResultsProps {
  result: AnalysisResult;
}

export const AnalysisResults = ({ result }: AnalysisResultsProps) => {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Image Preview */}
      <Card className="p-4 shadow-card">
        <img
          src={result.imageUrl}
          alt="Analyzed skin condition"
          className="w-full h-auto max-h-64 object-contain rounded-lg"
        />
      </Card>

      {/* Concern Level */}
      <Card className="p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-foreground">Analysis Summary</h3>
          <Badge
            variant={result.concernLevel === "Low" ? "secondary" : "default"}
            className={
              result.concernLevel === "Low"
                ? "bg-secondary text-secondary-foreground"
                : "bg-warning text-warning-foreground"
            }
          >
            {result.concernLevel} Concern Level
          </Badge>
        </div>
      </Card>

      {/* Visual Description */}
      <Card className="p-6 shadow-card">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">Visual Description</h4>
            <p className="text-muted-foreground">{result.visualDescription}</p>
          </div>
        </div>
      </Card>

      {/* Possibilities */}
      <Card className="p-6 shadow-card">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-accent" />
            <h4 className="font-semibold text-foreground">Possible Conditions</h4>
          </div>
          <ul className="space-y-2">
            {result.possibilities.map((possibility, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span className="text-muted-foreground">{possibility}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground italic">
            Note: These are general possibilities based on visual characteristics only. 
            A healthcare professional can provide accurate diagnosis.
          </p>
        </div>
      </Card>

      {/* Suggestions */}
      <Card className="p-6 shadow-card">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-secondary" />
            <h4 className="font-semibold text-foreground">General Care Suggestions</h4>
          </div>
          <ul className="space-y-3">
            {result.suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="mt-1 h-1.5 w-1.5 rounded-full bg-secondary flex-shrink-0" />
                <span className="text-muted-foreground">{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      {/* Disclaimer */}
      <Card className="p-6 bg-warning/5 border-warning/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">Medical Disclaimer</h4>
            <p className="text-sm text-muted-foreground">{result.disclaimer}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
