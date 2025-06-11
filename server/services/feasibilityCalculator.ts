import { StudyConcept, GenerateConceptRequest } from "@shared/schema";
import { FeasibilityData, RegionalLoeData } from "@/lib/types";
import { calculateSampleSize } from "./sampleSizeCalculator";

// TypeScript interface for the extended request type including anticipatedFpiDate
interface ExtendedGenerateConceptRequest extends GenerateConceptRequest {
  anticipatedFpiDate?: string;
}

// Type assertion helper for feasibilityData
export type ConceptWithFeasibility = Partial<StudyConcept> & {
  feasibilityData?: FeasibilityData;
};

/**
 * Calculates feasibility metrics for a study concept
 * 
 * @param concept The study concept to calculate feasibility for
 * @param requestData The original request data for context
 * @returns Feasibility data object
 */
export function calculateFeasibility(concept: ConceptWithFeasibility, requestData: Partial<ExtendedGenerateConceptRequest>): FeasibilityData {
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
  
  // Calculate number of countries based on geography array
  // Special handling for EU - it represents multiple countries
  let geographyCount = 0;
  if (concept.geography) {
    for (const region of concept.geography) {
      if (region === 'EU' || region.toLowerCase() === 'europe' || region.toLowerCase() === 'european union') {
        // EU represents approximately 27 member countries
        geographyCount += 10; // Assuming a typical study won't run in all EU countries, but in ~10
      } else {
        geographyCount += 1;
      }
    }
  }
  geographyCount = geographyCount || 1; // Ensure at least 1 country
  
  const hasTargetSubpopulation = !!concept.targetSubpopulation;
  const comparatorCount = concept.comparatorDrugs?.length || 0;
  
  // Step 2: Calculate patient numbers using statistical power analysis
  const sampleSizeCalculation = calculateSampleSize(concept, requestData);
  
  let patientCount = sampleSizeCalculation.sampleSize;
  let sampleSizeJustification = sampleSizeCalculation.justification;
  
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
  // Base cost per patient varies by endpoint complexity and phase requirements
  let costPerPatient: number;
  
  // Adjust base cost by endpoint type from sample size calculation
  const calculatedEndpointType = sampleSizeCalculation.endpoint.type;
  
  if (calculatedEndpointType === 'survival') {
    costPerPatient = isOncology ? 55000 : 35000; // Survival endpoints require extensive follow-up
  } else if (calculatedEndpointType === 'response_rate') {
    costPerPatient = isOncology ? 40000 : 25000; // Response rate studies need imaging/biomarkers
  } else if (calculatedEndpointType === 'biomarker') {
    costPerPatient = 30000; // Biomarker studies have high laboratory costs
  } else if (calculatedEndpointType === 'safety') {
    costPerPatient = studyPhase === 'I' ? 35000 : 20000; // Phase I safety studies are intensive
  } else {
    costPerPatient = isOncology ? 35000 : 22000; // Continuous endpoints
  }
  
  // Adjust for study phase complexity
  const phaseMultipliers = {
    'I': 1.2,   // Phase I requires intensive monitoring
    'II': 1.0,  // Base cost
    'III': 1.3, // Phase III has complex logistics
    'IV': 0.7,  // Post-market studies are less intensive
    'any': 1.0
  };
  
  costPerPatient *= phaseMultipliers[studyPhase as keyof typeof phaseMultipliers] || 1.0;
  
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
  
  let estimatedCost = (patientCount * costPerPatient) + (totalSites * siteSetupCost);
  
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
  
  // Total timeline from FPI to final report
  let timeline = recruitmentPeriod + followUpPeriod + analysisProcessingTime;
  
  // Adjust timeline for multi-geography studies (regulatory and coordination delays)
  if (geographyCount > 1) {
    const additionalTime = Math.log2(geographyCount) * 3; // More realistic delay for multiple countries
    timeline += additionalTime;
  }
  
  // Adjust for study complexity based on comparators
  if (comparatorCount > 0) {
    timeline += comparatorCount * 2; // Additional time for complex study designs
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
  const projectedROI = calculateProjectedROI(conceptWithFeasibility, requestData);

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
  const finalTotalCost = Math.max(totalCost, calculatedTotalCost);
  
  console.log("Final cost breakdown:", {
    totalCost: finalTotalCost,
    siteCosts: finalSiteCosts,
    personnelCosts: finalPersonnelCosts,
    materialCosts: finalMaterialCosts,
    monitoringCosts: finalMonitoringCosts,
    dataCosts: finalDataCosts,
    regulatoryCosts: finalRegulatoryCosts,
    sum: calculatedTotalCost
  });

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
    
    // Cost breakdown - ensure all values are properly set and non-zero
    siteCosts: finalSiteCosts,
    personnelCosts: finalPersonnelCosts,
    materialCosts: finalMaterialCosts,
    monitoringCosts: finalMonitoringCosts,
    dataCosts: finalDataCosts,
    regulatoryCosts: finalRegulatoryCosts,
    
    // Risk factors
    dropoutRate: parseFloat(dropoutRate.toFixed(2)),
    complexityFactor: parseFloat(complexityFactor.toFixed(2))
  };
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
 * @returns Projected ROI as a multiple (e.g., 2.5x means 2.5 times the investment)
 */
function calculateProjectedROI(
  concept: ConceptWithFeasibility,
  requestData: Partial<ExtendedGenerateConceptRequest>
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
    'defend_share': 1.2,      // Defending existing market
    'accelerate_uptake': 1.8, // Faster adoption
    'real_world_evidence': 1.5 // Real-world validation
  };
  
  // Step 2: Determine potential market impact based on indication and phase
  // Phase impact on revenue potential
  const phaseMultipliers: { [key: string]: number } = {
    'I': 0.6,    // Early phase, high uncertainty
    'II': 0.8,   // Mid phase, moderate uncertainty
    'III': 1.2,  // Late phase, regulatory potential
    'IV': 1.0,   // Post-market
    'any': 0.9   // Default
  };
  
  // Step 3: Calculate base ROI components
  let potentialRevenue = 1000000; // Base assumption for annual revenue impact
  
  // Adjust for strategic goal
  potentialRevenue *= marketMultipliers[strategicGoal];
  
  // Adjust for study phase
  potentialRevenue *= phaseMultipliers[studyPhase];
  
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
  
  if (concept.strategicGoal === 'real_world_evidence') {
    postLoeValue += 0.1; // RWE studies have more enduring value
  }
  
  if (concept.strategicGoal === 'defend_share') {
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
  return {
    globalLoeDate: globalLoeDate.toISOString().split('T')[0],
    regionalLoeData,
    timeToLoe: timeToGlobalLoe,
    postLoeValue: Math.min(0.7, postLoeValue), // Cap at 70% value retention
    estimatedFpiDate: estimatedFpiDate.toISOString().split('T')[0]
  };
}
