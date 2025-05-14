import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StudyIdeaUploader from "@/components/validation/StudyIdeaUploader";
import ValidationResults from "@/components/validation/ValidationResults";
import { ValidationResults as ValidationResultsType } from "@/lib/types";

const ValidateStudyIdea: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("upload");
  const [validationResults, setValidationResults] = useState<ValidationResultsType | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);

  const handleValidationSuccess = (results: ValidationResultsType) => {
    setValidationResults(results);
    setActiveTab("results");
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-dark">Study Idea Validator</h1>
        <p className="text-neutral-medium mt-1">Upload and validate your clinical study idea with AI analysis</p>
      </div>

      <div className="mb-6 border-b border-neutral-light">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="border-b-0">
            <TabsTrigger value="generate" asChild>
              <a href="/generate-concept">Generate Concept</a>
            </TabsTrigger>
            <TabsTrigger value="upload">Validate Study Idea</TabsTrigger>
            <TabsTrigger value="reports" asChild>
              <a href="/reports">Reports</a>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" forceMount className={activeTab !== "upload" ? "hidden" : ""}>
            <StudyIdeaUploader
              onValidationSuccess={handleValidationSuccess}
              isValidating={isValidating}
              setIsValidating={setIsValidating}
            />
          </TabsContent>
          
          <TabsContent value="results" forceMount className={activeTab !== "results" ? "hidden" : ""}>
            {validationResults && (
              <ValidationResults results={validationResults} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default ValidateStudyIdea;