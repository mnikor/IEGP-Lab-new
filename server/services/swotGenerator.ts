import { StudyConcept } from "@shared/schema";
import { SwotAnalysis } from "@shared/schema";

/**
 * Generates a SWOT analysis for a study concept
 * 
 * @param concept The study concept to analyze
 * @param searchResults Search results from Perplexity to inform the analysis
 * @returns SWOT analysis object
 */
export function generateSwot(
  concept: Partial<StudyConcept>,
  searchResults: { content: string; citations: string[] }
): SwotAnalysis {
  // Generate dynamic SWOT analysis based on concept details and evidence
  return {
    strengths: generateStrengths(concept, searchResults),
    weaknesses: generateWeaknesses(concept, searchResults),
    opportunities: generateOpportunities(concept, searchResults),
    threats: generateThreats(concept, searchResults)
  };
}

/**
 * Generates strengths for SWOT analysis
 */
function generateStrengths(
  concept: Partial<StudyConcept>,
  searchResults: { content: string; citations: string[] }
): string[] {
  const strengths: string[] = [];
  
  // Analyze strategic goal for strengths
  const strategicGoal = concept.strategicGoal || 'expand_label';
  switch (strategicGoal) {
    case 'expand_label':
      strengths.push(`Potential for expanded indication to ${concept.indication}`);
      break;
    case 'defend_share':
      strengths.push('Reinforces competitive position in current market');
      break;
    case 'accelerate_uptake':
      strengths.push('Could increase adoption rate and market penetration');
      break;
    case 'real_world_evidence':
      strengths.push('Provides real-world data to support clinical findings');
      break;
  }
  
  // Add strengths based on evidence
  if (concept.evidenceSources && concept.evidenceSources.length > 3) {
    strengths.push('Strong supporting evidence base from multiple sources');
  }
  
  // Add strengths based on PICO
  if (concept.picoData) {
    if (concept.picoData.population.length > 30) {
      strengths.push('Well-defined target population');
    }
    if (concept.picoData.outcomes.includes('survival') || concept.picoData.outcomes.includes('mortality')) {
      strengths.push('Focus on clinically meaningful endpoints');
    }
  }
  
  // Add strengths based on geography
  if (concept.geography && concept.geography.length > 1) {
    strengths.push(`Multi-regional approach across ${concept.geography.length} territories`);
  }
  
  // Add feasibility strengths
  if (concept.feasibilityData) {
    if (concept.feasibilityData.projectedROI >= 3.0) {
      strengths.push(`High projected ROI (${concept.feasibilityData.projectedROI.toFixed(1)}x)`);
    }
    if (concept.feasibilityData.recruitmentRate >= 0.7) {
      strengths.push('Favorable patient recruitment potential');
    }
  }
  
  // Add more generic strengths if we don't have enough specific ones
  if (strengths.length < 3) {
    strengths.push('Builds on established clinical research methodologies');
    strengths.push('Addresses an unmet medical need');
  }
  
  return strengths;
}

/**
 * Generates weaknesses for SWOT analysis
 */
function generateWeaknesses(
  concept: Partial<StudyConcept>,
  searchResults: { content: string; citations: string[] }
): string[] {
  const weaknesses: string[] = [];
  
  // Study phase considerations
  const studyPhase = concept.studyPhase || 'any';
  switch (studyPhase) {
    case 'I':
      weaknesses.push('Early-phase study may have limited impact on clinical practice');
      break;
    case 'II':
      weaknesses.push('Phase II may not be powered for definitive conclusions');
      break;
    case 'III':
      weaknesses.push('Large Phase III study requires significant resources and time');
      break;
    case 'IV':
      weaknesses.push('Post-marketing studies may face challenges in demonstrating added value');
      break;
  }
  
  // Target population considerations
  if (concept.targetSubpopulation) {
    weaknesses.push(`Specialized population (${concept.targetSubpopulation}) may slow recruitment`);
  }
  
  // Budget and timeline considerations
  if (concept.feasibilityData) {
    if (concept.feasibilityData.estimatedCost > 5000000) {
      weaknesses.push('Relatively high cost of implementation');
    }
    if (concept.feasibilityData.timeline > 24) {
      weaknesses.push('Extended timeline may delay time to market');
    }
    if (concept.feasibilityData.completionRisk > 0.4) {
      weaknesses.push('Moderate to high risk of study completion challenges');
    }
  }
  
  // Comparator considerations
  if (concept.comparatorDrugs && concept.comparatorDrugs.length > 1) {
    weaknesses.push('Complex design with multiple comparator arms');
  }
  
  // Add more generic weaknesses if we don't have enough specific ones
  if (weaknesses.length < 3) {
    weaknesses.push('Potential for unanticipated adverse events');
    weaknesses.push('Dependent on high-quality execution across sites');
    weaknesses.push('May require specialized expertise or equipment');
  }
  
  return weaknesses;
}

/**
 * Generates opportunities for SWOT analysis
 */
function generateOpportunities(
  concept: Partial<StudyConcept>,
  searchResults: { content: string; citations: string[] }
): string[] {
  const opportunities: string[] = [];
  
  // Strategic goal considerations
  const strategicGoal = concept.strategicGoal || 'expand_label';
  switch (strategicGoal) {
    case 'expand_label':
      opportunities.push('Potential for regulatory approval in new indication');
      opportunities.push('Expand addressable patient population');
      break;
    case 'defend_share':
      opportunities.push('Strengthen product differentiation against competitors');
      opportunities.push('Reinforce position in treatment guidelines');
      break;
    case 'accelerate_uptake':
      opportunities.push('Increase physician confidence and prescription rates');
      opportunities.push('Improve payer acceptance and reimbursement');
      break;
    case 'real_world_evidence':
      opportunities.push('Generate data for health technology assessment bodies');
      opportunities.push('Support value-based pricing models');
      break;
  }
  
  // Geography considerations
  if (concept.geography && concept.geography.includes('US')) {
    opportunities.push('Potential for FDA approval/recognition');
  }
  if (concept.geography && concept.geography.includes('EU')) {
    opportunities.push('Alignment with EMA requirements');
  }
  
  // Study design considerations
  if (concept.picoData && concept.picoData.outcomes.includes('quality of life')) {
    opportunities.push('Patient-reported outcomes may support patient-centric marketing');
  }
  
  // Add more generic opportunities if we don't have enough specific ones
  if (opportunities.length < 3) {
    opportunities.push('First-mover advantage in specific study design');
    opportunities.push('Potential for publication in high-impact journals');
    opportunities.push('Foundation for follow-up studies and research program');
  }
  
  return opportunities;
}

/**
 * Generates threats for SWOT analysis
 */
function generateThreats(
  concept: Partial<StudyConcept>,
  searchResults: { content: string; citations: string[] }
): string[] {
  const threats: string[] = [];
  
  // Competitive landscape threats
  threats.push('Competing studies with similar objectives may be in progress');
  threats.push('Evolving standard of care may impact study relevance');
  
  // Study design risks
  const studyPhase = concept.studyPhase || 'any';
  if (studyPhase === 'III') {
    threats.push('Failure to meet primary endpoint would have significant impact');
  }
  
  // Market considerations
  if (concept.strategicGoal === 'defend_share') {
    threats.push('Competitor products may demonstrate superior results during study period');
  } else if (concept.strategicGoal === 'expand_label') {
    threats.push('Regulatory pathway may become more stringent');
  }
  
  // Feasibility considerations
  if (concept.feasibilityData) {
    if (concept.feasibilityData.completionRisk > 0.3) {
      threats.push('Risk of enrollment challenges or high dropout rates');
    }
    if (concept.feasibilityData.projectedROI < 2.5) {
      threats.push('Potential for insufficient return on investment');
    }
  }
  
  // Add more generic threats if we don't have enough specific ones
  if (threats.length < 3) {
    threats.push('Unexpected safety signals could derail study progress');
    threats.push('Changing reimbursement landscape may affect commercial value');
    threats.push('Technical or operational challenges in study execution');
  }
  
  return threats;
}
