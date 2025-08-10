import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StudyConcept } from "@/lib/types";
import ConceptCard from "./ConceptCard";
import SituationalAnalysisModal from "./SituationalAnalysisModal";
import { Download, FileDown, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ResearchResult {
  id: number;
  searchQuery: string;
  searchType: string;
  priority: number;
  synthesizedInsights: string;
  keyFindings: string[];
  designImplications: string[];
  strategicRecommendations: string[];
  rawResults: {
    content: string;
    citations: string[];
    error?: string;
  };
}

interface ResultsSectionProps {
  concepts: StudyConcept[];
  researchStrategyId?: number | null;
}

const ResultsSection: React.FC<ResultsSectionProps> = ({ concepts, researchStrategyId }) => {
  const { toast } = useToast();
  const [localConcepts, setLocalConcepts] = useState<StudyConcept[]>(concepts);
  const [researchResults, setResearchResults] = useState<ResearchResult[]>([]);
  const [showSituationalAnalysis, setShowSituationalAnalysis] = useState(false);
  const [loadingResearch, setLoadingResearch] = useState(false);

  // Fetch research results when researchStrategyId is provided
  useEffect(() => {
    const fetchResearchResults = async () => {
      if (!researchStrategyId) return;
      
      setLoadingResearch(true);
      try {
        const response = await apiRequest('GET', `/api/research-strategies/${researchStrategyId}/results`);
        const results = await response.json();
        setResearchResults(results);
      } catch (error) {
        console.error('Failed to fetch research results:', error);
      } finally {
        setLoadingResearch(false);
      }
    };

    fetchResearchResults();
  }, [researchStrategyId]);

  const exportPDF = async () => {
    try {
      const response = await apiRequest("GET", "/api/export/pdf?ids=" + concepts.map(c => c.id).join(","), undefined);
      
      // Create a blob from the PDF Stream
      const blob = await response.blob();
      
      // Create a link element, use it to download the blob, then remove it
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `clinical-study-concepts-${new Date().toISOString().split('T')[0]}.pdf`;
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

  const exportPPTX = async () => {
    try {
      const response = await apiRequest("GET", "/api/export/pptx?ids=" + concepts.map(c => c.id).join(","), undefined);
      
      // Check content type to determine if we got PPTX or PDF (fallback)
      const contentType = response.headers.get('content-type');
      const isPDF = contentType && contentType.includes('application/pdf');
      
      // Create a blob from the response
      const blob = await response.blob();
      
      // Create a link element, use it to download the blob, then remove it
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      
      // Use appropriate file extension based on content type
      const fileExtension = isPDF ? 'pdf' : 'pptx';
      link.download = `clinical-study-concepts-${new Date().toISOString().split('T')[0]}.${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Export Successful",
        description: isPDF || import.meta.env.MODE === 'production'
          ? "Your presentation has been downloaded as a PDF file"
          : "The PPTX has been downloaded to your device",
      });
    } catch (error) {
      console.error("Failed to export presentation:", error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting the presentation",
        variant: "destructive",
      });
    }
  };

  // Update local concepts when props change
  useEffect(() => {
    setLocalConcepts(concepts);
  }, [concepts]);

  // Handle concept updates from chat
  const handleConceptUpdate = (updatedConcept: StudyConcept) => {
    setLocalConcepts(prevConcepts =>
      prevConcepts.map(concept =>
        concept.id === updatedConcept.id ? updatedConcept : concept
      )
    );
  };

  // Extract drug name and indication from the first concept
  const drugName = localConcepts.length > 0 ? localConcepts[0].drugName || 'Unknown Drug' : 'Unknown Drug';
  const indication = localConcepts.length > 0 ? localConcepts[0].indication || 'Unknown Indication' : 'Unknown Indication';

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-xl font-semibold text-neutral-dark">Generated Study Concepts</h2>
          <div className="flex space-x-3">
            {/* Situational Analysis Button - only show if research data available */}
            {researchResults.length > 0 && (
              <Button 
                variant="outline" 
                onClick={() => setShowSituationalAnalysis(true)}
                className="flex items-center space-x-2"
              >
                <Search className="h-4 w-4" />
                <span>Situational Analysis</span>
              </Button>
            )}
            <Button variant="outline" onClick={exportPDF}>
              <FileDown className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
            <Button onClick={exportPPTX}>
              <Download className="mr-2 h-4 w-4" />
              {import.meta.env.MODE === 'production' ? 'Export Presentation' : 'Export PPTX'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {localConcepts.map((concept, index) => (
              <ConceptCard 
                key={concept.id || index} 
                concept={concept} 
                index={index + 1}
                onConceptUpdate={handleConceptUpdate}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Situational Analysis Modal */}
      <SituationalAnalysisModal
        isOpen={showSituationalAnalysis}
        onClose={() => setShowSituationalAnalysis(false)}
        drugName={drugName}
        indication={indication}
        researchResults={researchResults}
        isLoading={loadingResearch}
      />
    </>
  );
};

export default ResultsSection;
