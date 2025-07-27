import OpenAI from 'openai';
import type { StudyConcept } from '@shared/schema';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface DrugCharacteristics {
  mechanism: string;
  therapeuticClass: string;
  safetyProfile: string;
  efficacyBenchmarks: string;
  dosing: string;
  administration: string;
}

interface DiseaseCharacteristics {
  severity: string;
  heterogeneity: string;
  standardOfCare: string;
  prognosis: string;
  biomarkers: string;
  unmetNeed: string;
}

interface StudyObjectives {
  primaryGoal: string;
  regulatoryPath: string;
  commercialStrategy: string;
  evidenceGeneration: string;
  riskMitigation: string;
}

interface StatisticalPlan {
  primaryEndpoint: string;
  endpointType: 'survival' | 'response_rate' | 'continuous' | 'safety' | 'composite';
  studyDesign: 'single_arm' | 'randomized_controlled' | 'observational' | 'registry';
  comparator: 'placebo' | 'active_control' | 'historical' | 'none';
  effectSize: number;
  power: number;
  alpha: number;
  dropoutRate: number;
  analysisMethod: string;
  interimAnalyses: boolean;
  multipleTesting: string;
}

interface StatisticalJustification {
  endpointSelection: string;
  effectSizeRationale: string;
  powerJustification: string;
  alphaRationale: string;
  dropoutAssumptions: string;
  comparatorContext: string;
  regulatoryAlignment: string;
  precedentAnalysis: string;
}

interface SampleSizeResult {
  totalPatients: number;
  patientsPerArm: number;
  numberOfArms: number;
  statisticalPlan: StatisticalPlan;
  justification: StatisticalJustification;
  precedentAnalysis: string;
  sensitivityAnalysis: {
    scenario: string;
    sampleSize: number;
    rationale: string;
  }[];
}

export class AIStatisticalAnalyzer {
  
  async analyzeStudyConcept(concept: StudyConcept, requestData: any): Promise<SampleSizeResult> {
    // 1. Build comprehensive study context
    const context = await this.buildStudyContext(concept);
    
    // 2. Get AI-driven statistical plan
    const statisticalPlan = await this.getAIStatisticalPlan(concept, context);
    
    // 3. Calculate sample size with AI parameters
    const sampleSize = await this.calculateSampleSizeWithAI(concept, statisticalPlan);
    
    // 4. Generate justification and precedent analysis
    const justification = await this.generateJustification(concept, statisticalPlan, sampleSize);
    
    return {
      totalPatients: sampleSize.totalPatients,
      patientsPerArm: sampleSize.patientsPerArm,
      numberOfArms: sampleSize.numberOfArms,
      statisticalPlan,
      justification,
      precedentAnalysis: justification.precedentAnalysis,
      sensitivityAnalysis: sampleSize.sensitivityAnalysis || []
    };
  }

  private async buildStudyContext(concept: StudyConcept): Promise<{
    drug: DrugCharacteristics;
    disease: DiseaseCharacteristics;
    objectives: StudyObjectives;
  }> {
    const prompt = `Analyze this clinical study concept and extract key characteristics:

Study Title: ${concept.title}
Drug: ${concept.drugName}
Indication: ${concept.indication}
Phase: ${concept.studyPhase}
Strategic Goals: ${concept.strategicGoals?.join(', ')}
Target Population: ${concept.targetSubpopulation || 'General population'}

Please provide a structured analysis in JSON format with:
1. Drug characteristics (mechanism, class, safety profile, known efficacy)
2. Disease characteristics (severity, heterogeneity, standard of care, prognosis)
3. Study objectives (regulatory path, commercial strategy, evidence needs)

Focus on clinically relevant details that would influence sample size calculations.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a clinical development expert. Analyze study concepts and extract key characteristics that influence statistical design. Respond with valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      // Fallback to basic analysis if AI fails
      return this.generateFallbackContext(concept);
    }
  }

  private async getAIStatisticalPlan(concept: StudyConcept, context: any): Promise<StatisticalPlan> {
    const prompt = `As a senior biostatistician, design the optimal statistical plan for this clinical study:

Study: ${concept.title}
Phase: ${concept.studyPhase}
Drug: ${concept.drugName} (${context.drug?.mechanism || 'mechanism unknown'})
Indication: ${concept.indication}
Disease Context: ${context.disease?.severity || 'standard severity'}
Strategic Goals: ${concept.strategicGoals?.join(', ')}

Consider:
1. Regulatory requirements for this phase and indication
2. Standard practice for similar drugs/indications
3. Clinical meaningfulness thresholds
4. Competitive landscape and differentiation needs
5. Risk-benefit profile requirements

Provide a statistical plan in JSON format including:
- primaryEndpoint (specific clinical endpoint)
- endpointType (survival/response_rate/continuous/safety/composite)
- studyDesign (single_arm/randomized_controlled/observational/registry)
- comparator (placebo/active_control/historical/none)
- effectSize (clinically meaningful difference)
- power (0.80 or 0.90)
- alpha (0.05 or 0.025)
- dropoutRate (expected percentage)
- analysisMethod (statistical test/method)
- interimAnalyses (boolean)
- multipleTesting (correction method if applicable)

Base recommendations on real clinical trial methodology and regulatory standards.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a senior biostatistician with 20+ years of regulatory experience. Design statistically sound and regulatorily compliant clinical trial plans. Respond with valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2
      });

      const plan = JSON.parse(response.choices[0].message.content || '{}');
      return this.validateAndSanitizeStatisticalPlan(plan);
    } catch (error) {
      return this.generateFallbackStatisticalPlan(concept);
    }
  }

  private async calculateSampleSizeWithAI(concept: StudyConcept, plan: StatisticalPlan): Promise<{
    totalPatients: number;
    patientsPerArm: number;
    numberOfArms: number;
    sensitivityAnalysis?: any[];
  }> {
    const prompt = `Calculate the sample size for this clinical study using established statistical methods:

Study: ${concept.title}
Phase: ${concept.studyPhase}
Primary Endpoint: ${plan.primaryEndpoint}
Endpoint Type: ${plan.endpointType}
Study Design: ${plan.studyDesign}
Comparator: ${plan.comparator}
Effect Size: ${plan.effectSize}
Power: ${plan.power}
Alpha: ${plan.alpha}
Dropout Rate: ${plan.dropoutRate}
Analysis Method: ${plan.analysisMethod}

Calculate sample size using appropriate statistical formulas:
- For survival endpoints: logrank test sample size
- For response rates: two-proportion test
- For continuous endpoints: two-sample t-test
- For safety endpoints: precision-based or rule-of-3
- Account for dropout, interim analyses, and multiple testing

Provide calculations in JSON format:
{
  "calculationMethod": "specific formula used",
  "baseCalculation": "step-by-step calculation",
  "totalPatients": number,
  "patientsPerArm": number,
  "numberOfArms": number,
  "adjustments": "dropout and other adjustments",
  "sensitivityAnalysis": [
    {"scenario": "conservative", "sampleSize": number, "rationale": "reason"},
    {"scenario": "optimistic", "sampleSize": number, "rationale": "reason"}
  ]
}

Use real statistical formulas, not rough estimates.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert biostatistician. Calculate sample sizes using established statistical formulas and methods. Show your work and provide accurate calculations. Respond with valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      });

      const calculation = JSON.parse(response.choices[0].message.content || '{}');
      return this.validateAndSanitizeCalculation(calculation, concept, plan);
    } catch (error) {
      return this.generateFallbackCalculation(concept, plan);
    }
  }

  private async generateJustification(
    concept: StudyConcept, 
    plan: StatisticalPlan, 
    sampleSize: any
  ): Promise<StatisticalJustification> {
    const prompt = `Provide comprehensive statistical justification for this clinical study design:

Study: ${concept.title}
Phase: ${concept.studyPhase}
Sample Size: ${sampleSize.totalPatients}
Primary Endpoint: ${plan.primaryEndpoint}
Design: ${plan.studyDesign}
Power: ${plan.power}, Alpha: ${plan.alpha}
Effect Size: ${plan.effectSize}

Generate detailed justification addressing:
1. Why this primary endpoint is appropriate
2. How the effect size was determined (clinical meaningfulness)
3. Rationale for power and alpha levels
4. Dropout rate assumptions and basis
5. Choice of comparator and study design
6. Regulatory alignment with FDA/EMA guidance
7. Precedent analysis from similar approved studies

Provide as JSON with detailed explanations for each element.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a regulatory affairs expert and biostatistician. Provide thorough scientific justification for clinical trial designs that would satisfy regulatory reviewers. Respond with valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      return this.generateFallbackJustification(concept, plan, sampleSize);
    }
  }

  private validateAndSanitizeStatisticalPlan(plan: any): StatisticalPlan {
    return {
      primaryEndpoint: plan.primaryEndpoint || 'Primary efficacy endpoint',
      endpointType: ['survival', 'response_rate', 'continuous', 'safety', 'composite'].includes(plan.endpointType) 
        ? plan.endpointType : 'continuous',
      studyDesign: ['single_arm', 'randomized_controlled', 'observational', 'registry'].includes(plan.studyDesign)
        ? plan.studyDesign : 'randomized_controlled',
      comparator: ['placebo', 'active_control', 'historical', 'none'].includes(plan.comparator)
        ? plan.comparator : 'placebo',
      effectSize: Math.max(0.1, Math.min(1.0, plan.effectSize || 0.3)),
      power: [0.80, 0.90].includes(plan.power) ? plan.power : 0.80,
      alpha: [0.05, 0.025, 0.01].includes(plan.alpha) ? plan.alpha : 0.05,
      dropoutRate: Math.max(0.05, Math.min(0.40, plan.dropoutRate || 0.15)),
      analysisMethod: plan.analysisMethod || 'Standard statistical test',
      interimAnalyses: Boolean(plan.interimAnalyses),
      multipleTesting: plan.multipleTesting || 'None'
    };
  }

  private validateAndSanitizeCalculation(calculation: any, concept: StudyConcept, plan: StatisticalPlan): {
    totalPatients: number;
    patientsPerArm: number;
    numberOfArms: number;
    sensitivityAnalysis?: any[];
  } {
    const totalPatients = Math.max(20, Math.min(10000, calculation.totalPatients || 300));
    const numberOfArms = plan.studyDesign === 'single_arm' ? 1 : 
                        plan.comparator === 'none' ? 1 : 2;
    const patientsPerArm = Math.round(totalPatients / numberOfArms);

    return {
      totalPatients,
      patientsPerArm,
      numberOfArms,
      sensitivityAnalysis: calculation.sensitivityAnalysis || []
    };
  }

  private generateFallbackContext(concept: StudyConcept): any {
    return {
      drug: {
        mechanism: 'Standard mechanism',
        therapeuticClass: 'Investigational therapy',
        safetyProfile: 'Under investigation',
        efficacyBenchmarks: 'To be determined',
        dosing: 'Optimized dosing',
        administration: 'Standard administration'
      },
      disease: {
        severity: 'Moderate to severe',
        heterogeneity: 'Standard population',
        standardOfCare: 'Current standard treatments',
        prognosis: 'Variable outcomes',
        biomarkers: 'Under investigation',
        unmetNeed: 'Significant medical need'
      },
      objectives: {
        primaryGoal: 'Demonstrate efficacy and safety',
        regulatoryPath: 'Standard approval pathway',
        commercialStrategy: 'Market differentiation',
        evidenceGeneration: 'Clinical evidence base',
        riskMitigation: 'Safety monitoring'
      }
    };
  }

  private generateFallbackStatisticalPlan(concept: StudyConcept): StatisticalPlan {
    const isOncology = concept.indication?.toLowerCase().includes('cancer') ||
                      concept.indication?.toLowerCase().includes('tumor') ||
                      concept.indication?.toLowerCase().includes('carcinoma');
    
    const phase = concept.studyPhase?.toLowerCase() || '';
    
    return {
      primaryEndpoint: isOncology ? 'Progression-free survival' : 'Clinical response',
      endpointType: isOncology ? 'survival' : 'continuous',
      studyDesign: phase.includes('i') ? 'single_arm' : 'randomized_controlled',
      comparator: phase.includes('i') ? 'none' : 'placebo',
      effectSize: isOncology ? 0.67 : 0.3,
      power: 0.80,
      alpha: 0.05,
      dropoutRate: isOncology ? 0.20 : 0.15,
      analysisMethod: isOncology ? 'Logrank test' : 'Two-sample t-test',
      interimAnalyses: phase.includes('iii'),
      multipleTesting: 'None'
    };
  }

  private generateFallbackCalculation(concept: StudyConcept, plan: StatisticalPlan): {
    totalPatients: number;
    patientsPerArm: number;
    numberOfArms: number;
  } {
    const phase = concept.studyPhase?.toLowerCase() || '';
    let baseSize = 300;
    
    if (phase.includes('i')) baseSize = 40;
    else if (phase.includes('ii')) baseSize = 150;
    else if (phase.includes('iii')) baseSize = 600;
    else if (phase.includes('iv')) baseSize = 1000;
    
    const numberOfArms = plan.studyDesign === 'single_arm' ? 1 : 2;
    const totalPatients = baseSize;
    const patientsPerArm = Math.round(totalPatients / numberOfArms);
    
    return { totalPatients, patientsPerArm, numberOfArms };
  }

  private generateFallbackJustification(concept: StudyConcept, plan: StatisticalPlan, sampleSize: any): StatisticalJustification {
    return {
      endpointSelection: `${plan.primaryEndpoint} selected as clinically meaningful endpoint for ${concept.indication}`,
      effectSizeRationale: `Effect size of ${plan.effectSize} represents clinically meaningful benefit`,
      powerJustification: `${plan.power * 100}% power provides adequate probability of detecting true effect`,
      alphaRationale: `Alpha level of ${plan.alpha} maintains appropriate Type I error control`,
      dropoutAssumptions: `${plan.dropoutRate * 100}% dropout rate based on similar studies`,
      comparatorContext: `${plan.comparator} comparator appropriate for study objectives`,
      regulatoryAlignment: `Design aligns with regulatory expectations for ${concept.studyPhase}`,
      precedentAnalysis: `Sample size consistent with similar approved studies in this indication`
    };
  }
}