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

  const handleValidationSuccess = (results: ValidationResultsType) => {
    setValidationResults(results);
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
                {studyParams && (
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
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default ValidateSynopsis;
