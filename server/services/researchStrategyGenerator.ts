import OpenAI from 'openai';
import { SearchItem } from '@shared/schema';
import { v4 as uuidv4 } from 'uuid';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface StrategyContext {
  drugName: string;
  indication: string;
  strategicGoals: string[];
  studyPhase: string;
  geography: string[];
}

interface GeneratedStrategy {
  searches: SearchItem[];
  rationale: string;
}

export class ResearchStrategyGenerator {
  
  /**
   * Generate AI-driven research strategy based on study context
   */
  async generateStrategy(context: StrategyContext): Promise<GeneratedStrategy> {
    const prompt = this.buildStrategyPrompt(context);
    
    try {
      const response = await openai.chat.completions.create({
        // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert clinical research strategist who designs targeted literature search strategies for pharmaceutical studies. Your role is to analyze study context and recommend specific, actionable research queries that will directly inform study design decisions.

RESPONSE FORMAT: Return valid JSON with this exact structure:
{
  "searches": [
    {
      "id": "unique_id",
      "query": "specific search query",
      "type": "core|competitive|regulatory|strategic|therapeutic",
      "priority": 1-10,
      "rationale": "why this search is important"
    }
  ],
  "rationale": "overall strategy explanation"
}`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      // Validate and format the response
      return this.validateAndFormatStrategy(result);
      
    } catch (error) {
      console.error('Error generating research strategy:', error);
      // Return fallback strategy
      return this.generateFallbackStrategy(context);
    }
  }

  private buildStrategyPrompt(context: StrategyContext): string {
    const { drugName, indication, strategicGoals, studyPhase, geography } = context;
    
    return `
STUDY CONTEXT:
- Drug: ${drugName}
- Indication: ${indication}
- Strategic Goals: ${strategicGoals.join(', ')}
- Study Phase: ${studyPhase}
- Geography: ${geography.join(', ')}

TASK: Generate 8-12 comprehensive research queries that will provide actionable intelligence for this study design. MUST INCLUDE specific searches for:

CRITICAL ONGOING TRIALS SEARCHES:
- Current ongoing clinical trials for ${drugName} in ${indication} (use ClinicalTrials.gov, NCT numbers)
- Recent 2024-2025 trial initiations and pipeline updates for ${drugName}
- Competitive trials in ${indication} with similar mechanisms of action
- New formulations, dosing regimens, or combination studies for ${drugName}

COMPREHENSIVE COMPETITIVE INTELLIGENCE:
- Direct competitors currently in clinical development for ${indication}
- Recent approvals and pipeline drugs targeting same pathways
- Competitive positioning and differentiation opportunities
- Market share and treatment landscape analysis

REGULATORY AND STRATEGIC INTELLIGENCE:
- FDA guidance and regulatory precedents for ${indication}
- Biomarker strategies and companion diagnostics requirements
- Health economics and payer access considerations
- Safety monitoring and risk management requirements

SEARCH TYPES:
- "core": Essential baseline information (regulatory precedents, unmet needs)
- "competitive": Ongoing trials, competitive products, pipeline analysis
- "regulatory": Approval pathways, FDA guidance, regulatory precedents
- "strategic": Market access, biomarkers, commercial considerations
- "therapeutic": Disease/therapeutic area specific considerations

PRIORITY LEVELS:
- 9-10: Critical for study success, immediate impact on design
- 7-8: Important for optimization and risk mitigation
- 5-6: Valuable context and background intelligence
- 1-4: Nice-to-have supplementary information

STRATEGIC GOAL MAPPINGS:
- expand_label: Focus on comparative effectiveness, health economics, payer requirements
- validate_biomarker: Focus on companion diagnostics, precision medicine, biomarker validation
- accelerate_uptake: Focus on treatment patterns, physician preferences, adoption barriers
- gain_approval: Focus on regulatory precedents, approval pathways, endpoint guidance
- defend_market_share: Focus on competitive landscape, differentiation strategies
- manage_safety_risk: Focus on safety monitoring, risk management plans

Generate specific, actionable queries that a research analyst could execute immediately.
`;
  }

  private validateAndFormatStrategy(result: any): GeneratedStrategy {
    const searches: SearchItem[] = [];
    
    if (result.searches && Array.isArray(result.searches)) {
      for (const search of result.searches) {
        searches.push({
          id: search.id || uuidv4(),
          query: search.query || 'Missing query',
          type: this.validateSearchType(search.type),
          priority: Math.max(1, Math.min(10, search.priority || 5)),
          rationale: search.rationale || 'AI-generated search',
          enabled: true,
          userModified: false
        });
      }
    }

    return {
      searches: searches.length > 0 ? searches : this.getDefaultSearches(),
      rationale: result.rationale || 'AI-generated research strategy'
    };
  }

  private validateSearchType(type: string): 'core' | 'competitive' | 'regulatory' | 'strategic' | 'therapeutic' {
    const validTypes = ['core', 'competitive', 'regulatory', 'strategic', 'therapeutic'];
    return validTypes.includes(type) ? type as any : 'core';
  }

  private generateFallbackStrategy(context: StrategyContext): GeneratedStrategy {
    const { drugName, indication, strategicGoals, studyPhase } = context;
    
    const searches: SearchItem[] = [
      {
        id: uuidv4(),
        query: `"${drugName}" ongoing recruiting active trials ${indication} ClinicalTrials.gov 2024 2025`,
        type: 'competitive',
        priority: 10,
        rationale: 'Critical - identify current ongoing trials to avoid duplication',
        enabled: true,
        userModified: false
      },
      {
        id: uuidv4(),
        query: `"${drugName}" clinical trials status recruiting active ${indication} NCT site:clinicaltrials.gov`,
        type: 'competitive',
        priority: 10,
        rationale: 'Find specific ongoing trials with real NCT numbers',
        enabled: true,
        userModified: false
      },
      {
        id: uuidv4(),
        query: `${drugName} new formulations dosing regimens combination therapy ${indication} 2024 2025`,
        type: 'competitive',
        priority: 9,
        rationale: 'Essential - find new formulations and combinations in development',
        enabled: true,
        userModified: false
      },
      {
        id: uuidv4(),
        query: `competitive trials ${indication} EGFR MET targeted therapy ongoing recruiting`,
        type: 'competitive',
        priority: 9,
        rationale: 'Competitive landscape analysis to inform positioning',
        enabled: true,
        userModified: false
      },
      {
        id: uuidv4(),
        query: `FDA guidance ${indication} regulatory precedents approval pathway`,
        type: 'regulatory',
        priority: 8,
        rationale: 'Regulatory requirements for study design',
        enabled: true,
        userModified: false
      },
      {
        id: uuidv4(),
        query: `Recent clinical trials ${indication} ${studyPhase} phase regulatory approvals`,
        type: 'core',
        priority: 8,
        rationale: 'Essential regulatory precedents for study design',
        enabled: true,
        userModified: false
      },
      {
        id: uuidv4(),
        query: `Unmet medical needs ${indication} treatment gaps current therapies`,
        type: 'core',
        priority: 7,
        rationale: 'Identify clinical gaps this study could address',
        enabled: true,
        userModified: false
      },
      {
        id: uuidv4(),
        query: `Clinical trial design considerations ${indication} endpoints sample size`,
        type: 'therapeutic',
        priority: 7,
        rationale: 'Therapeutic area-specific design requirements',
        enabled: true,
        userModified: false
      }
    ];

    // Add strategic goal-specific searches
    for (const goal of strategicGoals) {
      searches.push(this.getStrategicGoalSearch(goal, indication));
    }

    return {
      searches,
      rationale: `Fallback research strategy for ${indication} ${studyPhase} study focusing on ${strategicGoals.join(', ')}`
    };
  }

  private getStrategicGoalSearch(goal: string, indication: string): SearchItem {
    const goalSearchMap: Record<string, { query: string; priority: number; rationale: string }> = {
      expand_label: {
        query: `Health economics outcomes ${indication} comparative effectiveness payer evidence requirements`,
        priority: 8,
        rationale: 'Critical for label expansion and market access strategy'
      },
      validate_biomarker: {
        query: `Companion diagnostics biomarker validation ${indication} precision medicine regulatory guidance`,
        priority: 9,
        rationale: 'Essential for biomarker validation study design'
      },
      accelerate_uptake: {
        query: `Treatment patterns ${indication} physician adoption barriers clinical practice guidelines`,
        priority: 7,
        rationale: 'Understanding adoption challenges and opportunities'
      },
      gain_approval: {
        query: `FDA EMA regulatory guidance ${indication} approval pathways breakthrough designation`,
        priority: 9,
        rationale: 'Critical regulatory strategy and pathway optimization'
      },
      defend_market_share: {
        query: `Competitive landscape ${indication} market share analysis emerging therapies`,
        priority: 7,
        rationale: 'Competitive intelligence for market defense strategy'
      }
    };

    const searchInfo = goalSearchMap[goal] || {
      query: `${goal} ${indication} clinical research strategy`,
      priority: 6,
      rationale: `Strategic intelligence for ${goal} objective`
    };

    return {
      id: uuidv4(),
      query: searchInfo.query,
      type: 'strategic',
      priority: searchInfo.priority,
      rationale: searchInfo.rationale,
      enabled: true,
      userModified: false
    };
  }

  private getDefaultSearches(): SearchItem[] {
    return [
      {
        id: uuidv4(),
        query: 'Clinical trial design considerations regulatory requirements',
        type: 'core',
        priority: 5,
        rationale: 'Basic clinical trial design intelligence',
        enabled: true,
        userModified: false
      }
    ];
  }
}