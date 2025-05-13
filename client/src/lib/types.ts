// Common shared types for the application

export type StrategicGoal = "expand_label" | "defend_share" | "accelerate_uptake" | "real_world_evidence";
export type StudyPhase = "I" | "II" | "III" | "IV" | "any";

export interface PicoData {
  population: string;
  intervention: string;
  comparator: string;
  outcomes: string;
}

export interface McDAScore {
  scientificValidity: number;
  clinicalImpact: number;
  commercialValue: number;
  feasibility: number;
  overall: number;
}

export interface SwotAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface FeasibilityData {
  // Core metrics
  estimatedCost: number;
  timeline: number;
  projectedROI: number;
  recruitmentRate: number;
  completionRisk: number;
  
  // Enhanced study details
  sampleSize: number;
  sampleSizeJustification: string;
  numberOfSites: number;
  numberOfCountries: number;
  recruitmentPeriodMonths: number;
  followUpPeriodMonths: number;
  
  // Cost breakdown
  siteCosts: number;
  personnelCosts: number;
  materialCosts: number;
  monitoringCosts: number;
  dataCosts: number;
  regulatoryCosts: number;
  
  // Risk factors
  dropoutRate: number;
  complexityFactor: number;
}

export interface EvidenceSource {
  title: string;
  authors?: string;
  publication?: string;
  year?: number;
  url?: string;
  citation: string;
}

export interface EvidenceCitation {
  id: number;
  url: string;
  title: string;
}

export interface CurrentEvidence {
  summary: string;
  citations: EvidenceCitation[];
}

export interface StudyConcept {
  id?: number;
  title: string;
  drugName: string;
  indication: string;
  strategicGoal: StrategicGoal;
  geography: string[];
  studyPhase: StudyPhase;
  targetSubpopulation?: string;
  comparatorDrugs?: string[];
  budgetCeilingEur?: number;
  timelineCeilingMonths?: number;
  salesImpactThreshold?: number;
  picoData: PicoData;
  mcdaScores: McDAScore;
  swotAnalysis: SwotAnalysis;
  feasibilityData: FeasibilityData;
  evidenceSources: EvidenceSource[];
  currentEvidence?: CurrentEvidence;
  createdAt?: string;
}

export interface GenerateConceptRequest {
  drugName: string;
  indication: string;
  strategicGoal: StrategicGoal;
  geography: string[];
  studyPhasePref: StudyPhase;
  currentEvidenceRefs?: string[];
  targetSubpopulation?: string;
  comparatorDrugs?: string[];
  budgetCeilingEur?: number;
  timelineCeilingMonths?: number;
  salesImpactThreshold?: number;
}

export interface EvidenceFile {
  name: string;
  type: string;
  content?: string;
  size: number;
}

export interface BenchmarkDelta {
  aspect: string;
  current: string;
  suggested: string;
  impact: "positive" | "negative" | "neutral";
}

export interface RiskFlag {
  category: string;
  description: string;
  severity: "high" | "medium" | "low";
  mitigation?: string;
}

export interface RevisedEconomics {
  originalCost?: number;
  revisedCost: number;
  originalTimeline?: number;
  revisedTimeline: number;
  originalROI?: number;
  revisedROI: number;
  notes: string;
}

export interface ValidationResults {
  id?: number;
  title: string;
  originalFileName: string;
  extractedPico: PicoData;
  benchmarkDeltas: BenchmarkDelta[];
  riskFlags: RiskFlag[];
  revisedEconomics: RevisedEconomics;
  swotAnalysis: SwotAnalysis;
  createdAt?: string;
}

export interface ValidateSynopsisRequest {
  drugName: string;
  indication: string;
  strategicGoal: StrategicGoal;
  // File is handled separately through FormData
}
