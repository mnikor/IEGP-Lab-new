import { StudyConcept } from "@shared/schema";

/**
 * Study design characteristics
 */
interface StudyDesign {
  numberOfArms: number;   // Total number of study arms
  armRatio: number[];     // Allocation ratio (e.g. [1,1] for 1:1, [2,1] for 2:1)
  isBlinded: boolean;     // Whether study is blinded
  isRandomized: boolean;  // Whether study is randomized
  comparatorType: 'placebo' | 'active' | 'historical' | 'none';
}

/**
 * Statistical parameters for sample size calculations
 */
interface StatisticalParameters {
  alpha: number;          // Type I error rate (typically 0.05)
  beta: number;           // Type II error rate (typically 0.1 or 0.2)
  power: number;          // Statistical power (1 - beta)
  effectSize: number;     // Expected effect size
  dropoutRate: number;    // Expected dropout rate
  allocation: number;     // Allocation ratio for calculations
  studyDesign: StudyDesign; // Study design characteristics
}

/**
 * Endpoint types with their typical parameters
 */
interface EndpointParameters {
  type: 'survival' | 'response_rate' | 'continuous' | 'safety' | 'biomarker' | 'rwe_effectiveness' | 'rwe_safety' | 'registry' | 'real_world_outcomes';
  baseline: number;       // Baseline rate/value
  target: number;         // Target improvement
  standardDeviation?: number; // For continuous endpoints
  hazardRatio?: number;   // For survival endpoints
  prevalence?: number;    // For rare event detection
  precision?: number;     // For precision-based calculations
  clinicalSignificance?: number; // Minimum clinically important difference
}

/**
 * Dynamically determines study design based on concept parameters
 */
function determineStudyDesign(concept: Partial<StudyConcept>, studyPhase: string): StudyDesign {
  const title = concept.title || '';
  const picoData = concept.picoData as any;
  const comparatorDrugs = concept.comparatorDrugs || [];
  const strategicGoals = concept.strategicGoals || [];
  
  // Determine number of arms and comparator type
  let numberOfArms = 1;
  let comparatorType: 'placebo' | 'active' | 'historical' | 'none' = 'none';
  let armRatio: number[] = [1];
  
  // Check for comparator information in title and PICO data
  const titleLower = title.toLowerCase();
  const comparatorText = picoData?.comparator || '';
  const comparatorLower = comparatorText.toLowerCase();
  
  // Detect study design from title patterns
  if (titleLower.includes('versus') || titleLower.includes(' vs ') || titleLower.includes(' vs.')) {
    numberOfArms = 2;
    armRatio = [1, 1]; // 1:1 randomization
    comparatorType = titleLower.includes('placebo') ? 'placebo' : 'active';
  } else if (titleLower.includes('three-arm') || titleLower.includes('3-arm')) {
    numberOfArms = 3;
    armRatio = [1, 1, 1]; // 1:1:1 randomization
    comparatorType = 'active';
  } else if (comparatorDrugs.length > 0) {
    numberOfArms = 2 + comparatorDrugs.length;
    armRatio = Array(numberOfArms).fill(1);
    comparatorType = 'active';
  }
  
  // Check comparator description for design clues
  if (comparatorLower.includes('placebo') || comparatorLower.includes('sham')) {
    comparatorType = 'placebo';
    if (numberOfArms === 1) numberOfArms = 2;
  } else if (comparatorLower.includes('standard of care') || comparatorLower.includes('best supportive care')) {
    comparatorType = 'active';
    if (numberOfArms === 1) numberOfArms = 2;
  } else if (comparatorLower.includes('historical') || comparatorLower.includes('retrospective')) {
    comparatorType = 'historical';
    numberOfArms = 1;
  }
  
  // Phase-specific design adjustments
  switch (studyPhase) {
    case 'I':
      // Phase I studies are typically single-arm dose escalation
      numberOfArms = 1;
      comparatorType = 'historical';
      armRatio = [1];
      break;
    
    case 'II':
      // Phase II can be single or two-arm
      if (numberOfArms === 1 && comparatorType === 'none') {
        // Default to single-arm for Phase II unless comparator specified
        comparatorType = 'historical';
      }
      break;
    
    case 'III':
      // Phase III should be randomized controlled trials
      if (numberOfArms === 1) {
        numberOfArms = 2;
        armRatio = [1, 1];
        comparatorType = comparatorType === 'none' ? 'active' : comparatorType;
      }
      break;
    
    case 'IV':
      // Phase IV post-marketing studies often single-arm
      if (numberOfArms === 1) {
        comparatorType = 'historical';
      }
      break;
  }
  
  // Determine if study is blinded and randomized
  const isBlinded = studyPhase === 'III' && comparatorType === 'placebo';
  const isRandomized = numberOfArms > 1 && comparatorType !== 'historical';
  
  return {
    numberOfArms,
    armRatio,
    isBlinded,
    isRandomized,
    comparatorType
  };
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
  
  // Dynamically determine study design
  const studyDesign = determineStudyDesign(concept, studyPhase);
  
  // Determine primary endpoint type based on phase and indication
  const endpoint = determineEndpoint(studyPhase, isOncology, strategicGoals, concept);
  
  // Set statistical parameters based on phase and study design
  const parameters = getStatisticalParameters(studyPhase, isOncology, studyDesign);
  
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
    
    case 'rwe_effectiveness':
      const rweEffectivenessCalc = calculateRWEEffectivenessSampleSize(endpoint, parameters);
      sampleSize = rweEffectivenessCalc.sampleSize;
      powerAnalysis = rweEffectivenessCalc.analysis;
      break;
    
    case 'rwe_safety':
      const rweSafetyCalc = calculateRWESafetySampleSize(endpoint, parameters);
      sampleSize = rweSafetyCalc.sampleSize;
      powerAnalysis = rweSafetyCalc.analysis;
      break;
    
    case 'registry':
      const registryCalc = calculateRegistrySampleSize(endpoint, parameters);
      sampleSize = registryCalc.sampleSize;
      powerAnalysis = registryCalc.analysis;
      break;
    
    case 'real_world_outcomes':
      const realWorldCalc = calculateRealWorldOutcomesSampleSize(endpoint, parameters);
      sampleSize = realWorldCalc.sampleSize;
      powerAnalysis = realWorldCalc.analysis;
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
  strategicGoals: string[],
  concept?: Partial<StudyConcept>
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
      // Add study-specific variability for Phase III non-oncology studies
      const studyTitle = concept?.title || '';
      const picoData = concept?.picoData as any;
      const studyDesign = picoData?.intervention || '';
      const targetSubpopulation = concept?.targetSubpopulation || '';
      const comparatorDrugs = concept?.comparatorDrugs || [];
      
      // Vary effect size based on study characteristics
      let effectSize = 0.3; // Base effect size
      let standardDeviation = 1.0;
      
      // Combination therapy studies typically show larger effects
      if (studyTitle.toLowerCase().includes('combination') || 
          studyDesign.toLowerCase().includes('combination') ||
          comparatorDrugs.length > 0) {
        effectSize = 0.4; // Larger effect size for combination studies
      }
      
      // Biologic-experienced populations are harder to treat (smaller effect)
      if (studyTitle.toLowerCase().includes('experienced') || 
          studyTitle.toLowerCase().includes('refractory') ||
          targetSubpopulation.toLowerCase().includes('experienced')) {
        effectSize = 0.25; // Smaller effect size for difficult populations
        standardDeviation = 1.2; // Higher variability
      }
      
      // Early intervention studies may show different responses
      if (studyTitle.toLowerCase().includes('early') || 
          studyTitle.toLowerCase().includes('mild') ||
          targetSubpopulation.toLowerCase().includes('early')) {
        effectSize = 0.35; // Moderate effect size for early intervention
        standardDeviation = 0.9; // Lower variability in less severe patients
      }
      
      // Head-to-head comparisons need to detect smaller differences
      if (studyTitle.toLowerCase().includes('head-to-head') ||
          studyTitle.toLowerCase().includes('versus') ||
          studyTitle.toLowerCase().includes('vs.')) {
        effectSize = 0.2; // Smaller effect size for active comparator studies
      }
      
      // Studies targeting specific biomarkers or mechanisms
      if (strategicGoals.includes('validate_biomarker') ||
          studyTitle.toLowerCase().includes('biomarker') ||
          targetSubpopulation.includes('positive')) {
        effectSize = 0.45; // Larger effect in biomarker-selected populations
        standardDeviation = 0.8; // Less variability in selected populations
      }
      
      return {
        type: 'continuous',
        baseline: 0,
        target: effectSize,
        standardDeviation: standardDeviation
      };
    }
  }
  
  if (studyPhase === 'IV') {
    // Phase IV studies - determine endpoint based on study objectives
    const studyTitle = concept?.title || '';
    const studyTitleLower = studyTitle.toLowerCase();
    
    // Real-world evidence studies
    if (strategicGoals.includes('generate_real_world_evidence') || 
        studyTitleLower.includes('real-world') || 
        studyTitleLower.includes('registry') ||
        studyTitleLower.includes('rwe') ||
        studyTitleLower.includes('observational')) {
      
      if (isOncology) {
        // Oncology RWE - typically survival or progression endpoints
        return {
          type: 'rwe_effectiveness',
          baseline: 12,    // 12 months median survival/PFS
          target: 15,      // 15 months target (25% improvement)
          hazardRatio: 0.80, // More conservative than RCT
          precision: 0.1   // ±10% precision around estimate
        };
      } else {
        // Non-oncology RWE - typically effectiveness or QoL outcomes
        return {
          type: 'real_world_outcomes',
          baseline: 0,
          target: 0.3,     // 30% improvement in outcome measure
          standardDeviation: 1.2, // Higher variability in real-world setting
          precision: 0.15  // ±15% precision
        };
      }
    }
    
    // Safety surveillance studies
    if (studyTitleLower.includes('safety') || 
        studyTitleLower.includes('surveillance') ||
        studyTitleLower.includes('adverse') ||
        strategicGoals.includes('safety_monitoring')) {
      
      // Determine baseline AE rate based on indication
      let baselineAE = 0.05; // 5% default
      let targetDetection = 0.10; // Detect 10% rate
      
      if (isOncology) {
        baselineAE = 0.15; // 15% for oncology drugs
        targetDetection = 0.25; // Detect 25% rate
      } else if (studyTitleLower.includes('rare') || studyTitleLower.includes('serious')) {
        baselineAE = 0.01; // 1% for rare serious events
        targetDetection = 0.03; // Detect 3% rate
      }
      
      return {
        type: 'rwe_safety',
        baseline: baselineAE,
        target: targetDetection,
        prevalence: baselineAE,
        precision: baselineAE * 0.5 // Precision = 50% of baseline rate
      };
    }
    
    // Registry studies for rare diseases or long-term outcomes
    if (studyTitleLower.includes('registry') || 
        studyTitleLower.includes('rare') ||
        studyTitleLower.includes('long-term') ||
        studyTitleLower.includes('natural history')) {
      
      return {
        type: 'registry',
        baseline: 0.1,   // 10% baseline event rate
        target: 0.15,    // 15% detectable difference
        prevalence: 0.1, // Disease/event prevalence
        precision: 0.03  // ±3% precision around prevalence estimate
      };
    }
    
    // Default Phase IV safety study
    return {
      type: 'safety',
      baseline: isOncology ? 0.15 : 0.05,
      target: isOncology ? 0.25 : 0.10,
      prevalence: isOncology ? 0.15 : 0.05,
      precision: isOncology ? 0.05 : 0.02
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

function getStatisticalParameters(studyPhase: string, isOncology: boolean, studyDesign: StudyDesign): StatisticalParameters {
  // Calculate allocation ratio for statistical calculations
  const totalRatio = studyDesign.armRatio.reduce((sum, ratio) => sum + ratio, 0);
  const allocationRatio = studyDesign.numberOfArms > 1 ? totalRatio / studyDesign.numberOfArms : 1;
  
  const baseParams = {
    alpha: 0.05,
    beta: 0.20,
    power: 0.80,
    allocation: allocationRatio,
    dropoutRate: 0.15,
    studyDesign: studyDesign
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
        effectSize: studyDesign.comparatorType === 'placebo' ? 
          (isOncology ? 0.4 : 0.5) : // Larger effect vs placebo
          (isOncology ? 0.25 : 0.3) // Smaller effect vs active comparator
      };
    
    case 'IV':
      // Phase IV studies have different statistical requirements
      if (baseParams.studyDesign.comparatorType === 'historical') {
        // Single-arm RWE studies - less stringent requirements
        return {
          ...baseParams,
          beta: 0.30,
          power: 0.70, // Lower power acceptable for exploratory RWE
          dropoutRate: 0.40, // Higher dropout/loss to follow-up in real-world
          effectSize: 0.3 // More conservative effect size expectations
        };
      } else {
        // Comparative RWE studies
        return {
          ...baseParams,
          beta: 0.20,
          power: 0.80,
          dropoutRate: 0.35, // Higher dropout than RCTs but lower than single-arm
          effectSize: 0.25 // Small effect sizes in real-world comparisons
        };
      }
    
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
  
  // Adjust sample size based on study design
  const studyDesign = params.studyDesign;
  
  if (studyDesign.numberOfArms === 1) {
    // Single-arm study (historical comparison)
    const singleArmNum = Math.pow(zAlpha * Math.sqrt(p1 * (1 - p1)) + 
                                 zBeta * Math.sqrt(p2 * (1 - p2)), 2);
    sampleSize = singleArmNum / Math.pow(p2 - p1, 2);
  } else {
    // Multi-arm randomized study
    const totalArms = studyDesign.numberOfArms;
    const armRatioSum = studyDesign.armRatio.reduce((sum, ratio) => sum + ratio, 0);
    sampleSize = sampleSize * (armRatioSum / 2); // Adjust for total sample across all arms
  }
  
  // Adjust for dropout
  sampleSize = sampleSize / (1 - params.dropoutRate);
  
  const designType = studyDesign.numberOfArms === 1 ? 
    `Single-arm (${studyDesign.comparatorType} control)` : 
    `${studyDesign.numberOfArms}-arm randomized (${studyDesign.armRatio.join(':')} allocation)`;
  
  const analysis = `Response rate comparison: ${(p1 * 100).toFixed(0)}% baseline vs ${(p2 * 100).toFixed(0)}% target. Power ${(params.power * 100).toFixed(0)}%, α=${params.alpha.toFixed(2)}. ${designType} design with ${studyDesign.comparatorType} comparator.`;
  
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
  
  // Adjust for study design
  const studyDesign = params.studyDesign;
  
  if (studyDesign.numberOfArms > 1) {
    // Multi-arm study - calculate total sample across all arms
    const armRatioSum = studyDesign.armRatio.reduce((sum, ratio) => sum + ratio, 0);
    sampleSize = sampleSize * armRatioSum / 2; // Adjust for all arms in the study
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

function calculateRWEEffectivenessSampleSize(
  endpoint: EndpointParameters, 
  params: StatisticalParameters
): { sampleSize: number; analysis: string } {
  
  // For RWE effectiveness studies - simplified approach for real-world settings
  const hazardRatio = endpoint.hazardRatio || 0.80; // More conservative than RCT
  const precision = endpoint.precision || 0.1; // ±10% precision
  
  // For RWE studies, use simple logrank-based calculation
  // but with more conservative parameters
  const zAlpha = 1.96; // 95% confidence interval
  const zBeta = params.power === 0.70 ? 0.52 : 0.84; // Lower power for RWE
  
  // Simplified event-based calculation for RWE
  const logHR = Math.log(hazardRatio);
  const requiredEvents = Math.pow(zAlpha + zBeta, 2) * 4 / Math.pow(logHR, 2);
  
  // In RWE studies, assume 50% event rate (more conservative)
  const eventRate = 0.50;
  let sampleSize = requiredEvents / eventRate;
  
  // Adjust for real-world loss to follow-up (40%)
  const lossToFollowUp = 0.40;
  sampleSize = sampleSize / (1 - lossToFollowUp);
  
  // Reasonable range for RWE effectiveness studies
  sampleSize = Math.max(500, Math.min(sampleSize, 2000));
  
  const analysisTime = endpoint.baseline;
  const targetTime = endpoint.target;
  const analysis = `Real-world effectiveness study comparing ${targetTime}-month vs ${analysisTime}-month outcomes. Target HR≤${hazardRatio.toFixed(2)}, ${Math.round(requiredEvents)} events needed, ${(eventRate*100).toFixed(0)}% event rate assumed. Accounts for ${(lossToFollowUp*100).toFixed(0)}% real-world loss to follow-up.`;
  
  return { sampleSize, analysis };
}

function calculateRWESafetySampleSize(
  endpoint: EndpointParameters, 
  params: StatisticalParameters
): { sampleSize: number; analysis: string } {
  
  const baselineRate = endpoint.baseline;
  const targetRate = endpoint.target;
  const precision = endpoint.precision || (baselineRate * 0.5);
  
  // For safety surveillance - precision-based calculation
  // N = (Z_α/2)² × p × (1-p) / precision²
  const zAlpha = 1.96;
  let sampleSize = Math.pow(zAlpha, 2) * baselineRate * (1 - baselineRate) / Math.pow(precision, 2);
  
  // Rule of 3 for rare events (if we want to rule out events occurring at 3x baseline rate)
  const ruleOf3Size = 3 / baselineRate;
  
  // Use larger of precision-based or rule-of-3
  sampleSize = Math.max(sampleSize, ruleOf3Size);
  
  // For detecting differences between rates (if target > baseline)
  if (targetRate > baselineRate) {
    const differenceDetection = 2 * Math.pow(zAlpha, 2) * 
      (baselineRate * (1 - baselineRate) + targetRate * (1 - targetRate)) / 
      Math.pow(targetRate - baselineRate, 2);
    sampleSize = Math.max(sampleSize, differenceDetection);
  }
  
  // Adjust for real-world data completeness (85% data quality)
  sampleSize = sampleSize / 0.85;
  
  // Minimum for safety studies
  sampleSize = Math.max(sampleSize, 1000);
  
  const analysis = `Real-world safety surveillance for events at ${(baselineRate*100).toFixed(1)}% baseline rate. Precision ±${(precision*100).toFixed(1)}%, with 95% confidence to rule out rates ≥${(targetRate*100).toFixed(1)}%. Adjusted for 85% real-world data completeness.`;
  
  return { sampleSize, analysis };
}

function calculateRegistrySampleSize(
  endpoint: EndpointParameters, 
  params: StatisticalParameters
): { sampleSize: number; analysis: string } {
  
  const prevalence = endpoint.prevalence || 0.1;
  const precision = endpoint.precision || 0.03;
  
  // Registry studies - precision around prevalence estimate
  // N = (Z_α/2)² × p × (1-p) / precision²
  const zAlpha = 1.96;
  let sampleSize = Math.pow(zAlpha, 2) * prevalence * (1 - prevalence) / Math.pow(precision, 2);
  
  // For rare diseases, ensure adequate number of cases
  const minimumCases = 100; // At least 100 cases
  const minimumSampleForCases = minimumCases / prevalence;
  sampleSize = Math.max(sampleSize, minimumSampleForCases);
  
  // Adjust for enrollment over time (registry studies often have incomplete enrollment)
  const enrollmentEfficiency = 0.70; // 70% of targeted population enrolls
  sampleSize = sampleSize / enrollmentEfficiency;
  
  // Long-term studies need buffer for loss to follow-up
  const longTermFollowUp = 0.40; // 40% loss over long-term follow-up
  sampleSize = sampleSize / (1 - longTermFollowUp);
  
  const analysis = `Registry study for ${(prevalence*100).toFixed(1)}% prevalence condition. Precision ±${(precision*100).toFixed(1)}% around prevalence estimate. Minimum ${minimumCases} cases required. Accounts for ${(enrollmentEfficiency*100).toFixed(0)}% enrollment efficiency and ${(longTermFollowUp*100).toFixed(0)}% long-term loss to follow-up.`;
  
  return { sampleSize, analysis };
}

function calculateRealWorldOutcomesSampleSize(
  endpoint: EndpointParameters, 
  params: StatisticalParameters
): { sampleSize: number; analysis: string } {
  
  const effectSize = params.effectSize || 0.3; // Reasonable RWE effect size
  const sd = endpoint.standardDeviation || 1.2; // Higher variability in real-world
  const precision = endpoint.precision || 0.15;
  
  // Simplified calculation for RWE continuous outcomes
  const zAlpha = 1.96;
  const zBeta = params.power === 0.70 ? 0.52 : 0.84; // Lower power for RWE
  
  // Standard two-sample t-test calculation
  let sampleSize = 2 * Math.pow((zAlpha + zBeta) * sd / effectSize, 2);
  
  // Adjust for real-world data challenges (conservative)
  const dataCompletenessRate = 0.75; // 75% complete data in real-world
  const confoundingAdjustment = 1.20; // 20% increase for confounding adjustment
  
  sampleSize = sampleSize / dataCompletenessRate * confoundingAdjustment;
  
  // Cap at reasonable range for RWE studies
  sampleSize = Math.max(500, Math.min(sampleSize, 1500));
  
  const analysis = `Real-world outcomes study targeting ${effectSize.toFixed(2)} effect size (SD=${sd.toFixed(1)}). Power ${(params.power*100).toFixed(0)}%, adjusted for ${(dataCompletenessRate*100).toFixed(0)}% data completeness and ${((confoundingAdjustment-1)*100).toFixed(0)}% confounding buffer.`;
  
  return { sampleSize, analysis };
}

function getDefaultSampleSize(studyPhase: string, isOncology: boolean): number {
  const defaults = {
    'I': isOncology ? 30 : 40,
    'II': isOncology ? 120 : 150,
    'II/III adaptive': isOncology ? 350 : 450,
    'III': isOncology ? 600 : 800,
    'IV': isOncology ? 1000 : 1200,
    'any': isOncology ? 300 : 400
  };
  
  return defaults[studyPhase as keyof typeof defaults] || defaults['any'];
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
    'biomarker': 'biomarker validation',
    'rwe_effectiveness': 'real-world effectiveness',
    'rwe_safety': 'real-world safety surveillance',
    'registry': 'disease registry and natural history',
    'real_world_outcomes': 'real-world patient outcomes'
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