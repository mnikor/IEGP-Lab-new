import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Eye, Calendar, MapPin, Target, FlaskConical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

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

export default function SavedProposalsPage() {
  const [selectedProposal, setSelectedProposal] = useState<SavedStudyProposal | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: proposals, isLoading } = useQuery({
    queryKey: ['/api/saved-proposals'],
    queryFn: async (): Promise<SavedStudyProposal[]> => {
      const response = await fetch('/api/saved-proposals');
      if (!response.ok) throw new Error('Failed to fetch proposals');
      return response.json();
    }
  });

  const deleteMutation = useMutation({
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

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading saved proposals...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Saved Study Proposals</h1>
          <p className="text-muted-foreground mt-2">
            Manage your generated clinical study proposals
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-3 py-1">
          {proposals?.length || 0} Proposals
        </Badge>
      </div>

      {!proposals || proposals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <FlaskConical className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Saved Proposals</h3>
            <p className="text-muted-foreground text-center">
              Generate study concepts to automatically save proposals here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {proposals.map((proposal) => (
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
                      <Badge variant="secondary">{proposal.studyPhase}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedProposal(proposal)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
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
                            onClick={() => deleteMutation.mutate(proposal.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
            </Card>
          ))}
        </div>
      )}

      {/* Proposal Details Modal */}
      <Dialog open={!!selectedProposal} onOpenChange={() => setSelectedProposal(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedProposal?.title}</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            {selectedProposal && (
              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Study Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Drug Name</p>
                      <p className="text-sm">{selectedProposal.drugName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Indication</p>
                      <p className="text-sm">{selectedProposal.indication}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Study Phase</p>
                      <p className="text-sm">{selectedProposal.studyPhase}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Geography</p>
                      <p className="text-sm">{selectedProposal.geography.join(', ')}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Strategic Goals */}
                {selectedProposal.strategicGoals && selectedProposal.strategicGoals.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Strategic Goals</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedProposal.strategicGoals.map((goal, index) => (
                        <Badge key={index} variant="secondary">
                          {goal.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Generated Concepts Summary */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Generated Concepts ({selectedProposal.generatedConcepts.length})</h3>
                  <div className="space-y-3">
                    {selectedProposal.generatedConcepts.map((concept, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{concept.title}</h4>
                          <Badge variant="outline">{concept.confidenceLevel}% Confidence</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{concept.description}</p>
                        {concept.feasibilityData && (
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="font-medium">Estimated Cost</p>
                              <p className="text-muted-foreground">€{concept.feasibilityData.estimatedCost?.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="font-medium">Timeline</p>
                              <p className="text-muted-foreground">{concept.feasibilityData.timeline} months</p>
                            </div>
                            <div>
                              <p className="font-medium">Sample Size</p>
                              <p className="text-muted-foreground">{concept.feasibilityData.sampleSize} patients</p>
                            </div>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Request Parameters */}
                {selectedProposal.requestParameters && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Request Parameters</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {selectedProposal.requestParameters.budgetCeilingEur && (
                        <div>
                          <p className="font-medium text-muted-foreground">Budget Ceiling</p>
                          <p>€{selectedProposal.requestParameters.budgetCeilingEur.toLocaleString()}</p>
                        </div>
                      )}
                      {selectedProposal.requestParameters.timelineCeilingMonths && (
                        <div>
                          <p className="font-medium text-muted-foreground">Timeline Ceiling</p>
                          <p>{selectedProposal.requestParameters.timelineCeilingMonths} months</p>
                        </div>
                      )}
                      {selectedProposal.requestParameters.targetSubpopulation && (
                        <div>
                          <p className="font-medium text-muted-foreground">Target Subpopulation</p>
                          <p>{selectedProposal.requestParameters.targetSubpopulation}</p>
                        </div>
                      )}
                      {selectedProposal.requestParameters.aiModel && (
                        <div>
                          <p className="font-medium text-muted-foreground">AI Model Used</p>
                          <p>{selectedProposal.requestParameters.aiModel}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}