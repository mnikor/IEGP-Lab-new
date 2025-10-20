export type StudyPhaseKey = "I" | "II" | "III" | "IV";

export interface CostBand {
  /** Base cost expressed in EUR for a standard Phase II trial */
  baseEur: number;
  /** Phase specific multipliers applied on top of the base */
  phaseMultipliers: Record<StudyPhaseKey, number>;
}

export interface RegionalOperationalAdjustments {
  /** Multiplier applied to site start-up costs */
  siteStartupMultiplier: number;
  /** Multiplier applied to per-patient visit costs */
  visitCostMultiplier: number;
  /** Incremental monitoring oversight cost (EUR) per site */
  monitoringOversightPerSite: number;
  /** Additional regulatory submission cost (EUR) per country */
  regulatoryFilingCost: number;
  /** Typical patient incentive spend (EUR) per patient */
  patientIncentivePerPatient: number;
  /** Expected delay in months for first-patient-in vs. US baseline */
  startupLagMonths: number;
}

export interface RegionalCostBenchmark {
  regionId: string; // e.g. "us"
  countryCode: string; // ISO 3166-1 alpha-2
  displayName: string;
  currency: string;
  /** FX factor to convert local currency -> EUR */
  fxRateToEur: number;
  baseCostBand: CostBand;
  operationalAdjustments: RegionalOperationalAdjustments;
  typicalSiteThroughput: {
    patientsPerMonth: number;
    visitsPerMonth: number;
  };
  complianceRiskScore: number; // 1-5 scale
  notes?: string;
}

export const BASELINE_REGIONAL_BENCHMARK: RegionalCostBenchmark = {
  regionId: "global_baseline",
  countryCode: "GL",
  displayName: "Global Baseline",
  currency: "EUR",
  fxRateToEur: 1,
  baseCostBand: {
    baseEur: 38000,
    phaseMultipliers: {
      I: 1.18,
      II: 1.0,
      III: 1.42,
      IV: 0.78,
    },
  },
  operationalAdjustments: {
    siteStartupMultiplier: 1.0,
    visitCostMultiplier: 1.0,
    monitoringOversightPerSite: 25000,
    regulatoryFilingCost: 90000,
    patientIncentivePerPatient: 750,
    startupLagMonths: 2,
  },
  typicalSiteThroughput: {
    patientsPerMonth: 1.7,
    visitsPerMonth: 25,
  },
  complianceRiskScore: 3,
  notes: "Fallback benchmark applied when region-specific data is unavailable.",
};

export const REGIONAL_COST_BENCHMARKS: RegionalCostBenchmark[] = [
  BASELINE_REGIONAL_BENCHMARK,
  {
    regionId: "us",
    countryCode: "US",
    displayName: "United States",
    currency: "USD",
    fxRateToEur: 0.92,
    baseCostBand: {
      baseEur: 45000,
      phaseMultipliers: {
        I: 1.35,
        II: 1.1,
        III: 1.55,
        IV: 0.85,
      },
    },
    operationalAdjustments: {
      siteStartupMultiplier: 1.0,
      visitCostMultiplier: 1.0,
      monitoringOversightPerSite: 32000,
      regulatoryFilingCost: 125000,
      patientIncentivePerPatient: 1200,
      startupLagMonths: 0,
    },
    typicalSiteThroughput: {
      patientsPerMonth: 2.1,
      visitsPerMonth: 35,
    },
    complianceRiskScore: 2,
    notes: "Reference market used as baseline for global modelling.",
  },
  {
    regionId: "uk",
    countryCode: "GB",
    displayName: "United Kingdom",
    currency: "GBP",
    fxRateToEur: 1.15,
    baseCostBand: {
      baseEur: 41000,
      phaseMultipliers: {
        I: 1.25,
        II: 1.05,
        III: 1.45,
        IV: 0.8,
      },
    },
    operationalAdjustments: {
      siteStartupMultiplier: 0.92,
      visitCostMultiplier: 0.95,
      monitoringOversightPerSite: 28500,
      regulatoryFilingCost: 95000,
      patientIncentivePerPatient: 900,
      startupLagMonths: 1,
    },
    typicalSiteThroughput: {
      patientsPerMonth: 1.8,
      visitsPerMonth: 28,
    },
    complianceRiskScore: 2,
    notes: "Strong NHS infrastructure with moderate startup timelines.",
  },
  {
    regionId: "de",
    countryCode: "DE",
    displayName: "Germany",
    currency: "EUR",
    fxRateToEur: 1,
    baseCostBand: {
      baseEur: 39500,
      phaseMultipliers: {
        I: 1.2,
        II: 1.0,
        III: 1.4,
        IV: 0.78,
      },
    },
    operationalAdjustments: {
      siteStartupMultiplier: 1.05,
      visitCostMultiplier: 0.98,
      monitoringOversightPerSite: 27000,
      regulatoryFilingCost: 115000,
      patientIncentivePerPatient: 750,
      startupLagMonths: 2,
    },
    typicalSiteThroughput: {
      patientsPerMonth: 1.6,
      visitsPerMonth: 26,
    },
    complianceRiskScore: 3,
    notes: "High-quality data collection with higher regulatory overhead.",
  },
  {
    regionId: "fr",
    countryCode: "FR",
    displayName: "France",
    currency: "EUR",
    fxRateToEur: 1,
    baseCostBand: {
      baseEur: 36000,
      phaseMultipliers: {
        I: 1.18,
        II: 0.98,
        III: 1.32,
        IV: 0.75,
      },
    },
    operationalAdjustments: {
      siteStartupMultiplier: 1.1,
      visitCostMultiplier: 0.93,
      monitoringOversightPerSite: 25000,
      regulatoryFilingCost: 108000,
      patientIncentivePerPatient: 650,
      startupLagMonths: 3,
    },
    typicalSiteThroughput: {
      patientsPerMonth: 1.4,
      visitsPerMonth: 24,
    },
    complianceRiskScore: 3,
    notes: "Longer contract cycle with strong investigator engagement.",
  },
  {
    regionId: "es",
    countryCode: "ES",
    displayName: "Spain",
    currency: "EUR",
    fxRateToEur: 1,
    baseCostBand: {
      baseEur: 33000,
      phaseMultipliers: {
        I: 1.12,
        II: 0.95,
        III: 1.25,
        IV: 0.72,
      },
    },
    operationalAdjustments: {
      siteStartupMultiplier: 0.88,
      visitCostMultiplier: 0.9,
      monitoringOversightPerSite: 21000,
      regulatoryFilingCost: 82000,
      patientIncentivePerPatient: 600,
      startupLagMonths: 2,
    },
    typicalSiteThroughput: {
      patientsPerMonth: 1.7,
      visitsPerMonth: 22,
    },
    complianceRiskScore: 3,
    notes: "Attractive per-patient costs with improving regulatory timelines.",
  },
  {
    regionId: "it",
    countryCode: "IT",
    displayName: "Italy",
    currency: "EUR",
    fxRateToEur: 1,
    baseCostBand: {
      baseEur: 34500,
      phaseMultipliers: {
        I: 1.15,
        II: 0.97,
        III: 1.28,
        IV: 0.74,
      },
    },
    operationalAdjustments: {
      siteStartupMultiplier: 1.08,
      visitCostMultiplier: 0.92,
      monitoringOversightPerSite: 22500,
      regulatoryFilingCost: 90000,
      patientIncentivePerPatient: 620,
      startupLagMonths: 4,
    },
    typicalSiteThroughput: {
      patientsPerMonth: 1.3,
      visitsPerMonth: 23,
    },
    complianceRiskScore: 3,
    notes: "Regional ethics committees drive longer start-up; strong oncology centres.",
  },
  {
    regionId: "jp",
    countryCode: "JP",
    displayName: "Japan",
    currency: "JPY",
    fxRateToEur: 0.006,
    baseCostBand: {
      baseEur: 52000,
      phaseMultipliers: {
        I: 1.4,
        II: 1.15,
        III: 1.65,
        IV: 0.95,
      },
    },
    operationalAdjustments: {
      siteStartupMultiplier: 1.18,
      visitCostMultiplier: 1.2,
      monitoringOversightPerSite: 34500,
      regulatoryFilingCost: 135000,
      patientIncentivePerPatient: 1500,
      startupLagMonths: 5,
    },
    typicalSiteThroughput: {
      patientsPerMonth: 1.1,
      visitsPerMonth: 30,
    },
    complianceRiskScore: 2,
    notes: "High-quality data with higher per-visit costs and cultural recruitment constraints.",
  },
  {
    regionId: "cn",
    countryCode: "CN",
    displayName: "China",
    currency: "CNY",
    fxRateToEur: 0.13,
    baseCostBand: {
      baseEur: 28000,
      phaseMultipliers: {
        I: 1.22,
        II: 0.9,
        III: 1.2,
        IV: 0.7,
      },
    },
    operationalAdjustments: {
      siteStartupMultiplier: 0.95,
      visitCostMultiplier: 0.82,
      monitoringOversightPerSite: 19500,
      regulatoryFilingCost: 98000,
      patientIncentivePerPatient: 500,
      startupLagMonths: 6,
    },
    typicalSiteThroughput: {
      patientsPerMonth: 2.5,
      visitsPerMonth: 27,
    },
    complianceRiskScore: 4,
    notes: "Significant recruitment potential with evolving regulatory guidance.",
  },
  {
    regionId: "au",
    countryCode: "AU",
    displayName: "Australia",
    currency: "AUD",
    fxRateToEur: 0.61,
    baseCostBand: {
      baseEur: 37000,
      phaseMultipliers: {
        I: 1.2,
        II: 0.98,
        III: 1.35,
        IV: 0.76,
      },
    },
    operationalAdjustments: {
      siteStartupMultiplier: 0.9,
      visitCostMultiplier: 0.88,
      monitoringOversightPerSite: 23500,
      regulatoryFilingCost: 65000,
      patientIncentivePerPatient: 700,
      startupLagMonths: 1,
    },
    typicalSiteThroughput: {
      patientsPerMonth: 1.9,
      visitsPerMonth: 25,
    },
    complianceRiskScore: 2,
    notes: "Efficient regulatory fast track with attractive R&D tax incentives.",
  },
  {
    regionId: "ca",
    countryCode: "CA",
    displayName: "Canada",
    currency: "CAD",
    fxRateToEur: 0.68,
    baseCostBand: {
      baseEur: 39000,
      phaseMultipliers: {
        I: 1.22,
        II: 1.02,
        III: 1.42,
        IV: 0.82,
      },
    },
    operationalAdjustments: {
      siteStartupMultiplier: 0.96,
      visitCostMultiplier: 0.97,
      monitoringOversightPerSite: 26500,
      regulatoryFilingCost: 99000,
      patientIncentivePerPatient: 880,
      startupLagMonths: 2,
    },
    typicalSiteThroughput: {
      patientsPerMonth: 1.7,
      visitsPerMonth: 27,
    },
    complianceRiskScore: 2,
    notes: "Stable regulatory environment with high-quality academic networks.",
  },
  {
    regionId: "br",
    countryCode: "BR",
    displayName: "Brazil",
    currency: "BRL",
    fxRateToEur: 0.18,
    baseCostBand: {
      baseEur: 26500,
      phaseMultipliers: {
        I: 1.08,
        II: 0.88,
        III: 1.18,
        IV: 0.68,
      },
    },
    operationalAdjustments: {
      siteStartupMultiplier: 1.12,
      visitCostMultiplier: 0.8,
      monitoringOversightPerSite: 20500,
      regulatoryFilingCost: 76000,
      patientIncentivePerPatient: 550,
      startupLagMonths: 5,
    },
    typicalSiteThroughput: {
      patientsPerMonth: 2.2,
      visitsPerMonth: 21,
    },
    complianceRiskScore: 4,
    notes: "Strong recruitment offset by longer ANVISA review timelines.",
  },
  {
    regionId: "mx",
    countryCode: "MX",
    displayName: "Mexico",
    currency: "MXN",
    fxRateToEur: 0.05,
    baseCostBand: {
      baseEur: 27500,
      phaseMultipliers: {
        I: 1.1,
        II: 0.9,
        III: 1.22,
        IV: 0.7,
      },
    },
    operationalAdjustments: {
      siteStartupMultiplier: 1.08,
      visitCostMultiplier: 0.82,
      monitoringOversightPerSite: 21500,
      regulatoryFilingCost: 82000,
      patientIncentivePerPatient: 520,
      startupLagMonths: 4,
    },
    typicalSiteThroughput: {
      patientsPerMonth: 2.1,
      visitsPerMonth: 22,
    },
    complianceRiskScore: 4,
    notes: "Regional COFEPRIS processes improving; solid investigator networks in major hubs.",
  },
  {
    regionId: "ar",
    countryCode: "AR",
    displayName: "Argentina",
    currency: "ARS",
    fxRateToEur: 0.002,
    baseCostBand: {
      baseEur: 25500,
      phaseMultipliers: {
        I: 1.06,
        II: 0.88,
        III: 1.18,
        IV: 0.68,
      },
    },
    operationalAdjustments: {
      siteStartupMultiplier: 1.1,
      visitCostMultiplier: 0.78,
      monitoringOversightPerSite: 20500,
      regulatoryFilingCost: 76000,
      patientIncentivePerPatient: 480,
      startupLagMonths: 5,
    },
    typicalSiteThroughput: {
      patientsPerMonth: 2.0,
      visitsPerMonth: 21,
    },
    complianceRiskScore: 4,
    notes: "Competitive per-patient pricing with strong academic institutions, currency volatility risk.",
  },
  {
    regionId: "co",
    countryCode: "CO",
    displayName: "Colombia",
    currency: "COP",
    fxRateToEur: 0.00022,
    baseCostBand: {
      baseEur: 24500,
      phaseMultipliers: {
        I: 1.04,
        II: 0.86,
        III: 1.15,
        IV: 0.66,
      },
    },
    operationalAdjustments: {
      siteStartupMultiplier: 1.05,
      visitCostMultiplier: 0.76,
      monitoringOversightPerSite: 19000,
      regulatoryFilingCost: 72000,
      patientIncentivePerPatient: 450,
      startupLagMonths: 4,
    },
    typicalSiteThroughput: {
      patientsPerMonth: 2.3,
      visitsPerMonth: 20,
    },
    complianceRiskScore: 3,
    notes: "Growing clinical research infrastructure with attractive recruitment rates.",
  },
  {
    regionId: "cl",
    countryCode: "CL",
    displayName: "Chile",
    currency: "CLP",
    fxRateToEur: 0.0011,
    baseCostBand: {
      baseEur: 26000,
      phaseMultipliers: {
        I: 1.05,
        II: 0.87,
        III: 1.16,
        IV: 0.67,
      },
    },
    operationalAdjustments: {
      siteStartupMultiplier: 1.02,
      visitCostMultiplier: 0.8,
      monitoringOversightPerSite: 19500,
      regulatoryFilingCost: 74000,
      patientIncentivePerPatient: 470,
      startupLagMonths: 4,
    },
    typicalSiteThroughput: {
      patientsPerMonth: 2.1,
      visitsPerMonth: 20,
    },
    complianceRiskScore: 3,
    notes: "Efficient regulatory timelines with concentrated expertise in Santiago-based centres.",
  },
  {
    regionId: "in",
    countryCode: "IN",
    displayName: "India",
    currency: "INR",
    fxRateToEur: 0.011,
    baseCostBand: {
      baseEur: 24000,
      phaseMultipliers: {
        I: 1.05,
        II: 0.85,
        III: 1.12,
        IV: 0.65,
      },
    },
    operationalAdjustments: {
      siteStartupMultiplier: 0.85,
      visitCostMultiplier: 0.72,
      monitoringOversightPerSite: 17500,
      regulatoryFilingCost: 68000,
      patientIncentivePerPatient: 400,
      startupLagMonths: 4,
    },
    typicalSiteThroughput: {
      patientsPerMonth: 2.8,
      visitsPerMonth: 20,
    },
    complianceRiskScore: 4,
    notes: "Cost-efficient with high patient access; requires robust quality oversight.",
  },
];

export function getRegionalBenchmark(regionId: string): RegionalCostBenchmark | undefined {
  return REGIONAL_COST_BENCHMARKS.find((benchmark) => benchmark.regionId === regionId) ?? BASELINE_REGIONAL_BENCHMARK;
}

export function getRegionalBenchmarks(regionIds?: string[]): RegionalCostBenchmark[] {
  if (!regionIds || regionIds.length === 0) {
    return REGIONAL_COST_BENCHMARKS;
  }
  const matches = REGIONAL_COST_BENCHMARKS.filter((benchmark) => regionIds.includes(benchmark.regionId));
  return matches.length > 0 ? matches : [BASELINE_REGIONAL_BENCHMARK];
}
