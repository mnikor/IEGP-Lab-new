import { StudyConcept, GenerateConceptRequest } from "@shared/schema";
import { FeasibilityData } from "@/lib/types";

/**
 * Calculates feasibility metrics for a study concept
 * 
 * @param concept The study concept to calculate feasibility for
 * @param requestData The original request data for context
 * @returns Feasibility data object
 */
export function calculateFeasibility(concept: Partial<StudyConcept>, requestData: Partial<GenerateConceptRequest>): FeasibilityData {
  // Step 1: Determine the study phase and complexity factors
  const studyPhase = concept.studyPhase || 'any';
  const isRealWorldEvidence = concept.strategicGoal === 'real_world_evidence';
  const geographyCount = concept.geography?.length || 1;
  const hasTargetSubpopulation = !!concept.targetSubpopulation;
  const comparatorCount = concept.comparatorDrugs?.length || 0;
  
  // Step 2: Calculate patient numbers based on phase and indication
  // These are estimated average patient numbers by phase
  const basePatientsByPhase: { [key: string]: number } = {
    'I': isRealWorldEvidence ? 200 : 50,
    'II': isRealWorldEvidence ? 500 : 200,
    'III': isRealWorldEvidence ? 2000 : 1000,
    'IV': isRealWorldEvidence ? 3000 : 1500,
    'any': isRealWorldEvidence ? 1000 : 500
  };
  
  let patientCount = basePatientsByPhase[studyPhase];
  
  // Adjust patient count based on subpopulation (more targeted = fewer patients)
  if (hasTargetSubpopulation) {
    patientCount *= 0.8;
  }
  
  // Step 3: Calculate site numbers based on geography and patient count
  // These are estimated patients per site by phase
  const patientsPerSiteByPhase: { [key: string]: number } = {
    'I': 10,
    'II': 15,
    'III': 20,
    'IV': 25,
    'any': 18
  };
  
  let sitesPerGeography = Math.ceil(patientCount / (patientsPerSiteByPhase[studyPhase] * geographyCount));
  let totalSites = sitesPerGeography * geographyCount;
  
  // Minimum sites per geography
  totalSites = Math.max(totalSites, geographyCount * 2);
  
  // Step 4: Calculate cost based on patient and site numbers
  // Average cost per patient by phase (in EUR)
  const costPerPatientByPhase: { [key: string]: number } = {
    'I': 20000,
    'II': 15000,
    'III': 10000,
    'IV': 5000,
    'any': 12000
  };
  
  // Site setup cost per site (in EUR)
  const siteSetupCost = 25000;
  
  let estimatedCost = (patientCount * costPerPatientByPhase[studyPhase]) + (totalSites * siteSetupCost);
  
  // Additional costs for complex studies
  if (comparatorCount > 0) {
    estimatedCost *= (1 + (comparatorCount * 0.1)); // 10% increase per comparator
  }
  
  // Regulatory costs vary by geography
  estimatedCost += geographyCount * 50000; // 50K EUR per geography for regulatory
  
  // Step 5: Calculate timeline based on recruitment rates and processing time
  // Base monthly recruitment rate per site
  const monthlyRecruitmentPerSite = 1.5;
  
  // Base processing times (in months)
  const baseProcessingTimes: { [key: string]: number } = {
    'I': 6,  // Setup + analysis
    'II': 8,
    'III': 10,
    'IV': 6,
    'any': 8
  };
  
  // Calculate recruitment period
  const recruitmentPeriod = Math.ceil(patientCount / (totalSites * monthlyRecruitmentPerSite));
  
  // Total timeline
  let timeline = recruitmentPeriod + baseProcessingTimes[studyPhase];
  
  // Adjust timeline for multi-geography studies (regulatory delays)
  if (geographyCount > 1) {
    timeline += Math.log2(geographyCount) * 2; // Logarithmic increase for additional geographies
  }
  
  // Step 6: Calculate recruitment rate (0-1 scale)
  const recruitmentRate = calculateRecruitmentRate(concept, studyPhase);
  
  // Step 7: Calculate completion risk (0-1 scale, where 0 is lowest risk and 1 is highest risk)
  const completionRisk = calculateCompletionRisk(concept, studyPhase, requestData);
  
  // Step 8: Calculate projected ROI
  const projectedROI = calculateProjectedROI(concept, requestData);

  // Enforce any budget ceilings by adjusting scope if necessary
  if (requestData.budgetCeilingEur && estimatedCost > requestData.budgetCeilingEur) {
    // Adjust cost to ceiling and note the impact on timeline and other factors
    const adjustmentRatio = requestData.budgetCeilingEur / estimatedCost;
    estimatedCost = requestData.budgetCeilingEur;
    timeline = Math.ceil(timeline * (1 + (1 - adjustmentRatio) * 0.5)); // Timeline increases with budget constraints
  }

  return {
    estimatedCost: Math.round(estimatedCost),
    timeline: Math.round(timeline),
    projectedROI: parseFloat(projectedROI.toFixed(1)),
    recruitmentRate: parseFloat(recruitmentRate.toFixed(2)),
    completionRisk: parseFloat(completionRisk.toFixed(2))
  };
}

/**
 * Calculates the recruitment rate for a study
 */
function calculateRecruitmentRate(concept: Partial<StudyConcept>, studyPhase: string): number {
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
  concept: Partial<StudyConcept>, 
  studyPhase: string,
  requestData: Partial<GenerateConceptRequest>
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
  
  // Budget constraints increase risk
  if (requestData.budgetCeilingEur && concept.feasibilityData?.estimatedCost) {
    if (concept.feasibilityData.estimatedCost > requestData.budgetCeilingEur) {
      baseRisk += 0.15;
    }
  }
  
  // Timeline constraints increase risk
  if (requestData.timelineCeilingMonths && concept.feasibilityData?.timeline) {
    if (concept.feasibilityData.timeline > requestData.timelineCeilingMonths) {
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
  concept: Partial<StudyConcept>,
  requestData: Partial<GenerateConceptRequest>
): number {
  // Only calculate if feasibilityData.estimatedCost exists
  if (!concept.feasibilityData?.estimatedCost) {
    return 2.5; // Return default if no cost data yet
  }
  
  // Step 1: Determine base factors based on strategic goal
  const strategicGoal = concept.strategicGoal || requestData.strategicGoal || 'expand_label';
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
  const timeToImpact = concept.feasibilityData.timeline / 12; // Years until results
  
  // Step 6: Apply discount rate to future revenue (simple NPV calculation)
  const discountRate = 0.1; // 10% annual discount rate
  const discountFactor = 1 / Math.pow(1 + discountRate, timeToImpact);
  
  // Revenue over 5 years after study completion
  let totalDiscountedRevenue = 0;
  for (let year = 1; year <= 5; year++) {
    // Revenue ramps up over time
    const yearlyRevenue = potentialRevenue * Math.min(1.0, year * 0.3);
    const yearsFromNow = timeToImpact + year;
    const yearDiscountFactor = 1 / Math.pow(1 + discountRate, yearsFromNow);
    totalDiscountedRevenue += yearlyRevenue * yearDiscountFactor;
  }
  
  // Step 7: Calculate ROI
  const investment = concept.feasibilityData.estimatedCost;
  const roi = totalDiscountedRevenue / investment;
  
  // Step 8: Apply risk adjustments
  // Higher completion risk reduces ROI
  const riskAdjustment = 1 - (concept.feasibilityData.completionRisk * 0.5);
  const riskAdjustedROI = roi * riskAdjustment;
  
  // Ensure ROI is within realistic bounds
  return Math.max(0.5, Math.min(10, parseFloat(riskAdjustedROI.toFixed(1))));
}
