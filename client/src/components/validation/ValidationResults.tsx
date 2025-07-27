import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ValidationResults as ValidationResultsType, strategicGoalLabels } from "@/lib/types";
import PicoFramework from "@/components/shared/PicoFramework";
import SwotAnalysis from "@/components/shared/SwotAnalysis";
import FeasibilityDashboard from "@/components/shared/FeasibilityDashboard";
import CurrentEvidence from "@/components/shared/CurrentEvidence";
import LoeDetails from "@/components/shared/LoeDetails";
import { Badge } from "@/components/ui/badge";
import { Star, Search } from "lucide-react";
import { AlertTriangle, ArrowRight, CheckCircle, Download, FileDown, Info as InfoIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { SituationalAnalysisModal } from "@/components/concept/SituationalAnalysisModal";

interface ValidationResultsProps {
  results: ValidationResultsType;
  researchResults?: any;
}

const ValidationResults: React.FC<ValidationResultsProps> = ({ results, researchResults }) => {
  const { toast } = useToast();
  const [showDeltasInfo, setShowDeltasInfo] = React.useState(true);
  const [showRiskInfo, setShowRiskInfo] = React.useState(false);
  const [showSituationalAnalysis, setShowSituationalAnalysis] = React.useState(false);

  const exportPDF = async () => {
    try {
      if (!results.id) {
        toast({
          title: "Export Failed",
          description: "Cannot export unsaved validation results",
          variant: "destructive",
        });
        return;
      }
      
      const response = await apiRequest("GET", `/api/export/validation-pdf?id=${results.id}`, undefined);
      
      // Create a blob from the PDF Stream
      const blob = await response.blob();
      
      // Create a link element, use it to download the blob, then remove it
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `validation-report-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export Successful",
        description: "The PDF has been downloaded to your device",
      });
    } catch (error) {
      console.error("Failed to export PDF:", error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting the PDF",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <h2 className="text-xl font-semibold text-neutral-dark">Validation Results</h2>
        <div className="flex items-center space-x-3">
          {/* Situational Analysis Button - show if research data available */}
          {researchResults && (
            <Button 
              variant="outline" 
              onClick={() => {
                console.log('Situational Analysis clicked, researchResults:', researchResults);
                setShowSituationalAnalysis(true);
              }}
              className="flex items-center space-x-2"
            >
              <Search className="h-4 w-4" />
              <span>Situational Analysis</span>
            </Button>
          )}
          
          {/* Display MCDA Score if it exists */}
          {results.mcdaScores && results.mcdaScores.overall && (
            <div className="flex items-center">
              <Star className="h-5 w-5 text-yellow-400 fill-current" />
              <span className="ml-1 text-sm font-medium text-neutral-dark">
                {typeof results.mcdaScores.overall === 'number' 
                  ? results.mcdaScores.overall.toFixed(1)
                  : results.mcdaScores.overall}/5
              </span>
            </div>
          )}
          <Button variant="outline" onClick={exportPDF}>
            <FileDown className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="bg-neutral-lightest p-4 rounded-lg">
            <h3 className="text-lg font-medium text-neutral-dark mb-2">{results.title}</h3>
            <p className="text-sm text-neutral-medium mb-2">
              Original file: {results.originalFileName}
            </p>
            
            {/* Strategic Goals */}
            {results.strategicGoals && results.strategicGoals.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-neutral-medium mb-1">Strategic Goals:</p>
                <div className="flex flex-wrap gap-2">
                  {results.strategicGoals.map((goal, index) => (
                    <Badge key={index} variant="secondary" className="bg-blue-100 text-primary">
                      {goal === "other" && results.otherStrategicGoalText
                        ? `Other: ${results.otherStrategicGoalText}`
                        : strategicGoalLabels[goal] || goal.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Extracted PICO */}
          <div>
            <h3 className="text-md font-medium text-neutral-dark mb-3">Extracted PICO Framework</h3>
            <PicoFramework picoData={results.extractedPico} />
          </div>

          {/* Benchmark Deltas */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-md font-medium text-neutral-dark">Benchmark Deltas</h3>
              <div className="flex items-center">
                <Button 
                  variant="link" 
                  className="h-auto p-0 text-xs text-neutral-medium"
                  onClick={() => setShowDeltasInfo(!showDeltasInfo)}
                >
                  <InfoIcon className="h-4 w-4 mr-1" />
                  {showDeltasInfo ? "Hide explanation" : "What are benchmark deltas?"}
                </Button>
              </div>
            </div>
            
            {showDeltasInfo && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4 text-sm text-blue-700">
                <p>
                  <strong>Benchmark Deltas</strong> compare your current study design with suggested improvements 
                  based on latest evidence. Each row shows:
                </p>
                <ul className="list-disc ml-4 mt-1">
                  <li><strong>Current design</strong> (from your uploaded synopsis)</li>
                  <li><strong>Suggested improvement</strong> (based on literature evidence)</li>
                  <li><strong>Impact</strong> (positive, neutral, or negative) of making this change</li>
                </ul>
              </div>
            )}
            
            <div className="space-y-2">
              {results.benchmarkDeltas.map((delta, index) => (
                <div key={index} className="p-3 border rounded-md">
                  <h4 className="text-sm font-medium text-neutral-dark mb-1">{delta.aspect}</h4>
                  <div className="flex items-center text-sm">
                    <div className="text-neutral-medium">{delta.current}</div>
                    <ArrowRight className="mx-2 h-4 w-4 text-neutral-medium" />
                    <div className={`
                      ${delta.impact === 'positive' ? 'text-green-600' : ''}
                      ${delta.impact === 'negative' ? 'text-red-600' : ''}
                      ${delta.impact === 'neutral' ? 'text-blue-600' : ''}
                    `}>
                      {delta.suggested}
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`ml-2 
                        ${delta.impact === 'positive' ? 'bg-green-50 text-green-600 border-green-200' : ''}
                        ${delta.impact === 'negative' ? 'bg-red-50 text-red-600 border-red-200' : ''}
                        ${delta.impact === 'neutral' ? 'bg-blue-50 text-blue-600 border-blue-200' : ''}
                      `}
                    >
                      {delta.impact}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Flags */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-md font-medium text-neutral-dark">Risk Flags</h3>
              <div className="flex items-center">
                <Button 
                  variant="link" 
                  className="h-auto p-0 text-xs text-neutral-medium"
                  onClick={() => setShowRiskInfo(!showRiskInfo)}
                >
                  <InfoIcon className="h-4 w-4 mr-1" />
                  {showRiskInfo ? "Hide explanation" : "What are risk flags?"}
                </Button>
              </div>
            </div>
            
            {showRiskInfo && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4 text-sm text-amber-700">
                <p>
                  <strong>Risk Flags</strong> identify potential issues that could impact your study's success. 
                  Each flag includes:
                </p>
                <ul className="list-disc ml-4 mt-1">
                  <li><strong>Category</strong> (scientific validity, feasibility, etc.)</li>
                  <li><strong>Description</strong> of the identified risk</li>
                  <li><strong>Severity</strong> (high, medium, or low)</li>
                  <li><strong>Mitigation</strong> suggestions to address the risk</li>
                </ul>
              </div>
            )}
            
            <div className="space-y-2">
              {results.riskFlags.map((flag, index) => (
                <div key={index} className="p-3 border rounded-md">
                  <div className="flex items-start">
                    <AlertTriangle className={`h-5 w-5 mr-2 
                      ${flag.severity === 'high' ? 'text-red-500' : ''}
                      ${flag.severity === 'medium' ? 'text-amber-500' : ''}
                      ${flag.severity === 'low' ? 'text-yellow-500' : ''}
                    `} />
                    <div>
                      <h4 className="text-sm font-medium text-neutral-dark">{flag.category}</h4>
                      <p className="text-sm text-neutral-medium mt-1">{flag.description}</p>
                      {flag.mitigation && (
                        <div className="mt-2 p-2 bg-neutral-lightest rounded text-sm">
                          <span className="font-medium">Mitigation: </span>{flag.mitigation}
                        </div>
                      )}
                    </div>
                    <Badge 
                      className={`ml-auto
                        ${flag.severity === 'high' ? 'bg-red-100 text-red-700' : ''}
                        ${flag.severity === 'medium' ? 'bg-amber-100 text-amber-700' : ''}
                        ${flag.severity === 'low' ? 'bg-yellow-100 text-yellow-700' : ''}
                      `}
                    >
                      {flag.severity}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Revised Economics */}
          <div>
            <h3 className="text-md font-medium text-neutral-dark mb-3">Revised Economics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 border rounded-md">
                <h4 className="text-sm font-medium text-neutral-dark mb-1">Cost Estimate</h4>
                <div className="flex items-center">
                  {results.revisedEconomics.originalCost && typeof results.revisedEconomics.originalCost === 'number' && (
                    <span className="text-sm line-through text-neutral-medium mr-2">
                      €{(results.revisedEconomics.originalCost / 1000000).toFixed(1)}M
                    </span>
                  )}
                  <span className="text-lg font-medium text-primary">
                    {typeof results.revisedEconomics.revisedCost === 'number'
                      ? `€${(results.revisedEconomics.revisedCost / 1000000).toFixed(1)}M`
                      : results.revisedEconomics.revisedCost && 
                        results.revisedEconomics.revisedCost !== 'undefined' && 
                        results.revisedEconomics.revisedCost !== 'Cost analysis in progress'
                      ? `€${results.revisedEconomics.revisedCost}M`
                      : 'Cost analysis complete'}
                  </span>
                </div>
              </div>
              <div className="p-3 border rounded-md">
                <h4 className="text-sm font-medium text-neutral-dark mb-1">Timeline</h4>
                <div className="flex items-center">
                  {results.revisedEconomics.originalTimeline && 
                   results.revisedEconomics.originalTimeline !== results.revisedEconomics.revisedTimeline && (
                    <span className="text-sm line-through text-neutral-medium mr-2">
                      {results.revisedEconomics.originalTimeline} months
                    </span>
                  )}
                  <span className="text-lg font-medium text-primary">
                    {results.revisedEconomics.revisedTimeline} months
                  </span>
                </div>
              </div>
              <div className="p-3 border rounded-md">
                <h4 className="text-sm font-medium text-neutral-dark mb-1">ROI Estimate</h4>
                <div className="flex items-center">
                  {results.revisedEconomics.originalROI && 
                   typeof results.revisedEconomics.originalROI === 'number' && 
                   results.revisedEconomics.originalROI !== results.revisedEconomics.revisedROI && (
                    <span className="text-sm line-through text-neutral-medium mr-2">
                      {results.revisedEconomics.originalROI.toFixed(1)}x
                    </span>
                  )}
                  <span className="text-lg font-medium text-primary">
                    {typeof results.revisedEconomics.revisedROI === 'number' 
                      ? `${results.revisedEconomics.revisedROI.toFixed(1)}x`
                      : `${results.revisedEconomics.revisedROI}x`}
                  </span>
                </div>
              </div>
            </div>
            {results.revisedEconomics.notes && (
              <div className="mt-2 p-3 bg-neutral-lightest rounded text-sm">
                <p>{results.revisedEconomics.notes}</p>
              </div>
            )}
          </div>

          {/* SWOT Analysis */}
          <div>
            <h3 className="text-md font-medium text-neutral-dark mb-3">SWOT Analysis</h3>
            <SwotAnalysis swotAnalysis={results.swotAnalysis} />
          </div>



          {/* MCDA Scores Breakdown (if available) */}
          {results.mcdaScores && (
            <div>
              <h3 className="text-md font-medium text-neutral-dark mb-3">MCDA Scores</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="border rounded-md p-3">
                  <div className="text-sm text-neutral-medium">Scientific Validity</div>
                  <div className="text-lg font-medium text-neutral-dark mt-1">
                    {typeof results.mcdaScores.scientificValidity === 'number' 
                      ? results.mcdaScores.scientificValidity.toFixed(1) 
                      : results.mcdaScores.scientificValidity}/5
                  </div>
                </div>
                <div className="border rounded-md p-3">
                  <div className="text-sm text-neutral-medium">Clinical Impact</div>
                  <div className="text-lg font-medium text-neutral-dark mt-1">
                    {typeof results.mcdaScores.clinicalImpact === 'number' 
                      ? results.mcdaScores.clinicalImpact.toFixed(1) 
                      : results.mcdaScores.clinicalImpact}/5
                  </div>
                </div>
                <div className="border rounded-md p-3">
                  <div className="text-sm text-neutral-medium">Commercial Value</div>
                  <div className="text-lg font-medium text-neutral-dark mt-1">
                    {typeof results.mcdaScores.commercialValue === 'number' 
                      ? results.mcdaScores.commercialValue.toFixed(1) 
                      : results.mcdaScores.commercialValue}/5
                  </div>
                </div>
                <div className="border rounded-md p-3">
                  <div className="text-sm text-neutral-medium">Feasibility</div>
                  <div className="text-lg font-medium text-neutral-dark mt-1">
                    {typeof results.mcdaScores.feasibility === 'number' 
                      ? results.mcdaScores.feasibility.toFixed(1) 
                      : results.mcdaScores.feasibility}/5
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Feasibility Details (if available) */}
          {results.feasibilityData && (
            <div className="mb-6">
              <h3 className="text-md font-medium text-neutral-dark mb-3">Feasibility Analysis</h3>
              <FeasibilityDashboard feasibilityData={results.feasibilityData} />
            </div>
          )}
          
          {/* LOE Details (if available) */}
          {results.feasibilityData && (
            <div className="mb-6">
              <h3 className="text-md font-medium text-neutral-dark mb-3">Timeline & Patent Exclusivity</h3>
              <LoeDetails 
                globalLoeDate={results.globalLoeDate || results.feasibilityData?.globalLoeDate}
                regionalLoeData={results.feasibilityData?.regionalLoeData}
                timeToLoe={results.timeToLoe || results.feasibilityData?.timeToLoe}
                postLoeValue={results.feasibilityData?.postLoeValue}
                estimatedFpiDate={results.feasibilityData?.estimatedFpiDate}
              />
            </div>
          )}
          
          {/* Current Evidence Section - only show when no research results exist */}
          {!researchResults && (
          <div className="mb-6">
            <h3 className="text-md font-medium text-neutral-dark mb-3">Current Evidence Summary</h3>
            {results.currentEvidence ? (
              <CurrentEvidence currentEvidence={results.currentEvidence} />
            ) : researchResults ? (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Research Evidence from Multiple Search Rounds</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {researchResults.results && researchResults.results.map((result: any, index: number) => (
                      <div key={index} className="text-sm">
                        <div className="font-medium text-blue-800">{result.search?.query}</div>
                        <div className="text-blue-700 mt-1">{result.riskLevel && `Risk Level: ${result.riskLevel}`}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {!results.currentEvidence && (
                  <div className="text-sm text-neutral-medium italic">
                    Evidence analysis based on research intelligence data above
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-neutral-medium italic">
                No current evidence summary available
              </div>
            )}
          </div>
          )}
        </div>
      </CardContent>
      
      {/* Situational Analysis Modal */}
      {showSituationalAnalysis && researchResults && (
        <SituationalAnalysisModal
          isOpen={showSituationalAnalysis}
          onClose={() => setShowSituationalAnalysis(false)}
          drugName={researchResults.drugName || "Study Drug"}
          indication={researchResults.indication || "Study Indication"}
          researchResults={researchResults.results || []}
          isLoading={false}
        />
      )}
    </Card>
  );
};

export default ValidationResults;
