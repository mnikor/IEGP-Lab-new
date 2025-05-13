import React from "react";
import { StudyConcept } from "@/lib/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import PicoFramework from "@/components/shared/PicoFramework";
import SwotAnalysis from "@/components/shared/SwotAnalysis";
import FeasibilityChart from "@/components/shared/FeasibilityChart";

interface ConceptCardProps {
  concept: StudyConcept;
  index: number;
}

const ConceptCard: React.FC<ConceptCardProps> = ({ concept, index }) => {
  return (
    <Card className="border border-neutral-light rounded-lg overflow-hidden">
      <CardHeader className="bg-neutral-lightest p-4 border-b border-neutral-light flex flex-row items-center justify-between">
        <div className="flex items-center">
          <span className="text-lg font-medium text-primary">Concept {index}</span>
          <Badge variant="secondary" className="ml-3 bg-blue-100 text-primary">
            Phase {concept.studyPhase === "any" ? "Any" : concept.studyPhase}
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center">
            <Star className="h-5 w-5 text-yellow-400 fill-current" />
            <span className="ml-1 text-sm font-medium text-neutral-dark">
              {concept.mcdaScores.overall.toFixed(1)}/5
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <h3 className="text-lg font-medium text-neutral-dark mb-2">{concept.title}</h3>
        
        {/* PICO Framework */}
        <PicoFramework picoData={concept.picoData} className="mb-4" />

        {/* Scores */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-neutral-dark mb-2">MCDA Scores</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-blue-50 rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-medium">Scientific Validity</span>
                <span className="text-sm font-medium text-primary">
                  {concept.mcdaScores.scientificValidity.toFixed(1)}/5
                </span>
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-medium">Clinical Impact</span>
                <span className="text-sm font-medium text-primary">
                  {concept.mcdaScores.clinicalImpact.toFixed(1)}/5
                </span>
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-medium">Commercial Value</span>
                <span className="text-sm font-medium text-primary">
                  {concept.mcdaScores.commercialValue.toFixed(1)}/5
                </span>
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-medium">Feasibility</span>
                <span className="text-sm font-medium text-primary">
                  {concept.mcdaScores.feasibility.toFixed(1)}/5
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-neutral-dark mb-2">Feasibility Analysis</h4>
          <FeasibilityChart feasibilityData={concept.feasibilityData} />
        </div>

        {/* SWOT Analysis */}
        <SwotAnalysis swotAnalysis={concept.swotAnalysis} className="mb-4" />

        {/* Economics Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="p-3 border border-neutral-light rounded-md">
            <h4 className="text-sm font-medium text-neutral-dark mb-1">Estimated Cost</h4>
            <div className="flex items-baseline">
              <span className="text-lg font-medium text-primary">
                €{(concept.feasibilityData.estimatedCost / 1000000).toFixed(1)}M
              </span>
              {concept.budgetCeilingEur && (
                <span className="ml-1 text-xs text-neutral-medium">
                  ({concept.feasibilityData.estimatedCost <= concept.budgetCeilingEur ? "within budget" : "over budget"})
                </span>
              )}
            </div>
          </div>
          <div className="p-3 border border-neutral-light rounded-md">
            <h4 className="text-sm font-medium text-neutral-dark mb-1">Timeline</h4>
            <div className="flex items-baseline">
              <span className="text-lg font-medium text-primary">
                {concept.feasibilityData.timeline} months
              </span>
              <span className="ml-1 text-xs text-neutral-medium">(from initiation)</span>
            </div>
          </div>
          <div className="p-3 border border-neutral-light rounded-md">
            <h4 className="text-sm font-medium text-neutral-dark mb-1">Projected ROI</h4>
            <div className="flex items-baseline">
              <span className="text-lg font-medium text-primary">
                {concept.feasibilityData.projectedROI.toFixed(1)}x
              </span>
              <span className="ml-1 text-xs text-neutral-medium">(5-year model)</span>
            </div>
          </div>
        </div>

        {/* Evidence Sources */}
        <div>
          <h4 className="text-sm font-medium text-neutral-dark mb-2">Evidence Sources</h4>
          <div className="text-xs text-neutral-medium space-y-1">
            {concept.evidenceSources.map((source, i) => (
              <p key={i}>{i + 1}. {source.citation}</p>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConceptCard;
