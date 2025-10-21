import { StudyConcept, GenerateConceptRequest } from "@shared/schema";

type RecommendationLevel = "proceed" | "revise" | "stop";

interface ConceptRecommendation {
  level: RecommendationLevel;
  confidence: "high" | "medium" | "low";
  rationale: string[];
  blockers?: string[];
  windowAssessment?: string;
}

interface McdaScoreWithRecommendation {
  scientificValidity: number;
  clinicalImpact: number;
  commercialValue: number;
  feasibility: number;
  overall: number;
  commercialRecommendation: ConceptRecommendation;
  commercialAlerts: string[];
  financialSignals: {
    projectedROI?: number | null;
    riskAdjustedEnpv?: number | null;
    windowToLoeMonths?: number | null;
  };
}

interface CommercialAssessment {
  score: number;
  recommendation: ConceptRecommendation;
  alerts: string[];
  financialSignals: McdaScoreWithRecommendation["financialSignals"];
}

/**
 * Calculates Multi-Criteria Decision Analysis scores for a study concept
 * 
 * @param concept The study concept to score
 * @param requestData The original request data for context
 * @returns MCDA score object with recommendation metadata
 */
export function scoreMcda(
  concept: Partial<StudyConcept>,
  requestData: Partial<GenerateConceptRequest>
): McdaScoreWithRecommendation {
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
  const commercialAssessment = calculateCommercialValueScore(concept, requestData);
  const feasibilityScore = calculateFeasibilityScore(concept, requestData);

  // Calculate weighted overall score
  const overallScore = (
    scientificValidityScore * weights.scientificValidity +
    clinicalImpactScore * weights.clinicalImpact +
    commercialAssessment.score * weights.commercialValue +
    feasibilityScore * weights.feasibility
  );

  return {
    scientificValidity: parseFloat(scientificValidityScore.toFixed(1)),
    clinicalImpact: parseFloat(clinicalImpactScore.toFixed(1)),
    commercialValue: parseFloat(commercialAssessment.score.toFixed(1)),
    feasibility: parseFloat(feasibilityScore.toFixed(1)),
    overall: parseFloat(overallScore.toFixed(1)),
    commercialRecommendation: commercialAssessment.recommendation,
    commercialAlerts: commercialAssessment.alerts,
    financialSignals: commercialAssessment.financialSignals
  };
}

/**
 * Calculates the scientific validity score (1-5 scale)
 */
function calculateScientificValidityScore(concept: Partial<StudyConcept>): number {
  let score = 3.5; // Default starting score
  
  // Evidence source count contributes to scientific validity
  const evidenceSourceCount = Array.isArray(concept.evidenceSources) ? concept.evidenceSources.length : 0;
  if (evidenceSourceCount >= 5) {
    score += 0.8;
  } else if (evidenceSourceCount >= 3) {
    score += 0.5;
  } else if (evidenceSourceCount >= 1) {
    score += 0.2;
  }
  
  // Well-defined PICO increases score
  const picoData = concept.picoData as Record<string, unknown> | undefined;
  const population = typeof picoData?.population === "string" ? picoData.population : "";
  const intervention = typeof picoData?.intervention === "string" ? picoData.intervention : "";
  const comparator = typeof picoData?.comparator === "string" ? picoData.comparator : "";
  const outcomes = typeof picoData?.outcomes === "string" ? picoData.outcomes : "";

  if (population.length > 30) score += 0.3;
  if (intervention.length > 30) score += 0.3;
  if (comparator.length > 20) score += 0.2;
  if (outcomes.length > 30) score += 0.4;

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
  const strategicGoals = Array.isArray(concept.strategicGoals) ? concept.strategicGoals : [];
  const strategicGoal = strategicGoals[0] || 'expand_label';
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
  const picoData = concept.picoData as Record<string, unknown> | undefined;
  const outcomes = typeof picoData?.outcomes === "string" ? (picoData.outcomes as string) : "";
  if (outcomes.length > 40) {
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
): CommercialAssessment {
  let score = 2.5; // Slightly conservative baseline
  const alerts: string[] = [];
  const rationale: string[] = [];
  const blockers: string[] = [];
  let confidence: ConceptRecommendation["confidence"] = "medium";
  let windowAssessment: string | undefined;

  // Strategic goal affects commercial value
  const strategicGoals = Array.isArray(concept.strategicGoals) ? concept.strategicGoals : [];
  const requestGoals = Array.isArray(requestData.strategicGoals) ? requestData.strategicGoals : [];
  const strategicGoal = strategicGoals[0] || requestGoals[0] || 'expand_label';
  switch (strategicGoal) {
    case 'expand_label':
      score += 0.6;
      break;
    case 'defend_share':
      score += 0.4;
      break;
    case 'accelerate_uptake':
      score += 0.7;
      break;
    case 'real_world_evidence':
      score += 0.3;
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

  // Financial signals
  const feasibility = concept.feasibilityData as Record<string, unknown> | undefined;
  const projectedROI = typeof feasibility?.projectedROI === "number"
    ? (feasibility.projectedROI as number)
    : null;
  const riskAdjustedEnpv = pickRiskAdjustedEnpv(concept);
  const windowToLoeMonths = computeWindowToLoe(concept);

  if (typeof projectedROI === "number") {
    rationale.push(`Projected ROI ${projectedROI.toFixed(1)}x`);
    if (projectedROI >= 4.0) {
      score += 0.7;
    } else if (projectedROI >= 3.0) {
      score += 0.5;
    } else if (projectedROI >= 2.0) {
      score += 0.2;
    } else if (projectedROI < 1.0) {
      score -= 1.5;
      alerts.push("Projected ROI is below 1.0×; investment would not breakeven.");
      blockers.push("Increase commercial impact or reduce cost to achieve at least 1.0× ROI.");
    } else if (projectedROI < 1.5) {
      score -= 0.8;
      alerts.push("Projected ROI marginal (<1.5×). Consider redesign to boost return.");
    }
  } else {
    alerts.push("Projected ROI missing; unable to assess commercial return confidently.");
  }

  if (typeof riskAdjustedEnpv === "number") {
    const enpvMillions = riskAdjustedEnpv / 1_000_000;
    rationale.push(`Risk-adjusted eNPV ${enpvMillions.toFixed(1)}M`);
    if (riskAdjustedEnpv < 0) {
      score -= 1.2;
      alerts.push("Risk-adjusted eNPV is negative; study destroys value under current assumptions.");
      blockers.push("Revisit revenue assumptions or run smaller, faster evidence plans.");
    } else if (riskAdjustedEnpv < 25_000_000) {
      score -= 0.5;
      alerts.push("Risk-adjusted eNPV is low; upside may not justify investment.");
    } else {
      score += 0.2;
    }
  }

  if (typeof windowToLoeMonths === "number") {
    const years = windowToLoeMonths / 12;
    windowAssessment = years >= 3
      ? `LOE window supports ~${years.toFixed(1)} years of monetisation post-readout.`
      : `Only ${Math.max(windowToLoeMonths, 0).toFixed(0)} months remain before LOE after readout.`;

    if (windowToLoeMonths < 12) {
      score -= 0.7;
      alerts.push("LOE window under 12 months post-readout; limited time to recoup investment.");
      blockers.push("Accelerate timeline or focus on lifecycle extension strategies.");
    } else if (windowToLoeMonths < 24) {
      score -= 0.4;
      alerts.push("LOE window tight (<24 months); ensure acceleration or extension plan.");
    } else if (windowToLoeMonths > 48) {
      score += 0.2;
    }
  }

  // Clamp score within bounds
  score = Math.min(5.0, Math.max(1.0, score));

  // Determine recommendation level
  let level: RecommendationLevel = "proceed";

  const hasNegativeRoi = typeof projectedROI === "number" && projectedROI < 1.0;
  const hasNegativeEnpv = typeof riskAdjustedEnpv === "number" && riskAdjustedEnpv < 0;
  const windowTooShort = typeof windowToLoeMonths === "number" && windowToLoeMonths < 12;

  if (hasNegativeRoi || hasNegativeEnpv) {
    level = "stop";
    confidence = "low";
  } else if (
    (typeof projectedROI === "number" && projectedROI < 1.5) ||
    (typeof riskAdjustedEnpv === "number" && riskAdjustedEnpv < 25_000_000) ||
    windowTooShort
  ) {
    level = "revise";
    confidence = score >= 3.0 ? "medium" : "low";
  } else {
    confidence = score >= 4.0 ? "high" : "medium";
  }

  const recommendation: ConceptRecommendation = {
    level,
    confidence,
    rationale,
    blockers: blockers.length > 0 ? blockers : undefined,
    windowAssessment
  };

  return {
    score,
    recommendation,
    alerts,
    financialSignals: {
      projectedROI,
      riskAdjustedEnpv,
      windowToLoeMonths
    }
  };
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
  const feasibility = concept.feasibilityData as Record<string, unknown> | undefined;
  if (feasibility) {
    // Higher recruitment rate increases feasibility
    const recruitmentRate = typeof feasibility.recruitmentRate === "number" ? feasibility.recruitmentRate : undefined;
    if (typeof recruitmentRate === "number" && recruitmentRate >= 0.8) {
      score += 0.8;
    } else if (typeof recruitmentRate === "number" && recruitmentRate >= 0.6) {
      score += 0.5;
    } else if (typeof recruitmentRate === "number" && recruitmentRate < 0.5) {
      score -= 0.5;
    }
    
    // Lower completion risk increases feasibility
    const completionRisk = typeof feasibility.completionRisk === "number" ? feasibility.completionRisk : undefined;
    if (typeof completionRisk === "number" && completionRisk <= 0.2) {
      score += 0.8;
    } else if (typeof completionRisk === "number" && completionRisk <= 0.3) {
      score += 0.4;
    } else if (typeof completionRisk === "number" && completionRisk >= 0.5) {
      score -= 0.5;
    }
  }
  
  // Budget considerations
  if (requestData.budgetCeilingEur && typeof feasibility?.estimatedCost === "number") {
    const estimatedCost = feasibility.estimatedCost as number;
    if (estimatedCost <= requestData.budgetCeilingEur * 0.8) {
      score += 0.5; // Well under budget
    } else if (estimatedCost > requestData.budgetCeilingEur) {
      score -= 0.8; // Over budget
    }
  }
  
  // Timeline considerations
  if (requestData.timelineCeilingMonths && typeof feasibility?.timeline === "number") {
    const timeline = feasibility.timeline as number;
    if (timeline <= requestData.timelineCeilingMonths * 0.8) {
      score += 0.5; // Well under timeline
    } else if (timeline > requestData.timelineCeilingMonths) {
      score -= 0.8; // Over timeline
    }
  }
  
  // Simpler study designs are more feasible
  if (!concept.targetSubpopulation) {
    score += 0.2; // Broader population is easier to recruit
  }
  
  if (!Array.isArray(concept.comparatorDrugs) || concept.comparatorDrugs.length <= 1) {
    score += 0.3; // Fewer comparators means simpler design
  }
  
  return Math.min(5.0, Math.max(1.0, score)); // Clamp between 1 and 5
}

function pickRiskAdjustedEnpv(concept: Partial<StudyConcept>): number | null {
  const feasibility = concept.feasibilityData as Record<string, unknown> | undefined;
  if (!feasibility) return null;

  const candidates = [
    feasibility.riskAdjustedENpvUsd,
    feasibility.riskAdjustedEnpvUsd,
    feasibility.riskAdjustedENpv,
    feasibility.riskAdjustedEnpv,
    feasibility.economicNetPresentValueUsd,
  ];

  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function computeWindowToLoe(concept: Partial<StudyConcept>): number | null {
  const feasibility = concept.feasibilityData as Record<string, unknown> | undefined;
  const loeDateStr =
    (typeof feasibility?.globalLoeDate === "string" && feasibility.globalLoeDate) ||
    (typeof concept.globalLoeDate === "string" ? concept.globalLoeDate : undefined);

  const readoutStr =
    (typeof feasibility?.expectedToplineDate === "string" && feasibility.expectedToplineDate) ||
    (typeof concept.expectedToplineDate === "string" ? concept.expectedToplineDate : undefined);

  if (!loeDateStr || !readoutStr) {
    return null;
  }

  const loeDate = new Date(loeDateStr);
  const readoutDate = new Date(readoutStr);

  if (Number.isNaN(loeDate.getTime()) || Number.isNaN(readoutDate.getTime())) {
    return null;
  }

  const diffMs = loeDate.getTime() - readoutDate.getTime();
  const months = diffMs / (1000 * 60 * 60 * 24 * 30.4375);
  return Math.round(Math.max(0, months));
}
