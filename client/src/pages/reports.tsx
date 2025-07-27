import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Eye, Trash2, Calendar, MapPin, Target } from "lucide-react";
import { Link } from "wouter";
import { StudyConcept, ValidationResults } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";

const Reports: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: concepts, isLoading: loadingConcepts } = useQuery<StudyConcept[]>({
    queryKey: ["/api/study-concepts"],
  });

  const { data: validations, isLoading: loadingValidations } = useQuery<ValidationResults[]>({
    queryKey: ["/api/study-idea-validations"],
  });

  // Show all individual concepts since we no longer have proposal grouping
  const filteredConcepts = concepts || [];

  const handleDownloadConceptPDF = async (concept: StudyConcept) => {
    try {
      console.log('Starting concept PDF download for:', concept.id);
      const response = await fetch(`/api/study-concepts/${concept.id}/pdf`);
      console.log('Concept PDF response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Concept PDF generation failed:', errorText);
        throw new Error(`Failed to generate PDF: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      console.log('Concept PDF blob size:', blob.size);
      
      if (blob.size === 0) {
        throw new Error('Generated PDF is empty');
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      const cleanFilename = `${concept.title.replace(/[^a-zA-Z0-9]/g, '_')}_concept.pdf`;
      a.download = cleanFilename;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
      
      toast({
        title: "Success",
        description: "Concept PDF downloaded successfully"
      });
    } catch (error) {
      console.error('Concept PDF download error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download concept PDF",
        variant: "destructive"
      });
    }
  };

  const handleDeleteConcept = async (conceptId: number) => {
    try {
      const response = await fetch(`/api/study-concepts/${conceptId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete concept');
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/study-concepts'] });
      toast({
        title: "Success",
        description: "Study concept deleted successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete concept",
        variant: "destructive"
      });
    }
  };

  const handleDeleteValidation = async (validationId: number | undefined) => {
    if (!validationId) return;
    
    try {
      await apiRequest("DELETE", `/api/study-idea-validations/${validationId}`);
      
      // Refresh the validations list
      queryClient.invalidateQueries({ queryKey: ["/api/study-idea-validations"] });
      
      toast({
        title: "Success",
        description: "Validation deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting validation:', error);
      toast({
        title: "Error",
        description: "Failed to delete validation",
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
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDownloadConceptPDF(concept)}
                        >
                          <Download className="mr-1 h-4 w-4" /> PDF
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteConcept(concept.id)}
                        >
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
                          <span className="font-medium">Risk Flags:</span> {(validation.riskFlags || []).length}
                        </div>
                        <div>
                          <span className="font-medium">Deltas:</span> {(validation.benchmarkDeltas || []).length}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between pt-2">
                      <Link href={`/validation/${validation.id}`}>
                        <Button variant="ghost" size="sm"><Eye className="mr-1 h-4 w-4" /> View</Button>
                      </Link>
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="sm"><Download className="mr-1 h-4 w-4" /> PDF</Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteValidation(validation.id!)}
                        >
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
