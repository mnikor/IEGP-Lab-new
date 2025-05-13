import { StudyConcept, GenerateConceptRequest } from "@shared/schema";
import { FeasibilityData } from "@shared/schema";

/**
 * Calculates feasibility metrics for a study concept
 * 
 * @param concept The study concept to calculate feasibility for
 * @param requestData The original request data for context
 * @returns Feasibility data object
 */
export function calculateFeasibility(concept: Partial<StudyConcept>, requestData: Partial<GenerateConceptRequest>): FeasibilityData {
  // Base costs by phase (in EUR)
  const baseCostByPhase: { [key: string]: number } = {
    'I': 1500000,
    'II': 3000000,
    'III': 7500000,
    'IV': 2500000,
    'any': 4000000
  };

  // Base timelines by phase (in months)
  const baseTimelineByPhase: { [key: string]: number } = {
    'I': 12,
    'II': 24,
    'III': 36,
    'IV': 18,
    'any': 24
  };

  // Get the study phase, defaulting to 'any' if not specified
  const studyPhase = concept.studyPhase || 'any';
  
  // Calculate estimated cost
  let estimatedCost = baseCostByPhase[studyPhase];
  
  // Adjust cost based on geography
  const geographyCount = concept.geography?.length || 1;
  if (geographyCount > 1) {
    estimatedCost *= (1 + (geographyCount - 1) * 0.2); // 20% increase per additional geography
  }
  
  // Adjust cost based on complexity of population
  if (concept.targetSubpopulation) {
    estimatedCost *= 1.15; // 15% increase for specialized population
  }

  // Calculate timeline
  let timeline = baseTimelineByPhase[studyPhase];
  
  // Adjust timeline based on geography
  if (geographyCount > 1) {
    timeline *= (1 + (geographyCount - 1) * 0.1); // 10% increase per additional geography
  }
  
  // Calculate recruitment rate (0-1 scale)
  const recruitmentRate = calculateRecruitmentRate(concept, studyPhase);
  
  // Calculate completion risk (0-1 scale, where 0 is lowest risk and 1 is highest risk)
  const completionRisk = calculateCompletionRisk(concept, studyPhase, requestData);
  
  // Calculate projected ROI
  const projectedROI = calculateProjectedROI(concept, requestData);

  return {
    estimatedCost: Math.round(estimatedCost),
    timeline: Math.round(timeline),
    projectedROI,
    recruitmentRate,
    completionRisk
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
 * Calculates the projected ROI for a study
 */
function calculateProjectedROI(
  concept: Partial<StudyConcept>,
  requestData: Partial<GenerateConceptRequest>
): number {
  // Base ROI by strategic goal
  const baseROIByGoal: { [key: string]: number } = {
    'expand_label': 3.5,
    'defend_share': 2.5,
    'accelerate_uptake': 4.0,
    'real_world_evidence': 2.0
  };
  
  const strategicGoal = concept.strategicGoal || requestData.strategicGoal || 'expand_label';
  let roi = baseROIByGoal[strategicGoal];
  
  // Adjust ROI based on study phase
  const studyPhase = concept.studyPhase || 'any';
  switch (studyPhase) {
    case 'I':
      roi *= 0.7; // Early phase has lower ROI
      break;
    case 'II':
      roi *= 0.9;
      break;
    case 'III':
      roi *= 1.2; // Phase III can lead to approval, higher ROI
      break;
    case 'IV':
      roi *= 1.0;
      break;
  }
  
  // If the target subpopulation is specified, adjust ROI
  if (concept.targetSubpopulation) {
    roi *= 1.1; // Targeted approach can increase ROI
  }
  
  return parseFloat(roi.toFixed(1));
}
