import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Link } from "wouter";
import SwotAnalysis from "@/components/shared/SwotAnalysis";
import ReasonsToBelieve from "@/components/shared/ReasonsToBelieve";
import type { StudyConcept, SavedStudyProposal } from "@shared/schema";

const ConceptDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
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
  const relatedProposal = savedProposals?.find(proposal => 
    Array.isArray(proposal.generatedConcepts) && 
    proposal.generatedConcepts.some((c: any) => c.id === concept?.id)
  );

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
            {concept.mcdaScores && (
              <div className="flex items-center">
                <span className="ml-1 text-sm font-medium text-neutral-dark">
                  {concept.mcdaScores.overall != null 
                    ? concept.mcdaScores.overall.toFixed(1) + '/5'
                    : 'N/A'}
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
                      {concept.mcdaScores.scientificValidity != null 
                        ? concept.mcdaScores.scientificValidity.toFixed(1) + '/5'
                        : 'N/A'}
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-blue-50 rounded-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-medium">Clinical Impact</span>
                    <span className="text-sm font-medium text-primary">
                      {concept.mcdaScores.clinicalImpact != null 
                        ? concept.mcdaScores.clinicalImpact.toFixed(1) + '/5'
                        : 'N/A'}
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-blue-50 rounded-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-medium">Commercial Value</span>
                    <span className="text-sm font-medium text-primary">
                      {concept.mcdaScores.commercialValue != null 
                        ? concept.mcdaScores.commercialValue.toFixed(1) + '/5'
                        : 'N/A'}
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-blue-50 rounded-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-medium">Feasibility</span>
                    <span className="text-sm font-medium text-primary">
                      {concept.mcdaScores.feasibility != null 
                        ? concept.mcdaScores.feasibility.toFixed(1) + '/5'
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

          {/* Study Overview Details */}
          <div className="mb-4">
            <div className="bg-gray-50 border border-gray-100 rounded-md p-3">
              <h4 className="text-sm font-semibold text-gray-800 mb-2">Study Rationale</h4>
              <p className="text-sm text-gray-700 leading-relaxed">{concept.rationale}</p>
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

          {/* Research Insights */}
          {relatedProposal?.researchResults && (
            <div className="mt-4 bg-green-50 border border-green-100 rounded-md p-4">
              <h4 className="text-sm font-semibold text-green-800 mb-3 flex items-center">
                <BookOpen className="mr-2 h-4 w-4" />
                Research Insights
              </h4>
              <div className="prose prose-sm max-w-none">
                {typeof relatedProposal.researchResults === 'string' ? (
                  <div dangerouslySetInnerHTML={{ __html: relatedProposal.researchResults }} />
                ) : (
                  <pre className="whitespace-pre-wrap text-xs bg-white p-3 rounded border">
                    {JSON.stringify(relatedProposal.researchResults, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConceptDetailPage;