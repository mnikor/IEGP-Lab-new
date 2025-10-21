import React, { useState } from "react";
import { StudyConcept, strategicGoalLabels } from "@/lib/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import PicoFramework from "@/components/shared/PicoFramework";
import SwotAnalysis from "@/components/shared/SwotAnalysis";
import ConfidenceLevel from "@/components/shared/ConfidenceLevel";
import ConceptRefinementChat from "@/components/concept/ConceptRefinementChat";

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
  onConceptUpdate?: (updatedConcept: StudyConcept) => void;
}

const studyImpactLabels: Record<NonNullable<StudyConcept["studyImpact"]>, string> = {
  label_expansion: "Label expansion",
  market_access_enabler: "Market access enabler",
  clinical_guideline_shift: "Clinical guideline shift",
  practice_evolution: "Practice evolution",
  market_defense: "Market defense",
  evidence_gap_fill: "Evidence gap fill",
  limited_impact: "Limited impact",
  no_material_change: "No material change",
};

const ConceptCard: React.FC<ConceptCardProps> = ({ concept, index, onConceptUpdate }) => {
  const [showFeasibilityDetails, setShowFeasibilityDetails] = useState(false);
  const recommendation = concept.mcdaScores?.commercialRecommendation;
  const alerts = concept.mcdaScores?.commercialAlerts ?? [];
  const financialSignals = concept.mcdaScores?.financialSignals;
  const windowMonths = typeof financialSignals?.windowToLoeMonths === "number" ? financialSignals.windowToLoeMonths : concept.feasibilityData?.windowToLoeMonths;
  const advisoryRoi = typeof financialSignals?.projectedROI === "number" ? financialSignals.projectedROI : null;
  const feasibilityRoi = typeof concept.feasibilityData?.projectedROI === "number" ? concept.feasibilityData.projectedROI : null;

  return (
    <Card id={concept.id ? `concept-${concept.id}` : undefined} className="border border-neutral-light rounded-lg overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Badge variant="secondary">Concept {index + 1}</Badge>
              {concept.studyImpact && studyImpactLabels[concept.studyImpact] && (
                <Badge variant="outline" className="text-xs">
                  {studyImpactLabels[concept.studyImpact]}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {concept.mcdaScores?.overall !== undefined && (
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
              )}
              <div className="flex items-center">
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
                <span className="ml-1 text-sm font-medium text-neutral-dark">
                  {concept.mcdaScores && concept.mcdaScores.overall != null 
                    ? concept.mcdaScores.overall.toFixed(1) + '/5'
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ConfidenceLevel 
                feasibilityData={concept.feasibilityData}
                mcdaScores={concept.mcdaScores}
                className="flex-shrink-0"
              />
            </div>
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

        {recommendation && (
          <div className="mb-4 border border-blue-200 bg-blue-50 rounded-md p-3">
            <h4 className="text-sm font-semibold text-blue-800">AI Commercial Recommendation</h4>
            <p className="text-sm text-blue-700 mt-1">
              Confidence: {recommendation.confidence}
            </p>
            {recommendation.windowAssessment && (
              <p className="text-sm text-blue-700 mt-1">{recommendation.windowAssessment}</p>
            )}
            {recommendation.rationale?.length > 0 && (
              <ul className="text-sm text-blue-700 mt-2 list-disc list-inside space-y-1">
                {recommendation.rationale.slice(0, 3).map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            )}
            {(feasibilityRoi !== null || advisoryRoi !== null) && (
              <div className="mt-3 grid gap-2 rounded-md bg-white/60 p-3 border border-blue-100">
                {advisoryRoi !== null && (
                  <div className="text-xs text-blue-700">
                    <span className="font-semibold">AI advisory ROI:</span> {advisoryRoi.toFixed(1)}x
                  </div>
                )}
                {feasibilityRoi !== null && (
                  <div className="text-xs text-blue-700">
                    <span className="font-semibold">Deterministic feasibility ROI:</span> {feasibilityRoi.toFixed(1)}x
                  </div>
                )}
                {advisoryRoi !== null && feasibilityRoi !== null && Math.abs(advisoryRoi - feasibilityRoi) > 0.2 && (
                  <p className="text-[11px] text-blue-600">
                    MCDA reasoning may surface upside scenarios. Use the feasibility ROI for baseline planning and treat advisory ROI as sensitivity guidance.
                  </p>
                )}
              </div>
            )}
            {Array.isArray(recommendation.blockers) && recommendation.blockers.length > 0 && (
              <div className="mt-2 text-sm text-blue-700">
                <span className="font-semibold">Key blockers:</span>
                <ul className="list-disc list-inside space-y-1">
                  {recommendation.blockers.slice(0, 3).map((blocker, idx) => (
                    <li key={idx}>{blocker}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {alerts.length > 0 && (
          <div className="mb-4 border border-red-200 bg-red-50 rounded-md p-3">
            <h4 className="text-sm font-semibold text-red-800">Commercial Alerts</h4>
            <ul className="text-sm text-red-700 mt-1 list-disc list-inside space-y-1">
              {alerts.map((alert, idx) => (
                <li key={idx}>{alert}</li>
              ))}
            </ul>
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
          {concept.feasibilityData?.expectedToplineDate && (
            <div className="p-3 border border-neutral-light rounded-md">
              <h4 className="text-sm font-medium text-neutral-dark mb-1">Expected Topline</h4>
              <span className="text-lg font-medium text-primary">
                {concept.feasibilityData.expectedToplineDate}
              </span>
              {typeof windowMonths === "number" && (
                <span className="ml-1 text-xs text-neutral-medium">
                  {windowMonths} months to LOE window
                </span>
              )}
            </div>
          )}
          {concept.feasibilityData?.plannedDbLockDate && (
            <div className="p-3 border border-neutral-light rounded-md">
              <h4 className="text-sm font-medium text-neutral-dark mb-1">Planned DB Lock</h4>
              <span className="text-lg font-medium text-primary">
                {concept.feasibilityData.plannedDbLockDate}
              </span>
            </div>
          )}
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
            estimatedFpiDate={concept.feasibilityData?.estimatedFpiDate || concept.estimatedFpiDate}
            expectedToplineDate={concept.feasibilityData?.expectedToplineDate || concept.expectedToplineDate}
            plannedDbLockDate={concept.feasibilityData?.plannedDbLockDate}
            windowToLoeMonths={concept.feasibilityData?.windowToLoeMonths}
            className="mb-6"
          />
        </div>
        
        {/* Current Evidence - Removed to avoid duplication with Situational Analysis */}

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
      
      {/* AI Refinement Chat - Only show if concept has been saved and has an ID */}
      {concept.id && onConceptUpdate && (
        <ConceptRefinementChat
          concept={concept}
          onConceptUpdate={onConceptUpdate}
        />
      )}
    </Card>
  );
};

export default ConceptCard;
