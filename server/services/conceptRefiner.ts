import OpenAI from 'openai';
import { StudyConcept, ConceptFormData } from "@shared/schema";
import { MCDAScorer } from './mcdaScorer';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface RefinementRequest {
  message: string;
  currentConcept: StudyConcept;
}

export interface RefinementResponse {
  updatedConcept: StudyConcept;
  explanation: string;
  changes: ConceptChange[];
}

export interface ConceptChange {
  field: string;
  oldValue: any;
  newValue: any;
  impact: {
    mcdaScores?: Partial<{
      scientificValidity: number;
      clinicalImpact: number;
      commercialValue: number;
      feasibility: number;
      overall: number;
    }>;
    feasibilityData?: {
      estimatedCost?: number;
      timeline?: number;
      recruitmentRate?: number;
      completionRisk?: number;
    };
  };
}

export class ConceptRefiner {
  async refineStudyConcept(request: RefinementRequest): Promise<RefinementResponse> {
    const { message, currentConcept } = request;

    // Use OpenAI to analyze the user's request and determine what changes to make
    const analysisPrompt = `
You are an expert clinical study designer. A user wants to modify their study concept based on this request: "${message}"

Current study concept:
- Title: ${currentConcept.title}
- Drug: ${currentConcept.drugName}
- Indication: ${currentConcept.indication}
- Strategic Goals: ${JSON.stringify(currentConcept.strategicGoals)}
- Study Phase: ${currentConcept.studyPhase}
- Geography: ${JSON.stringify(currentConcept.geography)}
- Target Subpopulation: ${currentConcept.targetSubpopulation || 'None specified'}
- Comparator Drugs: ${JSON.stringify(currentConcept.comparatorDrugs)}
- PICO Data: ${JSON.stringify(currentConcept.picoData)}

Analyze the user's request and provide a JSON response with the following structure:
{
  "changes": [
    {
      "field": "fieldName",
      "newValue": "newValue",
      "rationale": "explanation for this change"
    }
  ],
  "explanation": "A clear explanation of what was changed and why, including potential impacts on the study"
}

Valid fields that can be modified:
- strategicGoals (array of strategic goals)
- studyPhase (I, II, III, IV)
- geography (array of regions)
- targetSubpopulation (string)
- comparatorDrugs (array of drug names)
- picoData (object with population, intervention, comparator, outcomes)
- title (study title)

Focus on the specific changes requested. If the request is ambiguous, make reasonable assumptions based on clinical best practices.
`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are an expert clinical study designer who helps refine study concepts based on user feedback. Respond only with valid JSON."
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const analysisResult = JSON.parse(response.choices[0].message.content || '{}');
      
      // Apply the changes to create an updated concept
      const updatedConcept = { ...currentConcept };
      const changes: ConceptChange[] = [];

      for (const change of analysisResult.changes || []) {
        const oldValue = (updatedConcept as any)[change.field];
        const newValue = change.newValue;
        
        // Apply the change
        (updatedConcept as any)[change.field] = newValue;
        
        changes.push({
          field: change.field,
          oldValue,
          newValue,
          impact: {} // Will be calculated below
        });
      }

      // Recalculate MCDA scores and feasibility data
      const originalMcdaScores = currentConcept.mcdaScores;
      const originalFeasibilityData = currentConcept.feasibilityData;

      // Create concept form data for recalculation
      const conceptFormData: ConceptFormData = {
        drugName: updatedConcept.drugName,
        indication: updatedConcept.indication,
        strategicGoals: updatedConcept.strategicGoals,
        studyPhase: updatedConcept.studyPhase,
        geography: updatedConcept.geography,
        targetSubpopulation: updatedConcept.targetSubpopulation,
        comparatorDrugs: updatedConcept.comparatorDrugs || [],
        studyPhasePref: 'phase_iii', // Default value
        aiModel: 'gpt-4o', // Default value
        numberOfConcepts: 1 // Default value
      };

      // Recalculate feasibility data and MCDA scores when study parameters change
      let newFeasibilityData = originalFeasibilityData;
      let newMcdaScores = originalMcdaScores;
      
      // Check if any critical parameters changed that require recalculation
      const criticalFields = ['studyPhase', 'geography', 'targetSubpopulation', 'strategicGoals'];
      const needsRecalculation = changes.some(change => criticalFields.includes(change.field));
      
      if (needsRecalculation) {
        try {
          console.log(`Starting recalculation for fields: ${changes.map(c => c.field).join(', ')}`);
          
          // Import services dynamically to avoid circular dependencies
          const { calculateFeasibility } = await import('./feasibilityCalculator');
          const { McdaScorer } = await import('./mcdaScorer');
          
          const mcdaScorer = new McdaScorer();
          
          // Recalculate feasibility data with updated parameters
          console.log('Calling calculateFeasibility with updated concept...');
          newFeasibilityData = await calculateFeasibility(updatedConcept, conceptFormData);
          console.log('New feasibility data calculated:', { 
            sampleSize: newFeasibilityData.sampleSize, 
            estimatedCost: newFeasibilityData.estimatedCost,
            timeline: newFeasibilityData.timeline 
          });
          
          // Recalculate MCDA scores
          newMcdaScores = await mcdaScorer.calculateScores({
            ...updatedConcept,
            feasibilityData: newFeasibilityData
          });
          
          console.log('Recalculated feasibility and MCDA scores due to parameter changes');
        } catch (error) {
          console.error('Error during recalculation, using original values:', error);
          console.error('Full error details:', error.stack);
          // Fall back to original values if recalculation fails
        }
      }

      // Update the concept with new calculations
      updatedConcept.mcdaScores = newMcdaScores;
      updatedConcept.feasibilityData = newFeasibilityData;

      // Add impact analysis to changes
      changes.forEach(change => {
        change.impact = {
          mcdaScores: newMcdaScores || {},
          feasibilityData: newFeasibilityData ? {
            estimatedCost: newFeasibilityData.estimatedCost || 0,
            timeline: newFeasibilityData.timeline || 0,
            recruitmentRate: newFeasibilityData.recruitmentRate || 0,
            completionRisk: newFeasibilityData.completionRisk || 0
          } : {
            estimatedCost: 0,
            timeline: 0,
            recruitmentRate: 0,
            completionRisk: 0
          }
        };
      });

      return {
        updatedConcept,
        explanation: analysisResult.explanation || "Your study concept has been updated based on your request.",
        changes
      };

    } catch (error) {
      console.error('Error refining concept:', error);
      throw new Error('Failed to process refinement request');
    }
  }

  async generateRefinementSuggestions(concept: StudyConcept): Promise<string[]> {
    // Generate proactive suggestions for improving the study concept
    const suggestionPrompt = `
Based on this study concept, suggest 3-5 specific improvements that could enhance feasibility, reduce costs, or improve the strategic value:

Study: ${concept.title}
Drug: ${concept.drugName}
Indication: ${concept.indication}
Current MCDA Scores: ${JSON.stringify(concept.mcdaScores)}
Current Feasibility: ${JSON.stringify(concept.feasibilityData)}

Provide practical, actionable suggestions in a JSON array format:
["suggestion 1", "suggestion 2", "suggestion 3"]
`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a clinical study optimization expert. Provide practical suggestions for improving study concepts."
          },
          {
            role: "user",
            content: suggestionPrompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.4
      });

      const result = JSON.parse(response.choices[0].message.content || '[]');
      return Array.isArray(result) ? result : result.suggestions || [];

    } catch (error) {
      console.error('Error generating suggestions:', error);
      return [
        "Consider adjusting the target subpopulation to improve recruitment",
        "Evaluate alternative comparators to reduce study complexity",
        "Review strategic goals alignment with study design"
      ];
    }
  }
}