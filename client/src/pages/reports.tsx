import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Eye, Trash2, Calendar, MapPin, Target } from "lucide-react";
import { Link } from "wouter";
import { StudyConcept, ValidationResults } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface SavedStudyProposal {
  id: number;
  title: string;
  drugName: string;
  indication: string;
  strategicGoals: string[];
  geography: string[];
  researchStrategyId?: number;
  generatedConcepts: any[];
  conceptCount: number;
  userInputs?: any;
  researchResults?: any;
  createdAt: string;
  updatedAt: string;
}

const Reports: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: concepts, isLoading: loadingConcepts } = useQuery<StudyConcept[]>({
    queryKey: ["/api/study-concepts"],
  });

  const { data: validations, isLoading: loadingValidations } = useQuery<ValidationResults[]>({
    queryKey: ["/api/synopsis-validations"],
  });

  const { data: savedProposals, isLoading: loadingSavedProposals } = useQuery<SavedStudyProposal[]>({
    queryKey: ["/api/saved-proposals"],
    queryFn: async () => {
      const response = await fetch('/api/saved-proposals');
      if (!response.ok) throw new Error('Failed to fetch proposals');
      return response.json();
    }
  });

  const deleteProposalMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/saved-proposals/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete proposal');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-proposals'] });
      toast({
        title: "Success",
        description: "Study proposal deleted successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete proposal",
        variant: "destructive"
      });
    }
  });

  // Filter out concepts that are already part of saved proposals
  const conceptsInProposals = React.useMemo(() => {
    if (!savedProposals) return new Set<number>();
    const conceptIds = new Set<number>();
    savedProposals.forEach(proposal => {
      proposal.generatedConcepts?.forEach(concept => {
        if (concept.id) conceptIds.add(concept.id);
      });
    });
    return conceptIds;
  }, [savedProposals]);

  const filteredConcepts = React.useMemo(() => {
    if (!concepts) return [];
    return concepts.filter(concept => !conceptsInProposals.has(concept.id));
  }, [concepts, conceptsInProposals]);

  const handleDownloadPDF = async (proposal: SavedStudyProposal) => {
    try {
      console.log('Starting PDF download for proposal:', proposal.id);
      const response = await fetch(`/api/saved-proposals/${proposal.id}/pdf`);
      console.log('PDF response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('PDF generation failed:', errorText);
        throw new Error(`Failed to generate PDF: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      console.log('PDF blob size:', blob.size);
      
      if (blob.size === 0) {
        throw new Error('Generated PDF is empty');
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      // Clean filename to avoid special characters
      const cleanFilename = `${proposal.drugName.replace(/[^a-zA-Z0-9]/g, '_')}_${proposal.indication.replace(/[^a-zA-Z0-9]/g, '_')}_study_proposal.pdf`;
      a.download = cleanFilename;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
      
      toast({
        title: "Success",
        description: "PDF downloaded successfully"
      });
    } catch (error) {
      console.error('PDF download error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download PDF",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-dark">Reports</h1>
        <p className="text-neutral-medium mt-1">Access and manage your generated reports</p>
      </div>

      {/* Saved Proposals Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Saved Proposals</h2>
        <div className="grid gap-4">
          {loadingSavedProposals ? (
            <p>Loading saved proposals...</p>
          ) : savedProposals && savedProposals.length > 0 ? (
            savedProposals.map((proposal) => (
                  <Card key={proposal.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl mb-2">{proposal.title}</CardTitle>
                          <div className="flex flex-wrap gap-2 mb-3">
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              {proposal.drugName}
                            </Badge>
                            <Badge variant="outline">{proposal.indication}</Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          Created {format(new Date(proposal.createdAt), 'MMM d, yyyy')}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {proposal.geography.join(', ')}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Target className="h-4 w-4" />
                          {proposal.generatedConcepts.length} Concepts Generated
                        </div>
                      </div>
                      
                      {proposal.strategicGoals && proposal.strategicGoals.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium mb-2">Strategic Goals:</p>
                          <div className="flex flex-wrap gap-1">
                            {proposal.strategicGoals.map((goal, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {goal.replace('_', ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>

                    <CardFooter className="flex justify-between pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.href = `/concept/${proposal.generatedConcepts[0]?.id}`}
                      >
                        <Eye className="mr-1 h-4 w-4" />
                        View Details
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadPDF(proposal)}
                        >
                          <Download className="mr-1 h-4 w-4" />
                          Download PDF
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Study Proposal</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{proposal.title}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteProposalMutation.mutate(proposal.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center h-64">
                    <Target className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Saved Proposals</h3>
                    <p className="text-muted-foreground text-center">
                      Generate study concepts to automatically save proposals here
                    </p>
                  </CardContent>
                </Card>
              )}
        </div>
      </div>

      {/* Other Reports Section */}
      <div className="mb-6 border-b border-neutral-light">
        <Tabs defaultValue="concepts">
          <TabsList className="border-b-0">
            <TabsTrigger value="concepts">Generated Concepts</TabsTrigger>
            <TabsTrigger value="validations">Validated Synopses</TabsTrigger>
          </TabsList>
          <TabsContent value="concepts">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {loadingConcepts ? (
                <p>Loading concepts...</p>
              ) : filteredConcepts && filteredConcepts.length > 0 ? (
                filteredConcepts.map((concept) => (
                  <Card key={concept.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{concept.title}</CardTitle>
                      <CardDescription>
                        {concept.drugName} | {concept.indication}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="flex items-center mb-2">
                        <span className="text-xs font-medium bg-blue-100 text-primary px-2 py-0.5 rounded-full">
                          Phase {concept.studyPhase === "any" ? "Any" : concept.studyPhase}
                        </span>
                        <span className="ml-2 text-xs text-neutral-medium">
                          {concept.createdAt ? new Date(concept.createdAt).toLocaleDateString() : ""}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-medium truncate">
                        {concept.picoData.population.substring(0, 100)}...
                      </p>
                    </CardContent>
                    <CardFooter className="flex justify-between pt-2">
                      <Link href={`/concept/${concept.id}`}>
                        <Button variant="ghost" size="sm"><Eye className="mr-1 h-4 w-4" /> View</Button>
                      </Link>
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="sm"><Download className="mr-1 h-4 w-4" /> PDF</Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <div className="col-span-3 text-center py-10">
                  <p className="text-neutral-medium mb-4">No concepts found</p>
                  <Link href="/generate-concept">
                    <Button>Generate New Concept</Button>
                  </Link>
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="validations">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {loadingValidations ? (
                <p>Loading validations...</p>
              ) : validations && validations.length > 0 ? (
                validations.map((validation) => (
                  <Card key={validation.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{validation.title}</CardTitle>
                      <CardDescription>
                        File: {validation.originalFileName}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="mb-2">
                        <span className="text-xs text-neutral-medium">
                          {validation.createdAt ? new Date(validation.createdAt).toLocaleDateString() : ""}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="font-medium">Risk Flags:</span> {validation.riskFlags.length}
                        </div>
                        <div>
                          <span className="font-medium">Deltas:</span> {validation.benchmarkDeltas.length}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between pt-2">
                      <Link href={`/validation/${validation.id}`}>
                        <Button variant="ghost" size="sm"><Eye className="mr-1 h-4 w-4" /> View</Button>
                      </Link>
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="sm"><Download className="mr-1 h-4 w-4" /> PDF</Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <div className="col-span-3 text-center py-10">
                  <p className="text-neutral-medium mb-4">No validations found</p>
                  <Link href="/validate-synopsis">
                    <Button>Validate New Synopsis</Button>
                  </Link>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default Reports;
