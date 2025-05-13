import { StudyConcept, GenerateConceptRequest } from "@shared/schema";
import { McDAScore } from "@shared/schema";

/**
 * Calculates Multi-Criteria Decision Analysis scores for a study concept
 * 
 * @param concept The study concept to score
 * @param requestData The original request data for context
 * @returns MCDA score object
 */
export function scoreMcda(concept: Partial<StudyConcept>, requestData: Partial<GenerateConceptRequest>): McDAScore {
  // Define criteria weights
  const weights = {
    scientificValidity: 0.3,
    clinicalImpact: 0.3,
    commercialValue: 0.25,
    feasibility: 0.15
  };

  // Calculate individual scores
  const scientificValidityScore = calculateScientificValidityScore(concept);
  const clinicalImpactScore = calculateClinicalImpactScore(concept);
  const commercialValueScore = calculateCommercialValueScore(concept, requestData);
  const feasibilityScore = calculateFeasibilityScore(concept, requestData);

  // Calculate weighted overall score
  const overallScore = (
    scientificValidityScore * weights.scientificValidity +
    clinicalImpactScore * weights.clinicalImpact +
    commercialValueScore * weights.commercialValue +
    feasibilityScore * weights.feasibility
  );

  return {
    scientificValidity: parseFloat(scientificValidityScore.toFixed(1)),
    clinicalImpact: parseFloat(clinicalImpactScore.toFixed(1)),
    commercialValue: parseFloat(commercialValueScore.toFixed(1)),
    feasibility: parseFloat(feasibilityScore.toFixed(1)),
    overall: parseFloat(overallScore.toFixed(1))
  };
}

/**
 * Calculates the scientific validity score (1-5 scale)
 */
function calculateScientificValidityScore(concept: Partial<StudyConcept>): number {
  let score = 3.5; // Default starting score
  
  // Evidence source count contributes to scientific validity
  const evidenceSourceCount = concept.evidenceSources?.length || 0;
  if (evidenceSourceCount >= 5) {
    score += 0.8;
  } else if (evidenceSourceCount >= 3) {
    score += 0.5;
  } else if (evidenceSourceCount >= 1) {
    score += 0.2;
  }
  
  // Well-defined PICO increases score
  const picoData = concept.picoData;
  if (picoData) {
    if (picoData.population.length > 30) score += 0.3;
    if (picoData.intervention.length > 30) score += 0.3;
    if (picoData.comparator.length > 20) score += 0.2;
    if (picoData.outcomes.length > 30) score += 0.4;
  }
  
  // Study design phase can affect score (Phase III typically most rigorous)
  const studyPhase = concept.studyPhase || 'any';
  switch (studyPhase) {
    case 'I':
      score -= 0.2;
      break;
    case 'II':
      score += 0.0;
      break;
    case 'III':
      score += 0.3;
      break;
    case 'IV':
      score += 0.1;
      break;
  }
  
  return Math.min(5.0, Math.max(1.0, score)); // Clamp between 1 and 5
}

/**
 * Calculates the clinical impact score (1-5 scale)
 */
function calculateClinicalImpactScore(concept: Partial<StudyConcept>): number {
  let score = 3.0; // Default starting score
  
  // Strategic goal affects clinical impact
  const strategicGoal = concept.strategicGoal || 'expand_label';
  switch (strategicGoal) {
    case 'expand_label':
      score += 0.7;
      break;
    case 'defend_share':
      score += 0.3;
      break;
    case 'accelerate_uptake':
      score += 0.5;
      break;
    case 'real_world_evidence':
      score += 0.6;
      break;
  }
  
  // Well-defined outcomes increase clinical impact
  const picoData = concept.picoData;
  if (picoData && picoData.outcomes.length > 40) {
    score += 0.4;
  }
  
  // Target subpopulation can increase impact (addressing specific needs)
  if (concept.targetSubpopulation && concept.targetSubpopulation.length > 0) {
    score += 0.5;
  }
  
  // Higher phase studies tend to have more clinical impact
  const studyPhase = concept.studyPhase || 'any';
  switch (studyPhase) {
    case 'I':
      score -= 0.1;
      break;
    case 'II':
      score += 0.1;
      break;
    case 'III':
      score += 0.5;
      break;
    case 'IV':
      score += 0.3;
      break;
  }
  
  return Math.min(5.0, Math.max(1.0, score)); // Clamp between 1 and 5
}

/**
 * Calculates the commercial value score (1-5 scale)
 */
function calculateCommercialValueScore(
  concept: Partial<StudyConcept>,
  requestData: Partial<GenerateConceptRequest>
): number {
  let score = 3.0; // Default starting score
  
  // Strategic goal affects commercial value
  const strategicGoal = concept.strategicGoal || requestData.strategicGoal || 'expand_label';
  switch (strategicGoal) {
    case 'expand_label':
      score += 0.8;
      break;
    case 'defend_share':
      score += 0.6;
      break;
    case 'accelerate_uptake':
      score += 0.9;
      break;
    case 'real_world_evidence':
      score += 0.4;
      break;
  }
  
  // Target subpopulation can increase value (market segmentation)
  if (concept.targetSubpopulation && concept.targetSubpopulation.length > 0) {
    score += 0.3;
  }
  
  // Geography diversity increases commercial value
  const geographyCount = concept.geography?.length || 1;
  if (geographyCount > 2) {
    score += 0.5;
  } else if (geographyCount > 1) {
    score += 0.3;
  }
  
  // Higher ROI increases commercial value
  if (concept.feasibilityData?.projectedROI) {
    if (concept.feasibilityData.projectedROI >= 4.0) {
      score += 0.7;
    } else if (concept.feasibilityData.projectedROI >= 3.0) {
      score += 0.5;
    } else if (concept.feasibilityData.projectedROI >= 2.0) {
      score += 0.3;
    }
  }
  
  return Math.min(5.0, Math.max(1.0, score)); // Clamp between 1 and 5
}

/**
 * Calculates the feasibility score (1-5 scale)
 */
function calculateFeasibilityScore(
  concept: Partial<StudyConcept>,
  requestData: Partial<GenerateConceptRequest>
): number {
  let score = 3.0; // Default starting score
  
  // If feasibility data is available, use it
  if (concept.feasibilityData) {
    // Higher recruitment rate increases feasibility
    if (concept.feasibilityData.recruitmentRate >= 0.8) {
      score += 0.8;
    } else if (concept.feasibilityData.recruitmentRate >= 0.6) {
      score += 0.5;
    } else if (concept.feasibilityData.recruitmentRate < 0.5) {
      score -= 0.5;
    }
    
    // Lower completion risk increases feasibility
    if (concept.feasibilityData.completionRisk <= 0.2) {
      score += 0.8;
    } else if (concept.feasibilityData.completionRisk <= 0.3) {
      score += 0.4;
    } else if (concept.feasibilityData.completionRisk >= 0.5) {
      score -= 0.5;
    }
  }
  
  // Budget considerations
  if (requestData.budgetCeilingEur && concept.feasibilityData?.estimatedCost) {
    if (concept.feasibilityData.estimatedCost <= requestData.budgetCeilingEur * 0.8) {
      score += 0.5; // Well under budget
    } else if (concept.feasibilityData.estimatedCost > requestData.budgetCeilingEur) {
      score -= 0.8; // Over budget
    }
  }
  
  // Timeline considerations
  if (requestData.timelineCeilingMonths && concept.feasibilityData?.timeline) {
    if (concept.feasibilityData.timeline <= requestData.timelineCeilingMonths * 0.8) {
      score += 0.5; // Well under timeline
    } else if (concept.feasibilityData.timeline > requestData.timelineCeilingMonths) {
      score -= 0.8; // Over timeline
    }
  }
  
  // Simpler study designs are more feasible
  if (!concept.targetSubpopulation) {
    score += 0.2; // Broader population is easier to recruit
  }
  
  if (!concept.comparatorDrugs || concept.comparatorDrugs.length <= 1) {
    score += 0.3; // Fewer comparators means simpler design
  }
  
  return Math.min(5.0, Math.max(1.0, score)); // Clamp between 1 and 5
}
