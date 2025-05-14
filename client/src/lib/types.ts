// Common shared types for the application

export type StrategicGoal = "expand_label" | "defend_share" | "accelerate_uptake" | "real_world_evidence";

// Strategic goal label mapping
export const strategicGoalLabels: Record<StrategicGoal, string> = {
  "expand_label": "Expand Label",
  "defend_share": "Defend Market Share",
  "accelerate_uptake": "Accelerate Uptake",
  "real_world_evidence": "Real World Evidence"
};
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

export interface RegionalLoeData {
  region: string;            // e.g., "US", "EU", "Japan"
  loeDate: string;           // ISO date string format
  hasPatentExtension: boolean; // Whether the patent currently has an extension
  extensionPotential: boolean; // Whether study could extend exclusivity
  extensionMonths?: number;    // Potential months of extension
  notes?: string;            // Any additional information about the LOE
}

export interface SwotAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

// Note: RegionalLoeData interface is now unified and defined above

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
  
  // Loss of Exclusivity data
  globalLoeDate?: string;      // ISO date string for primary/global LOE
  regionalLoeData?: RegionalLoeData[]; // Region-specific LOE information
  timeToLoe?: number;          // Months from now until LOE
  postLoeValue?: number;       // Estimated value retention post-LOE (0-1 scale)
  estimatedFpiDate?: string;   // ISO date string for estimated FPI
  
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
  strategicGoals: StrategicGoal[];
  geography: string[];
  studyPhase: StudyPhase;
  targetSubpopulation?: string;
  comparatorDrugs?: string[];
  budgetCeilingEur?: number;
  timelineCeilingMonths?: number;
  salesImpactThreshold?: number;
  knowledgeGapAddressed?: string;
  innovationJustification?: string;
  picoData: PicoData;
  mcdaScores: McDAScore;
  swotAnalysis: SwotAnalysis;
  feasibilityData: FeasibilityData;
  evidenceSources: EvidenceSource[];
  currentEvidence?: CurrentEvidence;
  globalLoeDate?: string;    // Top-level LOE date for quicker access
  timeToLoe?: number;        // Top-level time to LOE for quicker access
  createdAt?: string;
}

export interface GenerateConceptRequest {
  drugName: string;
  indication: string;
  strategicGoals: StrategicGoal[];
  geography: string[];
  studyPhasePref: StudyPhase;
  currentEvidenceRefs?: string[];
  targetSubpopulation?: string;
  comparatorDrugs?: string[];
  budgetCeilingEur?: number;
  timelineCeilingMonths?: number;
  salesImpactThreshold?: number;
  
  // Study timeline information
  anticipatedFpiDate?: string;  // ISO date string for anticipated First Patient In date
  
  // LOE (Loss of Exclusivity) information
  globalLoeDate?: string;       // ISO date string for primary LOE
  regionalLoeDates?: {          // Region-specific LOE dates
    region: string;
    date: string;              // ISO date string
  }[];
  hasPatentExtensionPotential?: boolean; // Whether the study could extend exclusivity
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
  strategicGoals: StrategicGoal[];
  globalLoeDate?: string;
  timeToLoe?: number;
  
  // New fields to match New Concept tab
  mcdaScores?: McDAScore;
  feasibilityData?: FeasibilityData;
  currentEvidence?: CurrentEvidence;
  
  createdAt?: string;
}

export interface ValidateSynopsisRequest {
  drugName: string;
  indication: string;
  strategicGoal: StrategicGoal;
  // File is handled separately through FormData
}
