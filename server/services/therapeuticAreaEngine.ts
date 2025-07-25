/**
 * Therapeutic Area Intelligence Engine
 * Provides context-aware analysis for any disease area and study type
 */

import { StudyConcept } from "@shared/schema";

export interface TherapeuticAreaContext {
  area: string;
  complexity: 'low' | 'medium' | 'high' | 'very_high';
  recruitmentDifficulty: number; // 0.1 to 1.0
  regulatoryComplexity: number; // 0.1 to 1.0
  costMultiplier: number; // 0.5 to 3.0
  commonEndpoints: string[];
  typicalChallenges: string[];
  marketOpportunities: string[];
  competitiveThreats: string[];
}

/**
 * Analyzes therapeutic area context from study concept
 */
export function analyzeTherapeuticArea(concept: Partial<StudyConcept>): TherapeuticAreaContext {
  const indication = (concept.indication || '').toLowerCase();
  const title = (concept.title || '').toLowerCase();
  const description = (concept.description || '').toLowerCase();
  const drugName = (concept.drugName || '').toLowerCase();
  
  // Define therapeutic area patterns and their characteristics
  const therapeuticAreas = {
    oncology: {
      patterns: ['cancer', 'tumor', 'carcinoma', 'sarcoma', 'lymphoma', 'leukemia', 'oncology', 'metastatic'],
      complexity: 'very_high' as const,
      recruitmentDifficulty: 0.6,
      regulatoryComplexity: 0.9,
      costMultiplier: 2.5,
      commonEndpoints: ['overall survival', 'progression-free survival', 'objective response rate', 'safety'],
      typicalChallenges: [
        'Complex patient stratification and biomarker requirements',
        'High regulatory scrutiny for safety and efficacy',
        'Competing clinical trials in oncology space'
      ],
      marketOpportunities: [
        'High unmet medical need drives premium pricing',
        'Expedited regulatory pathways available for breakthrough therapies',
        'Strong market demand for innovative cancer treatments'
      ],
      competitiveThreats: [
        'Rapidly evolving treatment landscape with new therapies',
        'High competition from established oncology companies',
        'Potential for safety signals affecting class perception'
      ]
    },
    
    immunology: {
      patterns: ['rheumatoid', 'psoriasis', 'inflammatory bowel', 'multiple sclerosis', 'lupus', 'immune', 'autoimmune'],
      complexity: 'high' as const,
      recruitmentDifficulty: 0.7,
      regulatoryComplexity: 0.8,
      costMultiplier: 2.2,
      commonEndpoints: ['disease activity scores', 'clinical response', 'quality of life', 'biomarkers'],
      typicalChallenges: [
        'Chronic disease populations with variable response patterns',
        'Complex dosing and administration requirements',
        'Long-term safety monitoring needed for immunosuppression'
      ],
      marketOpportunities: [
        'Growing prevalence of autoimmune diseases',
        'Patient demand for targeted biologic therapies',
        'Opportunity for combination therapy approaches'
      ],
      competitiveThreats: [
        'Established biologic therapies with strong market position',
        'Biosimilar competition reducing pricing power',
        'Safety concerns affecting entire therapeutic class'
      ]
    },
    
    neurology: {
      patterns: ['alzheimer', 'parkinson', 'dementia', 'depression', 'anxiety', 'epilepsy', 'stroke', 'neurological'],
      complexity: 'very_high' as const,
      recruitmentDifficulty: 0.8,
      regulatoryComplexity: 0.9,
      costMultiplier: 2.3,
      commonEndpoints: ['cognitive assessments', 'functional outcomes', 'biomarkers', 'quality of life'],
      typicalChallenges: [
        'Subjective and complex endpoint measurements',
        'High placebo response rates in many conditions',
        'Ethical considerations for vulnerable patient populations'
      ],
      marketOpportunities: [
        'Aging population driving demand for neurological treatments',
        'Significant unmet need in neurodegenerative diseases',
        'Advanced biomarker development enabling precision medicine'
      ],
      competitiveThreats: [
        'High failure rates in neurological drug development',
        'Limited understanding of disease mechanisms',
        'Regulatory skepticism due to historical failures'
      ]
    },
    
    cardiovascular: {
      patterns: ['heart', 'cardiac', 'cardiovascular', 'hypertension', 'cholesterol', 'atherosclerosis'],
      complexity: 'high' as const,
      recruitmentDifficulty: 0.5,
      regulatoryComplexity: 0.8,
      costMultiplier: 1.8,
      commonEndpoints: ['MACE', 'blood pressure', 'lipid levels', 'exercise tolerance'],
      typicalChallenges: [
        'Large sample sizes required for cardiovascular outcomes',
        'Long study durations for meaningful clinical endpoints',
        'Complex statistical requirements for safety analysis'
      ],
      marketOpportunities: [
        'High prevalence of cardiovascular disease globally',
        'Clear regulatory pathway for cardiovascular benefits',
        'Strong health economic value proposition'
      ],
      competitiveThreats: [
        'Generic competition in established cardiovascular markets',
        'High evidence bar for new cardiovascular therapies',
        'Cost containment pressure from payers'
      ]
    },
    
    rareDisease: {
      patterns: ['rare disease', 'orphan', 'genetic disorder', 'hereditary', 'congenital'],
      complexity: 'very_high' as const,
      recruitmentDifficulty: 0.9,
      regulatoryComplexity: 0.7,
      costMultiplier: 3.0,
      commonEndpoints: ['functional assessments', 'biomarkers', 'quality of life', 'survival'],
      typicalChallenges: [
        'Extremely limited patient populations for recruitment',
        'Lack of validated outcome measures',
        'High per-patient costs due to specialized care'
      ],
      marketOpportunities: [
        'Regulatory incentives and expedited pathways',
        'Premium pricing supported by unmet need',
        'Limited competition in orphan indications'
      ],
      competitiveThreats: [
        'Gene therapy and advanced therapeutics changing landscape',
        'Regulatory requirements may evolve rapidly',
        'Patient advocacy groups with high expectations'
      ]
    },
    
    infectious: {
      patterns: ['infection', 'bacterial', 'viral', 'fungal', 'antibiotic', 'antiviral', 'antimicrobial'],
      complexity: 'medium' as const,
      recruitmentDifficulty: 0.4,
      regulatoryComplexity: 0.7,
      costMultiplier: 1.4,
      commonEndpoints: ['clinical cure', 'microbiological response', 'time to resolution', 'safety'],
      typicalChallenges: [
        'Resistance development affecting long-term utility',
        'Variable patient populations and infection severity',
        'Seasonal variability in patient availability'
      ],
      marketOpportunities: [
        'Growing concern about antimicrobial resistance',
        'Public health priority for new infectious disease treatments',
        'Potential for government funding and support'
      ],
      competitiveThreats: [
        'Generic antibiotics with established efficacy',
        'Resistance patterns may limit commercial lifespan',
        'Hospital formulary restrictions on new antimicrobials'
      ]
    }
  };
  
  // Analyze indication to determine therapeutic area
  for (const [area, config] of Object.entries(therapeuticAreas)) {
    const matchFound = config.patterns.some(pattern => 
      indication.includes(pattern) || title.includes(pattern) || description.includes(pattern)
    );
    
    if (matchFound) {
      return {
        area,
        ...config
      };
    }
  }
  
  // Default for unmatched therapeutic areas
  return {
    area: 'general',
    complexity: 'medium',
    recruitmentDifficulty: 0.6,
    regulatoryComplexity: 0.6,
    costMultiplier: 1.5,
    commonEndpoints: ['efficacy measures', 'safety assessments', 'quality of life'],
    typicalChallenges: [
      'Standard recruitment and retention challenges',
      'Regulatory requirements for safety and efficacy demonstration',
      'Market competition from existing therapies'
    ],
    marketOpportunities: [
      'Opportunity to address unmet medical needs',
      'Potential for market differentiation',
      'Patient and physician demand for new treatment options'
    ],
    competitiveThreats: [
      'Established therapies with proven track records',
      'Generic and biosimilar competition',
      'Evolving treatment guidelines and standards'
    ]
  };
}

/**
 * Adjusts sample size based on therapeutic area characteristics
 */
export function adjustSampleSizeForTherapeuticArea(
  baseSampleSize: number, 
  therapeuticContext: TherapeuticAreaContext,
  studyPhase: string
): number {
  let adjustedSize = baseSampleSize;
  
  // Adjust for recruitment difficulty
  if (therapeuticContext.recruitmentDifficulty > 0.7) {
    adjustedSize *= 1.3; // Increase sample size for difficult recruitment
  } else if (therapeuticContext.recruitmentDifficulty < 0.4) {
    adjustedSize *= 0.9; // Decrease for easy recruitment
  }
  
  // Adjust for therapeutic area complexity
  switch (therapeuticContext.complexity) {
    case 'very_high':
      adjustedSize *= studyPhase === 'III' ? 1.4 : 1.2;
      break;
    case 'high':
      adjustedSize *= studyPhase === 'III' ? 1.2 : 1.1;
      break;
    case 'low':
      adjustedSize *= 0.8;
      break;
  }
  
  return Math.round(adjustedSize);
}

/**
 * Calculates cost multiplier based on therapeutic area
 */
export function getTherapeuticAreaCostMultiplier(
  therapeuticContext: TherapeuticAreaContext,
  studyPhase: string
): number {
  let multiplier = therapeuticContext.costMultiplier;
  
  // Phase-specific adjustments
  if (studyPhase === 'III' && therapeuticContext.complexity === 'very_high') {
    multiplier *= 1.3;
  } else if (studyPhase === 'I' && therapeuticContext.area === 'oncology') {
    multiplier *= 1.2; // Dose escalation complexity
  }
  
  return multiplier;
}