import { StudyConcept } from "@shared/schema";

/**
 * Statistical parameters for sample size calculations
 */
interface StatisticalParameters {
  alpha: number;          // Type I error rate (typically 0.05)
  beta: number;           // Type II error rate (typically 0.1 or 0.2)
  power: number;          // Statistical power (1 - beta)
  effectSize: number;     // Expected effect size
  dropoutRate: number;    // Expected dropout rate
  allocation: number;     // Allocation ratio (1:1 = 1, 2:1 = 2, etc.)
}

/**
 * Endpoint types with their typical parameters
 */
interface EndpointParameters {
  type: 'survival' | 'response_rate' | 'continuous' | 'safety' | 'biomarker';
  baseline: number;       // Baseline rate/value
  target: number;         // Target improvement
  standardDeviation?: number; // For continuous endpoints
  hazardRatio?: number;   // For survival endpoints
}

/**
 * Calculates sample size based on study phase, indication, and endpoint type
 */
export function calculateSampleSize(concept: Partial<StudyConcept>, requestData: any): {
  sampleSize: number;
  justification: string;
  parameters: StatisticalParameters;
  endpoint: EndpointParameters;
  powerAnalysis: string;
} {
  const studyPhase = concept.studyPhase || 'any';
  const indication = concept.indication || '';
  const isOncology = isOncologyIndication(indication);
  const strategicGoals = concept.strategicGoals || [];
  
  // Determine primary endpoint type based on phase and indication
  const endpoint = determineEndpoint(studyPhase, isOncology, strategicGoals);
  
  // Set statistical parameters based on phase
  const parameters = getStatisticalParameters(studyPhase, isOncology);
  
  // Calculate sample size based on endpoint type
  let sampleSize: number;
  let powerAnalysis: string;
  
  switch (endpoint.type) {
    case 'survival':
      const survivalCalc = calculateSurvivalSampleSize(endpoint, parameters);
      sampleSize = survivalCalc.sampleSize;
      powerAnalysis = survivalCalc.analysis;
      break;
    
    case 'response_rate':
      const responseCalc = calculateResponseRateSampleSize(endpoint, parameters);
      sampleSize = responseCalc.sampleSize;
      powerAnalysis = responseCalc.analysis;
      break;
    
    case 'continuous':
      const continuousCalc = calculateContinuousSampleSize(endpoint, parameters);
      sampleSize = continuousCalc.sampleSize;
      powerAnalysis = continuousCalc.analysis;
      break;
    
    case 'safety':
      const safetyCalc = calculateSafetySampleSize(endpoint, parameters);
      sampleSize = safetyCalc.sampleSize;
      powerAnalysis = safetyCalc.analysis;
      break;
    
    case 'biomarker':
      const biomarkerCalc = calculateBiomarkerSampleSize(endpoint, parameters);
      sampleSize = biomarkerCalc.sampleSize;
      powerAnalysis = biomarkerCalc.analysis;
      break;
    
    default:
      sampleSize = getDefaultSampleSize(studyPhase, isOncology);
      powerAnalysis = "Sample size based on standard phase requirements";
  }
  
  // Adjust for subpopulation and geography
  sampleSize = adjustForStudyCharacteristics(sampleSize, concept, requestData);
  
  // Generate comprehensive justification
  const justification = generateSampleSizeJustification(
    sampleSize, 
    studyPhase, 
    endpoint, 
    parameters, 
    isOncology,
    concept
  );
  
  return {
    sampleSize: Math.round(sampleSize),
    justification,
    parameters,
    endpoint,
    powerAnalysis
  };
}

function isOncologyIndication(indication: string): boolean {
  const oncologyKeywords = [
    'cancer', 'carcinoma', 'tumor', 'tumour', 'oncology', 'sarcoma',
    'leukemia', 'lymphoma', 'myeloma', 'metastatic', 'malignant',
    'neoplasm', 'adenocarcinoma', 'melanoma'
  ];
  
  return oncologyKeywords.some(keyword => 
    indication.toLowerCase().includes(keyword)
  );
}

function determineEndpoint(
  studyPhase: string, 
  isOncology: boolean, 
  strategicGoals: string[]
): EndpointParameters {
  
  if (studyPhase === 'I') {
    return {
      type: 'safety',
      baseline: 0.15, // 15% expected DLT rate
      target: 0.33,   // 33% maximum tolerable DLT rate
    };
  }
  
  if (studyPhase === 'II') {
    if (isOncology) {
      return {
        type: 'response_rate',
        baseline: 0.10, // 10% baseline response rate
        target: 0.25,   // 25% target response rate
      };
    } else {
      return {
        type: 'continuous',
        baseline: 0,
        target: 0.5,    // 0.5 effect size
        standardDeviation: 1.0
      };
    }
  }
  
  if (studyPhase === 'III') {
    if (isOncology) {
      return {
        type: 'survival',
        baseline: 12,   // 12 month median survival
        target: 18,     // 18 month target survival
        hazardRatio: 0.67 // 33% reduction in hazard
      };
    } else {
      return {
        type: 'continuous',
        baseline: 0,
        target: 0.3,    // 0.3 effect size for phase III
        standardDeviation: 1.0
      };
    }
  }
  
  if (studyPhase === 'IV') {
    return {
      type: 'safety',
      baseline: 0.05, // 5% baseline adverse event rate
      target: 0.10,   // 10% target detection rate
    };
  }
  
  // Default for 'any' phase
  return {
    type: isOncology ? 'response_rate' : 'continuous',
    baseline: isOncology ? 0.15 : 0,
    target: isOncology ? 0.30 : 0.4,
    standardDeviation: isOncology ? undefined : 1.0
  };
}

function getStatisticalParameters(studyPhase: string, isOncology: boolean): StatisticalParameters {
  const baseParams = {
    alpha: 0.05,
    beta: 0.20,
    power: 0.80,
    allocation: 1,
    dropoutRate: 0.15
  };
  
  switch (studyPhase) {
    case 'I':
      return {
        ...baseParams,
        beta: 0.30,
        power: 0.70,
        dropoutRate: 0.10,
        effectSize: 0.8 // Large effect size for phase I
      };
    
    case 'II':
      return {
        ...baseParams,
        beta: 0.20,
        power: 0.80,
        dropoutRate: isOncology ? 0.20 : 0.15,
        effectSize: isOncology ? 0.6 : 0.5
      };
    
    case 'III':
      return {
        ...baseParams,
        beta: 0.10,
        power: 0.90,
        dropoutRate: isOncology ? 0.25 : 0.20,
        effectSize: isOncology ? 0.3 : 0.3
      };
    
    case 'IV':
      return {
        ...baseParams,
        beta: 0.20,
        power: 0.80,
        dropoutRate: 0.30, // Higher dropout in post-market studies
        effectSize: 0.4
      };
    
    default:
      return {
        ...baseParams,
        effectSize: 0.5
      };
  }
}

function calculateSurvivalSampleSize(
  endpoint: EndpointParameters, 
  params: StatisticalParameters
): { sampleSize: number; analysis: string } {
  
  const hazardRatio = endpoint.hazardRatio || 0.75;
  const medianSurvival = endpoint.baseline;
  const targetSurvival = endpoint.target;
  
  // Logrank test sample size calculation
  // N = (Z_α/2 + Z_β)² × 4 / (ln(HR))²
  const zAlpha = 1.96; // For α = 0.05, two-sided
  const zBeta = params.power === 0.80 ? 0.84 : (params.power === 0.90 ? 1.28 : 0.84);
  
  const logHR = Math.log(hazardRatio);
  const requiredEvents = Math.pow(zAlpha + zBeta, 2) * 4 / Math.pow(logHR, 2);
  
  // Assume 70% of patients will have events by analysis
  const eventRate = 0.70;
  let sampleSize = requiredEvents / eventRate;
  
  // Adjust for dropout
  sampleSize = sampleSize / (1 - params.dropoutRate);
  
  const analysis = `Survival analysis targeting HR=${hazardRatio.toFixed(2)} (${medianSurvival} to ${targetSurvival} months median survival). Requires ${Math.round(requiredEvents)} events with ${(eventRate * 100).toFixed(0)}% event rate. Power ${(params.power * 100).toFixed(0)}%, α=${params.alpha.toFixed(2)}.`;
  
  return { sampleSize, analysis };
}

function calculateResponseRateSampleSize(
  endpoint: EndpointParameters, 
  params: StatisticalParameters
): { sampleSize: number; analysis: string } {
  
  const p1 = endpoint.baseline; // Control response rate
  const p2 = endpoint.target;   // Treatment response rate
  
  // Two-proportion z-test sample size
  const zAlpha = 1.96;
  const zBeta = params.power === 0.80 ? 0.84 : (params.power === 0.90 ? 1.28 : 0.84);
  
  const pooledP = (p1 + p2) / 2;
  const numerator = Math.pow(zAlpha * Math.sqrt(2 * pooledP * (1 - pooledP)) + 
                           zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2);
  const denominator = Math.pow(p2 - p1, 2);
  
  let sampleSize = numerator / denominator;
  
  // For single-arm studies (common in phase II), use different formula
  if (params.allocation === 1) {
    const singleArmNum = Math.pow(zAlpha * Math.sqrt(p1 * (1 - p1)) + 
                                 zBeta * Math.sqrt(p2 * (1 - p2)), 2);
    sampleSize = singleArmNum / Math.pow(p2 - p1, 2);
  }
  
  // Adjust for dropout
  sampleSize = sampleSize / (1 - params.dropoutRate);
  
  const analysis = `Response rate comparison: ${(p1 * 100).toFixed(0)}% baseline vs ${(p2 * 100).toFixed(0)}% target. Power ${(params.power * 100).toFixed(0)}%, α=${params.alpha.toFixed(2)}. ${params.allocation === 1 ? 'Single-arm' : 'Two-arm'} design.`;
  
  return { sampleSize, analysis };
}

function calculateContinuousSampleSize(
  endpoint: EndpointParameters, 
  params: StatisticalParameters
): { sampleSize: number; analysis: string } {
  
  const effectSize = params.effectSize;
  const sd = endpoint.standardDeviation || 1.0;
  
  // Two-sample t-test sample size
  const zAlpha = 1.96;
  const zBeta = params.power === 0.80 ? 0.84 : (params.power === 0.90 ? 1.28 : 0.84);
  
  let sampleSize = 2 * Math.pow((zAlpha + zBeta) * sd / (effectSize * sd), 2);
  
  // Adjust for allocation ratio
  if (params.allocation !== 1) {
    sampleSize = sampleSize * (1 + 1/params.allocation) * params.allocation / 4;
  }
  
  // Adjust for dropout
  sampleSize = sampleSize / (1 - params.dropoutRate);
  
  const analysis = `Continuous endpoint with effect size ${effectSize.toFixed(2)} (Cohen's d). Standard deviation ${sd.toFixed(1)}. Power ${(params.power * 100).toFixed(0)}%, α=${params.alpha.toFixed(2)}.`;
  
  return { sampleSize, analysis };
}

function calculateSafetySampleSize(
  endpoint: EndpointParameters, 
  params: StatisticalParameters
): { sampleSize: number; analysis: string } {
  
  const baselineRate = endpoint.baseline;
  const targetDetectionRate = endpoint.target;
  
  // Safety analysis often uses rule of 3 or precision-based calculations
  // For rare events: N = 3 / p (to rule out events with 95% confidence)
  let sampleSize = 3 / baselineRate;
  
  // For detection of specific rates, use binomial confidence intervals
  if (targetDetectionRate > baselineRate) {
    // Sample size to detect increase in adverse events
    const zAlpha = 1.96;
    sampleSize = Math.pow(zAlpha, 2) * targetDetectionRate * (1 - targetDetectionRate) / 
                 Math.pow(targetDetectionRate - baselineRate, 2);
  }
  
  // Minimum safety population
  sampleSize = Math.max(sampleSize, 100);
  
  // Adjust for dropout
  sampleSize = sampleSize / (1 - params.dropoutRate);
  
  const analysis = `Safety analysis for events occurring at ${(baselineRate * 100).toFixed(1)}% baseline rate. Designed to detect ${(targetDetectionRate * 100).toFixed(1)}% rate with 95% confidence.`;
  
  return { sampleSize, analysis };
}

function calculateBiomarkerSampleSize(
  endpoint: EndpointParameters, 
  params: StatisticalParameters
): { sampleSize: number; analysis: string } {
  
  // Biomarker studies often use correlation or regression analysis
  const effectSize = params.effectSize;
  const zAlpha = 1.96;
  const zBeta = params.power === 0.80 ? 0.84 : (params.power === 0.90 ? 1.28 : 0.84);
  
  // For correlation studies: N = (Z_α + Z_β)² / (0.5 × ln((1+r)/(1-r)))² + 3
  const r = effectSize; // Expected correlation coefficient
  const fisherZ = 0.5 * Math.log((1 + r) / (1 - r));
  let sampleSize = Math.pow(zAlpha + zBeta, 2) / Math.pow(fisherZ, 2) + 3;
  
  // Minimum for biomarker validation
  sampleSize = Math.max(sampleSize, 50);
  
  // Adjust for dropout
  sampleSize = sampleSize / (1 - params.dropoutRate);
  
  const analysis = `Biomarker validation study with expected correlation r=${r.toFixed(2)}. Power ${(params.power * 100).toFixed(0)}%, α=${params.alpha.toFixed(2)}.`;
  
  return { sampleSize, analysis };
}

function getDefaultSampleSize(studyPhase: string, isOncology: boolean): number {
  const defaults = {
    'I': isOncology ? 30 : 40,
    'II': isOncology ? 120 : 150,
    'III': isOncology ? 600 : 800,
    'IV': isOncology ? 1000 : 1200,
    'any': isOncology ? 300 : 400
  };
  
  return defaults[studyPhase as keyof typeof defaults] || 200;
}

function adjustForStudyCharacteristics(
  baseSampleSize: number, 
  concept: Partial<StudyConcept>, 
  requestData: any
): number {
  let adjustedSize = baseSampleSize;
  
  // Adjust for target subpopulation (reduces available population)
  if (concept.targetSubpopulation) {
    adjustedSize *= 1.25; // 25% increase for subpopulation studies
  }
  
  // Adjust for geography complexity
  const geographyCount = concept.geography?.length || 1;
  if (geographyCount > 3) {
    adjustedSize *= 1.1; // 10% increase for multi-regional studies
  }
  
  // Adjust for strategic goals requiring larger populations
  const strategicGoals = concept.strategicGoals || [];
  if (strategicGoals.includes('generate_real_world_evidence')) {
    adjustedSize *= 2.0; // Real-world evidence requires larger populations
  }
  
  if (strategicGoals.includes('validate_biomarker')) {
    adjustedSize *= 1.3; // Biomarker validation needs larger populations
  }
  
  // Adjust for budget constraints
  if (requestData.budgetCeilingEur) {
    const estimatedCostPerPatient = 25000; // Rough estimate
    const maxAffordableSize = requestData.budgetCeilingEur / estimatedCostPerPatient;
    if (adjustedSize > maxAffordableSize) {
      adjustedSize = maxAffordableSize * 0.8; // 80% of maximum affordable
    }
  }
  
  return adjustedSize;
}

function generateSampleSizeJustification(
  sampleSize: number,
  studyPhase: string,
  endpoint: EndpointParameters,
  parameters: StatisticalParameters,
  isOncology: boolean,
  concept: Partial<StudyConcept>
): string {
  
  const phaseDescriptions = {
    'I': 'safety and dose-escalation',
    'II': 'efficacy signal detection and dose optimization',
    'III': 'confirmatory efficacy and safety',
    'IV': 'post-market safety and real-world effectiveness'
  };
  
  const endpointDescriptions = {
    'survival': 'overall survival',
    'response_rate': 'objective response rate',
    'continuous': 'continuous efficacy endpoint',
    'safety': 'safety and tolerability',
    'biomarker': 'biomarker validation'
  };
  
  let justification = `Sample size of ${sampleSize} patients calculated for Phase ${studyPhase} `;
  justification += `${phaseDescriptions[studyPhase as keyof typeof phaseDescriptions] || 'clinical'} study `;
  justification += `with ${endpointDescriptions[endpoint.type]} as primary endpoint. `;
  
  justification += `Statistical assumptions: ${(parameters.power * 100).toFixed(0)}% power, `;
  justification += `α=${parameters.alpha.toFixed(2)} (two-sided), `;
  justification += `${(parameters.dropoutRate * 100).toFixed(0)}% dropout rate. `;
  
  if (endpoint.type === 'survival' && endpoint.hazardRatio) {
    justification += `Designed to detect hazard ratio of ${endpoint.hazardRatio.toFixed(2)} `;
    justification += `(${endpoint.baseline} to ${endpoint.target} months median survival). `;
  } else if (endpoint.type === 'response_rate') {
    justification += `Designed to detect improvement from ${(endpoint.baseline * 100).toFixed(0)}% `;
    justification += `to ${(endpoint.target * 100).toFixed(0)}% response rate. `;
  } else if (endpoint.type === 'continuous') {
    justification += `Designed to detect effect size of ${parameters.effectSize.toFixed(2)} (Cohen's d). `;
  }
  
  if (concept.targetSubpopulation) {
    justification += `Sample size increased by 25% to account for targeted subpopulation enrollment challenges. `;
  }
  
  if (isOncology) {
    justification += `Oncology-specific considerations include higher dropout rates and complex endpoint assessment.`;
  }
  
  return justification;
}