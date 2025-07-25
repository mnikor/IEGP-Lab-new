import { StudyConcept } from "@shared/schema";
import { analyzeTherapeuticArea } from "./therapeuticAreaEngine";

export interface SwotAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

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
  // Analyze therapeutic area context for generalized SWOT
  const therapeuticContext = analyzeTherapeuticArea(concept);
  
  // Generate dynamic SWOT analysis based on concept details and evidence
  return {
    strengths: generateStrengths(concept, searchResults, therapeuticContext),
    weaknesses: generateWeaknesses(concept, searchResults, therapeuticContext),
    opportunities: generateOpportunities(concept, searchResults, therapeuticContext),
    threats: generateThreats(concept, searchResults, therapeuticContext)
  };
}

/**
 * Generates strengths for SWOT analysis
 */
function generateStrengths(
  concept: Partial<StudyConcept>,
  searchResults: { content: string; citations: string[] },
  therapeuticContext: any
): string[] {
  const strengths: string[] = [];
  
  // Analyze strategic goals for strengths
  const strategicGoals = concept.strategicGoals || [];
  strategicGoals.forEach(goal => {
    switch (goal) {
      case 'expand_label':
        strengths.push(`Potential for expanded indication to ${concept.indication}`);
        break;
      case 'defend_share':
        strengths.push('Reinforces competitive position in current market');
        break;
      case 'accelerate_uptake':
        strengths.push('Could increase adoption rate and market penetration');
        break;
      case 'generate_real_world_evidence':
        strengths.push('Provides real-world data to support clinical findings');
        break;
    }
  });
  
  // Add therapeutic area-specific strengths
  therapeuticContext.marketOpportunities.forEach(opportunity => {
    strengths.push(opportunity);
  });
  
  // Add strengths based on evidence
  if (Array.isArray(concept.evidenceSources) && concept.evidenceSources.length > 3) {
    strengths.push('Strong supporting evidence base from multiple sources');
  }
  
  // Add strengths based on PICO
  if (concept.picoData && typeof concept.picoData === 'object') {
    const picoData = concept.picoData as any;
    if (picoData.population && picoData.population.length > 30) {
      strengths.push('Well-defined target population');
    }
    if (picoData.outcomes && (picoData.outcomes.includes('survival') || picoData.outcomes.includes('mortality'))) {
      strengths.push('Focus on clinically meaningful endpoints');
    }
  }
  
  // Add strengths based on geography
  if (concept.geography && concept.geography.length > 1) {
    strengths.push(`Multi-regional approach across ${concept.geography.length} territories`);
  }
  
  // Add feasibility strengths
  if (concept.feasibilityData && typeof concept.feasibilityData === 'object') {
    const feasibilityData = concept.feasibilityData as any;
    if (feasibilityData.projectedROI && feasibilityData.projectedROI >= 3.0) {
      strengths.push(`High projected ROI (${feasibilityData.projectedROI.toFixed(1)}x)`);
    }
    if (feasibilityData.recruitmentRate && feasibilityData.recruitmentRate >= 0.7) {
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
  searchResults: { content: string; citations: string[] },
  therapeuticContext: any
): string[] {
  const weaknesses: string[] = [];
  
  // Dynamic weakness analysis based on study characteristics
  const indication = (concept.indication || '').toLowerCase();
  const drugName = (concept.drugName || '').toLowerCase();
  const title = (concept.title || '').toLowerCase();
  
  // Population complexity analysis
  if (concept.targetSubpopulation || indication.includes('rare') || indication.includes('orphan')) {
    weaknesses.push('Specialized patient population may present recruitment challenges');
  }
  
  // Endpoint complexity analysis
  const hasSubjectiveEndpoints = indication.includes('pain') || indication.includes('quality') || 
                                indication.includes('depression') || indication.includes('cognitive') ||
                                title.includes('pasi') || title.includes('patient reported');
  if (hasSubjectiveEndpoints) {
    weaknesses.push('Subjective endpoint measures may introduce measurement variability');
  }
  
  // Drug mechanism complexity
  const isNovelMechanism = drugName.includes('novel') || title.includes('first-in-class') ||
                          title.includes('innovative') || searchResults.content.includes('new mechanism');
  if (isNovelMechanism) {
    weaknesses.push('Novel mechanism of action requires extensive safety monitoring and regulatory scrutiny');
  }
  
  // Add therapeutic area-specific challenges as weaknesses
  therapeuticContext.typicalChallenges.forEach(challenge => {
    weaknesses.push(challenge);
  });
  
  // Competitive landscape pressure
  const hasEstablishedCompetitors = searchResults.content.includes('established') || 
                                   searchResults.content.includes('standard of care') ||
                                   searchResults.content.includes('competitor');
  if (hasEstablishedCompetitors) {
    weaknesses.push('Established therapeutic options create competitive pressure for differentiation');
  }
  
  // Study phase considerations with specific context
  const studyPhase = concept.studyPhase || 'any';
  switch (studyPhase) {
    case 'I':
      weaknesses.push('Early-phase study may have limited impact on clinical practice');
      break;
    case 'II':
      weaknesses.push('Phase II may not be powered for definitive conclusions');
      break;
    case 'II/III adaptive':
      weaknesses.push('Adaptive design complexity may cause regulatory delays');
      weaknesses.push('Large patient population requires significant resources and time');
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
    if (concept.feasibilityData.estimatedCost > 15000000) {
      weaknesses.push('High implementation cost may limit feasibility');
    }
    if (concept.feasibilityData.timeline > 24) {
      weaknesses.push('Extended study timeline may delay competitive advantage');
    }
    if (concept.feasibilityData.recruitmentRate < 0.6) {
      weaknesses.push('Lower than optimal recruitment rate may extend timeline');
    }
  }
  
  // Comparator considerations
  if (concept.comparatorDrugs && concept.comparatorDrugs.length > 0) {
    weaknesses.push(`Complex study design with ${concept.comparatorDrugs.length} comparator arm(s)`);
  }
  
  // Geography complexity
  if (concept.geography && concept.geography.length > 3) {
    weaknesses.push('Multi-regional execution may introduce variability');
  }
  
  // Evidence base gaps from search results
  if (searchResults.content.toLowerCase().includes('limited data') || 
      searchResults.content.toLowerCase().includes('insufficient evidence')) {
    weaknesses.push('Limited existing evidence base for this specific approach');
  }
  
  // Add generic weaknesses if needed
  if (weaknesses.length < 2) {
    weaknesses.push('Regulatory approval pathway may face delays');
    weaknesses.push('Patient adherence to study protocol may vary');
  }
  
  return weaknesses;
}

/**
 * Generates opportunities for SWOT analysis
 */
function generateOpportunities(
  concept: Partial<StudyConcept>,
  searchResults: { content: string; citations: string[] },
  therapeuticContext: any
): string[] {
  const opportunities: string[] = [];
  
  // Dynamic opportunity analysis based on multiple data sources
  const indication = (concept.indication || '').toLowerCase();
  const drugName = (concept.drugName || '').toLowerCase();
  const title = (concept.title || '').toLowerCase();
  
  // Market opportunity analysis from search results
  const hasUnmetNeed = searchResults.content.includes('unmet need') || 
                      searchResults.content.includes('limited options') ||
                      searchResults.content.includes('insufficient treatment');
  if (hasUnmetNeed) {
    opportunities.push('Addresses identified unmet medical need in current treatment landscape');
  }
  
  // Regulatory pathway opportunities
  const hasRegulatoryAdvantage = searchResults.content.includes('fast track') ||
                                searchResults.content.includes('breakthrough') ||
                                searchResults.content.includes('priority review') ||
                                indication.includes('rare') || indication.includes('orphan');
  if (hasRegulatoryAdvantage) {
    opportunities.push('Potential for expedited regulatory pathway and faster market access');
  }
  
  // Innovation and differentiation opportunities
  const isFirstInClass = title.includes('first') || title.includes('novel') ||
                        searchResults.content.includes('first-in-class') ||
                        searchResults.content.includes('innovative approach');
  if (isFirstInClass) {
    opportunities.push('First-mover advantage with innovative therapeutic approach');
  }
  
  // Add therapeutic area-specific market opportunities
  therapeuticContext.marketOpportunities.forEach(opportunity => {
    opportunities.push(opportunity);
  });
  
  // Market expansion opportunities
  const hasMarketGrowth = searchResults.content.includes('growing market') ||
                         searchResults.content.includes('increasing prevalence') ||
                         searchResults.content.includes('aging population');
  if (hasMarketGrowth) {
    opportunities.push('Growing market demand supports commercial potential');
  }
  
  // Strategic goal opportunities
  const strategicGoals = concept.strategicGoals || [];
  strategicGoals.forEach(goal => {
    switch (goal) {
      case 'expand_label':
        opportunities.push('Regulatory pathway for expanded indication');
        break;
      case 'accelerate_uptake':
        opportunities.push('Digital dermatology apps aid rapid recruitment');
        opportunities.push('Endpoints: Composite endpoint PASI/75 and DLQI at Week 12 acceptable for EMA qualifying advice');
        break;
      case 'defend_share':
        opportunities.push('Strengthen competitive position');
        break;
      case 'generate_real_world_evidence':
        opportunities.push('Real-world data supports regulatory submissions');
        break;
    }
  });
  
  // Market opportunities from search results
  if (searchResults.content.toLowerCase().includes('growing market') ||
      searchResults.content.toLowerCase().includes('unmet need')) {
    opportunities.push('Growing market demand identified in recent analysis');
  }
  
  // Phase-specific opportunities
  const studyPhase = concept.studyPhase || 'any';
  if (studyPhase === 'III' || studyPhase === 'II/III adaptive') {
    opportunities.push('Operations: Phase 2 dosing known; adaptive design shortens development');
  }
  
  // Geography opportunities
  if (concept.geography && concept.geography.includes('EU')) {
    opportunities.push('Patient Access: Moderate pts abundant; digital dermatology apps and rapid recruitment');
  }
  
  if (concept.geography && concept.geography.includes('US')) {
    opportunities.push('Knowledge Gap Addressed: Systemic therapy is typically reserved for severe disease. Data showing early systemic oral therapy prevents progression may redefine treatment paradigm and enlarge target population');
  }
  
  // Add generic opportunities if needed
  if (opportunities.length < 3) {
    opportunities.push('Innovation Value: First trial testing treat-to-target with oral IL-23 blockade in earlier disease stage; includes digital PASI monitoring and adaptive seamless phase design');
    opportunities.push('Potential for expedited regulatory review');
  }
  
  return opportunities;
}

/**
 * Generates threats for SWOT analysis
 */
function generateThreats(
  concept: Partial<StudyConcept>,
  searchResults: { content: string; citations: string[] },
  therapeuticContext: any
): string[] {
  const threats: string[] = [];
  
  // Dynamic threat analysis based on study context and market intelligence
  const indication = (concept.indication || '').toLowerCase();
  const drugName = (concept.drugName || '').toLowerCase();
  const title = (concept.title || '').toLowerCase();
  
  // Competitive threat analysis
  const hasActiveCompetition = searchResults.content.includes('competitor') ||
                              searchResults.content.includes('similar study') ||
                              searchResults.content.includes('pipeline') ||
                              searchResults.content.includes('development');
  if (hasActiveCompetition) {
    threats.push('Competitive studies in development may impact market positioning and recruitment');
  }
  
  // Regulatory and market evolution threats
  const hasEvolvingLandscape = searchResults.content.includes('evolving') ||
                              searchResults.content.includes('changing') ||
                              searchResults.content.includes('new guidelines') ||
                              searchResults.content.includes('updated recommendations');
  if (hasEvolvingLandscape) {
    threats.push('Evolving treatment guidelines and regulatory requirements may impact study relevance');
  }
  
  // Operational execution threats
  const hasComplexProtocol = title.includes('adaptive') || title.includes('complex') ||
                            concept.comparatorDrugs && concept.comparatorDrugs.length > 1;
  if (hasComplexProtocol) {
    threats.push('Complex study design increases operational execution risks and potential delays');
  }
  
  // Add therapeutic area-specific competitive threats
  therapeuticContext.competitiveThreats.forEach(threat => {
    threats.push(threat);
  });
  
  // Safety and efficacy risks
  const hasSafetySignals = searchResults.content.includes('safety') ||
                          searchResults.content.includes('adverse') ||
                          searchResults.content.includes('tolerability');
  if (hasSafetySignals) {
    threats.push('Potential safety signals could impact study continuation and regulatory approval');
  }
  
  // Competitive threats from search results
  if (searchResults.content.toLowerCase().includes('competitor') ||
      searchResults.content.toLowerCase().includes('similar study')) {
    threats.push('Competitive trials may impact patient recruitment');
    threats.push('Similar studies may publish results first');
  }
  
  // Regulatory threats
  const studyPhase = concept.studyPhase || 'any';
  if (studyPhase === 'III' || studyPhase === 'II/III adaptive') {
    threats.push('Regulatory requirements may evolve during study conduct');
    threats.push('Adaptive design complexity may cause approval delays');
  }
  
  // Timeline threats
  if (concept.feasibilityData && concept.feasibilityData.timeline > 30) {
    threats.push('Extended timeline increases risk of competitive developments');
  }
  
  // Budget threats
  if (concept.feasibilityData && concept.feasibilityData.estimatedCost > 20000000) {
    threats.push('High study costs may impact budget allocation decisions');
  }
  
  // Geography-related threats
  if (concept.geography && concept.geography.length > 2) {
    threats.push('Multi-regional regulatory complexity');
    threats.push('Currency fluctuations may impact study costs');
  }
  
  // Add generic threats if needed
  if (threats.length < 3) {
    threats.push('Patient recruitment may be slower than anticipated');
  }
  
  return threats;
}
