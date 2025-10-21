import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";
import type { PortfolioSummary } from "@/lib/types";

interface ConceptSummaryPanelProps {
  summary?: PortfolioSummary | null;
  onViewConcept?: (conceptId: number | string) => void;
}

const recommendationCopy: Record<PortfolioSummary["recommendation"], { badge: string; tone: "default" | "destructive" | "secondary" }> = {
  proceed: {
    badge: "Proceed",
    tone: "default",
  },
  revise: {
    badge: "Revise",
    tone: "secondary",
  },
  stop: {
    badge: "Do Not Proceed",
    tone: "destructive",
  },
};

export const ConceptSummaryPanel: React.FC<ConceptSummaryPanelProps> = ({ summary, onViewConcept }) => {
  if (!summary) {
    return null;
  }

  const recMeta = recommendationCopy[summary.recommendation];

  return (
    <Card className="mb-6 border-primary/30 bg-primary/5">
      <CardContent className="pt-6">
        <div className="grid gap-6 lg:grid-cols-[1.75fr_1.25fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-start gap-3">
              <Badge variant={recMeta.tone}>{recMeta.badge}</Badge>
              <div className="space-y-1">
                <h3 className="text-xl font-semibold leading-snug text-neutral-dark">
                  {summary.headline}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Portfolio recommendation synthesised from MCDA signals and GPT analysis.
                </p>
              </div>
            </div>

            {summary.rationale.length > 0 && (
              <div className="rounded-lg border border-primary/20 bg-white/70 p-4 shadow-sm">
                <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Why this recommendation</h4>
                <ul className="mt-3 space-y-2 text-sm text-neutral-dark">
                  {summary.rationale.map((item, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.warnings.length > 0 && (
              <Alert variant="destructive" className="border-red-300 bg-red-50/80">
                <AlertTitle className="text-sm font-semibold">Cautions before investing</AlertTitle>
                <AlertDescription>
                  <ul className="mt-2 space-y-1 text-sm">
                    {summary.warnings.map((warning, idx) => (
                      <li key={idx} className="leading-snug">
                        {warning}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-4 rounded-lg border border-primary/20 bg-white/60 p-4 shadow-sm">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Portfolio highlights</h4>
              <p className="mt-2 text-sm text-muted-foreground">
                Quick links into the most actionable concepts based on their financial and strategic signals.
              </p>
            </div>

            <div className="space-y-3">
              {summary.highlights.map((highlight) => (
                <div key={highlight.conceptId} className="rounded-md border border-primary/10 bg-white/60 p-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-neutral-dark">
                        {highlight.title}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground leading-snug">
                        {highlight.summary}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="self-start"
                      onClick={() => onViewConcept?.(highlight.conceptId)}
                    >
                      View concept
                      <ArrowUpRight className="ml-1.5 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
;

export default ConceptSummaryPanel;
