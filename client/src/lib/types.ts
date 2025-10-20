// Common shared types for the application

export type StrategicGoal = 
  "expand_label" | 
  "defend_market_share" | 
  "accelerate_uptake" | 
  "facilitate_market_access" | 
  "generate_real_world_evidence" | 
  "optimise_dosing" | 
  "validate_biomarker" | 
  "manage_safety_risk" | 
  "extend_lifecycle_combinations" | 
  "secure_initial_approval" |
  "demonstrate_poc" |
  "other";

// Strategic goal label mapping
export const strategicGoalLabels: Record<StrategicGoal, string> = {
  "expand_label": "Expand Label",
  "defend_market_share": "Defend Market Share",
  "accelerate_uptake": "Accelerate Uptake",
  "facilitate_market_access": "Facilitate Market Access",
  "generate_real_world_evidence": "Generate Real-World Evidence",
  "optimise_dosing": "Optimise Dosing / Formulation",
  "validate_biomarker": "Validate Biomarker / MOA",
  "manage_safety_risk": "Manage Safety & Risk",
  "extend_lifecycle_combinations": "Extend Lifecycle via Combinations",
  "secure_initial_approval": "Secure Initial Label Approval",
  "demonstrate_poc": "Demonstrate Mechanism Proof-of-Concept",
  "other": "Other"
};
export type StudyPhase = "I" | "II" | "III" | "IV" | "any";

export interface PicoData {
  population?: string;
  intervention?: string;
  comparator?: string;
  outcomes?: string;
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

export interface RegionalCostBreakdown {
  regionId: string;
  displayName: string;
  patients: number;
  sites: number;
  patientShare: number;
  siteStartupCost: number;
  patientVisitCost: number;
  monitoringCost: number;
  regulatoryCost: number;
  patientIncentives: number;
  vendorSpend: number;
  totalCost: number;
  startupLagMonths?: number;
  notes?: string;
}

export interface VendorSpendSummary {
  vendorId: string;
  displayName: string;
  category: string;
  totalSpend: number;
  markupSpend: number;
  retainerSpend: number;
  fxBufferSpend: number;
}

export interface RegionalRevenueForecast {
  regionId: string;
  displayName: string;
  incrementalSalesUsd: number;
  incrementalSalesEur: number;
  windowYears: number;
}

export interface ScenarioOutcome {
  scenario: "base" | "optimistic" | "pessimistic";
  estimatedCost: number;
  timeline: number;
  projectedROI: number;
  incrementalSalesUsd?: number;
  incrementalSalesEur?: number;
  eNpvUsd?: number;
  eNpvEur?: number;
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
  
  // Statistical power analysis details
  statisticalPower?: number;
  alphaLevel?: number;
  effectSize?: number;
  endpointType?: string;
  powerAnalysis?: string;
  
  // Risk factors
  dropoutRate: number;
  complexityFactor: number;

  // Extended commercial intelligence
  vendorCosts?: number;
  incrementalRevenue?: number;
  marketShareDefenseValue?: number;
  regionalCostBreakdown?: RegionalCostBreakdown[];
  vendorSpendSummary?: VendorSpendSummary[];
  scenarioAnalysis?: ScenarioOutcome[];
  aiAnalysis?: any;
  totalIncrementalSalesUsd?: number;
  totalIncrementalSalesEur?: number;
  economicNetPresentValueUsd?: number;
  economicNetPresentValueEur?: number;
  riskAdjustedENpvUsd?: number;
  riskAdjustedENpvEur?: number;
  regionalRevenueForecast?: RegionalRevenueForecast[];
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

export interface ReasonsToBelieve {
  scientificRationale?: {
    mechanismOfAction?: string;
    preclinicalData?: string;
    biomarkerSupport?: string;
  };
  clinicalEvidence?: {
    priorPhaseData?: string;
    safetyProfile?: string;
    efficacySignals?: string;
  };
  marketRegulatory?: {
    regulatoryPrecedent?: string;
    unmetNeed?: string;
    competitiveAdvantage?: string;
  };
  developmentFeasibility?: {
    patientAccess?: string;
    endpointViability?: string;
    operationalReadiness?: string;
  };
  overallConfidence?: string;
}

export interface StudyConcept {
  id?: number;
  title: string;
  drugName: string;
  indication: string;
  strategicGoals: StrategicGoal[];
  otherStrategicGoalText?: string;
  geography: string[];
  studyPhase: StudyPhase;
  targetSubpopulation?: string;
  comparatorDrugs?: string[];
  budgetCeilingEur?: number;
  timelineCeilingMonths?: number;
  salesImpactThreshold?: number;
  knowledgeGapAddressed?: string;
  innovationJustification?: string;
  reasonsToBelieve?: ReasonsToBelieve;
  picoData: PicoData;
  mcdaScores: McDAScore;
  swotAnalysis: SwotAnalysis;
  feasibilityData: FeasibilityData;
  evidenceSources: EvidenceSource[];
  currentEvidence?: CurrentEvidence;
  globalLoeDate?: string;    // Top-level LOE date for quicker access
  timeToLoe?: number;        // Top-level time to LOE for quicker access
  rankScore?: number;
  rankBreakdown?: {
    roi: number;
    feasibility: number;
    alignment: number;
  };
  createdAt?: string;
}

export interface GenerateConceptRequest {
  drugName: string;
  indication: string;
  strategicGoals: StrategicGoal[];
  otherStrategicGoalText?: string;
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
  vendorSelections?: string[];
  regionalDeploymentMix?: {
    regionId: string;
    weight: number;
  }[];
  scenarioPreference?: "base" | "optimistic" | "pessimistic";
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
  extractedPico?: PicoData;
  benchmarkDeltas?: BenchmarkDelta[];
  riskFlags?: RiskFlag[];
  revisedEconomics?: RevisedEconomics;
  swotAnalysis?: SwotAnalysis;
  strategicGoals: StrategicGoal[];
  otherStrategicGoalText?: string;
  globalLoeDate?: string;
  timeToLoe?: number;
  
  // New fields to match New Concept tab
  mcdaScores?: McDAScore;
  feasibilityData?: FeasibilityData;
  currentEvidence?: CurrentEvidence;
  
  // Research intelligence integration fields
  usedExistingResearch?: boolean;
  existingResearchData?: any;
  researchResults?: any; // Research results data for backward compatibility
  drugName?: string;
  indication?: string;
  
  createdAt?: string;
}

export interface ValidateSynopsisRequest {
  drugName: string;
  indication: string;
  strategicGoals: StrategicGoal[];
  otherStrategicGoalText?: string;
  // File is handled separately through FormData
}
