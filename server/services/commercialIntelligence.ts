import { StudyConcept } from '@shared/schema';

export interface RegionalMarketData {
  region: string;
  marketSize: number; // USD millions
  growthRate: number; // Annual %
  penetrationRate: number; // %
  pricingMultiplier: number; // vs US baseline
  regulatoryComplexity: number; // 1-5 scale
  timeToAccess: number; // months after approval
  keyPayerChallenges: string[];
  competitiveIntensity: number; // 1-5 scale
}

export interface CommercialImpactAnalysis {
  totalMarketOpportunity: number;
  peakSalesProjection: number;
  timeToBreakeven: number;
  netPresentValue: number;
  regionalBreakdown: {
    [region: string]: {
      marketShare: number;
      revenueProjection: number;
      riskAdjustedRevenue: number;
      keySuccessFactors: string[];
      majorRisks: string[];
    };
  };
  competitiveAdvantage: {
    differentiationScore: number;
    defensibilityScore: number;
    firstMoverAdvantage: boolean;
  };
  commercialFeasibility: {
    score: number;
    keyEnabler: string[];
    majorBarriers: string[];
  };
}

export interface TherapeuticAreaCommercialData {
  marketSizeMil: number;
  majorCompetitors: string[];
  priceRangeLow: number;
  priceRangeHigh: number;
  typicalPatientNumbers: number;
  emergingThreats: string[];
  marketTrends: string[];
  keySuccessFactors: string[];
}

// Comprehensive regional market intelligence
export const REGIONAL_MARKET_DATA: Record<string, RegionalMarketData> = {
  'us': {
    region: 'United States',
    marketSize: 1200000000, // $1.2B baseline
    growthRate: 8.5,
    penetrationRate: 85,
    pricingMultiplier: 1.0,
    regulatoryComplexity: 3,
    timeToAccess: 6,
    keyPayerChallenges: ['Formulary access', 'Prior authorization', 'Step therapy requirements'],
    competitiveIntensity: 4
  },
  'emea': {
    region: 'Europe, Middle East & Africa',
    marketSize: 980000000, // $980M
    growthRate: 6.2,
    penetrationRate: 72,
    pricingMultiplier: 0.75,
    regulatoryComplexity: 4,
    timeToAccess: 18,
    keyPayerChallenges: ['HTA requirements', 'Cost-effectiveness thresholds', 'National pricing negotiations', 'Reference pricing'],
    competitiveIntensity: 3
  },
  'asia_pacific': {
    region: 'Asia Pacific',
    marketSize: 540000000, // $540M
    growthRate: 12.3,
    penetrationRate: 45,
    pricingMultiplier: 0.45,
    regulatoryComplexity: 3,
    timeToAccess: 24,
    keyPayerChallenges: ['Local clinical data requirements', 'Price volume agreements', 'Generic competition'],
    competitiveIntensity: 5
  },
  'china': {
    region: 'China',
    marketSize: 450000000, // $450M
    growthRate: 15.8,
    penetrationRate: 38,
    pricingMultiplier: 0.35,
    regulatoryComplexity: 4,
    timeToAccess: 30,
    keyPayerChallenges: ['NRDL inclusion requirements', 'VBP tender system', 'Local production preferences'],
    competitiveIntensity: 5
  },
  'japan': {
    region: 'Japan',
    marketSize: 280000000, // $280M
    growthRate: 4.1,
    penetrationRate: 78,
    pricingMultiplier: 0.85,
    regulatoryComplexity: 3,
    timeToAccess: 15,
    keyPayerChallenges: ['Health economic evaluation', 'Price maintenance system', 'Generic substitution'],
    competitiveIntensity: 3
  },
  'latin_america': {
    region: 'Latin America',
    marketSize: 160000000, // $160M
    growthRate: 9.7,
    penetrationRate: 25,
    pricingMultiplier: 0.25,
    regulatoryComplexity: 3,
    timeToAccess: 36,
    keyPayerChallenges: ['Limited healthcare budgets', 'Currency volatility', 'Regulatory harmonization'],
    competitiveIntensity: 4
  }
};

// Therapeutic area specific commercial intelligence
export const THERAPEUTIC_AREA_COMMERCIAL_DATA: Record<string, TherapeuticAreaCommercialData> = {
  'oncology': {
    marketSizeMil: 180000,
    majorCompetitors: ['Roche', 'Merck', 'Bristol Myers Squibb', 'Pfizer', 'Novartis'],
    priceRangeLow: 120000,
    priceRangeHigh: 450000,
    typicalPatientNumbers: 250000,
    emergingThreats: ['CAR-T therapies', 'Biosimilars', 'Generic competition', 'Combination therapies'],
    marketTrends: ['Personalized medicine', 'Biomarker-driven therapy', 'Immuno-oncology combinations'],
    keySuccessFactors: ['Survival benefit', 'Safety profile', 'Biomarker strategy', 'Combination potential']
  },
  'immunology': {
    marketSizeMil: 95000,
    majorCompetitors: ['AbbVie', 'Novartis', 'Pfizer', 'UCB', 'Eli Lilly'],
    priceRangeLow: 65000,
    priceRangeHigh: 85000,
    typicalPatientNumbers: 180000,
    emergingThreats: ['JAK inhibitors', 'Biosimilars', 'Oral alternatives'],
    marketTrends: ['Oral delivery', 'Precision dosing', 'Early intervention'],
    keySuccessFactors: ['Efficacy vs biologics', 'Safety profile', 'Convenience', 'Cost effectiveness']
  },
  'neuroscience': {
    marketSizeMil: 125000,
    majorCompetitors: ['Biogen', 'Roche', 'Novartis', 'Gilead', 'Merck'],
    priceRangeLow: 85000,
    priceRangeHigh: 750000,
    typicalPatientNumbers: 120000,
    emergingThreats: ['Gene therapies', 'Disease modification claims', 'Digital therapeutics'],
    marketTrends: ['Biomarker-guided therapy', 'Early intervention', 'Disease modification'],
    keySuccessFactors: ['Disease modification', 'Cognitive benefit', 'Safety in elderly', 'Caregiver support']
  },
  'cardiovascular': {
    marketSizeMil: 65000,
    majorCompetitors: ['Novartis', 'AstraZeneca', 'Boehringer Ingelheim', 'Pfizer', 'Sanofi'],
    priceRangeLow: 3500,
    priceRangeHigh: 65000,
    typicalPatientNumbers: 850000,
    emergingThreats: ['Generic competition', 'Combination pills', 'Digital health solutions'],
    marketTrends: ['Precision medicine', 'Digital monitoring', 'Preventive care'],
    keySuccessFactors: ['Cardiovascular outcomes', 'Safety profile', 'Dosing convenience', 'Cost effectiveness']
  },
  'infectious_diseases': {
    marketSizeMil: 45000,
    majorCompetitors: ['Gilead', 'GSK', 'Merck', 'Pfizer', 'Roche'],
    priceRangeLow: 25000,
    priceRangeHigh: 180000,
    typicalPatientNumbers: 180000,
    emergingThreats: ['Resistance development', 'Generic competition', 'Prevention strategies'],
    marketTrends: ['Rapid diagnostics', 'Shorter treatment durations', 'Resistance profiling'],
    keySuccessFactors: ['Efficacy vs resistance', 'Safety profile', 'Treatment duration', 'Resistance barrier']
  }
};

export class CommercialIntelligenceService {
  
  /**
   * Generates comprehensive commercial impact analysis for a study concept
   */
  async generateCommercialImpactAnalysis(
    concept: StudyConcept,
    targetRegions: string[] = ['us', 'emea', 'asia_pacific']
  ): Promise<CommercialImpactAnalysis> {
    
    const therapeuticArea = this.getTherapeuticAreaFromIndication(concept.indication);
    const therapeuticData = THERAPEUTIC_AREA_COMMERCIAL_DATA[therapeuticArea] || THERAPEUTIC_AREA_COMMERCIAL_DATA['oncology'];
    
    // Calculate base market opportunity
    const studyTimeline = this.extractTimelineFromConcept(concept);
    const totalMarketOpportunity = this.calculateMarketOpportunity(concept, therapeuticData, targetRegions);
    
    // Regional analysis
    const regionalBreakdown: any = {};
    let totalPeakSales = 0;
    
    for (const region of targetRegions) {
      const regionalData = REGIONAL_MARKET_DATA[region];
      if (!regionalData) continue;
      
      const regionalAnalysis = this.calculateRegionalImpact(concept, therapeuticData, regionalData, studyTimeline);
      regionalBreakdown[region] = regionalAnalysis;
      totalPeakSales += regionalAnalysis.revenueProjection;
    }
    
    // Calculate NPV and other financial metrics
    const developmentCost = this.extractDevelopmentCost(concept);
    const timeToBreakeven = this.calculateTimeToBreakeven(totalPeakSales, developmentCost, studyTimeline);
    const netPresentValue = this.calculateNPV(totalPeakSales, developmentCost, timeToBreakeven);
    
    // Competitive analysis
    const competitiveAdvantage = this.analyzeCompetitiveAdvantage(concept, therapeuticData);
    
    // Commercial feasibility
    const commercialFeasibility = this.assessCommercialFeasibility(concept, therapeuticData, regionalBreakdown);
    
    return {
      totalMarketOpportunity,
      peakSalesProjection: totalPeakSales,
      timeToBreakeven,
      netPresentValue,
      regionalBreakdown,
      competitiveAdvantage,
      commercialFeasibility
    };
  }

  /**
   * Generate detailed EMEA commercial impact analysis
   */
  async generateEMEACommercialAnalysis(concept: StudyConcept): Promise<string> {
    const emeaData = REGIONAL_MARKET_DATA['emea'];
    const therapeuticArea = this.getTherapeuticAreaFromIndication(concept.indication);
    const therapeuticData = THERAPEUTIC_AREA_COMMERCIAL_DATA[therapeuticArea] || THERAPEUTIC_AREA_COMMERCIAL_DATA['oncology'];
    
    const studyTimeline = this.extractTimelineFromConcept(concept);
    const marketSize = this.calculateEMEAMarketSize(concept, therapeuticData);
    const marketShare = this.estimateMarketShare(concept, therapeuticData);
    const revenueProjection = marketSize * (marketShare / 100) * emeaData.pricingMultiplier;
    
    // Calculate time-adjusted revenue considering patent cliff
    const patentProtectionYears = this.calculatePatentProtection(concept);
    const timeAdjustedRevenue = this.applyPatentCliffAdjustment(revenueProjection, patentProtectionYears);
    
    // Risk adjustments
    const regulatoryRisk = this.assessRegulatoryRisk(concept, emeaData);
    const marketAccessRisk = this.assessMarketAccessRisk(concept, emeaData);
    const competitiveRisk = this.assessCompetitiveRisk(concept, therapeuticData);
    const overallRisk = (regulatoryRisk + marketAccessRisk + competitiveRisk) / 3;
    const riskAdjustedRevenue = timeAdjustedRevenue * (1 - overallRisk / 10);
    
    return `
**EMEA Commercial Impact Analysis for ${concept.title}**

**Market Opportunity:**
- EMEA ${therapeuticArea} market size: €${(marketSize / 1000000).toFixed(0)}M annually
- Estimated market share potential: ${marketShare.toFixed(1)}%
- Target patient population: ${this.estimatePatientPopulation(concept, emeaData).toLocaleString()} patients
- Price erosion factor: ${((1 - emeaData.pricingMultiplier) * 100).toFixed(0)}% vs US pricing

**Revenue Projections:**
- Peak annual sales projection: €${(revenueProjection / 1000000).toFixed(0)}M
- Patent-adjusted revenue (${patentProtectionYears} years protection): €${(timeAdjustedRevenue / 1000000).toFixed(0)}M
- Risk-adjusted revenue: €${(riskAdjustedRevenue / 1000000).toFixed(0)}M
- Time to market access: ${emeaData.timeToAccess} months post-approval

**Key Commercial Drivers:**
- Regulatory pathway complexity: ${regulatoryRisk.toFixed(1)}/10 risk score
- Market access barriers: ${marketAccessRisk.toFixed(1)}/10 risk score
- Competitive pressure: ${competitiveRisk.toFixed(1)}/10 risk score

**Major EMEA Challenges:**
${emeaData.keyPayerChallenges.map(challenge => `- ${challenge}`).join('\n')}

**Strategic Recommendations:**
- Early HTA engagement strategy required
- Cost-effectiveness data generation crucial
- Consider adaptive pricing models for major EU markets
- Plan for 18-24 month access timeline post-approval
- Develop real-world evidence strategy for payer negotiations

**Bottom Line:**
Risk-adjusted NPV for EMEA: €${(riskAdjustedRevenue * 0.6 / 1000000).toFixed(0)}M over ${patentProtectionYears} years
Investment recommendation: ${riskAdjustedRevenue > 200000000 ? 'STRONG PROCEED' : riskAdjustedRevenue > 100000000 ? 'PROCEED WITH CAUTION' : 'HIGH RISK - RECONSIDER'}
`;
  }

  private getTherapeuticAreaFromIndication(indication: string): string {
    const lower = indication.toLowerCase();
    if (lower.includes('cancer') || lower.includes('tumor') || lower.includes('oncol') || 
        lower.includes('carcinoma') || lower.includes('sarcoma') || lower.includes('leukemia') ||
        lower.includes('lymphoma') || lower.includes('myeloma')) {
      return 'oncology';
    }
    if (lower.includes('arthritis') || lower.includes('psoriasis') || lower.includes('inflammatory') ||
        lower.includes('autoimmune') || lower.includes('crohn') || lower.includes('colitis')) {
      return 'immunology';
    }
    if (lower.includes('alzheimer') || lower.includes('parkinson') || lower.includes('neurol') ||
        lower.includes('sclerosis') || lower.includes('epilepsy') || lower.includes('migraine')) {
      return 'neuroscience';
    }
    if (lower.includes('cardiac') || lower.includes('cardiovascular') || lower.includes('heart') ||
        lower.includes('hypertension') || lower.includes('cholesterol')) {
      return 'cardiovascular';
    }
    if (lower.includes('infection') || lower.includes('viral') || lower.includes('bacterial') ||
        lower.includes('hepatitis') || lower.includes('hiv') || lower.includes('covid')) {
      return 'infectious_diseases';
    }
    return 'oncology'; // Default fallback
  }

  private extractTimelineFromConcept(concept: StudyConcept): number {
    const feasibilityData = concept.feasibilityData as any;
    return feasibilityData?.timeline || 36; // Default 36 months
  }

  private extractDevelopmentCost(concept: StudyConcept): number {
    const feasibilityData = concept.feasibilityData as any;
    return feasibilityData?.estimatedCost || 50000000; // Default $50M
  }

  private calculateMarketOpportunity(
    concept: StudyConcept, 
    therapeuticData: TherapeuticAreaCommercialData, 
    regions: string[]
  ): number {
    let totalOpportunity = 0;
    for (const region of regions) {
      const regionalData = REGIONAL_MARKET_DATA[region];
      if (regionalData) {
        totalOpportunity += regionalData.marketSize * (regionalData.penetrationRate / 100);
      }
    }
    return totalOpportunity;
  }

  private calculateRegionalImpact(
    concept: StudyConcept,
    therapeuticData: TherapeuticAreaCommercialData,
    regionalData: RegionalMarketData,
    studyTimeline: number
  ) {
    const marketShare = this.estimateMarketShare(concept, therapeuticData);
    const baseRevenue = regionalData.marketSize * (marketShare / 100) * regionalData.pricingMultiplier;
    
    // Apply risk adjustments
    const regulatoryRisk = regionalData.regulatoryComplexity / 10;
    const competitiveRisk = regionalData.competitiveIntensity / 10;
    const accessRisk = Math.min(regionalData.timeToAccess / 24, 0.5); // Cap at 50% risk
    
    const riskAdjustedRevenue = baseRevenue * (1 - (regulatoryRisk + competitiveRisk + accessRisk) / 3);
    
    return {
      marketShare,
      revenueProjection: baseRevenue,
      riskAdjustedRevenue,
      keySuccessFactors: therapeuticData.keySuccessFactors.slice(0, 3),
      majorRisks: [
        `Regulatory complexity (${regionalData.regulatoryComplexity}/5)`,
        `Market access timeline (${regionalData.timeToAccess} months)`,
        `Competitive intensity (${regionalData.competitiveIntensity}/5)`
      ]
    };
  }

  private estimateMarketShare(concept: StudyConcept, therapeuticData: TherapeuticAreaCommercialData): number {
    let baseShare = 15; // Base 15% market share assumption
    
    // Adjust based on strategic goals
    const strategicGoals = concept.strategicGoals || [];
    if (strategicGoals.includes('expand_label')) baseShare += 5;
    if (strategicGoals.includes('accelerate_uptake')) baseShare += 3;
    if (strategicGoals.includes('defend_market_share')) baseShare += 2;
    
    // Adjust based on study phase
    if (concept.studyPhase === 'III') baseShare += 5;
    if (concept.studyPhase === 'IV') baseShare += 2;
    
    // Adjust based on competition
    const competitorCount = therapeuticData.majorCompetitors.length;
    if (competitorCount > 5) baseShare -= 3;
    if (competitorCount < 3) baseShare += 3;
    
    return Math.min(Math.max(baseShare, 5), 35); // Cap between 5% and 35%
  }

  private calculateEMEAMarketSize(concept: StudyConcept, therapeuticData: TherapeuticAreaCommercialData): number {
    const emeaData = REGIONAL_MARKET_DATA['emea'];
    return emeaData.marketSize * (emeaData.penetrationRate / 100);
  }

  private estimatePatientPopulation(concept: StudyConcept, regionalData: RegionalMarketData): number {
    const therapeuticArea = this.getTherapeuticAreaFromIndication(concept.indication);
    const basePopulation = THERAPEUTIC_AREA_COMMERCIAL_DATA[therapeuticArea]?.typicalPatientNumbers || 200000;
    
    // Adjust for regional penetration
    return Math.round(basePopulation * (regionalData.penetrationRate / 100) * 0.4); // 40% of market for EMEA
  }

  private calculatePatentProtection(concept: StudyConcept): number {
    const currentYear = new Date().getFullYear();
    const globalLoeDate = (concept as any).globalLoeDate;
    
    if (globalLoeDate) {
      const loeYear = new Date(globalLoeDate).getFullYear();
      return Math.max(loeYear - currentYear, 1);
    }
    
    return 8; // Default 8 years protection
  }

  private applyPatentCliffAdjustment(revenue: number, patentYears: number): number {
    // Apply declining revenue due to patent cliff
    if (patentYears <= 2) return revenue * 0.3; // High generic competition
    if (patentYears <= 5) return revenue * 0.7;
    return revenue; // Full patent protection
  }

  private assessRegulatoryRisk(concept: StudyConcept, regionalData: RegionalMarketData): number {
    let risk = regionalData.regulatoryComplexity * 2; // Base regulatory risk
    
    // Adjust based on study design
    if (concept.studyPhase === 'I' || concept.studyPhase === 'II') risk += 3;
    if (concept.studyPhase === 'IV') risk -= 1;
    
    return Math.min(Math.max(risk, 1), 10);
  }

  private assessMarketAccessRisk(concept: StudyConcept, regionalData: RegionalMarketData): number {
    let risk = regionalData.timeToAccess / 6; // Base risk from access timeline
    
    // Add pricing risk
    risk += (1 - regionalData.pricingMultiplier) * 5;
    
    // Add payer challenge risk
    risk += regionalData.keyPayerChallenges.length * 0.5;
    
    return Math.min(Math.max(risk, 1), 10);
  }

  private assessCompetitiveRisk(concept: StudyConcept, therapeuticData: TherapeuticAreaCommercialData): number {
    let risk = therapeuticData.majorCompetitors.length * 0.8; // Base competitive risk
    
    // Add emerging threat risk
    risk += therapeuticData.emergingThreats.length * 0.5;
    
    return Math.min(Math.max(risk, 1), 10);
  }

  private calculateTimeToBreakeven(peakSales: number, developmentCost: number, studyTimeline: number): number {
    const annualProfit = peakSales * 0.3; // 30% profit margin assumption
    const timeToBreakeven = developmentCost / annualProfit;
    return Math.round((studyTimeline / 12) + timeToBreakeven * 10) / 10; // Add study timeline
  }

  private calculateNPV(peakSales: number, developmentCost: number, timeToBreakeven: number): number {
    const discountRate = 0.12; // 12% discount rate
    const patentLifeYears = 10;
    
    let npv = -developmentCost;
    const annualCashFlow = peakSales * 0.3; // 30% profit margin
    
    for (let year = timeToBreakeven; year <= patentLifeYears; year++) {
      npv += annualCashFlow / Math.pow(1 + discountRate, year);
    }
    
    return npv;
  }

  private analyzeCompetitiveAdvantage(concept: StudyConcept, therapeuticData: TherapeuticAreaCommercialData) {
    const strategicGoals = concept.strategicGoals || [];
    
    let differentiationScore = 0.5; // Base score
    if (strategicGoals.includes('expand_label')) differentiationScore += 0.2;
    if (strategicGoals.includes('accelerate_uptake')) differentiationScore += 0.1;
    if (concept.studyPhase === 'III') differentiationScore += 0.15;
    
    let defensibilityScore = 0.6; // Base score  
    if (concept.studyPhase === 'III' || concept.studyPhase === 'IV') defensibilityScore += 0.2;
    if (strategicGoals.includes('defend_market_share')) defensibilityScore += 0.1;
    
    const firstMoverAdvantage = therapeuticData.majorCompetitors.length < 3;
    
    return {
      differentiationScore: Math.min(differentiationScore, 1.0),
      defensibilityScore: Math.min(defensibilityScore, 1.0),
      firstMoverAdvantage
    };
  }

  private assessCommercialFeasibility(concept: StudyConcept, therapeuticData: TherapeuticAreaCommercialData, regionalBreakdown: any) {
    let score = 0.6; // Base feasibility score
    
    // Positive factors
    if (concept.studyPhase === 'III') score += 0.2;
    if (concept.studyPhase === 'IV') score += 0.1;
    
    const strategicGoals = concept.strategicGoals || [];
    if (strategicGoals.includes('expand_label')) score += 0.15;
    if (strategicGoals.includes('accelerate_uptake')) score += 0.1;
    
    // Risk factors
    const avgCompetitiveRisk = Object.values(regionalBreakdown).reduce((sum: number, region: any) => 
      sum + region.majorRisks.length, 0) / Object.keys(regionalBreakdown).length;
    score -= avgCompetitiveRisk * 0.05;
    
    const keyEnabler = [
      'Strong clinical data package',
      'Established regulatory pathway',
      'Differentiated clinical profile'
    ];
    
    const majorBarriers = [
      'Intense competitive landscape',
      'Complex market access requirements',
      'Patent cliff proximity'
    ];
    
    return {
      score: Math.min(Math.max(score, 0.1), 1.0),
      keyEnabler,
      majorBarriers
    };
  }
}

export const commercialIntelligenceService = new CommercialIntelligenceService();