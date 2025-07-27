import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Brain, Calculator, Users, TrendingUp, Shield, FileText, Globe } from "lucide-react";
import { StudyConcept } from "@shared/schema";

interface AIAnalysisSectionProps {
  concept: StudyConcept;
}

export default function AIAnalysisSection({ concept }: AIAnalysisSectionProps) {
  const aiAnalysis = concept.aiAnalysis;
  
  if (!aiAnalysis) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>AI analysis not available for this concept</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-blue-600" />
          AI Analysis & Statistical Justification
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Comprehensive AI-driven analysis of study design, sample size calculation, and comparator selection
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="sample-size" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="sample-size" className="flex items-center gap-1">
              <Calculator className="h-4 w-4" />
              Sample Size
            </TabsTrigger>
            <TabsTrigger value="comparator" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              Comparator
            </TabsTrigger>
            <TabsTrigger value="risk-benefit" className="flex items-center gap-1">
              <Shield className="h-4 w-4" />
              Risk-Benefit
            </TabsTrigger>
            <TabsTrigger value="sensitivity" className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Sensitivity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sample-size" className="mt-4">
            <SampleSizeJustification 
              justification={aiAnalysis.justification} 
              statisticalPlan={aiAnalysis.statisticalPlan}
              totalPatients={aiAnalysis.totalPatients}
            />
          </TabsContent>

          <TabsContent value="comparator" className="mt-4">
            <ComparatorAnalysis 
              comparatorSelection={aiAnalysis.justification.comparatorSelection}
              indication={concept.indication}
              geography={concept.geography}
            />
          </TabsContent>

          <TabsContent value="risk-benefit" className="mt-4">
            <RiskBenefitAssessment 
              assessment={aiAnalysis.justification.riskBenefitAssessment}
              operationalData={concept.feasibilityData}
            />
          </TabsContent>

          <TabsContent value="sensitivity" className="mt-4">
            <SensitivityAnalysis 
              scenarios={aiAnalysis.sensitivityAnalysis}
              baseCase={aiAnalysis.totalPatients}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Sample Size Justification Component
function SampleSizeJustification({ justification, statisticalPlan, totalPatients }: {
  justification: any;
  statisticalPlan: any;
  totalPatients: number;
}) {
  const calculation = justification.sampleSizeCalculation;
  
  return (
    <div className="space-y-6">
      {/* Key Metrics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-blue-900">Total Patients</p>
          <p className="text-2xl font-bold text-blue-700">{totalPatients}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-green-900">Statistical Power</p>
          <p className="text-2xl font-bold text-green-700">{(statisticalPlan.power * 100).toFixed(0)}%</p>
        </div>
        <div className="bg-amber-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-amber-900">Alpha Level</p>
          <p className="text-2xl font-bold text-amber-700">{statisticalPlan.alpha}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-sm font-medium text-purple-900">Effect Size</p>
          <p className="text-2xl font-bold text-purple-700">{statisticalPlan.effectSize}</p>
        </div>
      </div>

      {/* Statistical Methodology */}
      <div className="space-y-4">
        <h4 className="font-semibold flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          Statistical Methodology
        </h4>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="font-medium mb-2">Primary Analysis Method:</p>
          <p className="text-sm">{calculation.methodology}</p>
        </div>
        
        <div>
          <p className="font-medium mb-2">Key Statistical Assumptions:</p>
          <ul className="space-y-1">
            {calculation.keyAssumptions.map((assumption: string, index: number) => (
              <li key={index} className="flex items-start text-sm">
                <span className="inline-block w-1 h-1 rounded-full bg-current mt-2 mr-2 flex-shrink-0"></span>
                {assumption}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Clinical Meaningfulness */}
      <div>
        <h4 className="font-semibold mb-2">Clinical Meaningfulness</h4>
        <p className="text-sm text-muted-foreground">{calculation.clinicalMeaningfulness}</p>
      </div>

      {/* Step-by-Step Calculation */}
      <div>
        <h4 className="font-semibold mb-2">Calculation Details</h4>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm">{calculation.stepByStepCalculation}</p>
        </div>
      </div>

      {/* Regulatory Precedents */}
      <div>
        <h4 className="font-semibold mb-2">Regulatory Precedents</h4>
        <div className="flex flex-wrap gap-2">
          {calculation.regulatoryPrecedents.map((precedent: string, index: number) => (
            <Badge key={index} variant="outline" className="text-xs">
              {precedent}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

// Comparator Analysis Component
function ComparatorAnalysis({ comparatorSelection, indication, geography }: {
  comparatorSelection: any;
  indication: string;
  geography: string[] | string;
}) {
  return (
    <div className="space-y-6">
      {/* Selected Comparator Overview */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-2">Selected Comparator</h4>
        <p className="text-lg font-medium text-blue-800">{comparatorSelection.chosen}</p>
        <p className="text-sm text-blue-700 mt-2">{comparatorSelection.rationale}</p>
      </div>

      {/* Regulatory Basis */}
      <div>
        <h4 className="font-semibold flex items-center gap-2 mb-3">
          <FileText className="h-4 w-4" />
          Regulatory Basis
        </h4>
        <div className="space-y-2">
          {comparatorSelection.regulatoryBasis.map((basis: string, index: number) => (
            <div key={index} className="flex items-start p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2 mr-3 flex-shrink-0"></div>
              <span className="text-sm">{basis}</span>
            </div>
          ))}
        </div>
      </div>

      {/* HTA Recommendations */}
      <div>
        <h4 className="font-semibold flex items-center gap-2 mb-3">
          <Globe className="h-4 w-4" />
          HTA Body Recommendations
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {comparatorSelection.htaRecommendations.map((recommendation: string, index: number) => (
            <div key={index} className="p-3 border border-amber-200 bg-amber-50 rounded-lg">
              <span className="text-sm font-medium text-amber-900">{recommendation}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Standard of Care Evidence */}
      <div>
        <h4 className="font-semibold mb-3">Clinical Practice Guidelines</h4>
        <div className="flex flex-wrap gap-2">
          {comparatorSelection.standardOfCareEvidence.map((evidence: string, index: number) => (
            <Badge key={index} variant="outline" className="text-xs">
              {evidence}
            </Badge>
          ))}
        </div>
      </div>

      {/* Regional Variations */}
      <div>
        <h4 className="font-semibold mb-3">Regional Considerations</h4>
        <div className="space-y-2">
          {comparatorSelection.regionalVariations.map((variation: any, index: number) => (
            <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="font-medium text-sm">{variation.region}</span>
              <span className="text-sm text-muted-foreground">{variation.recommendation}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Competitive Landscape */}
      <div>
        <h4 className="font-semibold mb-2">Competitive Landscape</h4>
        <p className="text-sm text-muted-foreground p-3 bg-purple-50 rounded-lg border border-purple-200">
          {comparatorSelection.competitiveLandscape}
        </p>
      </div>

      {/* Access Considerations */}
      <div>
        <h4 className="font-semibold mb-2">Access & Availability</h4>
        <p className="text-sm text-muted-foreground p-3 bg-green-50 rounded-lg border border-green-200">
          {comparatorSelection.accessConsiderations}
        </p>
      </div>
    </div>
  );
}

// Risk-Benefit Assessment Component
function RiskBenefitAssessment({ assessment, operationalData }: {
  assessment: any;
  operationalData: any;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Patient Considerations */}
        <div className="space-y-4">
          <h4 className="font-semibold text-blue-700">Patient Considerations</h4>
          
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h5 className="font-medium mb-2">Patient Burden</h5>
            <p className="text-sm text-blue-800">{assessment.patientBurden}</p>
          </div>
          
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h5 className="font-medium mb-2">Ethical Considerations</h5>
            <p className="text-sm text-green-800">{assessment.ethicalConsiderations}</p>
          </div>
        </div>

        {/* Operational Considerations */}
        <div className="space-y-4">
          <h4 className="font-semibold text-purple-700">Operational Considerations</h4>
          
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h5 className="font-medium mb-2">Operational Complexity</h5>
            <p className="text-sm text-purple-800">{assessment.operationalComplexity}</p>
          </div>
          
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <h5 className="font-medium mb-2">Cost Effectiveness</h5>
            <p className="text-sm text-amber-800">{assessment.costEffectiveness}</p>
          </div>
        </div>
      </div>

      {/* Recruitment Feasibility */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h5 className="font-medium mb-2">Recruitment Feasibility</h5>
        <p className="text-sm text-gray-700 mb-3">{assessment.recruitmentFeasibility}</p>
        
        {operationalData && (
          <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-gray-200">
            <div className="text-center">
              <p className="text-lg font-bold text-green-600">
                {operationalData.recruitmentRate ? Math.round(operationalData.recruitmentRate * 100) : 'N/A'}%
              </p>
              <p className="text-xs text-muted-foreground">Recruitment Rate</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-amber-600">
                {operationalData.completionRisk ? Math.round(operationalData.completionRisk * 100) : 'N/A'}%
              </p>
              <p className="text-xs text-muted-foreground">Completion Risk</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-blue-600">
                {operationalData.timeline || 'N/A'}
              </p>
              <p className="text-xs text-muted-foreground">Timeline (months)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Sensitivity Analysis Component
function SensitivityAnalysis({ scenarios, baseCase }: {
  scenarios: any[];
  baseCase: number;
}) {
  if (!scenarios || scenarios.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Sensitivity analysis not available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-1">Base Case Scenario</h4>
        <p className="text-2xl font-bold text-blue-700">{baseCase} patients</p>
      </div>

      <div className="space-y-4">
        {scenarios.map((scenario: any, index: number) => {
          const isConservative = scenario.scenario.toLowerCase().includes('conservative');
          const isOptimistic = scenario.scenario.toLowerCase().includes('optimistic');
          
          return (
            <div 
              key={index} 
              className={`p-4 rounded-lg border ${
                isConservative 
                  ? 'bg-red-50 border-red-200' 
                  : isOptimistic 
                    ? 'bg-green-50 border-green-200'
                    : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h5 className={`font-semibold capitalize ${
                  isConservative 
                    ? 'text-red-800' 
                    : isOptimistic 
                      ? 'text-green-800'
                      : 'text-gray-800'
                }`}>
                  {scenario.scenario} Scenario
                </h5>
                <Badge 
                  variant="outline" 
                  className={
                    isConservative 
                      ? 'border-red-300 text-red-700' 
                      : isOptimistic 
                        ? 'border-green-300 text-green-700'
                        : 'border-gray-300 text-gray-700'
                  }
                >
                  {scenario.sampleSize} patients
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{scenario.rationale}</p>
              
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {scenario.sampleSize > baseCase ? '+' : ''}{((scenario.sampleSize - baseCase) / baseCase * 100).toFixed(1)}% vs base case
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}