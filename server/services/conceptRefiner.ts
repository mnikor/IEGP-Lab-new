import OpenAI from 'openai';
import { StudyConcept, ConceptFormData } from "@shared/schema";
import { MCDAScorer } from './mcdaScorer';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface RefinementRequest {
  message: string;
  currentConcept: StudyConcept;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export interface RefinementResponse {
  updatedConcept: StudyConcept;
  explanation: string;
  changes: ConceptChange[];
  cascadingAnalysis?: {
    timelineImpact?: string;
    resourceImpact?: string;
    financialImpact?: string;
    regulatoryImpact?: string;
    strategicImpact?: string;
  };
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
  cascadingEffect?: boolean;
  impactArea?: string;
}

export class ConceptRefiner {
  // Helper function to calculate LOE-related fields when timeline dates change
  private calculateLoeTimelines(concept: StudyConcept, changes: any[]): { timeToLoe?: number; updatedConcept: StudyConcept } {
    let updatedConcept = { ...concept };
    let calculatedTimeToLoe: number | undefined;

    // Check if FPI date or LOE date was changed
    const fpiChange = changes.find(c => c.field === 'anticipatedFpiDate');
    const loeChange = changes.find(c => c.field === 'globalLoeDate');

    if (fpiChange || loeChange) {
      try {
        // Get the updated FPI date
        const fpiDate = fpiChange ? fpiChange.newValue : concept.anticipatedFpiDate;
        // Get the updated LOE date  
        const loeDate = loeChange ? loeChange.newValue : concept.globalLoeDate;

        if (fpiDate && loeDate) {
          // Parse FPI date (handle both formats)
          let parsedFpiDate: Date;
          if (fpiDate.includes('-') && fpiDate.length >= 10) {
            parsedFpiDate = new Date(fpiDate);
          } else {
            // Handle "July 2026" format - default to end of month
            const testDate = new Date(fpiDate + ' 1');
            const year = testDate.getFullYear();
            const month = testDate.getMonth();
            parsedFpiDate = new Date(year, month + 1, 0); // Last day of month
          }

          // Calculate data readout date (FPI + 24 months study duration)
          const readoutDate = new Date(parsedFpiDate);
          readoutDate.setMonth(parsedFpiDate.getMonth() + 24);

          // Parse LOE date
          const parsedLoeDate = new Date(loeDate);

          // Calculate time to LOE in years from data readout
          const timeDiffMs = parsedLoeDate.getTime() - readoutDate.getTime();
          const timeDiffYears = timeDiffMs / (1000 * 60 * 60 * 24 * 365.25);
          calculatedTimeToLoe = Math.max(0, Math.round(timeDiffYears * 10) / 10); // Round to 1 decimal

          // Update the concept with calculated timeToLoe
          updatedConcept.timeToLoe = calculatedTimeToLoe;
        }
      } catch (error) {
        console.error('Error calculating LOE timelines:', error);
      }
    }

    return { timeToLoe: calculatedTimeToLoe, updatedConcept };
  }

  async refineStudyConcept(request: RefinementRequest): Promise<RefinementResponse> {
    const { message, currentConcept, conversationHistory = [] } = request;

    // Use OpenAI to analyze the user's request and determine what changes to make
    const analysisPrompt = `
You are an expert clinical study designer with advanced reasoning capabilities. Analyze the user's message and think through all cascading implications systematically.

**REASONING PROCESS:**
1. Identify the primary change requested
2. Systematically analyze what other study components should change as a result
3. Consider timeline, resource, regulatory, and strategic implications
4. Provide clear rationale for each cascading change

**USER REQUEST:** "${message}"

**CURRENT STUDY CONCEPT:**
- Title: ${currentConcept.title}
- Drug: ${currentConcept.drugName}
- Indication: ${currentConcept.indication}
- Phase: ${currentConcept.studyPhase}
- Strategic Goals: ${JSON.stringify(currentConcept.strategicGoals)}
- Geography: ${JSON.stringify(currentConcept.geography)}
- Target Population: ${currentConcept.targetSubpopulation}
- Current Sample Size: ${(currentConcept.feasibilityData as any)?.sampleSize || 'Unknown'}
- Current Timeline: ${(currentConcept.feasibilityData as any)?.timeline || 'Unknown'} months
- Current Cost: €${((currentConcept.feasibilityData as any)?.estimatedCost || 0) / 1000000}M
- Anticipated FPI: ${(currentConcept as any).anticipatedFpiDate || 'Not set'}
- Global LOE Date: ${(currentConcept as any).globalLoeDate || 'Not set'}
- Time to LOE: ${(currentConcept as any).timeToLoe || 'Not set'} years

**ANALYSIS INSTRUCTIONS:**
Determine if this is a MODIFY or DISCUSS request:

**MODIFY**: Specific changes requiring updates to study parameters
**DISCUSS**: Advisory questions without parameter changes

For MODIFY requests, systematically think through ALL cascading changes using your reasoning framework.

Provide a JSON response with detailed cascading analysis:
{
  "intent": "MODIFY" | "DISCUSS",
  "primaryChange": "Description of the main requested change",
  "reasoning": "Step-by-step analysis of cascading implications",
  "changes": [
    {
      "field": "fieldName",
      "newValue": "newValue", 
      "rationale": "explanation for this specific change",
      "cascadingEffect": true/false,
      "impactArea": "timeline|resource|regulatory|strategic"
    }
  ],
  "explanation": "Conversational explanation of all changes made and their interconnected rationale",
  "discussionOnly": boolean,
  "cascadingAnalysis": {
    "timelineImpact": "How changes affect study timeline, milestones, and time-to-market",
    "resourceImpact": "How changes affect costs, sample size, and operational resources", 
    "financialImpact": "How changes affect ROI, NPV, revenue timing, and financial projections",
    "regulatoryImpact": "How changes affect regulatory pathway, endpoints, and approval strategy",
    "strategicImpact": "How changes affect strategic goals, competitive positioning, and commercial objectives"
  }
}

**Available fields for modification:**
- strategicGoals (array of strategic goals)
- studyPhase (I, II, III, IV)
- geography (array of regions)
- targetSubpopulation (string)
- comparatorDrugs (array of drug names)
- picoData (object with population, intervention, comparator, outcomes)
- title (study title)
- anticipatedFpiDate (First Patient In date, e.g., "July 2026", "Q3 2025")
- plannedDbLockDate (Database lock date)
- expectedToplineDate (Topline results date)
- globalLoeDate (Global Loss of Exclusivity date)
- timeToLoe (Time until LOE from data readout in years)
- primaryEndpoint (string - main efficacy endpoint)
- secondaryEndpoints (array of secondary endpoints)
- followUpDuration (number - months of follow-up)
- recruitmentPeriod (number - months for recruitment)

**Critical:** If intent is DISCUSS, set discussionOnly: true and provide comprehensive advice without making changes.
`;

    try {
      // Use o3 reasoning model for intelligent cascading change analysis
      const response = await openai.chat.completions.create({
        model: "o3", // o3 reasoning model for intelligent analysis and cascading change detection
        messages: [
          {
            role: "system",
            content: `You are an expert clinical study designer with deep reasoning capabilities. When analyzing changes to study concepts, think through all interconnected implications systematically.

REASONING FRAMEWORK:
1. Primary Change Analysis: Understand the requested modification
2. Cascading Impact Assessment: Identify what other study components should change
3. Timeline Implications: Consider how changes affect study duration, milestones
4. Resource Impact: Analyze effects on sample size, costs, site requirements
5. Financial Impact: Consider ROI implications, NPV changes, time value of money effects
6. Regulatory Considerations: Assess implications for endpoints, comparators
7. Strategic Alignment: Ensure changes support overall study goals and commercial objectives

CASCADING CHANGE EXAMPLES:
- Phase change (II→III): Affects sample size, endpoints, regulatory pathway, costs, timeline
- Geography expansion: Impacts recruitment, regulatory, costs, site count, timeline
- Endpoint changes: Affects sample size calculations, study duration, regulatory strategy
- FPI date changes: Cascades to data readout, LOE timelines, timeToLoe calculations, ROI projections, NPV calculations, strategic planning
- LOE date changes: Affects timeToLoe, commercial viability, strategic value, urgency assessments, competitive positioning
- Timeline shifts: Impact ROI through delayed revenue recognition, reduced market exclusivity period, time value of money effects

Be conversational and natural. Explain your reasoning for each cascading change. Respond only with valid JSON.`
          },
          // Include conversation history for context
          ...conversationHistory.slice(-3).map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        response_format: { type: "json_object" }
      });

      const analysisResult = JSON.parse(response.choices[0].message.content || '{}');
      
      // If this is a discussion-only request, return without making changes
      if (analysisResult.intent === 'DISCUSS' || analysisResult.discussionOnly) {
        return {
          updatedConcept: currentConcept, // No changes
          explanation: analysisResult.explanation || "Provided analysis and recommendations without modifying the study concept.",
          changes: [],
          cascadingAnalysis: analysisResult.cascadingAnalysis || null
        };
      }
      
      // Apply the changes to create an updated concept
      let updatedConcept = { ...currentConcept };
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
          impact: {}, // Will be calculated below
          cascadingEffect: change.cascadingEffect || false,
          impactArea: change.impactArea || 'general'
        });
      }

      // Calculate LOE timelines if FPI or LOE dates changed
      const loeCalculation = this.calculateLoeTimelines(currentConcept, analysisResult.changes || []);
      updatedConcept = loeCalculation.updatedConcept;
      
      // If timeToLoe was recalculated, add it as a cascading change
      if (loeCalculation.timeToLoe !== undefined && !changes.find(c => c.field === 'timeToLoe')) {
        changes.push({
          field: 'timeToLoe',
          oldValue: currentConcept.timeToLoe,
          newValue: loeCalculation.timeToLoe,
          impact: {},
          cascadingEffect: true,
          impactArea: 'timeline'
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
          const { scoreMcda } = await import('./mcdaScorer');
          
          // Recalculate feasibility data with updated parameters
          console.log('Calling calculateFeasibility with updated concept...');
          newFeasibilityData = await calculateFeasibility(updatedConcept, conceptFormData);
          console.log('New feasibility data calculated:', { 
            sampleSize: newFeasibilityData.sampleSize, 
            estimatedCost: newFeasibilityData.estimatedCost,
            timeline: newFeasibilityData.timeline 
          });
          
          // Recalculate MCDA scores
          newMcdaScores = scoreMcda({
            ...updatedConcept,
            feasibilityData: newFeasibilityData
          }, conceptFormData);
          
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
        changes,
        cascadingAnalysis: analysisResult.cascadingAnalysis || null
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