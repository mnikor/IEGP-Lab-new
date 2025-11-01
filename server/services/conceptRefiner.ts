import OpenAI from 'openai';
import { StudyConcept } from "@shared/schema";
import { generateJJBusinessPrompt, getJJBusinessGuidance } from './jjBusinessIntelligence';

const llmEnabled = process.env.PORTFOLIO_SUMMARY_USE_LLM === 'true';
let openaiClient: OpenAI | null = null;

async function getOpenAIClient(): Promise<OpenAI> {
  if (!llmEnabled) {
    throw new Error('LLM usage disabled');
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable not found');
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  return openaiClient;
}

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

    if (!llmEnabled) {
      console.warn('ConceptRefiner: LLM disabled, returning deterministic rationale');
      return {
        updatedConcept: currentConcept,
        explanation: "LLM disabled: no automatic refinements applied. Review manually for cascading changes.",
        changes: [],
        cascadingAnalysis: {
          timelineImpact: "Manual review required to assess timeline modifications.",
          resourceImpact: "Consider resource allocation adjustments manually.",
          financialImpact: "No LLM analysis available.",
          regulatoryImpact: "Maintain current regulatory assumptions until reviewed.",
          strategicImpact: "Evaluate strategic alignment manually."
        }
      };
    }

    // Generate J&J business intelligence guidance
    const therapeuticArea = this.getTherapeuticAreaFromIndication(currentConcept.indication);
    const jjBusinessPrompt = generateJJBusinessPrompt(therapeuticArea, currentConcept.drugName);
    
    // Import commercial intelligence service for enhanced analysis
    const { commercialIntelligenceService } = await import('./commercialIntelligence');

    // Detect if this is a commercial/market analysis question
    const isCommercialQuery = this.isCommercialAnalysisQuery(message);
    let commercialAnalysis = '';
    
    if (isCommercialQuery) {
      // Generate detailed commercial analysis
      if (message.toLowerCase().includes('emea') || message.toLowerCase().includes('europe')) {
        commercialAnalysis = await commercialIntelligenceService.generateEMEACommercialAnalysis(currentConcept);
      } else {
        const fullAnalysis = await commercialIntelligenceService.generateCommercialImpactAnalysis(currentConcept);
        commercialAnalysis = this.formatCommercialAnalysisForChat(fullAnalysis, currentConcept);
      }
    }

    // Use OpenAI to analyze the user's request and determine what changes to make
    const analysisPrompt = `
${jjBusinessPrompt}

You are an expert clinical study designer with advanced reasoning capabilities and comprehensive commercial intelligence. Analyze the user's message and think through all cascading implications systematically.

**COMMERCIAL INTELLIGENCE AVAILABLE:**
${commercialAnalysis ? `
DETAILED COMMERCIAL ANALYSIS FOR THIS STUDY:
${commercialAnalysis}

Use this detailed commercial analysis to provide specific, data-driven responses to commercial questions. Always reference specific figures, timelines, and regional considerations when discussing commercial impact.
` : 'No specific commercial analysis requested - focus on study design optimization.'}

**REASONING PROCESS:**
1. Identify the primary change requested OR if this is a commercial/market analysis question
2. If commercial question: Provide detailed, specific analysis using the commercial intelligence above
3. If study change: Systematically analyze what other study components should change as a result
4. Consider timeline, resource, regulatory, and strategic implications
5. Provide clear rationale for each cascading change

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
      const client = await getOpenAIClient();
      const response = await client.chat.completions.create({
        model: "o3", // o3 reasoning model for intelligent analysis and cascading change detection
        messages: [
          {
            role: "system",
            content: `You are an expert clinical study designer with deep reasoning capabilities and comprehensive commercial intelligence. When analyzing changes to study concepts or answering commercial questions, think through all interconnected implications systematically.

COMMERCIAL ANALYSIS CAPABILITIES:
When users ask about commercial impact, market analysis, revenue projections, or regional considerations (especially EMEA):
- Provide specific financial figures, market share estimates, and revenue projections
- Consider regional differences in pricing, market access, regulatory requirements, and competitive dynamics
- Factor in patent protection timelines, competitive threats, and market exclusivity periods
- Include payer considerations such as HTA requirements, cost-effectiveness thresholds, and formulary access challenges
- Assess time-to-market factors and commercial feasibility scores
- Always reference the detailed commercial intelligence data provided in the prompt when available

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
      const conceptFormData = {
        drugName: updatedConcept.drugName,
        indication: updatedConcept.indication,
        strategicGoals: updatedConcept.strategicGoals,
        studyPhase: updatedConcept.studyPhase,
        geography: updatedConcept.geography,
        targetSubpopulation: updatedConcept.targetSubpopulation,
        comparatorDrugs: updatedConcept.comparatorDrugs || [],
        studyPhasePref: 'phase_iii' as const, // Default value
        aiModel: 'gpt-4o' as const, // Default value
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
          newFeasibilityData = await calculateFeasibility(updatedConcept as any, conceptFormData as any);
          console.log('New feasibility data calculated:', { 
            sampleSize: (newFeasibilityData as any)?.sampleSize, 
            estimatedCost: (newFeasibilityData as any)?.estimatedCost,
            timeline: (newFeasibilityData as any)?.timeline 
          });
          
          // Recalculate MCDA scores
          newMcdaScores = (await import('./mcdaScorer')).scoreMcda({
            ...updatedConcept,
            feasibilityData: newFeasibilityData
          } as any, conceptFormData as any);
          
          console.log('Recalculated feasibility and MCDA scores due to parameter changes');
        } catch (error) {
          console.error('Error during recalculation, using original values:', error);
          console.error('Full error details:', (error as Error).stack);
          // Fall back to original values if recalculation fails
        }
      }

      // Update the concept with new calculations
      updatedConcept.mcdaScores = newMcdaScores;
      updatedConcept.feasibilityData = newFeasibilityData;
      
      // Add feasibility data changes as explicit cascading changes
      if (needsRecalculation && newFeasibilityData !== originalFeasibilityData) {
        // Add sample size change if it was recalculated
        if ((newFeasibilityData as any)?.sampleSize !== (originalFeasibilityData as any)?.sampleSize) {
          changes.push({
            field: 'feasibilityData.sampleSize',
            oldValue: (originalFeasibilityData as any)?.sampleSize || 0,
            newValue: (newFeasibilityData as any)?.sampleSize,
            impact: {
              feasibilityData: {
                estimatedCost: (newFeasibilityData as any)?.estimatedCost,
                timeline: (newFeasibilityData as any)?.timeline,
                recruitmentRate: (newFeasibilityData as any)?.recruitmentRate,
                completionRisk: (newFeasibilityData as any)?.completionRisk
              }
            },
            cascadingEffect: true,
            impactArea: 'resource'
          });
        }
        
        // Add cost change if it was recalculated
        if ((newFeasibilityData as any)?.estimatedCost !== (originalFeasibilityData as any)?.estimatedCost) {
          changes.push({
            field: 'feasibilityData.estimatedCost',
            oldValue: (originalFeasibilityData as any)?.estimatedCost || 0,
            newValue: (newFeasibilityData as any)?.estimatedCost,
            impact: {
              feasibilityData: {
                estimatedCost: (newFeasibilityData as any)?.estimatedCost,
                timeline: (newFeasibilityData as any)?.timeline,
                recruitmentRate: (newFeasibilityData as any)?.recruitmentRate,
                completionRisk: (newFeasibilityData as any)?.completionRisk
              }
            },
            cascadingEffect: true,
            impactArea: 'financial'
          });
        }
        
        // Add timeline change if it was recalculated
        if ((newFeasibilityData as any)?.timeline !== (originalFeasibilityData as any)?.timeline) {
          changes.push({
            field: 'feasibilityData.timeline',
            oldValue: (originalFeasibilityData as any)?.timeline || 0,
            newValue: (newFeasibilityData as any)?.timeline,
            impact: {
              feasibilityData: {
                estimatedCost: (newFeasibilityData as any)?.estimatedCost,
                timeline: (newFeasibilityData as any)?.timeline,
                recruitmentRate: (newFeasibilityData as any)?.recruitmentRate,
                completionRisk: (newFeasibilityData as any)?.completionRisk
              }
            },
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
            estimatedCost: (newFeasibilityData as any)?.estimatedCost || 0,
            timeline: (newFeasibilityData as any)?.timeline || 0,
            recruitmentRate: (newFeasibilityData as any)?.recruitmentRate || 0,
            completionRisk: (newFeasibilityData as any)?.completionRisk || 0
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
      if (!llmEnabled) {
        console.warn('ConceptRefiner: LLM disabled, returning heuristic suggestions');
        return [
          "Reassess comparator alignment with strategic goals and regulatory expectations.",
          "Optimize recruitment plan by focusing on high-yield geographies.",
          "Refine endpoint prioritization to balance feasibility and impact."
        ];
      }

      const client = await getOpenAIClient();
      const response = await client.chat.completions.create({
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

  /**
   * Detects if the user message is asking for commercial/market analysis
   */
  private isCommercialAnalysisQuery(message: string): boolean {
    const commercialKeywords = [
      'commercial', 'revenue', 'market', 'sales', 'profit', 'roi', 'financial',
      'impact', 'emea', 'europe', 'pricing', 'payer', 'access', 'reimbursement',
      'competition', 'competitive', 'share', 'opportunity', 'valuation', 'npv'
    ];
    
    const lowerMessage = message.toLowerCase();
    return commercialKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Formats commercial analysis for chat display
   */
  private formatCommercialAnalysisForChat(analysis: any, concept: StudyConcept): string {
    const regions = Object.keys(analysis.regionalBreakdown);
    
    return `
**Commercial Impact Analysis for ${concept.title}**

**Overall Financial Projections:**
- Total Market Opportunity: $${(analysis.totalMarketOpportunity / 1000000).toFixed(0)}M
- Peak Sales Projection: $${(analysis.peakSalesProjection / 1000000).toFixed(0)}M annually
- Time to Breakeven: ${analysis.timeToBreakeven.toFixed(1)} years
- Net Present Value: $${(analysis.netPresentValue / 1000000).toFixed(0)}M

**Regional Breakdown:**
${regions.map(region => {
  const data = analysis.regionalBreakdown[region];
  return `- ${region.toUpperCase()}: ${data.marketShare.toFixed(1)}% market share, $${(data.revenueProjection / 1000000).toFixed(0)}M revenue projection`;
}).join('\n')}

**Competitive Position:**
- Differentiation Score: ${(analysis.competitiveAdvantage.differentiationScore * 100).toFixed(0)}%
- Defensibility Score: ${(analysis.competitiveAdvantage.defensibilityScore * 100).toFixed(0)}%
- First Mover Advantage: ${analysis.competitiveAdvantage.firstMoverAdvantage ? 'Yes' : 'No'}

**Commercial Feasibility Score: ${(analysis.commercialFeasibility.score * 100).toFixed(0)}%**

**Key Success Factors:**
${analysis.commercialFeasibility.keyEnabler.map((factor: string) => `- ${factor}`).join('\n')}

**Major Risks:**
${analysis.commercialFeasibility.majorBarriers.map((barrier: string) => `- ${barrier}`).join('\n')}
`;
  }
}