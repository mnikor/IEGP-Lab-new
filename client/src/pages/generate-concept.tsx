import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ConceptForm from "@/components/concept/ConceptForm";
import ResultsSection from "@/components/concept/ResultsSection";
import { StudyConcept } from "@/lib/types";

const GenerateConcept: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("generate");
  const [generatedConcepts, setGeneratedConcepts] = useState<StudyConcept[] | null>(null);
  const [researchStrategyId, setResearchStrategyId] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const handleConceptGeneration = (concepts: StudyConcept[], strategyId?: number) => {
    setGeneratedConcepts(concepts);
    setResearchStrategyId(strategyId || null);
    setActiveTab("results");
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-dark">Clinical Study Concept Generator</h1>
        <p className="text-neutral-medium mt-1">Generate or validate clinical study concepts with AI-powered analysis</p>
      </div>

      <div className="mb-6 border-b border-neutral-light">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="border-b-0">
            <TabsTrigger value="generate">Generate Concept</TabsTrigger>
            <TabsTrigger value="validate" asChild>
              <a href="/validate-study-idea">Validate Study Idea</a>
            </TabsTrigger>
            <TabsTrigger value="reports" asChild>
              <a href="/reports">Reports</a>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="generate" forceMount className={activeTab !== "generate" ? "hidden" : ""}>
            <ConceptForm 
              onGenerateSuccess={handleConceptGeneration} 
              isGenerating={isGenerating}
              setIsGenerating={setIsGenerating}
            />
          </TabsContent>
          
          <TabsContent value="results" forceMount className={activeTab !== "results" ? "hidden" : ""}>
            {generatedConcepts && (
              <ResultsSection 
                concepts={generatedConcepts} 
                researchStrategyId={researchStrategyId}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default GenerateConcept;
