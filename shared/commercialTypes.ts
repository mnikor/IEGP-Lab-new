export interface CommercialAssumptions {
  source: "llm" | "fallback";
  avgAnnualRevenuePerPatientUsd: number;
  addressablePatientCount: number;
  peakSharePercent: number;
  impactDurationYears: number;
  uptakeRampYears: number;
  accessDelayMonths: number;
  confidence: number;
  notes: string[];
}

export type StudyImpactCategory =
  | "label_expansion"
  | "market_access_enabler"
  | "clinical_guideline_shift"
  | "practice_evolution"
  | "market_defense"
  | "evidence_gap_fill"
  | "limited_impact"
  | "no_material_change"
  | null;
