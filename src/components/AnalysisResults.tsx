import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { AnalysisResult } from "./ImageUpload";
import ReactMarkdown from 'react-markdown';

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
          <div className="space-y-2 w-full">
            <h4 className="font-semibold text-foreground">Analysis Summary</h4>
            <div className="text-muted-foreground prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ node, ...props }) => <h1 className="text-2xl font-bold text-foreground text-center border-b border-border pb-2 mb-4" {...props} />,
                  h2: ({ node, ...props }) => <h2 className="text-xl font-semibold text-foreground text-center border-b border-border pb-2 mb-3" {...props} />,
                  h3: ({ node, ...props }) => <h3 className="text-lg font-medium text-foreground text-center border-b border-border pb-2 mb-2" {...props} />,
                  p: ({ node, ...props }) => <p className="leading-relaxed mb-2 last:mb-0" {...props} />,
                }}
              >
                {result.visualDescription}
              </ReactMarkdown>
            </div>
          </div>
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
