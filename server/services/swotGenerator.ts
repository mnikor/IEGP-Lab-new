import { StudyConcept } from "@shared/schema";
import { analyzeTherapeuticArea } from "./therapeuticAreaEngine";
import { REGIONAL_MARKET_DATA } from "./commercialIntelligence";
import { ScenarioOutcome } from "@/lib/types";

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
  const feasibility = concept.feasibilityData as any | undefined;
  const strategicGoals = concept.strategicGoals || [];
  const timelineMonths = feasibility?.timeline ?? 0;
  const timelineYears = timelineMonths > 0 ? (timelineMonths / 12).toFixed(1) : undefined;
  const regionalMix = concept.geography || [];
  const marketContext = summarizeMarketContext(regionalMix);
  
  // Generate dynamic SWOT analysis based on concept details and evidence
  return {
    strengths: generateStrengths(concept, searchResults, therapeuticContext, feasibility, strategicGoals, marketContext),
    weaknesses: generateWeaknesses(concept, searchResults, therapeuticContext, feasibility),
    opportunities: generateOpportunities(concept, searchResults, therapeuticContext, feasibility, marketContext),
    threats: generateThreats(concept, searchResults, therapeuticContext, feasibility, strategicGoals)
  };
}

/**
 * Generates strengths for SWOT analysis
 */
function generateStrengths(
  concept: Partial<StudyConcept>,
  searchResults: { content: string; citations: string[] },
  therapeuticContext: any,
  feasibility: any,
  strategicGoals: string[],
  marketContext: string | undefined
): string[] {
  const strengths: string[] = [];
  
  // Analyze strategic goals for strengths
  strategicGoals.forEach(goal => {
    switch (goal) {
      case 'expand_label':
        strengths.push(`Potential to expand indication scope in ${concept.indication}`);
        break;
      case 'defend_market_share':
        strengths.push('Directly supports lifecycle plan by reinforcing share in priority markets');
        break;
      case 'accelerate_uptake':
        strengths.push('Endpoints and design designed to accelerate adoption by frontline prescribers');
        break;
      case 'generate_real_world_evidence':
        strengths.push('Creates real-world dataset for payer discussions and HTA submissions');
        break;
      case 'facilitate_market_access':
        strengths.push('Embedded health-economic endpoints strengthens access dossier');
        break;
      case 'optimise_dosing':
        strengths.push('Generates data to support optimized dosing regimen claims');
        break;
      case 'validate_biomarker':
        strengths.push('Validates biomarker strategy aligned to precision medicine objectives');
        break;
    }
  });
  
  // Add therapeutic area-specific strengths
  therapeuticContext.marketOpportunities.forEach((opportunity: string) => {
    strengths.push(opportunity);
  });
  
  // Add strengths based on evidence
  if (Array.isArray(concept.evidenceSources) && concept.evidenceSources.length > 3) {
    strengths.push('Strong supporting evidence base from multiple independent sources');
  }
  if (searchResults.citations && searchResults.citations.length > 0) {
    strengths.push(`Backed by ${searchResults.citations.length} external references informing design choices`);
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
  if (feasibility && typeof feasibility === 'object') {
    if (feasibility.projectedROI && feasibility.projectedROI >= 2.5) {
      strengths.push(`High projected ROI (${feasibility.projectedROI.toFixed(1)}x)`);
    }
    if (feasibility.recruitmentRate && feasibility.recruitmentRate >= 0.7) {
      strengths.push('Favorable patient recruitment potential');
    }
    if (feasibility.totalIncrementalSalesEur) {
      strengths.push(`Economic upside: ${formatCurrency(feasibility.totalIncrementalSalesEur, 'EUR')} incremental sales projected`);
    }
    if (feasibility.regionalRevenueForecast && feasibility.regionalRevenueForecast.length > 0) {
      const topRegion = [...feasibility.regionalRevenueForecast].sort((a: any, b: any) => b.incrementalSalesEur - a.incrementalSalesEur)[0];
      if (topRegion) {
        strengths.push(`Largest revenue impact expected in ${topRegion.displayName} (${formatCurrency(topRegion.incrementalSalesEur, 'EUR')})`);
      }
    }
  }
  
  if (marketContext) {
    strengths.push(marketContext);
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
  therapeuticContext: any,
  feasibility: any
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
  therapeuticContext.typicalChallenges.forEach((challenge: string) => {
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
  if (feasibility) {
    if (feasibility.estimatedCost > 15000000) {
      weaknesses.push('High implementation cost may limit feasibility');
    }
    if (feasibility.timeline > 24) {
      weaknesses.push(`Extended study timeline (${feasibility.timeline} months) may delay competitive advantage`);
    }
    if (feasibility.recruitmentRate < 0.6) {
      weaknesses.push('Lower than optimal recruitment rate may extend timeline');
    }
    if (feasibility.riskAdjustedENpvEur && feasibility.riskAdjustedENpvEur < 0) {
      weaknesses.push('Risk-adjusted eNPV currently negative; value case depends on optimistic scenario execution');
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
  therapeuticContext: any,
  feasibility: any,
  marketContext: string | undefined
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
  strategicGoals.forEach((goal: string) => {
    switch (goal) {
      case 'expand_label':
        opportunities.push('Regulatory pathway for expanded indication');
        break;
      case 'accelerate_uptake':
        opportunities.push('Digital engagement and accelerated endpoints support rapid prescriber adoption');
        break;
      case 'defend_market_share':
        opportunities.push('Provides data to reinforce value with top payer segments and defend formulary positioning');
        break;
      case 'generate_real_world_evidence':
        opportunities.push('Real-world data supports regulatory submissions');
        break;
      case 'facilitate_market_access':
        opportunities.push('Inclusion of QoL and health economic measures strengthens HTA dossiers');
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
    opportunities.push('Adaptive or pivotal design positions program for rapid filing on positive readout');
  }
  
  // Geography opportunities
  if (concept.geography && concept.geography.includes('EU')) {
    opportunities.push('Access to EU reference markets creates leverage for cascading reimbursement negotiations');
  }
  
  if (concept.geography && concept.geography.includes('US')) {
    opportunities.push('US dataset can underpin payer value story for early systemic intervention');
  }

  if (marketContext) {
    opportunities.push(marketContext.replace('Market outlook:', 'Commercial opportunity:'));
  }

  if (feasibility && feasibility.scenarioAnalysis) {
    const optimisticScenario = feasibility.scenarioAnalysis.find((scenario: ScenarioOutcome) => scenario.scenario === 'optimistic');
    if (optimisticScenario && optimisticScenario.incrementalSalesEur) {
      opportunities.push(`Upside scenario delivers ${formatCurrency(optimisticScenario.incrementalSalesEur, 'EUR')} incremental sales if execution accelerates`);
    }
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
  therapeuticContext: any,
  feasibility: any,
  strategicGoals: string[]
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
  therapeuticContext.competitiveThreats.forEach((threat: string) => {
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
  if (feasibility && feasibility.timeline > 30) {
    threats.push(`Extended timeline (${feasibility.timeline} months) increases risk of competitive developments or LOE compression`);
  }

  if (feasibility && feasibility.estimatedCost > 20000000) {
    threats.push('High study costs may impact budget allocation decisions');
  }

  if (feasibility && feasibility.totalIncrementalSalesEur && feasibility.estimatedCost) {
    const payback = feasibility.totalIncrementalSalesEur / feasibility.estimatedCost;
    if (payback < 3) {
      threats.push('Value upside vs. investment is modest; portfolio governance scrutiny likely');
    }
  }

  if (strategicGoals.includes('defend_market_share') && !(feasibility && feasibility.riskAdjustedENpvEur > 0)) {
    threats.push('Defensive objective relies on positive HTA outcomes; negative eNPV undermines market-access narrative');
  }
  
  // Add generic threats if needed
  if (threats.length < 2) {
    threats.push('Regulatory or reimbursement changes could impact study relevance');
    threats.push('Evolving standard of care may reduce differentiation at launch');
  }
  
  return threats;
}

function formatCurrency(value: number, currency: 'EUR' | 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function summarizeMarketContext(geographies: string[]): string | undefined {
  if (!geographies || geographies.length === 0) return undefined;
  const regions = geographies
    .map((regionCode) => {
      const market = REGIONAL_MARKET_DATA[regionCode.toLowerCase() as keyof typeof REGIONAL_MARKET_DATA];
      if (!market) return undefined;
      return `${market.region} market ~${formatCurrency(market.marketSize, 'USD')} with ${market.growthRate}% CAGR`;
    })
    .filter(Boolean);
  if (regions.length === 0) return undefined;
  return `Market outlook: ${regions.join('; ')}`;
}
