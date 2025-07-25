import React, { useState } from "react";
import { StudyConcept, strategicGoalLabels } from "@/lib/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import PicoFramework from "@/components/shared/PicoFramework";
import SwotAnalysis from "@/components/shared/SwotAnalysis";
import ConfidenceLevel from "@/components/shared/ConfidenceLevel";

import FeasibilityDashboard from "@/components/shared/FeasibilityDashboard";
import CurrentEvidence from "@/components/shared/CurrentEvidence";
import LoeDetails from "@/components/shared/LoeDetails";
import ReasonsToBelieve from "@/components/shared/ReasonsToBelieve";
// Debug import to check feasibility data
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ConceptCardProps {
  concept: StudyConcept;
  index: number;
}

const ConceptCard: React.FC<ConceptCardProps> = ({ concept, index }) => {
  const [showFeasibilityDetails, setShowFeasibilityDetails] = useState(false);
  
  return (
    <Card className="border border-neutral-light rounded-lg overflow-hidden">
      <CardHeader className="bg-neutral-lightest p-4 border-b border-neutral-light flex flex-row items-center justify-between">
        <div className="flex items-center">
          <span className="text-lg font-medium text-primary">Concept {index}</span>
          <Badge variant="secondary" className="ml-3 bg-blue-100 text-primary">
            Phase {concept.studyPhase === "any" ? "Any" : concept.studyPhase}
          </Badge>
        </div>
        <div className="flex items-center space-x-4">
          <ConfidenceLevel 
            feasibilityData={concept.feasibilityData}
            mcdaScores={concept.mcdaScores}
            className="flex-shrink-0"
          />
          <div className="flex items-center">
            <Star className="h-5 w-5 text-yellow-400 fill-current" />
            <span className="ml-1 text-sm font-medium text-neutral-dark">
              {concept.mcdaScores && concept.mcdaScores.overall != null 
                ? concept.mcdaScores.overall.toFixed(1) + '/5'
                : 'N/A'}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <h3 className="text-lg font-medium text-neutral-dark mb-2">{concept.title}</h3>
        
        {/* Strategic Goals */}
        <div className="flex flex-wrap gap-2 mb-3">
          {concept.strategicGoals?.map((goal, index) => (
            <Badge key={index} variant="secondary" className="bg-blue-100 text-primary">
              {goal === "other" && concept.otherStrategicGoalText
                ? `Other: ${concept.otherStrategicGoalText}`
                : strategicGoalLabels[goal] || goal.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </Badge>
          ))}
        </div>
        
        {/* Reasons to Believe - Prominent placement */}
        {concept.reasonsToBelieve && (
          <div className="mb-4">
            <ReasonsToBelieve reasonsToBelieve={concept.reasonsToBelieve} />
          </div>
        )}

        {/* Knowledge Gap & Innovation Justification */}
        {(concept.knowledgeGapAddressed || concept.innovationJustification) && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
            {concept.knowledgeGapAddressed && (
              <div className="mb-2">
                <h4 className="text-sm font-semibold text-amber-800">Knowledge Gap Addressed:</h4>
                <p className="text-sm text-amber-700">{concept.knowledgeGapAddressed}</p>
              </div>
            )}
            {concept.innovationJustification && (
              <div>
                <h4 className="text-sm font-semibold text-amber-800">Innovation Value:</h4>
                <p className="text-sm text-amber-700">{concept.innovationJustification}</p>
              </div>
            )}
          </div>
        )}
        
        {/* PICO Framework */}
        <PicoFramework picoData={concept.picoData} className="mb-4" />

        {/* Scores */}
        <div className="mb-4">
          <div className="flex items-center mb-2">
            <h4 className="text-sm font-medium text-neutral-dark">MCDA Scores</h4>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="ml-1 inline-flex text-neutral-medium cursor-help">
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-semibold">Multi-Criteria Decision Analysis</p>
                  <p className="text-xs mt-1">Evaluates study concepts across multiple dimensions:</p>
                  <ul className="text-xs mt-1 list-disc pl-4 space-y-1">
                    <li><span className="font-medium">Scientific Validity:</span> Soundness of methodology and design</li>
                    <li><span className="font-medium">Clinical Impact:</span> Potential effect on patient outcomes</li>
                    <li><span className="font-medium">Commercial Value:</span> Business implications and ROI</li>
                    <li><span className="font-medium">Feasibility:</span> Practicality of execution</li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-blue-50 rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-medium">Scientific Validity</span>
                <span className="text-sm font-medium text-primary">
                  {concept.mcdaScores && concept.mcdaScores.scientificValidity != null 
                    ? concept.mcdaScores.scientificValidity.toFixed(1) + '/5'
                    : 'N/A'}
                </span>
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-medium">Clinical Impact</span>
                <span className="text-sm font-medium text-primary">
                  {concept.mcdaScores && concept.mcdaScores.clinicalImpact != null 
                    ? concept.mcdaScores.clinicalImpact.toFixed(1) + '/5'
                    : 'N/A'}
                </span>
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-medium">Commercial Value</span>
                <span className="text-sm font-medium text-primary">
                  {concept.mcdaScores && concept.mcdaScores.commercialValue != null 
                    ? concept.mcdaScores.commercialValue.toFixed(1) + '/5'
                    : 'N/A'}
                </span>
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-medium">Feasibility</span>
                <span className="text-sm font-medium text-primary">
                  {concept.mcdaScores && concept.mcdaScores.feasibility != null 
                    ? concept.mcdaScores.feasibility.toFixed(1) + '/5'
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Feasibility Analysis */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-neutral-dark">Feasibility Analysis</h4>
          </div>
          
          {/* Always show both chart and detailed view */}
          <div className="flex flex-col space-y-4">
            {/* Summary Chart */}
            {/* Feasibility Dashboard */}
            <div className="border rounded-md p-3 bg-blue-50/30">
              <FeasibilityDashboard feasibilityData={concept.feasibilityData} />
            </div>
          </div>
        </div>

        {/* Study Design Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="p-3 border border-neutral-light rounded-md">
            <h4 className="text-sm font-medium text-neutral-dark mb-1">Sample Size</h4>
            <div className="flex items-baseline">
              <span className="text-lg font-medium text-primary">
                {concept.feasibilityData && concept.feasibilityData.sampleSize != null
                  ? `${concept.feasibilityData.sampleSize} patients`
                  : 'N/A'}
              </span>
            </div>
          </div>
          <div className="p-3 border border-neutral-light rounded-md">
            <h4 className="text-sm font-medium text-neutral-dark mb-1">Sites Required</h4>
            <div className="flex items-baseline">
              <span className="text-lg font-medium text-primary">
                {concept.feasibilityData && concept.feasibilityData.numberOfSites != null
                  ? `${concept.feasibilityData.numberOfSites} sites`
                  : 'N/A'}
              </span>
              {concept.feasibilityData && concept.feasibilityData.numberOfCountries != null && (
                <span className="ml-1 text-xs text-neutral-medium">
                  across {concept.feasibilityData.numberOfCountries} countries
                </span>
              )}
            </div>
          </div>
          <div className="p-3 border border-neutral-light rounded-md">
            <h4 className="text-sm font-medium text-neutral-dark mb-1">Estimated Cost</h4>
            <div className="flex items-baseline">
              <span className="text-lg font-medium text-primary">
                {concept.feasibilityData && concept.feasibilityData.estimatedCost != null
                  ? `€${(concept.feasibilityData.estimatedCost / 1000000).toFixed(1)}M`
                  : 'N/A'}
              </span>
              {concept.budgetCeilingEur && concept.feasibilityData && concept.feasibilityData.estimatedCost != null && (
                <span className="ml-1 text-xs text-neutral-medium">
                  ({concept.feasibilityData.estimatedCost <= concept.budgetCeilingEur ? "within budget" : "over budget"})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* SWOT Analysis */}
        <SwotAnalysis swotAnalysis={concept.swotAnalysis} className="mb-4" />

        {/* LOE Details */}
        <div className="mb-4">
          {/* Debug logging using a self-executing function to avoid React node issues */}
          {(() => {
            console.log('ConceptCard LOE data:', {
              topLevelGlobalLoeDate: concept.globalLoeDate,
              topLevelTimeToLoe: concept.timeToLoe,
              nestedGlobalLoeDate: concept.feasibilityData?.globalLoeDate,
              nestedTimeToLoe: concept.feasibilityData?.timeToLoe
            });
            return null;
          })()}
          <LoeDetails 
            // First try the top-level value, then try the nested value
            globalLoeDate={concept.globalLoeDate || concept.feasibilityData?.globalLoeDate}
            regionalLoeData={concept.feasibilityData?.regionalLoeData}
            timeToLoe={concept.timeToLoe || concept.feasibilityData?.timeToLoe}
            postLoeValue={concept.feasibilityData?.postLoeValue}
            estimatedFpiDate={concept.feasibilityData?.estimatedFpiDate}
          />
        </div>
        
        {/* Current Evidence */}
        {concept.currentEvidence && (
          <div className="mb-4">
            <CurrentEvidence currentEvidence={concept.currentEvidence} />
          </div>
        )}

        {/* Evidence Sources - Compact View */}
        <div>
          <h4 className="text-sm font-medium text-neutral-dark mb-2">Evidence Sources</h4>
          <div className="text-xs text-neutral-medium">
            <p className="text-gray-600">
              {concept.evidenceSources.length} sources referenced. 
              <span className="text-blue-600 ml-1 cursor-pointer">View full analysis in Situational Analysis →</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConceptCard;
