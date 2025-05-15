import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StudyConcept } from "@/lib/types";
import ConceptCard from "./ConceptCard";
import { Download, FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ResultsSectionProps {
  concepts: StudyConcept[];
}

const ResultsSection: React.FC<ResultsSectionProps> = ({ concepts }) => {
  const { toast } = useToast();

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
        description: isPDF 
          ? "PPTX generation failed, but PDF has been downloaded as a fallback"
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <h2 className="text-xl font-semibold text-neutral-dark">Generated Study Concepts</h2>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={exportPDF}>
            <FileDown className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button onClick={exportPPTX}>
            <Download className="mr-2 h-4 w-4" />
            Export PPTX
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {concepts.map((concept, index) => (
            <ConceptCard key={index} concept={concept} index={index + 1} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ResultsSection;
