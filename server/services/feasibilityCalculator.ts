import { StudyConcept, GenerateConceptRequest } from "@shared/schema";
import { FeasibilityData, RegionalLoeData, RegionalRevenueForecast, ScenarioOutcome } from "@/lib/types";
import { calculateSampleSizeWithAI, calculateSampleSizeTraditional } from "./sampleSizeCalculator";
import { analyzeTherapeuticArea, adjustSampleSizeForTherapeuticArea, getTherapeuticAreaCostMultiplier } from "./therapeuticAreaEngine";
import { generateCommercialAssumptions } from "./commercialAssumptionGenerator";
import { BASELINE_REGIONAL_BENCHMARK, getRegionalBenchmarks } from "../data/regionalCostBenchmarks";
import { BASELINE_VENDOR_PROFILE, calculateVendorScenario } from "./vendorCostEngine";
import type { RegionalCostBenchmark } from "../data/regionalCostBenchmarks";
import type { VendorScenarioResult, SupportedStudyPhase } from "./vendorCostEngine";
import { REGIONAL_MARKET_DATA } from "./commercialIntelligence";
import type { CommercialAssumptions, StudyImpactCategory } from "@shared/commercialTypes";

// TypeScript interface for the extended request type including anticipatedFpiDate
type RegionalDeploymentMix = {
  regionId: string;
  weight: number;
};

interface StrategyProfile {
  unlockMultiplier: number;
  maxShare: number;
  retentionShare: number;
  uptakeLagYears: number;
  accessDelayYears: number;
  windowMultiplier: number;
  windowCap: number;
  evidenceMultiplier: number;
  practiceConfidence: number;
  labelProbability: number;
  accessProbability: number;
}

function deriveStrategyProfile(concept: ConceptWithFeasibility): StrategyProfile {
  const goals = Array.isArray(concept.strategicGoals) ? concept.strategicGoals : [];

  const profile: StrategyProfile = {
    unlockMultiplier: 1,
    maxShare: 35,
    retentionShare: 0,
    uptakeLagYears: 0,
    accessDelayYears: 0,
    windowMultiplier: 1,
    windowCap: 1.5,
    evidenceMultiplier: 1,
    practiceConfidence: 0.2,
    labelProbability: 0.15,
    accessProbability: 0.25,
  };

  const bumpUnlock = (amount: number, cap?: number) => {
    profile.unlockMultiplier += amount;
    if (cap) {
      profile.maxShare = Math.max(profile.maxShare, cap);
    }
  };

  if (goals.includes("expand_label") || goals.includes("extend_lifecycle_combinations") || goals.includes("secure_initial_approval")) {
    bumpUnlock(0.35, 45);
    profile.windowMultiplier += 0.12;
    profile.labelProbability += 0.35;
    profile.practiceConfidence += 0.25;
  }

  if (goals.includes("extend_lifecycle_combinations")) {
    bumpUnlock(0.2, 42);
    profile.retentionShare += 0.03;
    profile.windowMultiplier += 0.08;
    profile.practiceConfidence += 0.1;
  }

  if (goals.includes("accelerate_uptake")) {
    bumpUnlock(0.15, 40);
    profile.uptakeLagYears -= 0.6;
    profile.retentionShare += 0.03;
    profile.practiceConfidence += 0.12;
    profile.accessProbability += 0.08;
  }

  if (goals.includes("defend_market_share")) {
    profile.retentionShare += 0.08;
    profile.uptakeLagYears -= 0.35;
    profile.evidenceMultiplier += 0.05;
    profile.maxShare = Math.max(profile.maxShare, 38);
    profile.practiceConfidence += 0.15;
    profile.accessProbability += 0.05;
  }

  if (goals.includes("generate_real_world_evidence")) {
    profile.retentionShare += 0.06;
    profile.uptakeLagYears -= 0.4;
    profile.windowMultiplier += 0.05;
    profile.evidenceMultiplier += 0.1;
    bumpUnlock(0.05, 38);
    profile.practiceConfidence += 0.3;
    profile.accessProbability += 0.12;
  }

  if (goals.includes("facilitate_market_access")) {
    profile.accessDelayYears -= 0.3;
    profile.uptakeLagYears -= 0.2;
    profile.windowMultiplier += 0.05;
    profile.accessProbability += 0.25;
    profile.practiceConfidence += 0.05;
  }

  if (goals.includes("manage_safety_risk")) {
    profile.retentionShare += 0.02;
    profile.evidenceMultiplier += 0.02;
    profile.practiceConfidence += 0.08;
  }

  // Ensure values remain within sensible bounds
  profile.unlockMultiplier = Math.max(0.5, profile.unlockMultiplier);
  profile.maxShare = Math.max(20, Math.min(55, profile.maxShare));
  profile.retentionShare = Math.max(0, Math.min(0.2, profile.retentionShare));
  profile.windowMultiplier = Math.max(0.6, Math.min(1.5, profile.windowMultiplier));
  profile.windowCap = Math.max(1, Math.min(2.0, profile.windowCap + (profile.windowMultiplier - 1) * 0.5));
  profile.evidenceMultiplier = Math.max(0.6, Math.min(1.4, profile.evidenceMultiplier));
  profile.uptakeLagYears = Math.max(-1.5, Math.min(1.5, profile.uptakeLagYears));
  profile.accessDelayYears = Math.max(-1, Math.min(1.5, profile.accessDelayYears));
  profile.practiceConfidence = Math.max(0, Math.min(1, profile.practiceConfidence));
  profile.labelProbability = Math.max(0, Math.min(0.9, profile.labelProbability));
  profile.accessProbability = Math.max(0, Math.min(0.9, profile.accessProbability));

  return profile;
}
type ExtendedGenerateConceptRequest = GenerateConceptRequest & {
  anticipatedFpiDate?: string;
  globalLoeDate?: string;
  regionalLoeDates?: {
    region: string;
    date: string;
  }[];
  hasPatentExtensionPotential?: boolean;
  budgetCeilingEur?: number;
  timelineCeilingMonths?: number;
  strategicGoals?: string[];
  regionalDeploymentMix?: RegionalDeploymentMix[];
  vendorSelections?: string[];
  scenarioPreference?: "base" | "optimistic" | "pessimistic";
};

// Type assertion helper for feasibilityData
export type ConceptWithFeasibility = Partial<StudyConcept> & {
  feasibilityData?: FeasibilityData;
};

/**
 * Detects if a study involves biologics or high-cost therapies based on multiple indicators
 */
function detectBiologicsOrHighCostTherapy(concept: ConceptWithFeasibility): boolean {
  const drugName = (concept.drugName || '').toLowerCase();
  const indication = (concept.indication || '').toLowerCase();
  const title = (concept.title || '').toLowerCase();
  const pico = concept.picoData as Record<string, unknown> | undefined;
  const picoPopulation = typeof pico?.population === "string" ? (pico.population as string) : (concept.title || '');
  const description = picoPopulation.toLowerCase();
  
  // Biologic drug naming patterns
  const biologicPatterns = [
    'mab', 'ximab', 'zumab', 'tuzumab', 'lizumab', 'cizumab', 'omab',
    'tinib', 'nib', 'ceptor', 'kinra', 'inib', 'prot', 'ase',
    'pegyl', 'interferon', 'interleukin', 'rituximab', 'adalimumab',
    'infliximab', 'etanercept', 'certolizumab', 'golimumab',
    'ustekinumab', 'secukinumab', 'ixekizumab', 'brodalumab',
    'risankizumab', 'guselkumab', 'tildrakizumab'
  ];
  
  // High-cost indication patterns
  const highCostIndications = [
    'cancer', 'oncology', 'tumor', 'carcinoma', 'sarcoma', 'lymphoma', 'leukemia',
    'multiple sclerosis', 'rheumatoid arthritis', 'psoriasis', 'crohn', 'colitis',
    'inflammatory bowel', 'ankylosing spondylitis', 'lupus', 'vasculitis',
    'transplant', 'rejection', 'graft', 'immunosuppression',
    'rare disease', 'orphan', 'genetic disorder', 'metabolic disorder'
  ];
  
  // Therapeutic area patterns indicating high costs
  const highCostTherapeuticAreas = [
    'immunology', 'immune', 'autoimmune', 'inflammatory',
    'hematology', 'heme', 'onco', 'neuro', 'cardio',
    'gene therapy', 'cell therapy', 'regenerative',
    'precision medicine', 'personalized', 'targeted therapy'
  ];
  
  // Check drug name patterns
  const hasBiologicDrug = biologicPatterns.some(pattern => 
    drugName.includes(pattern) || title.includes(pattern));
  
  // Check indication patterns
  const hasHighCostIndication = highCostIndications.some(pattern => 
    indication.includes(pattern) || title.includes(pattern) || description.includes(pattern));
  
  // Check therapeutic area patterns
  const hasHighCostTherapeuticArea = highCostTherapeuticAreas.some(pattern => 
    indication.includes(pattern) || title.includes(pattern) || description.includes(pattern));
  
  // Advanced detection: look for cost indicators in study phase and design
  const studyPhase = concept.studyPhase || '';
  const hasComplexPhase = studyPhase.includes('III') || studyPhase.includes('adaptive');
  
  // Strategic goals indicating high-cost studies
  const strategicGoals = concept.strategicGoals || [];
  const hasHighCostGoals = strategicGoals.some((goal: string) => 
    ['expand_label', 'defend_market_share', 'accelerate_uptake'].includes(goal));
  
  return hasBiologicDrug || hasHighCostIndication || hasHighCostTherapeuticArea || 
         (hasComplexPhase && hasHighCostGoals);
}

/**
 * Calculates feasibility metrics for a study concept
 * 
 * @param concept The study concept to calculate feasibility for
 * @param requestData The original request data for context
 * @returns Feasibility data object
 */
export async function calculateFeasibility(concept: ConceptWithFeasibility, requestData: Partial<ExtendedGenerateConceptRequest>): Promise<FeasibilityData> {
  // Step 1: Determine the study phase and complexity factors
  const studyPhase = concept.studyPhase || 'any';
  const isRealWorldEvidence = concept.strategicGoals?.includes('generate_real_world_evidence') || false;
  const isOncology = (concept.indication || '').toLowerCase().includes('cancer') || 
                    (concept.indication || '').toLowerCase().includes('oncol') || 
                    (concept.indication || '').toLowerCase().includes('tumor') ||
                    (concept.indication || '').toLowerCase().includes('carcinoma') ||
                    (concept.indication || '').toLowerCase().includes('sarcoma') ||
                    (concept.indication || '').toLowerCase().includes('leukemia') ||
                    (concept.indication || '').toLowerCase().includes('lymphoma');
  
  // Determine regional deployment baseline
  const requestedRegions: string[] = requestData.regionalDeploymentMix?.map((mix: RegionalDeploymentMix) => mix.regionId)
    ?? concept.geography
    ?? [];
  const regionalBenchmarks: RegionalCostBenchmark[] = getRegionalBenchmarks(requestedRegions);
  const hasCustomRegionalData = Array.isArray(requestData.regionalDeploymentMix) && requestData.regionalDeploymentMix.length > 0;

  const effectiveRegionalMix: RegionalDeploymentMix[] = hasCustomRegionalData
    ? requestData.regionalDeploymentMix!
    : [{ regionId: BASELINE_REGIONAL_BENCHMARK.regionId, weight: 1 }];

  const geographyCount = requestedRegions.length > 0
    ? requestedRegions.length
    : concept.geography && concept.geography.length > 0
      ? concept.geography.length
      : 1;
  
  const hasTargetSubpopulation = !!concept.targetSubpopulation;
  const comparatorCount = concept.comparatorDrugs?.length || 0;
  
  // Step 2: Calculate patient numbers using AI-driven statistical analysis with therapeutic area intelligence
  const therapeuticContext = analyzeTherapeuticArea(concept);
  let sampleSizeCalculation;
  
  try {
    // Use AI-driven calculation for personalized sample size determination
    sampleSizeCalculation = await calculateSampleSizeWithAI(concept, requestData);
    console.log('AI-driven sample size calculation completed successfully');
  } catch (error) {
    console.warn('AI calculation failed, using traditional method:', error);
    sampleSizeCalculation = calculateSampleSizeTraditional(concept, requestData);
  }
  
  let patientCount = adjustSampleSizeForTherapeuticArea(
    sampleSizeCalculation.sampleSize, 
    therapeuticContext, 
    concept.studyPhase || 'any'
  );
  let sampleSizeJustification = `${sampleSizeCalculation.justification} Adjusted for ${therapeuticContext.area} therapeutic area complexity and recruitment characteristics.`;
  
  // Ensure minimum realistic patient count
  patientCount = Math.max(patientCount, 20); // Minimum 20 patients for any study
  
  // For Real World Evidence studies, adjust the calculated sample size upward
  if (isRealWorldEvidence) {
    patientCount = Math.round(patientCount * 2.5); // RWE studies need larger populations
    sampleSizeJustification = `${sampleSizeJustification} Sample size increased for real-world evidence collection to ensure adequate representation across diverse patient populations and practice settings.`;
  }
  
  console.log("Sample size calculation:", {
    originalSampleSize: sampleSizeCalculation.sampleSize,
    adjustedPatientCount: patientCount,
    geographyCount: geographyCount,
    studyPhase: studyPhase
  });
  
  // Step 3: Calculate site numbers based on geography and patient count
  // These are estimated patients per site by phase
  const patientsPerSiteByPhase: { [key: string]: number } = {
    'I': 10,
    'II': 15,
    'III': 20,
    'IV': 25,
    'any': 18
  };
  
  // Calculate patients per site for the given phase
  const patientsPerSite = patientsPerSiteByPhase[studyPhase] || 18;
  
  // Calculate total sites needed across all geographies
  let totalSites = Math.ceil(patientCount / patientsPerSite);
  
  // Ensure minimum sites per geography (at least 2 sites per geography)
  const minimumSitesTotal = geographyCount * 2;
  totalSites = Math.max(totalSites, minimumSitesTotal);
  
  // Ensure we don't have more sites than makes sense (max 50 sites per geography for very large studies)
  const maximumSitesTotal = geographyCount * 50;
  totalSites = Math.min(totalSites, maximumSitesTotal);
  
  // Final safety check - ensure totalSites is never zero or negative
  totalSites = Math.max(totalSites, minimumSitesTotal);
  
  console.log("Site calculation:", {
    patientCount: patientCount,
    patientsPerSite: patientsPerSite,
    calculatedSites: Math.ceil(patientCount / patientsPerSite),
    minimumSitesTotal: minimumSitesTotal,
    finalTotalSites: totalSites,
    geographyCount: geographyCount
  });
  
  // Step 4: Calculate cost based on statistical sample size and study complexity
  // Base cost per patient varies by endpoint complexity, phase requirements, and regional mix
  let costPerPatient: number;
  
  // Adjust base cost by endpoint type from sample size calculation - UPDATED FOR BIOLOGICS
  const calculatedEndpointType = sampleSizeCalculation.endpoint.type;
  
  // Enhanced biologics and high-cost therapy detection system with therapeutic area context
  const isBiologicsStudy = detectBiologicsOrHighCostTherapy(concept);
  const therapeuticAreaCostMultiplier = getTherapeuticAreaCostMultiplier(therapeuticContext, studyPhase);
  
  if (calculatedEndpointType === 'survival') {
    costPerPatient = isOncology ? (isBiologicsStudy ? 85000 : 65000) : (isBiologicsStudy ? 65000 : 45000);
  } else if (calculatedEndpointType === 'response_rate') {
    costPerPatient = isOncology ? (isBiologicsStudy ? 70000 : 50000) : (isBiologicsStudy ? 55000 : 35000);
  } else if (calculatedEndpointType === 'biomarker') {
    costPerPatient = isBiologicsStudy ? 55000 : 40000;
  } else if (calculatedEndpointType === 'safety') {
    costPerPatient = studyPhase === 'I' ? (isBiologicsStudy ? 65000 : 45000) : (isBiologicsStudy ? 45000 : 30000);
  } else {
    costPerPatient = isOncology ? (isBiologicsStudy ? 65000 : 45000) : (isBiologicsStudy ? 50000 : 32000);
  }
  
  // Adjust for study phase complexity - INCREASED MULTIPLIERS FOR REALISTIC COSTS
  const phaseMultipliers = {
    'I': 1.3,   // Phase I requires intensive monitoring
    'II': 1.1,  // Phase II increased base cost  
    'III': 1.6, // Phase III has much more complex logistics
    'IV': 0.8,  // Post-market studies are less intensive
    'any': 1.2
  };
  
  costPerPatient *= phaseMultipliers[studyPhase as keyof typeof phaseMultipliers] || 1.2;
  
  // Apply therapeutic area cost multiplier for comprehensive cost modeling
  costPerPatient *= therapeuticAreaCostMultiplier;
  
  // Adjust for statistical power requirements (higher power = more rigorous = more expensive)
  const powerAdjustment = 0.8 + (sampleSizeCalculation.parameters.power * 0.4); // 0.8 to 1.2 multiplier
  costPerPatient *= powerAdjustment;
  
  // Adjust for real world evidence studies
  if (isRealWorldEvidence) {
    costPerPatient *= 0.75; // RWE studies have less intensive interventions but more data collection
  }
  
  // Site setup cost per site (in EUR) - varies by geography and study complexity
  let siteSetupCost = 25000;
  if (geographyCount > 5) siteSetupCost = 35000; // Multi-regional studies
  if (calculatedEndpointType === 'survival') siteSetupCost *= 1.2; // Survival studies need more site infrastructure
  if (comparatorCount > 0) siteSetupCost *= 1.1; // Complex study designs
  
  // Calculate regionalized patient distribution
  const regionalCostBreakdown = effectiveRegionalMix.map((mix: RegionalDeploymentMix) => {
    const benchmark = regionalBenchmarks.find((region) => region.regionId === mix.regionId) || BASELINE_REGIONAL_BENCHMARK;
    const patientShare = mix.weight;
    const patientsInRegion = Math.round(patientCount * patientShare);
    const sitesInRegion = Math.max(2, Math.round(totalSites * patientShare));

    const phaseMultiplier = benchmark.baseCostBand.phaseMultipliers[studyPhase as keyof typeof benchmark.baseCostBand.phaseMultipliers] ?? 1;
    const regionalCostPerPatient = benchmark.baseCostBand.baseEur * phaseMultiplier * benchmark.operationalAdjustments.visitCostMultiplier;
    const patientVisitCost = patientsInRegion * regionalCostPerPatient;
    const siteStartupCost = sitesInRegion * siteSetupCost * benchmark.operationalAdjustments.siteStartupMultiplier;
    const monitoringCost = sitesInRegion * benchmark.operationalAdjustments.monitoringOversightPerSite;
    const regulatoryCost = benchmark.operationalAdjustments.regulatoryFilingCost;
    const patientIncentives = patientsInRegion * benchmark.operationalAdjustments.patientIncentivePerPatient;

    return {
      regionId: benchmark.regionId,
      displayName: benchmark.displayName,
      patients: patientsInRegion,
      sites: sitesInRegion,
      patientShare,
      siteStartupCost: Math.round(siteStartupCost),
      patientVisitCost: Math.round(patientVisitCost),
      monitoringCost: Math.round(monitoringCost),
      regulatoryCost: Math.round(regulatoryCost),
      patientIncentives: Math.round(patientIncentives),
      vendorSpend: 0,
      totalCost: 0,
      startupLagMonths: benchmark.operationalAdjustments.startupLagMonths,
      notes: benchmark.notes,
    };
  });

  const baselineEstimatedCost = (patientCount * costPerPatient) + (totalSites * siteSetupCost);
  let estimatedCost = baselineEstimatedCost;
  
  // Additional costs for study complexity
  if (comparatorCount > 0) {
    estimatedCost *= (1 + (comparatorCount * 0.15)); // 15% increase per comparator arm
  }
  
  // Cost adjustment for subpopulation studies (require more screening)
  if (hasTargetSubpopulation) {
    estimatedCost *= 1.25; // 25% increase for targeted populations
  }
  
  // Regulatory costs vary by geography, phase, and therapeutic area
  // First country has higher regulatory costs, then each additional country adds less
  let regulatoryCostBase = isOncology ? 100000 : 75000; // Base cost for first country
  if (studyPhase === 'III') {
    regulatoryCostBase *= 1.5; // Phase III studies have higher regulatory complexity
  } else if (studyPhase === 'I') {
    regulatoryCostBase *= 0.7; // Phase I studies have less regulatory burden
  }
  
  // Calculate total regulatory costs with diminishing returns for additional countries
  const regulatoryCost = regulatoryCostBase + (Math.log2(geographyCount) * regulatoryCostBase * 0.5);
  estimatedCost += regulatoryCost;

  // Step 5: Calculate timeline based on statistical power-informed recruitment
  // Monthly recruitment rate per site varies by phase and indication complexity
  let monthlyRecruitmentPerSite = 1.5; // Base rate
  
  // Adjust recruitment rate based on study characteristics
  if (isOncology) {
    monthlyRecruitmentPerSite *= 0.7; // Oncology patients harder to recruit
  }
  
  if (hasTargetSubpopulation) {
    monthlyRecruitmentPerSite *= 0.6; // Subpopulations are more difficult to find
  }
  
  if (studyPhase === 'I') {
    monthlyRecruitmentPerSite *= 0.8; // Phase I often slower due to safety concerns
  } else if (studyPhase === 'III') {
    monthlyRecruitmentPerSite *= 1.2; // Phase III often has broader criteria
  }
  
  // Calculate realistic recruitment period based on statistical sample size
  const recruitmentPeriod = Math.ceil(patientCount / (totalSites * monthlyRecruitmentPerSite));
  
  // Follow-up periods based on endpoint type from sample size calculation
  let followUpPeriod: number;
  const timelineEndpointType = sampleSizeCalculation.endpoint.type;
  
  if (timelineEndpointType === 'survival') {
    followUpPeriod = isOncology ? 24 : 18; // Longer follow-up for survival endpoints
  } else if (timelineEndpointType === 'safety') {
    followUpPeriod = studyPhase === 'I' ? 6 : 12; // Safety follow-up varies by phase
  } else if (timelineEndpointType === 'response_rate') {
    followUpPeriod = isOncology ? 12 : 6; // Response assessment period
  } else if (timelineEndpointType === 'biomarker') {
    followUpPeriod = 3; // Biomarker studies have shorter follow-up
  } else {
    followUpPeriod = 9; // Default continuous endpoint follow-up
  }
  
  // Database lock and analysis period
  const analysisProcessingTime = studyPhase === 'III' ? 6 : 4;
  
  const baselineStudyDurationMonths = Math.max(1, recruitmentPeriod + followUpPeriod + analysisProcessingTime);

  // Total timeline from FPI to final report
  let timeline = baselineStudyDurationMonths;

  if (regionalCostBreakdown.length > 0) {
    const maxStartupLag = Math.max(...regionalCostBreakdown.map((region) => region.startupLagMonths || 0));
    timeline += maxStartupLag;
  }
  
  // Adjust timeline for multi-geography studies (regulatory and coordination delays)
  if (geographyCount > 1) {
    const additionalTime = Math.log2(geographyCount) * 3; // More realistic delay for multiple countries
    timeline += additionalTime;
  }
  
  // Adjust for study complexity based on comparators
  if (comparatorCount > 0) {
    timeline += comparatorCount * 2; // Additional time for complex study designs
  }

  // Vendor scenario modeling
  const vendorIds = requestData.vendorSelections && requestData.vendorSelections.length > 0
    ? requestData.vendorSelections
    : [BASELINE_VENDOR_PROFILE.id];

  const vendorScenarioResults: VendorScenarioResult[] = calculateVendorScenario({
    selectedVendors: vendorIds,
    studyPhase: (studyPhase as SupportedStudyPhase) ?? "any",
    baseOperationalSpend: estimatedCost,
    studyDurationMonths: Math.round(Math.max(1, timeline)),
  });

  const totalVendorSpend = vendorScenarioResults.reduce((sum, result) => sum + result.totalSpend, 0);
  estimatedCost += totalVendorSpend;

  // Update regional breakdown with vendor spend proportional allocation
  if (regionalCostBreakdown.length > 0) {
    const totalRegionalSpend = regionalCostBreakdown.reduce((sum, region) => sum + region.patientVisitCost + region.siteStartupCost + region.monitoringCost + region.regulatoryCost + region.patientIncentives, 0);
    const allocationBaseline = totalRegionalSpend > 0 ? totalRegionalSpend : baselineEstimatedCost;
    regionalCostBreakdown.forEach((region) => {
      const operationalCost = region.patientVisitCost + region.siteStartupCost + region.monitoringCost + region.regulatoryCost + region.patientIncentives;
      const vendorAllocation = allocationBaseline > 0 ? Math.round(totalVendorSpend * (operationalCost / allocationBaseline)) : Math.round(totalVendorSpend / regionalCostBreakdown.length);
      region.vendorSpend = vendorAllocation;
      region.totalCost = Math.round(operationalCost + vendorAllocation);
    });
  }

  // Step 6: Calculate recruitment rate (0-1 scale)
  const recruitmentRate = calculateRecruitmentRate(concept, studyPhase);
  
  // Get LOE (Loss of Exclusivity) data from the request if available
  const loeData = calculateLoeData(concept, requestData, timeline);
  
  // Create initial feasibility data for completion risk calculation
  const initialFeasibilityData: FeasibilityData = {
    estimatedCost: Math.round(estimatedCost),
    timeline: Math.round(timeline),
    projectedROI: 2.5, // Default ROI of 2.5x (meaning 2.5 times return on investment)
    recruitmentRate: parseFloat(recruitmentRate.toFixed(2)),
    completionRisk: 0,
    sampleSize: patientCount,
    sampleSizeJustification: sampleSizeJustification,
    numberOfSites: totalSites,
    numberOfCountries: geographyCount,
    recruitmentPeriodMonths: recruitmentPeriod,
    followUpPeriodMonths: Math.round(timeline - recruitmentPeriod),
    expectedToplineDate: loeData.expectedToplineDate,
    plannedDbLockDate: loeData.plannedDbLockDate,
    windowToLoeMonths: loeData.windowToLoeMonths,
    
    // LOE data from calculations - IMPORTANT: use user-provided values when available
    globalLoeDate: requestData.globalLoeDate || loeData.globalLoeDate,
    regionalLoeData: loeData.regionalLoeData,
    timeToLoe: loeData.timeToLoe,
    postLoeValue: loeData.postLoeValue,
    estimatedFpiDate: requestData.anticipatedFpiDate || loeData.estimatedFpiDate,
    
    // Cost breakdown with MINIMUM values to ensure no zero values
    siteCosts: Math.max(10000, Math.round(totalSites * siteSetupCost)),
    personnelCosts: Math.max(15000, Math.round(estimatedCost * 0.3)),  // 30% personnel costs
    materialCosts: Math.max(5000, Math.round(estimatedCost * 0.15)),   // 15% material costs
    monitoringCosts: Math.max(8000, Math.round(estimatedCost * 0.2)),  // 20% monitoring costs 
    dataCosts: Math.max(5000, Math.round(estimatedCost * 0.15)),       // 15% data management costs
    regulatoryCosts: Math.max(5000, Math.round(regulatoryCost)),       // Regulatory costs
    dropoutRate: 0.13, // Default realistic dropout rate
    complexityFactor: 0.65 // Default complexity factor
  };
  
  // Create concept with initial feasibility data for calculations
  const conceptWithFeasibility = {
    ...concept,
    feasibilityData: initialFeasibilityData
  };
  
  // Step 7: Calculate completion risk (0-1 scale, where 0 is lowest risk and 1 is highest risk)
  const completionRisk = calculateCompletionRisk(conceptWithFeasibility, studyPhase, requestData);
  
  // Step 8: Calculate projected ROI
  const strategyProfile = deriveStrategyProfile(conceptWithFeasibility);
  const commercialAssumptions = await generateCommercialAssumptions(
    {
      title: concept.title,
      drugName: concept.drugName,
      indication: concept.indication,
      studyPhase: concept.studyPhase,
      strategicGoals: concept.strategicGoals,
      geography: concept.geography,
      mcdaScores: concept.mcdaScores,
      feasibilityData: { timeline: initialFeasibilityData.timeline },
    },
    therapeuticContext.area
  );
  initialFeasibilityData.commercialAssumptions = commercialAssumptions;
  const commercialOutlook = calculateCommercialOutlook({
    concept: conceptWithFeasibility,
    feasibility: initialFeasibilityData,
    requestData,
    regionalBenchmarks,
    effectiveRegionalMix,
    scenarioPreference: requestData.scenarioPreference,
    strategyProfile,
    commercialAssumptions,
  });
  const projectedROI = commercialOutlook.baseRoi;
  
  // Extract AI analysis from sample size calculation
  const aiAnalysis = (sampleSizeCalculation as any).aiAnalysis || null;

  // Enforce any budget ceilings by adjusting scope if necessary
  if (requestData.budgetCeilingEur && estimatedCost > requestData.budgetCeilingEur) {
    // Adjust cost to ceiling and note the impact on timeline and other factors
    const adjustmentRatio = requestData.budgetCeilingEur / estimatedCost;
    estimatedCost = requestData.budgetCeilingEur;
    timeline = Math.ceil(timeline * (1 + (1 - adjustmentRatio) * 0.5)); // Timeline increases with budget constraints
  }

  // Calculate cost breakdowns
  const totalCost = Math.round(estimatedCost);
  
  // Adjust proportions for oncology studies which have different cost distribution
  let personnelPct, materialPct, monitoringPct, dataPct;
  
  if (isOncology) {
    // Oncology trials have higher monitoring and data costs
    personnelPct = 0.25; // Staff costs are proportionally lower
    materialPct = 0.20;  // Materials (drugs, tests) are higher
    monitoringPct = 0.25; // More intensive patient monitoring
    dataPct = 0.18;      // More complex data collection and analysis
  } else {
    // Standard distribution for non-oncology
    personnelPct = 0.30;
    materialPct = 0.15;
    monitoringPct = 0.20;
    dataPct = 0.15;
  }
  
  // Ensure site costs are reasonable (minimum value)
  const siteCosts = Math.max(10000, Math.round(totalSites * siteSetupCost));
  const regulatoryCosts = Math.max(10000, Math.round(regulatoryCost));
  
  // Calculate other costs as percentages of the remaining budget after site and regulatory costs
  const remainingBudget = Math.max(5000, totalCost - siteCosts - regulatoryCosts);
  
  // Ensure each cost component is at least a minimum reasonable value to avoid showing zeros
  const personnelCosts = Math.max(15000, Math.round(remainingBudget * personnelPct));
  const materialCosts = Math.max(5000, Math.round(remainingBudget * materialPct)); 
  const monitoringCosts = Math.max(8000, Math.round(remainingBudget * monitoringPct));
  const dataCosts = Math.max(5000, Math.round(remainingBudget * dataPct));
  
  // Risk factors
  const dropoutRate = Math.min(0.3, 0.1 + (completionRisk * 0.2)); // 10-30% dropout rate
  const complexityFactor = Math.min(1.0, 0.5 + (0.1 * geographyCount) + (0.05 * comparatorCount)); // 0.5-1.0 scale
  
  // Ensure all cost components are non-zero and properly calculated
  const finalSiteCosts = Math.max(10000, siteCosts);
  const finalPersonnelCosts = Math.max(15000, personnelCosts);
  const finalMaterialCosts = Math.max(5000, materialCosts);
  const finalMonitoringCosts = Math.max(8000, monitoringCosts);
  const finalDataCosts = Math.max(5000, dataCosts);
  const finalRegulatoryCosts = Math.max(5000, regulatoryCosts);
  
  // Verify total cost equals sum of components
  const calculatedTotalCost = finalSiteCosts + finalPersonnelCosts + finalMaterialCosts + 
                              finalMonitoringCosts + finalDataCosts + finalRegulatoryCosts;
  const finalTotalCost = Math.max(totalCost, calculatedTotalCost + totalVendorSpend);
  
  console.log("Final cost breakdown:", {
    totalCost: finalTotalCost,
    siteCosts: finalSiteCosts,
    personnelCosts: finalPersonnelCosts,
    materialCosts: finalMaterialCosts,
    monitoringCosts: finalMonitoringCosts,
    dataCosts: finalDataCosts,
    regulatoryCosts: finalRegulatoryCosts,
    vendorCosts: Math.round(totalVendorSpend),
    sum: calculatedTotalCost
  });

  const scenarioAnalysis = buildScenarioAnalysis({
    baseCost: finalTotalCost,
    baseTimeline: timeline,
    baseRoi: projectedROI,
    commercialOutlook,
  });

  const studyImpact = classifyStudyImpact(conceptWithFeasibility, strategyProfile, commercialOutlook);
  (conceptWithFeasibility as any).studyImpact = studyImpact;

  return {
    // Core metrics
    estimatedCost: finalTotalCost,
    timeline: Math.round(timeline),
    projectedROI: projectedROI !== undefined ? parseFloat(projectedROI.toFixed(1)) : 2.5,
    recruitmentRate: parseFloat(recruitmentRate.toFixed(2)),
    completionRisk: parseFloat(completionRisk.toFixed(2)),
    
    // Enhanced study details with statistical power analysis
    sampleSize: patientCount,
    sampleSizeJustification: sampleSizeJustification,
    numberOfSites: totalSites,
    numberOfCountries: geographyCount,
    recruitmentPeriodMonths: recruitmentPeriod,
    followUpPeriodMonths: followUpPeriod,
    
    // Statistical power analysis details
    statisticalPower: sampleSizeCalculation.parameters.power,
    alphaLevel: sampleSizeCalculation.parameters.alpha,
    effectSize: sampleSizeCalculation.parameters.effectSize,
    endpointType: sampleSizeCalculation.endpoint.type,
    powerAnalysis: sampleSizeCalculation.powerAnalysis,
    
    // LOE data
    globalLoeDate: requestData.globalLoeDate || loeData.globalLoeDate,
    regionalLoeData: loeData.regionalLoeData,
    timeToLoe: loeData.timeToLoe,
    postLoeValue: loeData.postLoeValue,
    estimatedFpiDate: requestData.anticipatedFpiDate || loeData.estimatedFpiDate,
    expectedToplineDate: loeData.expectedToplineDate,
    plannedDbLockDate: loeData.plannedDbLockDate,
    windowToLoeMonths: loeData.windowToLoeMonths,
    
    // Cost breakdown - ensure all values are properly set and non-zero
    siteCosts: finalSiteCosts,
    personnelCosts: finalPersonnelCosts,
    materialCosts: finalMaterialCosts,
    monitoringCosts: finalMonitoringCosts,
    dataCosts: finalDataCosts,
    regulatoryCosts: finalRegulatoryCosts,
    
    // Risk factors
    dropoutRate: parseFloat(dropoutRate.toFixed(2)),
    complexityFactor: parseFloat(complexityFactor.toFixed(2)),
    
    // Extended reporting
    regionalCostBreakdown: regionalCostBreakdown.map((region) => ({
      ...region,
      totalCost: region.totalCost || Math.round(region.patientVisitCost + region.siteStartupCost + region.monitoringCost + region.regulatoryCost + region.patientIncentives + region.vendorSpend),
    })),
    vendorSpendSummary: vendorScenarioResults.map((result) => ({
      vendorId: result.vendorId,
      displayName: result.metadata.displayName,
      category: result.metadata.category,
      totalSpend: Math.round(result.totalSpend),
      markupSpend: Math.round(result.markupSpend),
      retainerSpend: Math.round(result.retainerSpend),
      fxBufferSpend: Math.round(result.fxBufferSpend),
    })),
    scenarioAnalysis,
    totalIncrementalSalesUsd: Math.round(commercialOutlook.totalIncrementalSalesUsd),
    totalIncrementalSalesEur: Math.round(commercialOutlook.totalIncrementalSalesEur),
    economicNetPresentValueUsd: Math.round(commercialOutlook.baseENpvUsd),
    economicNetPresentValueEur: Math.round(commercialOutlook.baseENpvEur),
    riskAdjustedENpvUsd: Math.round(commercialOutlook.riskAdjustedENpvUsd),
    riskAdjustedENpvEur: Math.round(commercialOutlook.riskAdjustedENpvEur),
    regionalRevenueForecast: commercialOutlook.regionalRevenueForecast,
    commercialAssumptions,
    studyImpact,
    // AI Analysis - include comprehensive statistical justification data
    aiAnalysis,
  };
}

function buildScenarioAnalysis(params: { baseCost: number; baseTimeline: number; baseRoi: number; commercialOutlook: CommercialOutlook }): ScenarioOutcome[] {
  const { baseCost, baseTimeline, baseRoi, commercialOutlook } = params;
  const { scenarios } = commercialOutlook;

  const base: ScenarioOutcome = {
    scenario: "base",
    estimatedCost: Math.round(baseCost),
    timeline: Math.round(baseTimeline),
    projectedROI: parseFloat(baseRoi.toFixed(1)),
    incrementalSalesUsd: Math.round(scenarios.base.incrementalSalesUsd),
    incrementalSalesEur: Math.round(scenarios.base.incrementalSalesEur),
    eNpvUsd: Math.round(scenarios.base.eNpvUsd),
    eNpvEur: Math.round(scenarios.base.eNpvEur),
  };

  const optimistic: ScenarioOutcome = {
    scenario: "optimistic",
    estimatedCost: Math.round(baseCost * 0.92),
    timeline: Math.max(1, Math.round(baseTimeline * 0.9)),
    projectedROI: parseFloat((baseRoi * 1.15).toFixed(1)),
    incrementalSalesUsd: Math.round(scenarios.optimistic.incrementalSalesUsd),
    incrementalSalesEur: Math.round(scenarios.optimistic.incrementalSalesEur),
    eNpvUsd: Math.round(scenarios.optimistic.eNpvUsd),
    eNpvEur: Math.round(scenarios.optimistic.eNpvEur),
  };

  const pessimistic: ScenarioOutcome = {
    scenario: "pessimistic",
    estimatedCost: Math.round(baseCost * 1.12),
    timeline: Math.round(baseTimeline * 1.15),
    projectedROI: parseFloat(Math.max(0.5, baseRoi * 0.75).toFixed(1)),
    incrementalSalesUsd: Math.round(scenarios.pessimistic.incrementalSalesUsd),
    incrementalSalesEur: Math.round(scenarios.pessimistic.incrementalSalesEur),
    eNpvUsd: Math.round(scenarios.pessimistic.eNpvUsd),
    eNpvEur: Math.round(scenarios.pessimistic.eNpvEur),
  };

  return [base, optimistic, pessimistic];
}

interface CommercialOutlook {
  totalIncrementalSalesUsd: number;
  totalIncrementalSalesEur: number;
  baseENpvUsd: number;
  baseENpvEur: number;
  riskAdjustedENpvUsd: number;
  riskAdjustedENpvEur: number;
  baseRoi: number;
  regionalRevenueForecast: RegionalRevenueForecast[];
  scenarios: {
    base: { incrementalSalesUsd: number; incrementalSalesEur: number; eNpvUsd: number; eNpvEur: number; roi: number; };
    optimistic: { incrementalSalesUsd: number; incrementalSalesEur: number; eNpvUsd: number; eNpvEur: number; roi: number; };
    pessimistic: { incrementalSalesUsd: number; incrementalSalesEur: number; eNpvUsd: number; eNpvEur: number; roi: number; };
  };
}

function calculateCommercialOutlook(params: {
  concept: ConceptWithFeasibility;
  feasibility: FeasibilityData;
  requestData: Partial<ExtendedGenerateConceptRequest>;
  regionalBenchmarks: RegionalCostBenchmark[];
  effectiveRegionalMix: RegionalDeploymentMix[];
  scenarioPreference?: "base" | "optimistic" | "pessimistic";
  strategyProfile?: StrategyProfile;
  commercialAssumptions: CommercialAssumptions;
}): CommercialOutlook {
  const { concept, feasibility, requestData, regionalBenchmarks, effectiveRegionalMix, strategyProfile, commercialAssumptions } = params;
  const timelineMonths = feasibility.timeline || 36;
  const timelineYears = timelineMonths / 12;
  const profile = strategyProfile ?? deriveStrategyProfile(concept);

  const discountRate = 0.1;
  const usdToEur = 0.92;
  const therapeuticMultiplier = getTherapeuticRevenueMultiplier(concept) * profile.evidenceMultiplier;

  const adjustedWindowYears = calculateWindowOfOpportunityYears(feasibility, timelineMonths) * profile.windowMultiplier;
  const cappedWindow = Math.max(1, Math.min(profile.windowCap, adjustedWindowYears));

  const impactWindowYears = Math.max(1, Math.min(cappedWindow, commercialAssumptions.impactDurationYears || cappedWindow));
  const baseAnnualRevenue = Math.max(0, commercialAssumptions.avgAnnualRevenuePerPatientUsd) * Math.max(0, commercialAssumptions.addressablePatientCount);
  const peakShare = Math.min(profile.maxShare, Math.max(1, commercialAssumptions.peakSharePercent) * profile.unlockMultiplier);
  const annualIncrementalRevenue = baseAnnualRevenue * (peakShare / 100) * therapeuticMultiplier;
  const retentionAnnualRevenue = baseAnnualRevenue * profile.retentionShare * 0.35 * therapeuticMultiplier;
  const totalAnnualRevenue = annualIncrementalRevenue + retentionAnnualRevenue;

  const weightDenominator = effectiveRegionalMix.reduce((sum, mix) => {
    const weight = mix.weight || 1;
    const marketData = REGIONAL_MARKET_DATA[mix.regionId as keyof typeof REGIONAL_MARKET_DATA];
    const pricing = marketData?.pricingMultiplier ?? 1;
    return sum + weight * pricing;
  }, 0) || effectiveRegionalMix.length || 1;

  const regionalRevenueForecast: RegionalRevenueForecast[] = effectiveRegionalMix.map((mix) => {
    const benchmark = regionalBenchmarks.find((region) => region.regionId === mix.regionId) || BASELINE_REGIONAL_BENCHMARK;
    const marketData = REGIONAL_MARKET_DATA[mix.regionId as keyof typeof REGIONAL_MARKET_DATA];
    const weighting = (mix.weight || 1) * (marketData?.pricingMultiplier ?? 1);
    const allocation = weighting / weightDenominator;
    const incrementalSalesUsd = totalAnnualRevenue * allocation * impactWindowYears;
    const incrementalSalesEur = incrementalSalesUsd * usdToEur * (benchmark.fxRateToEur || 1);

    return {
      regionId: mix.regionId,
      displayName: benchmark.displayName,
      incrementalSalesUsd,
      incrementalSalesEur,
      windowYears: impactWindowYears,
    } satisfies RegionalRevenueForecast;
  });

  const fallbackTotalIncrementalUsd = totalAnnualRevenue * impactWindowYears;
  const totalIncrementalSalesUsd = regionalRevenueForecast.length > 0
    ? regionalRevenueForecast.reduce((sum, region) => sum + region.incrementalSalesUsd, 0)
    : fallbackTotalIncrementalUsd;
  const totalIncrementalSalesEur = totalIncrementalSalesUsd * usdToEur;

  const assumptionAccessDelayYears = (commercialAssumptions.accessDelayMonths || 0) / 12;
  const baseDelayYears = timelineYears + profile.accessDelayYears + assumptionAccessDelayYears;
  const assumptionUptakeLagYears = Math.max(-1.5, Math.min(1.5, (commercialAssumptions.uptakeRampYears || 0) - 1));
  const uptakeLagYears = assumptionUptakeLagYears + profile.uptakeLagYears;
  const timeToImpactYears = Math.max(0.25, baseDelayYears + Math.max(0, uptakeLagYears));
  const baseENpvUsd = calculateENpv(totalIncrementalSalesUsd, feasibility.estimatedCost, timeToImpactYears, discountRate, uptakeLagYears);
  const baseENpvEur = baseENpvUsd * usdToEur;
  const riskMultiplier = Math.max(0.2, Math.min(1, (1 - (feasibility.completionRisk || 0.3) * 0.6) * (0.7 + 0.3 * (commercialAssumptions.confidence || 0.5))));
  const riskAdjustedENpvUsd = baseENpvUsd * riskMultiplier;
  const riskAdjustedENpvEur = riskAdjustedENpvUsd * usdToEur;

  const baseRoi = calculateProjectedROI(concept, requestData, commercialAssumptions, totalIncrementalSalesUsd) * profile.evidenceMultiplier;

  const optimisticIncrementalUsd = totalIncrementalSalesUsd * 1.25;
  const optimisticENpvUsd = calculateENpv(optimisticIncrementalUsd, feasibility.estimatedCost, Math.max(0.2, timeToImpactYears - 0.4), discountRate, uptakeLagYears - 0.3);
  const pessimisticIncrementalUsd = totalIncrementalSalesUsd * 0.7;
  const pessimisticENpvUsd = calculateENpv(pessimisticIncrementalUsd, feasibility.estimatedCost, timeToImpactYears + 0.8, discountRate, uptakeLagYears + 0.4);

  return {
    totalIncrementalSalesUsd,
    totalIncrementalSalesEur,
    baseENpvUsd,
    baseENpvEur,
    riskAdjustedENpvUsd,
    riskAdjustedENpvEur,
    baseRoi,
    regionalRevenueForecast: regionalRevenueForecast.length > 0 ? regionalRevenueForecast : [
      {
        regionId: "global",
        displayName: "Global",
        incrementalSalesUsd: totalIncrementalSalesUsd,
        incrementalSalesEur: totalIncrementalSalesEur,
        windowYears: impactWindowYears,
      }
    ],
    scenarios: {
      base: {
        incrementalSalesUsd: totalIncrementalSalesUsd,
        incrementalSalesEur: totalIncrementalSalesEur,
        eNpvUsd: baseENpvUsd,
        eNpvEur: baseENpvEur,
        roi: baseRoi,
      },
      optimistic: {
        incrementalSalesUsd: optimisticIncrementalUsd,
        incrementalSalesEur: optimisticIncrementalUsd * usdToEur,
        eNpvUsd: optimisticENpvUsd,
        eNpvEur: optimisticENpvUsd * usdToEur,
        roi: baseRoi * 1.18,
      },
      pessimistic: {
        incrementalSalesUsd: pessimisticIncrementalUsd,
        incrementalSalesEur: pessimisticIncrementalUsd * usdToEur,
        eNpvUsd: pessimisticENpvUsd,
        eNpvEur: pessimisticENpvUsd * usdToEur,
        roi: Math.max(0.4, baseRoi * 0.65),
      },
    },
  } satisfies CommercialOutlook;
}

function calculateENpv(totalSalesUsd: number, investment: number, timeToImpactYears: number, discountRate: number, uptakeLagYears: number = 0): number {
  const years = 5;
  let npv = -investment;
  const annualRevenue = totalSalesUsd / years;
  const rampFactor = uptakeLagYears < 0 ? 1 : 0.5;

  for (let year = 1; year <= years; year++) {
    const uptakeScaler = uptakeLagYears >= 0 ? Math.min(1, rampFactor + (year * (1 - rampFactor) / years)) : 1;
    const delay = timeToImpactYears + year - 1 + Math.max(0, uptakeLagYears);
    const discountedRevenue = (annualRevenue * uptakeScaler) / Math.pow(1 + discountRate, delay);
    npv += discountedRevenue;
  }
  return npv;
}

function classifyStudyImpact(concept: ConceptWithFeasibility, profile: StrategyProfile, commercialOutlook: CommercialOutlook): StudyImpactCategory {
  const hasLabelGoal = concept.strategicGoals?.some((goal) => ["expand_label", "secure_initial_approval"].includes(goal)) ?? false;
  const hasAccessGoal = concept.strategicGoals?.includes("facilitate_market_access") ?? false;
  const hasRweGoal = concept.strategicGoals?.includes("generate_real_world_evidence") ?? false;
  const hasDefenseGoal = concept.strategicGoals?.includes("defend_market_share") ?? false;
  const hasUptakeGoal = concept.strategicGoals?.includes("accelerate_uptake") ?? false;

  const salesUsd = commercialOutlook.totalIncrementalSalesUsd;
  const impactStrength = salesUsd >= 500000000 ? "high" : salesUsd >= 150000000 ? "medium" : salesUsd >= 50000000 ? "low" : "minimal";
  const largeEnpv = commercialOutlook.baseENpvUsd >= 100000000;
  const moderateEnpv = commercialOutlook.baseENpvUsd >= 25000000;

  if (hasLabelGoal && (impactStrength === "high" || largeEnpv)) {
    return "label_expansion";
  }

  if (hasAccessGoal && (impactStrength !== "minimal" || profile.accessProbability > 0.5)) {
    return "market_access_enabler";
  }

  if (hasRweGoal && profile.practiceConfidence > 0.5) {
    return impactStrength === "high" ? "clinical_guideline_shift" : "practice_evolution";
  }

  if (hasDefenseGoal && (impactStrength === "high" || moderateEnpv)) {
    return "market_defense";
  }

  if (hasUptakeGoal && impactStrength !== "minimal") {
    return "practice_evolution";
  }

  if (impactStrength === "minimal") {
    return "no_material_change";
  }

  if (impactStrength === "low") {
    return "limited_impact";
  }

  return "evidence_gap_fill";
}

function estimateRegionalMarketShare(concept: ConceptWithFeasibility, marketData: any, deploymentWeight: number): number {
  let share = 10 * deploymentWeight;
  const goals = concept.strategicGoals || [];
  if (goals.includes("expand_label")) share += 3;
  if (goals.includes("accelerate_uptake")) share += 2;
  if (goals.includes("defend_market_share")) share += 1;
  if (concept.studyPhase === "III") share += 3;
  if (concept.studyPhase === "IV" || concept.studyPhase === "any") share += 1;
  if (marketData && marketData.competitiveIntensity >= 4) share -= 2;
  return Math.max(2, Math.min(35, share));
}

function calculateWindowOfOpportunityYears(feasibility: FeasibilityData, timelineMonths: number): number {
  const monthsUntilLoe = feasibility.timeToLoe ?? 60;
  const remainingWindowMonths = Math.max(0, monthsUntilLoe - timelineMonths);
  return Math.max(1, remainingWindowMonths / 12);
}

function getTherapeuticRevenueMultiplier(concept: ConceptWithFeasibility): number {
  const indication = (concept.indication || "").toLowerCase();
  if (indication.includes("onc") || indication.includes("cancer")) return 1.4;
  if (indication.includes("immun")) return 1.2;
  if (indication.includes("neuro")) return 1.3;
  if (indication.includes("cardio")) return 0.9;
  return 1.0;
}

/**
 * Calculates the recruitment rate for a study
 */
function calculateRecruitmentRate(concept: ConceptWithFeasibility, studyPhase: string): number {
  let baseRate = 0.7; // Default 70% recruitment rate
  
  // Adjust based on phase
  switch (studyPhase) {
    case 'I':
      baseRate = 0.8; // Phase I typically has easier recruitment
      break;
    case 'II':
      baseRate = 0.75;
      break;
    case 'III':
      baseRate = 0.65; // Phase III typically requires more patients
      break;
    case 'IV':
      baseRate = 0.7;
      break;
  }
  
  // Adjust for target subpopulation (harder to recruit)
  if (concept.targetSubpopulation) {
    baseRate *= 0.85;
  }
  
  // Adjust for multigeography studies (easier to recruit)
  const geographyCount = concept.geography?.length || 1;
  if (geographyCount > 1) {
    baseRate = Math.min(0.95, baseRate * (1 + (geographyCount - 1) * 0.05));
  }
  
  return Math.min(0.95, Math.max(0.4, baseRate)); // Clamp between 40% and 95%
}

/**
 * Calculates the completion risk for a study
 */
function calculateCompletionRisk(
  concept: ConceptWithFeasibility, 
  studyPhase: string,
  requestData: Partial<ExtendedGenerateConceptRequest>
): number {
  let baseRisk = 0.3; // Default 30% risk
  
  // Adjust based on phase
  switch (studyPhase) {
    case 'I':
      baseRisk = 0.2;
      break;
    case 'II':
      baseRisk = 0.3;
      break;
    case 'III':
      baseRisk = 0.4; // Phase III typically has higher risk
      break;
    case 'IV':
      baseRisk = 0.25;
      break;
  }
  
  // Adjust for target subpopulation (increases risk)
  if (concept.targetSubpopulation) {
    baseRisk += 0.1;
  }
  
  // Adjust for complexity of comparator drugs
  const comparatorCount = concept.comparatorDrugs?.length || 0;
  if (comparatorCount > 1) {
    baseRisk += 0.05 * comparatorCount;
  }
  
  // Get feasibility data if it exists
  const feasibilityData = concept.feasibilityData as FeasibilityData | undefined;
  
  // Budget constraints increase risk
  if (requestData.budgetCeilingEur && feasibilityData && typeof feasibilityData.estimatedCost === 'number') {
    if (feasibilityData.estimatedCost > requestData.budgetCeilingEur) {
      baseRisk += 0.15;
    }
  }
  
  // Timeline constraints increase risk
  if (requestData.timelineCeilingMonths && feasibilityData && typeof feasibilityData.timeline === 'number') {
    if (feasibilityData.timeline > requestData.timelineCeilingMonths) {
      baseRisk += 0.15;
    }
  }
  
  return Math.min(0.95, Math.max(0.1, baseRisk)); // Clamp between 10% and 95%
}

/**
 * Calculates the projected ROI for a study based on multiple factors including:
 * - Strategic goal
 * - Study phase
 * - Target population
 * - Market potential
 * - Competition
 * - Cost of the study
 * 
 * @param concept The study concept to calculate ROI for
 * @param requestData The original request data for context
 * @param commercialAssumptions Commercial assumptions for revenue calculations
 * @param totalIncrementalSalesUsd Total incremental sales in USD
 * @returns Projected ROI as a multiple (e.g., 2.5x means 2.5 times the investment)
 */
function calculateProjectedROI(
  concept: ConceptWithFeasibility,
  requestData: Partial<ExtendedGenerateConceptRequest>,
  commercialAssumptions: CommercialAssumptions,
  totalIncrementalSalesUsd: number
): number {
  // Get feasibility data if it exists
  const feasibilityData = concept.feasibilityData as FeasibilityData | undefined;

  // Only calculate if feasibilityData exists and has estimatedCost
  if (!feasibilityData || typeof feasibilityData.estimatedCost !== 'number') {
    return 2.5; // Return default if no cost data yet
  }

  // Step 1: Determine base factors based on strategic goals
  const strategicGoals = concept.strategicGoals || requestData.strategicGoals || ['expand_label'];
  const primaryStrategicGoal = strategicGoals[0] || 'expand_label';
  const studyPhase = concept.studyPhase || 'any';

  // Market impact multipliers by strategic goal (5-year horizon)
  const marketMultipliers: { [key: string]: number } = {
    'expand_label': 2.0,      // New indication can expand market
    'defend_market_share': 1.2,      // Defending existing market
    'accelerate_uptake': 1.8, // Faster adoption
    'facilitate_market_access': 1.6, // Market access support
    'real_world_evidence': 1.5, // Real-world validation
    'generate_real_world_evidence': 1.5, // Real-world validation (alternative name)
    'dosing_optimization': 1.4, // Dosing studies
    'biomarker_validation': 1.3, // Biomarker studies
    'safety_risk_management': 1.2, // Safety studies
    'combination_extension': 1.7, // Combination studies
    'demonstrate_poc': 1.8,   // Proof of concept studies
    'other': 1.0             // Default for other goals
  };
  
  // Step 2: Determine potential market impact based on indication and phase
  // Phase impact on revenue potential
  const phaseMultipliers: { [key: string]: number } = {
    'I': 0.6,    // Early phase, high uncertainty
    'Ib': 0.65,  // Phase Ib
    'II': 0.8,   // Mid phase, moderate uncertainty
    'Ib/II': 0.75, // Combined phase Ib/II
    'III': 1.2,  // Late phase, regulatory potential
    'IV': 1.0,   // Post-market
    'any': 0.9   // Default
  };
  
  // Step 3: Calculate base ROI components grounded in commercial assumptions
  const assumedAnnualRevenue = Math.max(0, commercialAssumptions.avgAnnualRevenuePerPatientUsd) * Math.max(0, commercialAssumptions.addressablePatientCount);
  const assumedTotalRevenue = Math.max(totalIncrementalSalesUsd, assumedAnnualRevenue * Math.max(1, commercialAssumptions.impactDurationYears || 1));
  let potentialRevenue = assumedTotalRevenue;
  
  // Adjust for strategic goal with fallback
  potentialRevenue *= marketMultipliers[primaryStrategicGoal] || marketMultipliers['other'];
  
  // Adjust for study phase with fallback
  potentialRevenue *= phaseMultipliers[studyPhase] || phaseMultipliers['any'];
  
  // Step 4: Adjust for target population specificity
  if (concept.targetSubpopulation) {
    // Targeted studies often have higher per-patient value
    potentialRevenue *= 1.3;
  }
  
  // Step 5: Calculate time to impact based on phase and timeline
  const timeToImpact = feasibilityData.timeline / 12; // Years until results
  
  // Step 6: Apply discount rate to future revenue (simple NPV calculation)
  const discountRate = 0.1; // 10% annual discount rate
  const discountFactor = 1 / Math.pow(1 + discountRate, timeToImpact);
  
  // Check LOE impact on revenue projections
  const currentDate = new Date();
  const totalYearsToProject = 5; // Base projection period of 5 years
  
  // Calculate months until LOE from now
  let monthsUntilLoe = 120; // Default 10 years if no LOE data available
  let postLoeValueRetention = 0.2; // Default value retention after LOE (20%)
  
  if (feasibilityData.timeToLoe !== undefined) {
    monthsUntilLoe = feasibilityData.timeToLoe;
  } else if (feasibilityData.globalLoeDate) {
    const loeDate = new Date(feasibilityData.globalLoeDate);
    monthsUntilLoe = Math.max(0, 
      Math.round((loeDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 30.5))
    );
  }
  
  if (feasibilityData.postLoeValue !== undefined) {
    postLoeValueRetention = feasibilityData.postLoeValue;
  }
  
  // Calculate years until LOE (from study completion)
  const yearsFromResultsToLoe = (monthsUntilLoe / 12) - timeToImpact;
  
  // Revenue over 5 years after primary endpoint readout (not from study initiation)
  // We assume primary endpoint readout is at study completion
  let totalDiscountedRevenue = 0;
  for (let year = 1; year <= totalYearsToProject; year++) {
    // Revenue ramps up over time
    const yearlyRevenue = potentialRevenue * Math.min(1.0, year * 0.3);
    
    // Adjust for LOE (if it occurs within our projection window)
    let adjustedYearlyRevenue = yearlyRevenue;
    if (year > yearsFromResultsToLoe && yearsFromResultsToLoe > 0) {
      // Apply post-LOE value retention
      const yearsPostLoe = year - yearsFromResultsToLoe;
      const loeImpactFactor = Math.max(postLoeValueRetention, 1.0 - (yearsPostLoe * 0.2));
      adjustedYearlyRevenue = yearlyRevenue * loeImpactFactor;
    }
    
    // Calculate discount based on when the revenue will be received: 
    // timeToImpact represents time to primary endpoint readout, after which we calculate 5 years
    const yearsFromNow = timeToImpact + year;
    const yearDiscountFactor = 1 / Math.pow(1 + discountRate, yearsFromNow);
    totalDiscountedRevenue += adjustedYearlyRevenue * yearDiscountFactor;
  }
  
  // Step 7: Calculate ROI
  const investment = feasibilityData.estimatedCost;
  const roi = totalDiscountedRevenue / investment;
  
  // Step 8: Apply risk adjustments
  // Higher completion risk reduces ROI
  const riskAdjustment = 1 - (feasibilityData.completionRisk * 0.5);
  const riskAdjustedROI = roi * riskAdjustment;
  
  // Ensure ROI is within realistic bounds
  return Math.max(0.5, Math.min(10, parseFloat(riskAdjustedROI.toFixed(1))));
}

/**
 * Calculates LOE data including estimated First Patient In date, 
 * time to LOE, and regional LOE information
 * 
 * @param concept The study concept
 * @param requestData The original request data
 * @param timeline The calculated timeline in months
 * @returns LOE data object
 */
function calculateLoeData(
  concept: ConceptWithFeasibility,
  requestData: Partial<ExtendedGenerateConceptRequest>,
  timeline: number
): {
  globalLoeDate: string;
  regionalLoeData: RegionalLoeData[];
  timeToLoe: number;
  postLoeValue: number;
  estimatedFpiDate: string;
  plannedDbLockDate: string;
  expectedToplineDate: string;
  windowToLoeMonths: number;
} {
  // Current date for FPI calculations
  const currentDate = new Date();
  
  // For FPI (First Patient In) date calculation:
  // - If user provided an anticipated FPI date, use it
  // - Otherwise, default to a realistic 12 months from now for study startup
  // (includes protocol development, site selection, contracts, IRB approvals, site activation)
  let estimatedFpiDate: Date;
  
  if (requestData.anticipatedFpiDate && requestData.anticipatedFpiDate.trim() !== '') {
    // Use user-provided FPI date if available and not empty
    console.log("Using user-provided FPI date:", requestData.anticipatedFpiDate);
    
    try {
      // Make sure we're properly parsing the date string in ISO format (YYYY-MM-DD)
      estimatedFpiDate = new Date(requestData.anticipatedFpiDate + 'T00:00:00Z');
      
      // Verify the date is valid
      if (isNaN(estimatedFpiDate.getTime())) {
        console.error("Invalid date format from anticipatedFpiDate:", requestData.anticipatedFpiDate);
        // Fall back to default if the date is invalid
        estimatedFpiDate = new Date(currentDate.getTime());
        estimatedFpiDate.setMonth(currentDate.getMonth() + 12);
      }
    } catch (e) {
      console.error("Error parsing anticipatedFpiDate:", e);
      // Fall back to default on error
      estimatedFpiDate = new Date(currentDate.getTime());
      estimatedFpiDate.setMonth(currentDate.getMonth() + 12);
    }
  } else {
    // Realistic default: 12 months from now for study startup
    console.log("No user-provided FPI date, using default 12 months from now");
    estimatedFpiDate = new Date(currentDate.getTime());
    estimatedFpiDate.setMonth(currentDate.getMonth() + 12);
  }
  console.log("Final estimatedFpiDate:", estimatedFpiDate, "ISO String:", estimatedFpiDate.toISOString());
  
  // Default LOE to 10 years from now if not provided
  let globalLoeDate: Date = new Date(currentDate.getTime());
  globalLoeDate.setFullYear(globalLoeDate.getFullYear() + 10);
  
  // Check if user provided a global LOE date
  if (requestData.globalLoeDate) {
    console.log("Using user-provided global LOE date:", requestData.globalLoeDate);
    
    try {
      // Make sure we're properly parsing the date string
      globalLoeDate = new Date(requestData.globalLoeDate + 'T00:00:00Z');
      
      // Verify the date is valid
      if (isNaN(globalLoeDate.getTime())) {
        console.error("Invalid date format from globalLoeDate:", requestData.globalLoeDate);
        // Fall back to default if the date is invalid
        globalLoeDate = new Date(currentDate.getTime());
        globalLoeDate.setFullYear(globalLoeDate.getFullYear() + 10);
      }
    } catch (e) {
      console.error("Error parsing globalLoeDate:", e);
      // Fall back to default on error
      globalLoeDate = new Date(currentDate.getTime());
      globalLoeDate.setFullYear(globalLoeDate.getFullYear() + 10);
    }
  } else {
    console.log("No user-provided global LOE date, using default 10 years from now");
  }
  
  console.log("Final globalLoeDate:", globalLoeDate, "ISO String:", globalLoeDate.toISOString());
  
  // Initialize regional LOE data
  const regionalLoeData: RegionalLoeData[] = [];
  
  // Process regional LOE dates if provided
  if (requestData.regionalLoeDates && requestData.regionalLoeDates.length > 0) {
    for (const regionalDate of requestData.regionalLoeDates) {
      regionalLoeData.push({
        region: regionalDate.region,
        loeDate: regionalDate.date,
        hasPatentExtension: false,
        extensionPotential: requestData.hasPatentExtensionPotential || false
      });
    }
  } else {
    // If no regional data provided, create entries based on geography
    const geography = concept.geography || requestData.geography || [];
    for (const region of geography) {
      // Create region-specific LOE date based on the global LOE date
      // IMPORTANT: We must preserve the user-provided global LOE date
      const regionLoeDate = new Date(globalLoeDate.getTime());
      
      // Only make minor adjustments if the LOE date wasn't specified by the user
      if (!requestData.globalLoeDate) {
        // Adjust dates slightly by region (for variety)
        if (region === "US") {
          // US patent extension opportunities are often stronger
          regionLoeDate.setMonth(regionLoeDate.getMonth() + 3);
        } else if (region === "EU" || region.startsWith("E")) {
          // EU patents may expire slightly earlier
          regionLoeDate.setMonth(regionLoeDate.getMonth() - 2);
        } else if (region === "JP") {
          // Japan may have different patent terms
          regionLoeDate.setMonth(regionLoeDate.getMonth() + 1);
        }
      }
      
      // If user provided globalLoeDate, use that exact date for all regions
      // Otherwise use the adjusted region-specific date
      let regionLoeDateFormatted: string;
      
      if (requestData.globalLoeDate) {
        // Extremely important: Use the user-provided global LOE date for ALL regions
        regionLoeDateFormatted = globalLoeDate.toISOString().split('T')[0];
        console.log(`Using user-provided globalLoeDate for ${region}:`, regionLoeDateFormatted);
      } else {
        // Only use region-specific date if no user input was provided
        regionLoeDateFormatted = regionLoeDate.toISOString().split('T')[0];
      }
      
      regionalLoeData.push({
        region,
        loeDate: regionLoeDateFormatted,
        hasPatentExtension: false,
        extensionPotential: requestData.hasPatentExtensionPotential || false,
        extensionMonths: requestData.hasPatentExtensionPotential ? 6 : undefined
      });
    }
  }
  
  // Calculate estimated data readout date based on timeline and FPI date
  const estimatedDbLockDate = new Date(estimatedFpiDate.getTime());
  const estimatedDataReadoutDate = new Date(estimatedFpiDate.getTime());
  
  // Get the study duration from either the concept object or use the timeline value
  // The concept object might have timelineMonths or timeline property depending on the structure
  const studyDurationMonths = 
    (concept as any).timelineMonths || 
    (concept as any).timeline || 
    timeline || 
    24; // Default to 24 months if no timeline is available
    
  // Data readout typically happens earlier than final study completion
  // For most studies, primary endpoint readout occurs at:
  // - Phase 1: At study completion
  // - Phase 2: 2/3 of the way through the study
  // - Phase 3: 3/4 of the way through the study
  // - Phase 4: 3/4 of the way through the study
  let primaryEndpointReadoutFactor = 1.0; // Default: at completion
  
  const studyPhase = concept.studyPhase || 'any';
  if (studyPhase === 'II') {
    primaryEndpointReadoutFactor = 0.67; // 2/3 through study
  } else if (studyPhase === 'III' || studyPhase === 'IV') {
    primaryEndpointReadoutFactor = 0.75; // 3/4 through study
  }
  
  // Apply the readout factor to the study duration
  const dataReadoutMonths = Math.round(studyDurationMonths * primaryEndpointReadoutFactor);
  const dbLockLag = Math.max(2, Math.round(Math.max(0, studyDurationMonths - dataReadoutMonths) * 0.5));

  estimatedDbLockDate.setMonth(estimatedFpiDate.getMonth() + dataReadoutMonths + dbLockLag);
  estimatedDataReadoutDate.setMonth(estimatedFpiDate.getMonth() + dataReadoutMonths);
  
  console.log("Estimated data readout date:", estimatedDataReadoutDate.toISOString());
  
  // Calculate time to LOE in months from data readout date (not current date)
  // This represents the window of opportunity after having study results
  const timeToGlobalLoe = Math.max(0, 
    Math.round((globalLoeDate.getTime() - estimatedDataReadoutDate.getTime()) / (1000 * 60 * 60 * 24 * 30.5))
  );
  
  console.log("Time to LOE from data readout (months):", timeToGlobalLoe);
  
  // Calculate post-LOE value (0-1 scale, how much value remains after LOE)
  // Factors that increase post-LOE value:
  // - RWE studies (tend to support value proposition even after LOE)
  // - Studies in areas with less generic competition
  // - Extension potential
  let postLoeValue = 0.15; // Base value (15% of pre-LOE)
  
  const strategicGoals = concept.strategicGoals || [];
  
  if (strategicGoals.includes('real_world_evidence') || strategicGoals.includes('generate_real_world_evidence')) {
    postLoeValue += 0.1; // RWE studies have more enduring value
  }
  
  if (strategicGoals.includes('defend_market_share')) {
    postLoeValue += 0.05; // Studies designed to defend market share may have some enduring impact
  }
  
  if (requestData.hasPatentExtensionPotential) {
    postLoeValue += 0.2; // Potential for extended exclusivity
  }
  
  // Oncology drugs often retain more value post-LOE due to complex biosimilar requirements
  const isOncology = (concept.indication || '').toLowerCase().includes('cancer') || 
                    (concept.indication || '').toLowerCase().includes('oncol');
  if (isOncology) {
    postLoeValue += 0.1;
  }
  
  // Return the LOE data
  const plannedDbLockDate = estimatedDbLockDate.toISOString().split('T')[0];
  const expectedToplineDate = estimatedDataReadoutDate.toISOString().split('T')[0];

  return {
    globalLoeDate: globalLoeDate.toISOString().split('T')[0],
    regionalLoeData,
    timeToLoe: timeToGlobalLoe,
    postLoeValue: Math.min(0.7, postLoeValue),
    estimatedFpiDate: estimatedFpiDate.toISOString().split('T')[0],
    plannedDbLockDate,
    expectedToplineDate,
    windowToLoeMonths: timeToGlobalLoe,
  };
}
