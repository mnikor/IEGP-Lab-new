import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SituationalAnalysisModal } from "@/components/concept/SituationalAnalysisModal";
import { ArrowLeft, BookOpen, Search, Calendar, TrendingUp, Star } from "lucide-react";
import { Link } from "wouter";
import SwotAnalysis from "@/components/shared/SwotAnalysis";
import ReasonsToBelieve from "@/components/shared/ReasonsToBelieve";
import LoeDetails from "@/components/shared/LoeDetails";
import FeasibilityDashboard from "@/components/shared/FeasibilityDashboard";
import ConfidenceLevel from "@/components/shared/ConfidenceLevel";
import type { StudyConcept, SavedStudyProposal } from "@shared/schema";

const ConceptDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [showSituationalAnalysis, setShowSituationalAnalysis] = useState(false);
  
  const { data: concept, isLoading, error } = useQuery({
    queryKey: ['/api/study-concepts', parseInt(id!)],
    queryFn: async (): Promise<StudyConcept> => {
      const response = await fetch(`/api/study-concepts/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch concept details');
      }
      return response.json();
    },
    enabled: !!id
  });

  // Try to find related saved proposals that might contain research insights
  const { data: savedProposals } = useQuery({
    queryKey: ['/api/saved-proposals'],
    queryFn: async (): Promise<SavedStudyProposal[]> => {
      const response = await fetch('/api/saved-proposals');
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Find proposal that contains this concept
  const relatedProposal = savedProposals?.find(proposal => {
    if (!Array.isArray(proposal.generatedConcepts) || !concept?.id) return false;
    
    // Ensure both IDs are compared as the same type (number)
    const conceptId = typeof concept.id === 'string' ? parseInt(concept.id) : concept.id;
    return proposal.generatedConcepts.some((c: any) => {
      const savedConceptId = typeof c.id === 'string' ? parseInt(c.id) : c.id;
      return savedConceptId === conceptId;
    });
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Loading concept details...</div>
        </div>
      </div>
    );
  }

  if (error || !concept) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-600">
            {error ? 'Error loading concept details' : 'Concept not found'}
          </div>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
      return `€${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `€${(amount / 1000).toFixed(0)}K`;
    } else {
      return `€${amount.toLocaleString()}`;
    }
  };

  const feasibilityData = concept.feasibilityData as any;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Link href="/generate-concept">
          <Button variant="outline" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Concepts
          </Button>
        </Link>
      </div>

      <Card className="border border-neutral-light rounded-lg overflow-hidden">
        <CardHeader className="bg-neutral-lightest p-4 border-b border-neutral-light flex flex-row items-center justify-between">
          <div className="flex items-center">
            <span className="text-lg font-medium text-primary">{concept.title}</span>
            <Badge variant="secondary" className="ml-3 bg-blue-100 text-primary">
              Phase {concept.studyPhase === "any" ? "Any" : concept.studyPhase}
            </Badge>
          </div>
          <div className="flex items-center space-x-4">
            {/* Situational Analysis Button - if research data available */}
            {relatedProposal?.researchResults && (
              <Button 
                variant="outline" 
                size="sm"
                className="flex items-center space-x-2"
                onClick={() => setShowSituationalAnalysis(true)}
              >
                <Search className="h-4 w-4" />
                <span>Situational Analysis</span>
              </Button>
            )}
            
            {/* Confidence Level */}
            <ConfidenceLevel 
              feasibilityData={concept.feasibilityData}
              mcdaScores={concept.mcdaScores}
              className="flex-shrink-0"
            />
            
            {/* Overall Score */}
            {concept.mcdaScores && (concept.mcdaScores as any).overall != null && (
              <div className="flex items-center">
                <Star className="h-5 w-5 text-yellow-400 fill-current" />
                <span className="ml-1 text-sm font-medium text-neutral-dark">
                  {(concept.mcdaScores as any).overall.toFixed(1) + '/5'}
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-lg text-muted-foreground mb-4">
            {concept.drugName} for {concept.indication}
          </p>
          
          {/* Strategic Goals */}
          {concept.strategicGoals && concept.strategicGoals.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {concept.strategicGoals.map((goal, index) => (
                <Badge key={index} variant="secondary" className="bg-blue-100 text-primary">
                  {goal.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
              ))}
            </div>
          )}
          
          {/* Reasons to Believe - First after title, just like original */}
          {concept.reasonsToBelieve && (
            <div className="mb-4">
              <ReasonsToBelieve reasonsToBelieve={concept.reasonsToBelieve as any} />
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
          {concept.picoData && (
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <h4 className="text-sm font-medium text-neutral-dark">PICO Framework</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 border border-gray-100 rounded-md">
                  <h5 className="text-xs font-medium text-secondary mb-1">Population</h5>
                  <p className="text-xs text-neutral-medium">{(concept.picoData as any).population || 'Not specified'}</p>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-100 rounded-md">
                  <h5 className="text-xs font-medium text-secondary mb-1">Intervention</h5>
                  <p className="text-xs text-neutral-medium">{(concept.picoData as any).intervention || 'Not specified'}</p>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-100 rounded-md">
                  <h5 className="text-xs font-medium text-secondary mb-1">Comparator</h5>
                  <p className="text-xs text-neutral-medium">{(concept.picoData as any).comparator || 'Not specified'}</p>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-100 rounded-md">
                  <h5 className="text-xs font-medium text-secondary mb-1">Outcomes</h5>
                  <p className="text-xs text-neutral-medium">{(concept.picoData as any).outcomes || 'Not specified'}</p>
                </div>
              </div>
            </div>
          )}

          {/* MCDA Scores */}
          {concept.mcdaScores && (
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <h4 className="text-sm font-medium text-neutral-dark">MCDA Assessment</h4>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-blue-50 rounded-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-medium">Scientific Validity</span>
                    <span className="text-sm font-medium text-primary">
                      {(concept.mcdaScores as any).scientificValidity != null 
                        ? (concept.mcdaScores as any).scientificValidity.toFixed(1) + '/5'
                        : 'N/A'}
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-blue-50 rounded-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-medium">Clinical Impact</span>
                    <span className="text-sm font-medium text-primary">
                      {(concept.mcdaScores as any).clinicalImpact != null 
                        ? (concept.mcdaScores as any).clinicalImpact.toFixed(1) + '/5'
                        : 'N/A'}
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-blue-50 rounded-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-medium">Commercial Value</span>
                    <span className="text-sm font-medium text-primary">
                      {(concept.mcdaScores as any).commercialValue != null 
                        ? (concept.mcdaScores as any).commercialValue.toFixed(1) + '/5'
                        : 'N/A'}
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-blue-50 rounded-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-medium">Feasibility</span>
                    <span className="text-sm font-medium text-primary">
                      {(concept.mcdaScores as any).feasibility != null 
                        ? (concept.mcdaScores as any).feasibility.toFixed(1) + '/5'
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SWOT Analysis */}
          {concept.swotAnalysis && (
            <div className="mb-4">
              <SwotAnalysis swotAnalysis={concept.swotAnalysis as any} />
            </div>
          )}

          {/* LOE Details - Timeline information */}
          <div className="mb-4">
            <LoeDetails 
              globalLoeDate={(concept as any).globalLoeDate || feasibilityData?.globalLoeDate}
              regionalLoeData={feasibilityData?.regionalLoeData}
              timeToLoe={(concept as any).timeToLoe || feasibilityData?.timeToLoe}
              postLoeValue={feasibilityData?.postLoeValue}
              estimatedFpiDate={feasibilityData?.estimatedFpiDate}
            />
          </div>

          {/* Feasibility Dashboard - Comprehensive analysis */}
          {feasibilityData && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-neutral-dark flex items-center">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Feasibility Analysis
                </h4>
              </div>
              <div className="border rounded-md p-3 bg-blue-50/30">
                <FeasibilityDashboard feasibilityData={feasibilityData} />
              </div>
            </div>
          )}

          {/* Study Overview Details */}
          <div className="mb-4">
            <div className="bg-gray-50 border border-gray-100 rounded-md p-3">
              <h4 className="text-sm font-semibold text-gray-800 mb-2">Study Rationale</h4>
              <p className="text-sm text-gray-700 leading-relaxed">{(concept as any).rationale || 'No rationale provided'}</p>
            </div>
          </div>

          {/* Target Population & Comparators */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {concept.targetSubpopulation && (
              <div className="bg-gray-50 border border-gray-100 rounded-md p-3">
                <h4 className="text-sm font-semibold text-gray-800 mb-2">Target Population</h4>
                <p className="text-sm text-gray-700">{concept.targetSubpopulation}</p>
              </div>
            )}
            
            {concept.comparatorDrugs && concept.comparatorDrugs.length > 0 && (
              <div className="bg-gray-50 border border-gray-100 rounded-md p-3">
                <h4 className="text-sm font-semibold text-gray-800 mb-2">Comparator Drugs</h4>
                <div className="flex flex-wrap gap-2">
                  {concept.comparatorDrugs.map((drug, index) => (
                    <Badge key={index} variant="outline" className="text-xs">{drug}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Geography */}
          {concept.geography && concept.geography.length > 0 && (
            <div className="mb-4">
              <div className="bg-gray-50 border border-gray-100 rounded-md p-3">
                <h4 className="text-sm font-semibold text-gray-800 mb-2">Geographic Scope</h4>
                <div className="flex flex-wrap gap-2">
                  {concept.geography.map((region, index) => (
                    <Badge key={index} variant="outline" className="text-xs">{region}</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Feasibility Data Sidebar-style content at bottom */}
          {feasibilityData && (
            <div className="bg-blue-50 border border-blue-100 rounded-md p-4">
              <h4 className="text-sm font-semibold text-blue-800 mb-3">Feasibility Metrics</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-xs text-blue-600 mb-1">Estimated Cost</div>
                  <div className="text-sm font-semibold text-blue-800">
                    {formatCurrency(feasibilityData.estimatedCost)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-blue-600 mb-1">Timeline</div>
                  <div className="text-sm font-semibold text-blue-800">
                    {feasibilityData.timeline} months
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-blue-600 mb-1">Sample Size</div>
                  <div className="text-sm font-semibold text-blue-800">
                    {feasibilityData.sampleSize} patients
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-blue-600 mb-1">Projected ROI</div>
                  <div className="text-sm font-semibold text-blue-800">
                    {feasibilityData.projectedROI ? `${feasibilityData.projectedROI}%` : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          )}


        </CardContent>
      </Card>

      {/* Situational Analysis Modal */}
      {relatedProposal?.researchResults && (
        <SituationalAnalysisModal
          isOpen={showSituationalAnalysis}
          onClose={() => setShowSituationalAnalysis(false)}
          drugName={concept.drugName}
          indication={concept.indication}
          researchResults={Array.isArray(relatedProposal.researchResults) ? relatedProposal.researchResults : []}
          isLoading={false}
        />
      )}
    </div>
  );
};

export default ConceptDetailPage;