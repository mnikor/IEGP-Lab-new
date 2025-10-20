export type VendorCategory =
  | "global_cro"
  | "specialty_lab"
  | "imaging"
  | "central_pharmacy"
  | "biomarker"
  | "data_monitoring"
  | "decentralized_ops";

export type SupportedStudyPhase = "I" | "II" | "III" | "IV" | "any";

export interface VendorProfile {
  id: string;
  displayName: string;
  category: VendorCategory;
  /** Percentage markup applied to direct study operational spend (0.15 = 15%) */
  baseMarkup: number;
  /** Optional multiplier applied for specific phases */
  phaseMarkupAdjustments?: Partial<Record<SupportedStudyPhase, number>>;
  /** Monthly retainer fees in EUR (if any) */
  monthlyRetainerEur?: number;
  /** Minimum commitment in months */
  minimumCommitmentMonths?: number;
  /** FX hedging or reserve multipliers for emerging market work */
  fxVolatilityBuffer?: number;
  /** Narrative on the vendor strengths/limitations */
  notes?: string;
}

export interface VendorScenarioInput {
  selectedVendors: string[];
  studyPhase: SupportedStudyPhase;
  baseOperationalSpend: number;
  studyDurationMonths: number;
}

export interface VendorScenarioResult {
  vendorId: string;
  markupSpend: number;
  retainerSpend: number;
  fxBufferSpend: number;
  totalSpend: number;
  metadata: VendorProfile;
}

export const BASELINE_VENDOR_PROFILE: VendorProfile = {
  id: "vendor_baseline",
  displayName: "Baseline Operational Support",
  category: "global_cro",
  baseMarkup: 0.1,
  phaseMarkupAdjustments: {
    I: 0.12,
    II: 0.11,
    III: 0.13,
    IV: 0.09,
    any: 0.1,
  },
  monthlyRetainerEur: 0,
  minimumCommitmentMonths: 0,
  notes: "Generic global operations partner used when no specific vendor data is supplied.",
};

export const DEFAULT_VENDOR_PROFILES: VendorProfile[] = [
  BASELINE_VENDOR_PROFILE,
  {
    id: "cro_tier1",
    displayName: "Tier 1 Global CRO",
    category: "global_cro",
    baseMarkup: 0.22,
    phaseMarkupAdjustments: {
      III: 0.26,
      IV: 0.18,
    },
    monthlyRetainerEur: 180000,
    minimumCommitmentMonths: 18,
    fxVolatilityBuffer: 0.03,
    notes: "Integrated offering covering global site management, data management, and central monitoring.",
  },
  {
    id: "cro_regional_eu",
    displayName: "Regional CRO (EU Focus)",
    category: "global_cro",
    baseMarkup: 0.16,
    phaseMarkupAdjustments: {
      II: 0.18,
      III: 0.2,
    },
    monthlyRetainerEur: 95000,
    minimumCommitmentMonths: 12,
    notes: "Strong relationships with EU academic medical centres; requires sponsor oversight for ex-EU operations.",
  },
  {
    id: "lab_specialty_biomarker",
    displayName: "Specialty Biomarker Lab",
    category: "specialty_lab",
    baseMarkup: 0.28,
    phaseMarkupAdjustments: {
      I: 0.35,
      II: 0.31,
    },
    notes: "Advanced genomic and proteomic panels with rapid turnaround; capital intensive logistics.",
  },
  {
    id: "imaging_core",
    displayName: "Central Imaging Core Lab",
    category: "imaging",
    baseMarkup: 0.18,
    monthlyRetainerEur: 40000,
    minimumCommitmentMonths: 24,
    fxVolatilityBuffer: 0.02,
    notes: "Handles blinded radiology review and data harmonisation across geographies.",
  },
  {
    id: "dct_hybrid",
    displayName: "Hybrid Decentralised Trial Partner",
    category: "decentralized_ops",
    baseMarkup: 0.12,
    phaseMarkupAdjustments: {
      II: 0.16,
      III: 0.15,
    },
    monthlyRetainerEur: 65000,
    minimumCommitmentMonths: 9,
    notes: "Supports home-health nurse visits, wearables data capture, and patient concierge services.",
  },
  {
    id: "safety_dmc",
    displayName: "Independent Safety DMC",
    category: "data_monitoring",
    baseMarkup: 0.08,
    monthlyRetainerEur: 30000,
    minimumCommitmentMonths: 18,
    notes: "Data monitoring committee operations, charters, and interim review logistics.",
  },
  {
    id: "central_pharm",
    displayName: "Central Pharmacy & IMP Logistics",
    category: "central_pharmacy",
    baseMarkup: 0.14,
    fxVolatilityBuffer: 0.05,
    notes: "Manages global drug supply, temperature control, and import/export compliance.",
  },
];

export function getVendorProfile(vendorId: string): VendorProfile | undefined {
  return DEFAULT_VENDOR_PROFILES.find((profile) => profile.id === vendorId);
}

export function calculateVendorScenario(
  input: VendorScenarioInput
): VendorScenarioResult[] {
  const { selectedVendors, baseOperationalSpend, studyDurationMonths, studyPhase } = input;

  const fallbackIds = selectedVendors && selectedVendors.length > 0
    ? selectedVendors
    : [BASELINE_VENDOR_PROFILE.id];

  const resolvedProfiles = fallbackIds
    .map((vendorId) => getVendorProfile(vendorId))
    .filter((profile): profile is VendorProfile => Boolean(profile));

  const profilesToUse = resolvedProfiles.length > 0 ? resolvedProfiles : [BASELINE_VENDOR_PROFILE];

  return profilesToUse.map((profile) => {
      const phaseAdjustment = profile.phaseMarkupAdjustments?.[studyPhase] ?? profile.baseMarkup;
      const markupSpend = baseOperationalSpend * phaseAdjustment;
      const normalizedDuration = Math.max(0, studyDurationMonths);
      const retainerMonths = Math.max(profile.minimumCommitmentMonths ?? 0, normalizedDuration);
      const retainerSpend = (profile.monthlyRetainerEur ?? 0) * (retainerMonths > 0 ? retainerMonths : 0);
      const fxBufferSpend = baseOperationalSpend * (profile.fxVolatilityBuffer ?? 0);
      const totalSpend = markupSpend + retainerSpend + fxBufferSpend;

      return {
        vendorId: profile.id,
        markupSpend,
        retainerSpend,
        fxBufferSpend,
        totalSpend,
        metadata: profile,
      } satisfies VendorScenarioResult;
    });
}
