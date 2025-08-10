import OpenAI from 'openai';
import { StudyConcept, ConceptFormData } from "@shared/schema";
import { MCDAScorer } from './mcdaScorer';
import { generateJJBusinessPrompt, getJJBusinessGuidance } from './jjBusinessIntelligence';

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

  // Helper function to determine therapeutic area from indication
  private getTherapeuticAreaFromIndication(indication: string): string {
    const lowerIndication = indication.toLowerCase();
    if (lowerIndication.includes('cancer') || lowerIndication.includes('tumor') || lowerIndication.includes('oncol') || 
        lowerIndication.includes('carcinoma') || lowerIndication.includes('sarcoma') || lowerIndication.includes('leukemia') ||
        lowerIndication.includes('lymphoma') || lowerIndication.includes('prostate') || lowerIndication.includes('nsclc') ||
        lowerIndication.includes('colorectal') || lowerIndication.includes('crc')) {
      return 'oncology';
    }
    if (lowerIndication.includes('psoriasis') || lowerIndication.includes('arthritis') || lowerIndication.includes('crohn') ||
        lowerIndication.includes('colitis') || lowerIndication.includes('immunology') || lowerIndication.includes('autoimmune')) {
      return 'immunology';
    }
    return 'general';
  }

  async refineStudyConcept(request: RefinementRequest): Promise<RefinementResponse> {
    const { message, currentConcept, conversationHistory = [] } = request;

    // Generate J&J business intelligence guidance
    const therapeuticArea = this.getTherapeuticAreaFromIndication(currentConcept.indication);
    const jjBusinessPrompt = generateJJBusinessPrompt(therapeuticArea, currentConcept.drugName);

    // Use OpenAI to analyze the user's request and determine what changes to make
    const analysisPrompt = `
${jjBusinessPrompt}

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
**Current Study Parameters:**
- Sample Size: ${(currentConcept.feasibilityData as any)?.sampleSize || 'Unknown'}
- Timeline: ${(currentConcept.feasibilityData as any)?.timeline || 'Unknown'} months  
- Cost: €${((currentConcept.feasibilityData as any)?.estimatedCost || 0) / 1000000}M
- Recruitment Rate: ${(currentConcept.feasibilityData as any)?.recruitmentRate || 'Unknown'} patients/month
- Completion Risk: ${(currentConcept.feasibilityData as any)?.completionRisk || 'Unknown'}%

**Current Timeline & Commercial:**
- FPI Date: ${(currentConcept as any).anticipatedFpiDate || 'Not set'}
- DB Lock: ${(currentConcept as any).plannedDbLockDate || 'Not set'}
- Topline: ${(currentConcept as any).expectedToplineDate || 'Not set'}
- Global LOE: ${(currentConcept as any).globalLoeDate || 'Not set'}
- Time to LOE: ${(currentConcept as any).timeToLoe || 'Not set'} years
- Budget Ceiling: €${((currentConcept as any).budgetCeilingEur || 0) / 1000000}M
- Timeline Ceiling: ${(currentConcept as any).timelineCeilingMonths || 'Not set'} months

**Current MCDA Scores:**
- Scientific Validity: ${(currentConcept.mcdaScores as any)?.scientificValidity || 'Unknown'}
- Clinical Impact: ${(currentConcept.mcdaScores as any)?.clinicalImpact || 'Unknown'}
- Commercial Value: ${(currentConcept.mcdaScores as any)?.commercialValue || 'Unknown'}
- Feasibility: ${(currentConcept.mcdaScores as any)?.feasibility || 'Unknown'}
- Overall Score: ${(currentConcept.mcdaScores as any)?.overall || 'Unknown'}

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

**All Available Study Elements for Dynamic Modification:**

**Core Study Design:**
- title, studyPhase, targetSubpopulation, geography, comparatorDrugs
- primaryEndpoint, secondaryEndpoints, picoData

**Timeline & Milestones:**
- anticipatedFpiDate, plannedDbLockDate, expectedToplineDate, globalLoeDate
- followUpDuration, recruitmentPeriod, timeToLoe

**Strategic & Commercial:**
- strategicGoals, budgetCeilingEur, timelineCeilingMonths, salesImpactThreshold

**Study Parameters (via feasibilityData):**
- feasibilityData.estimatedCost, feasibilityData.timeline, feasibilityData.sampleSize, feasibilityData.recruitmentRate, feasibilityData.completionRisk

**Scoring & Analysis:**
- mcdaScores.scientificValidity, mcdaScores.clinicalImpact, mcdaScores.commercialValue, mcdaScores.feasibility, mcdaScores.overall

**CRITICAL INSTRUCTION:** 
Dynamically identify which elements need modification based on the interconnection patterns above. Don't limit yourself to obvious changes - think through ALL potential cascading effects to optimize the entire study concept holistically.

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

DYNAMIC REASONING FRAMEWORK:
Think systematically through ALL interconnected study elements. For ANY change, analyze these interconnection patterns:

**CLINICAL DESIGN INTERCONNECTIONS:**
- Study Phase ↔ Sample Size ↔ Statistical Power ↔ Primary Endpoints ↔ Study Duration
- Geography ↔ Recruitment Rate ↔ Site Count ↔ Regulatory Requirements ↔ Costs
- Population Criteria ↔ Sample Size ↔ Recruitment Feasibility ↔ Geographic Strategy
- Endpoints ↔ Study Duration ↔ Sample Size ↔ Statistical Analysis Plan ↔ Regulatory Strategy

**TIMELINE INTERCONNECTIONS:**
- FPI Date ↔ Recruitment Period ↔ Study Duration ↔ Data Lock ↔ Readout ↔ Filing ↔ Launch
- Any Timeline Change ↔ LOE Calculations ↔ Market Exclusivity ↔ ROI ↔ NPV ↔ Strategic Value

**FINANCIAL INTERCONNECTIONS:**
- Sample Size ↔ Study Costs ↔ Site Count ↔ Geography ↔ Budget Constraints
- Timeline ↔ Development Costs ↔ Revenue Timing ↔ NPV ↔ ROI ↔ Commercial Viability
- Study Duration ↔ Opportunity Costs ↔ Competitive Risk ↔ Market Position

**REGULATORY INTERCONNECTIONS:**
- Study Phase ↔ Regulatory Requirements ↔ Endpoints ↔ Sample Size ↔ Geography
- Comparators ↔ Regulatory Strategy ↔ Market Access ↔ Competitive Positioning
- Endpoints ↔ Label Claims ↔ Market Access ↔ Commercial Strategy

**STRATEGIC INTERCONNECTIONS:**
- Strategic Goals ↔ Study Design ↔ Timeline ↔ Budget ↔ Commercial Objectives
- Competitive Landscape ↔ Timeline Urgency ↔ Study Scope ↔ Resource Allocation

DYNAMIC ANALYSIS INSTRUCTIONS:
For EVERY change request, systematically evaluate which of these interconnections are triggered and determine what cascading modifications are needed to maintain study coherence and optimization.

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
        let oldValue, newValue;
        
        // Handle nested properties (e.g., feasibilityData.sampleSize)
        if (change.field.includes('.')) {
          const [parentField, childField] = change.field.split('.');
          oldValue = (updatedConcept as any)[parentField]?.[childField];
          newValue = change.newValue;
          
          // Ensure parent object exists
          if (!(updatedConcept as any)[parentField]) {
            (updatedConcept as any)[parentField] = {};
          }
          
          // Apply the nested change
          (updatedConcept as any)[parentField][childField] = newValue;
        } else {
          // Handle top-level properties
          oldValue = (updatedConcept as any)[change.field];
          newValue = change.newValue;
          
          // Apply the change
          (updatedConcept as any)[change.field] = newValue;
        }
        
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

      // Handle feasibility data updates for interconnected parameters
      const needsFeasibilityUpdate = changes.some(change => 
        ['studyPhase', 'geography', 'targetSubpopulation', 'sampleSize', 'timeline', 'recruitmentPeriod', 'followUpDuration'].includes(change.field)
      );

      // Handle MCDA score updates for changes that affect scoring
      const needsMcdaUpdate = changes.some(change => 
        ['studyPhase', 'geography', 'strategicGoals', 'comparatorDrugs', 'primaryEndpoint', 'timeline', 'estimatedCost'].includes(change.field)
      );

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
      
      // Add feasibility data changes as explicit cascading changes
      if (needsRecalculation && newFeasibilityData !== originalFeasibilityData) {
        // Add sample size change if it was recalculated
        if (newFeasibilityData.sampleSize !== (originalFeasibilityData as any)?.sampleSize) {
          changes.push({
            field: 'feasibilityData.sampleSize',
            oldValue: (originalFeasibilityData as any)?.sampleSize || 0,
            newValue: newFeasibilityData.sampleSize,
            impact: {},
            cascadingEffect: true,
            impactArea: 'resource'
          });
        }
        
        // Add cost change if it was recalculated
        if (newFeasibilityData.estimatedCost !== (originalFeasibilityData as any)?.estimatedCost) {
          changes.push({
            field: 'feasibilityData.estimatedCost',
            oldValue: (originalFeasibilityData as any)?.estimatedCost || 0,
            newValue: newFeasibilityData.estimatedCost,
            impact: {},
            cascadingEffect: true,
            impactArea: 'financial'
          });
        }
        
        // Add timeline change if it was recalculated
        if (newFeasibilityData.timeline !== (originalFeasibilityData as any)?.timeline) {
          changes.push({
            field: 'feasibilityData.timeline',
            oldValue: (originalFeasibilityData as any)?.timeline || 0,
            newValue: newFeasibilityData.timeline,
            impact: {},
            cascadingEffect: true,
            impactArea: 'timeline'
          });
        }
      }

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

      // Enhanced explanation that includes interconnection analysis
      const enhancedExplanation = analysisResult.explanation || "Your study concept has been updated with intelligent cascading analysis.";
      
      return {
        updatedConcept,
        explanation: enhancedExplanation,
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