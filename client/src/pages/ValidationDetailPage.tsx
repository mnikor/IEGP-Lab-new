import React from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Eye } from "lucide-react";
import { Link } from "wouter";
import ValidationResults from "@/components/validation/ValidationResults";
import { ValidationResults as ValidationResultsType } from "@/lib/types";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const ValidationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const { data: validation, isLoading, error } = useQuery<ValidationResultsType>({
    queryKey: ['/api/study-idea-validations', id],
    enabled: !!id,
  });
  
  // Debug log to see what we're getting from the API
  console.log('ValidationDetailPage data:', validation);

  const handleExportPDF = async () => {
    try {
      if (!validation?.id) {
        toast({
          title: "Export Failed",
          description: "Cannot export validation without ID",
          variant: "destructive",
        });
        return;
      }
      
      const response = await apiRequest("GET", `/api/export/validation-pdf?id=${validation.id}`, undefined);
      
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

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-lg text-gray-600">Loading validation details...</p>
        </div>
      </div>
    );
  }

  if (error || !validation) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64 flex-col space-y-4">
          <p className="text-lg text-red-600">Failed to load validation details</p>
          <Link href="/reports">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Reports
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Link href="/reports">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Reports
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{validation.title}</h1>
            <p className="text-sm text-gray-600">
              File: {validation.originalFileName} • Created: {validation.createdAt ? new Date(validation.createdAt).toLocaleDateString() : "Unknown"}
            </p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button onClick={handleExportPDF} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Validation Results */}
      <ValidationResults results={validation} />
    </div>
  );
};

export default ValidationDetailPage;