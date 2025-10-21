import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

export type GenerationProgressState = "idle" | "running" | "completed" | "failed";

interface ProgressStep {
  label: string;
  description?: string;
}

interface GenerationProgressProps {
  steps: ProgressStep[];
  activeStep: number;
  percent: number;
  state: GenerationProgressState;
  message?: string | null;
}

const statusCopy: Record<GenerationProgressState, { title: string; tone: "default" | "success" | "destructive" }> = {
  idle: { title: "", tone: "default" },
  running: { title: "Generating concepts", tone: "default" },
  completed: { title: "Generation complete", tone: "success" },
  failed: { title: "Generation failed", tone: "destructive" },
};

export const GenerationProgress: React.FC<GenerationProgressProps> = ({
  steps,
  activeStep,
  percent,
  state,
  message,
}) => {
  if (state === "idle") {
    return null;
  }

  const icon = (() => {
    if (state === "completed") {
      return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
    }
    if (state === "failed") {
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
    return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  })();

  const { title, tone } = statusCopy[state];

  return (
    <Card className={`mb-4 border ${tone === "success" ? "border-emerald-200 bg-emerald-50/60" : tone === "destructive" ? "border-red-200 bg-red-50/60" : "border-primary/20 bg-primary/5"}`}>
      <CardContent className="pt-4 pb-5 space-y-4">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <p className="text-sm font-semibold text-neutral-dark">
              {title || "Generating concepts"}
            </p>
            {message && (
              <p className="text-xs text-neutral-medium mt-1">{message}</p>
            )}
          </div>
        </div>

        <div>
          <Progress value={Math.min(100, Math.max(0, percent))} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {percent.toFixed(0)}% complete
          </p>
        </div>

        <div className="space-y-2">
          {steps.map((step, index) => {
            const isCompleted = index < activeStep;
            const isActive = index === activeStep;
            return (
              <div
                key={step.label}
                className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs transition-colors ${
                  isActive
                    ? "border-primary/50 bg-primary/10"
                    : isCompleted
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-neutral-200 bg-white"
                }`}
              >
                <div
                  className={`mt-1 h-2.5 w-2.5 rounded-full ${
                    isCompleted ? "bg-emerald-500" : isActive ? "bg-primary" : "bg-neutral-300"
                  }`}
                />
                <div>
                  <p className={`font-medium ${isCompleted ? "text-emerald-700" : isActive ? "text-primary" : "text-neutral-dark"}`}>
                    {step.label}
                  </p>
                  {step.description && (
                    <p className="text-[11px] text-neutral-medium mt-1">{step.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
