import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StudyIdeaUploader from "@/components/validation/StudyIdeaUploader";
import ValidationResults from "@/components/validation/ValidationResults";
import ValidationResearchSection from "@/components/validation/ValidationResearchSection";
import { ValidationResults as ValidationResultsType } from "@/lib/types";

const ValidateSynopsis: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("upload");
  const [validationResults, setValidationResults] = useState<ValidationResultsType | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [studyParams, setStudyParams] = useState<any>(null);
  const [researchResults, setResearchResults] = useState<any>(null);
  const [hasExistingResearch, setHasExistingResearch] = useState<boolean>(false);

  const handleValidationSuccess = (results: ValidationResultsType, existingResearch?: any) => {
    setValidationResults(results);
    if (existingResearch) {
      setResearchResults(existingResearch);
      setHasExistingResearch(true);
    }
    setActiveTab("results");
  };

  const handleStudyParamsCapture = (params: any) => {
    setStudyParams(params);
  };

  const handleResearchComplete = (results: any) => {
    setResearchResults(results);
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
          </TabsList>
          
          <TabsContent value="upload" forceMount className={activeTab !== "upload" ? "hidden" : ""}>
            <StudyIdeaUploader
              onValidationSuccess={handleValidationSuccess}
              isValidating={isValidating}
              setIsValidating={setIsValidating}
              onStudyParamsCapture={handleStudyParamsCapture}
            />
          </TabsContent>
          

          
          <TabsContent value="results" forceMount className={activeTab !== "results" ? "hidden" : ""}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                {validationResults && (
                  <ValidationResults 
                    results={validationResults} 
                    researchResults={researchResults}
                  />
                )}
              </div>
              
              <div className="space-y-6">
                {studyParams && !hasExistingResearch && (
                  <ValidationResearchSection
                    drugName={studyParams.drugName}
                    indication={studyParams.indication}
                    strategicGoals={studyParams.strategicGoals}
                    studyPhase={studyParams.studyPhase || 'III'}
                    geography={studyParams.geography || ['US', 'EU']}
                    additionalContext={studyParams.additionalContext}
                    onResearchComplete={handleResearchComplete}
                  />
                )}
                {hasExistingResearch && (
                  <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                    <p><strong>Research Intelligence already available</strong></p>
                    <p>This validation used existing research data from your concept generation. Use the "Situational Analysis" button to review the research findings.</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default ValidateSynopsis;
