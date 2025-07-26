import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, DollarSign, Users, MapPin, Target, Clock, BookOpen } from "lucide-react";
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
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading concept details...</p>
        </div>
      </div>
    );
  }

  if (error || !concept) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">Failed to load concept details</p>
          <Link href="/generate-concept">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Concepts
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const feasibilityData = concept.feasibilityData as any;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Link href="/generate-concept">
          <Button variant="outline" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Concepts
          </Button>
        </Link>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{concept.title}</h1>
            <p className="text-lg text-muted-foreground">
              {concept.drugName} for {concept.indication}
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            Phase {concept.studyPhase}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Study Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Study Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Rationale</h4>
                <p className="text-muted-foreground leading-relaxed">
                  {concept.rationale}
                </p>
              </div>
              
              {concept.targetSubpopulation && (
                <div>
                  <h4 className="font-semibold mb-2">Target Population</h4>
                  <p className="text-muted-foreground">
                    {concept.targetSubpopulation}
                  </p>
                </div>
              )}

              {concept.comparatorDrugs && concept.comparatorDrugs.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Comparator Drugs</h4>
                  <div className="flex flex-wrap gap-2">
                    {concept.comparatorDrugs.map((drug, index) => (
                      <Badge key={index} variant="outline">{drug}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* PICO Analysis */}
          {concept.picoData && (
            <Card>
              <CardHeader>
                <CardTitle>PICO Analysis</CardTitle>
                <CardDescription>Population, Intervention, Comparator, Outcomes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(concept.picoData as any).map(([key, value]) => (
                    <div key={key}>
                      <h4 className="font-semibold mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</h4>
                      <p className="text-muted-foreground text-sm">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* SWOT Analysis */}
          {concept.swotAnalysis && (
            <Card>
              <CardContent className="pt-6">
                <SwotAnalysis swotAnalysis={concept.swotAnalysis as any} />
              </CardContent>
            </Card>
          )}

          {/* Reasons to Believe */}
          {concept.reasonsToBelieve && (
            <ReasonsToBelieve reasonsToBelieve={concept.reasonsToBelieve as any} />
          )}

          {/* MCDA Scores */}
          {concept.mcdaScores && (
            <Card>
              <CardHeader>
                <CardTitle>MCDA Assessment</CardTitle>
                <CardDescription>Multi-Criteria Decision Analysis scoring</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(concept.mcdaScores as any).map(([criterion, score]) => (
                    <div key={criterion} className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">
                        {criterion.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${Math.min(100, (Number(score) || 0) * 10)}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold w-8 text-right">
                          {typeof score === 'number' ? score.toFixed(1) : String(score)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Research Insights */}
          {relatedProposal?.researchResults && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="mr-2 h-5 w-5" />
                  Research Insights
                </CardTitle>
                <CardDescription>Market intelligence and competitive analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  {typeof relatedProposal.researchResults === 'string' ? (
                    <div dangerouslySetInnerHTML={{ __html: relatedProposal.researchResults }} />
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded">
                      {JSON.stringify(relatedProposal.researchResults, null, 2)}
                    </pre>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Strategic Goals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="mr-2 h-5 w-5" />
                Strategic Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {concept.strategicGoals.map((goal, index) => (
                  <Badge key={index} variant="secondary">
                    {goal.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Geography */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="mr-2 h-5 w-5" />
                Geographic Scope
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {concept.geography.map((region, index) => (
                  <Badge key={index} variant="outline">{region}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Key Metrics */}
        <div className="space-y-6">
          {feasibilityData && (
            <>
              {/* Cost & Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Key Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <DollarSign className="mr-2 h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Estimated Cost</span>
                    </div>
                    <span className="font-semibold">
                      {formatCurrency(feasibilityData.estimatedCost)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Clock className="mr-2 h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Timeline</span>
                    </div>
                    <span className="font-semibold">
                      {feasibilityData.timeline} months
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Users className="mr-2 h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium">Sample Size</span>
                    </div>
                    <span className="font-semibold">
                      {feasibilityData.sampleSize} patients
                    </span>
                  </div>

                  {feasibilityData.projectedROI && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Target className="mr-2 h-4 w-4 text-amber-600" />
                        <span className="text-sm font-medium">Projected ROI</span>
                      </div>
                      <span className="font-semibold">
                        {(feasibilityData.projectedROI * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Study Dates */}
              {(feasibilityData.estimatedFpiDate || feasibilityData.globalLoeDate) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Calendar className="mr-2 h-5 w-5" />
                      Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {feasibilityData.estimatedFpiDate && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">First Patient In</div>
                        <div className="font-semibold">
                          {new Date(feasibilityData.estimatedFpiDate).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                    
                    {feasibilityData.globalLoeDate && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Global LOE</div>
                        <div className="font-semibold">
                          {new Date(feasibilityData.globalLoeDate).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConceptDetailPage;