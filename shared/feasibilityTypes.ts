import type { CommercialAssumptions, StudyImpactCategory } from "./commercialTypes";

export interface RegionalLoeData {
  region: string;
  loeDate: string;
  hasPatentExtension: boolean;
  extensionPotential: boolean;
  extensionMonths?: number;
  notes?: string;
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

export interface FeasibilityData {
  estimatedCost: number;
  timeline: number;
  projectedROI: number;
  recruitmentRate: number;
  completionRisk: number;

  sampleSize: number;
  sampleSizeJustification: string;
  numberOfSites: number;
  numberOfCountries: number;
  recruitmentPeriodMonths: number;
  followUpPeriodMonths: number;
  expectedToplineDate?: string;
  plannedDbLockDate?: string;
  windowToLoeMonths?: number;

  globalLoeDate?: string;
  regionalLoeData?: RegionalLoeData[];
  timeToLoe?: number;
  postLoeValue?: number;
  estimatedFpiDate?: string;

  siteCosts: number;
  personnelCosts: number;
  materialCosts: number;
  monitoringCosts: number;
  dataCosts: number;
  regulatoryCosts: number;

  statisticalPower?: number;
  alphaLevel?: number;
  effectSize?: number;
  endpointType?: string;
  powerAnalysis?: string;

  dropoutRate: number;
  complexityFactor: number;

  vendorCosts?: number;
  incrementalRevenue?: number;
  marketShareDefenseValue?: number;
  regionalCostBreakdown?: RegionalCostBreakdown[];
  vendorSpendSummary?: VendorSpendSummary[];
  scenarioAnalysis?: ScenarioOutcome[];
  aiAnalysis?: unknown;
  totalIncrementalSalesUsd?: number;
  totalIncrementalSalesEur?: number;
  economicNetPresentValueUsd?: number;
  economicNetPresentValueEur?: number;
  riskAdjustedENpvUsd?: number;
  riskAdjustedENpvEur?: number;
  regionalRevenueForecast?: RegionalRevenueForecast[];
  commercialAssumptions?: CommercialAssumptions;
  studyImpact?: StudyImpactCategory;
}
