import OpenAI from "openai";
import { v4 as uuidv4 } from 'uuid';

const llmEnabled = process.env.PORTFOLIO_SUMMARY_USE_LLM === "true";
let openaiClient: OpenAI | null = null;

async function getOpenAIClient(): Promise<OpenAI> {
  if (!llmEnabled) {
    throw new Error("LLM usage disabled");
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable not found");
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  return openaiClient;
}

interface ValidationResearchContext {
  drugName: string;
  indication: string;
  strategicGoals: string[];
  studyPhase?: string;
  geography?: string[];
  additionalContext?: string;
}

interface ValidationSearchItem {
  id: string;
  query: string;
  type: "core" | "competitive" | "regulatory" | "strategic" | "therapeutic" | "guidelines";
  priority: number;
  rationale: string;
  enabled: boolean;
  userModified: boolean;
  category?: string;
  riskType?: string;
}

interface ValidationResearchStrategy {
  searches: ValidationSearchItem[];
  rationale: string;
  riskCategories: string[];
}

interface ValidationResearchPackage {
  strategy: ValidationResearchStrategy;
  researchSummary: string;
  citations: string[];
}

export class ValidationResearchGenerator {
  
  async generateValidationStrategy(context: ValidationResearchContext): Promise<ValidationResearchStrategy> {
    try {
      if (!llmEnabled) {
        console.warn("Validation research: LLM disabled, using heuristic strategy");
        return this.generateFallbackValidationStrategy(context);
      }

      // Generate validation-specific research strategy using OpenAI
      const prompt = this.buildValidationPrompt(context);
      
      const client = await getOpenAIClient();
      const response = await client.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are a clinical development risk assessment expert. Generate a focused research strategy to validate study feasibility and identify potential risks. Focus on patent landscapes, competitive threats, regulatory precedents, and execution challenges.`
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
      
      // Ensure we have essential validation searches
      const validationSearches = this.getEssentialValidationSearches(context);
      const aiSearches = result.searches || [];
      
      // Combine AI-generated searches with essential validation searches
      // Ensure all AI-generated searches have required fields
      const processedAiSearches = aiSearches.slice(0, 8).map((search: any, index: number) => ({
        id: uuidv4(),
        query: search.query || '',
        type: this.mapCategoryToType(search.category || 'strategic'),
        priority: this.mapPriorityToNumber(search.priority || 'medium'),
        rationale: search.rationale || 'AI-generated validation search',
        enabled: true, // Critical: Enable all searches by default
        userModified: false,
        category: search.category || 'execution',
        riskType: search.riskType || 'moderate'
      }));
      
      const allSearches = [...validationSearches, ...processedAiSearches];
      
      return {
        searches: allSearches,
        rationale: result.rationale || 'AI-generated validation research strategy focusing on risk assessment',
        riskCategories: result.riskCategories || ['competitive', 'regulatory', 'commercial', 'execution']
      };
      
    } catch (error) {
      console.error('Error generating validation strategy:', error);
      return this.generateFallbackValidationStrategy(context);
    }
  }

  async generateValidationResearch(context: ValidationResearchContext): Promise<ValidationResearchPackage> {
    const strategy = await this.generateValidationStrategy(context);
    const fallbackSummary = this.buildFallbackResearchSummary(strategy, context);

    return {
      strategy,
      researchSummary: fallbackSummary.content,
      citations: fallbackSummary.citations
    };
  }

  private buildValidationPrompt(context: ValidationResearchContext): string {
    const { drugName, indication, strategicGoals, studyPhase = 'III', geography = ['US', 'EU'] } = context;
    
    return `Generate a validation-focused research strategy for this clinical study concept:

Drug: ${drugName}
Indication: ${indication}
Strategic Goals: ${strategicGoals.join(', ')}
Study Phase: ${studyPhase}
Geography: ${geography.join(', ')}
${context.additionalContext ? `Additional Context: ${context.additionalContext}` : ''}

Generate 6-8 targeted research queries to validate this study concept and identify key risks. Focus on:

1. **Comprehensive Regulatory Intelligence**: ALL approved indications, formulations (IV, subcutaneous, oral), regulatory status across regions, breakthrough designations
2. **Patent Intelligence**: Patent expiration timelines, freedom-to-operate, biosimilar competition
3. **Competitive Landscape**: Similar ongoing studies, competitive threats, recruitment challenges
4. **Market Access Risks**: HTA decisions, reimbursement challenges, cost-effectiveness concerns
5. **Execution Feasibility**: Site availability, patient population, recruitment timelines

CRITICAL: For regulatory searches, always include ALL formulations and indications of the drug, not just those mentioned in the study.

Respond in JSON format:
{
  "searches": [
    {
      "query": "specific search query including ALL drug formulations and indications",
      "rationale": "why this search is important for validation",
      "category": "patent|competitive|regulatory|market_access|execution",
      "priority": "high|medium|low",
      "riskType": "showstopper|moderate|informational"
    }
  ],
  "rationale": "overall strategy rationale",
  "riskCategories": ["competitive", "regulatory", "commercial", "execution"]
}`;
  }

  private getEssentialValidationSearches(context: ValidationResearchContext): ValidationSearchItem[] {
    const { drugName, indication, studyPhase = 'III' } = context;
    
    return [
      {
        id: uuidv4(),
        query: `${drugName} patent expiration timeline "Orange Book" site:accessdata.fda.gov`,
        type: "strategic",
        priority: 9,
        rationale: `Critical US patent data from FDA Orange Book for commercial viability`,
        enabled: true,
        userModified: false,
        category: "patent",
        riskType: "showstopper"
      },
      {
        id: uuidv4(),
        query: `${drugName} patent protection European patent office EPO site:epo.org`,
        type: "strategic",
        priority: 9,
        rationale: `European patent landscape and protection timeline`,
        enabled: true,
        userModified: false,
        category: "patent",
        riskType: "showstopper"
      },
      {
        id: uuidv4(),
        query: `${drugName} biosimilar competition approval timeline Google Patents`,
        type: "strategic",
        priority: 8,
        rationale: `Comprehensive patent and biosimilar intelligence across databases`,
        enabled: true,
        userModified: false,
        category: "patent",
        riskType: "moderate"
      },
      {
        id: uuidv4(),
        query: `ongoing clinical trials ${indication} ${studyPhase} recruiting site:clinicaltrials.gov`,
        type: "competitive",
        priority: 9,
        rationale: `Assess competitive recruitment landscape and site availability`,
        enabled: true,
        userModified: false,
        category: "competitive",
        riskType: "moderate"
      },
      {
        id: uuidv4(),
        query: `FDA breakthrough designation ${indication} ${new Date().getFullYear() - 1}-${new Date().getFullYear()}`,
        type: "regulatory",
        priority: 8,
        rationale: `Identify regulatory precedents and potential expedited pathways`,
        enabled: true,
        userModified: false,
        category: "regulatory",
        riskType: "informational"
      },
      {
        id: uuidv4(),
        query: `HTA NICE cost effectiveness ${indication} ${drugName.split(' ')[0]} site:nice.org.uk`,
        type: "strategic",
        priority: 8,
        rationale: `UK market access and reimbursement assessment`,
        enabled: true,
        userModified: false,
        category: "market_access",
        riskType: "moderate"
      },
      {
        id: uuidv4(),
        query: `IQWiG G-BA ${drugName.split(' ')[0]} Germany reimbursement site:iqwig.de`,
        type: "strategic",
        priority: 8,
        rationale: `German market access through IQWiG/G-BA evaluation`,
        enabled: true,
        userModified: false,
        category: "market_access",
        riskType: "moderate"
      },
      {
        id: uuidv4(),
        query: `HAS France ${drugName.split(' ')[0]} ${indication} reimbursement site:has-sante.fr`,
        type: "strategic",
        priority: 8,
        rationale: `French market access through HAS evaluation`,
        enabled: true,
        userModified: false,
        category: "market_access",
        riskType: "moderate"
      },
      {
        id: uuidv4(),
        query: `AIFA Italy ${drugName.split(' ')[0]} ${indication} approval reimbursement`,
        type: "strategic",
        priority: 7,
        rationale: `Italian market access and regulatory status`,
        enabled: true,
        userModified: false,
        category: "market_access",
        riskType: "moderate"
      },
      {
        id: uuidv4(),
        query: `AEMPS Spain ${drugName.split(' ')[0]} ${indication} market access pricing`,
        type: "strategic",
        priority: 7,
        rationale: `Spanish market access through AEMPS regulatory review`,
        enabled: true,
        userModified: false,
        category: "market_access",
        riskType: "moderate"
      },
      {
        id: uuidv4(),
        query: `${drugName} all approved indications formulations FDA label site:accessdata.fda.gov`,
        type: "regulatory",
        priority: 9,
        rationale: `Comprehensive US regulatory profile including all approved uses`,
        enabled: true,
        userModified: false,
        category: "regulatory",
        riskType: "informational"
      },
      {
        id: uuidv4(),
        query: `${drugName} EMA approval indications SmPC EPAR site:ema.europa.eu`,
        type: "regulatory",
        priority: 9,
        rationale: `Complete European regulatory profile and approved indications`,
        enabled: true,
        userModified: false,
        category: "regulatory",
        riskType: "informational"
      },
      {
        id: uuidv4(),
        query: `${drugName} subcutaneous IV oral formulation approval status`,
        type: "regulatory",
        priority: 8,
        rationale: `All formulation types and administration routes approved`,
        enabled: true,
        userModified: false,
        category: "regulatory",
        riskType: "informational"
      }
    ];
  }

  private generateFallbackValidationStrategy(context: ValidationResearchContext): ValidationResearchStrategy {
    const { drugName, indication } = context;
    
    return {
      searches: [
        {
          id: uuidv4(),
          query: `${drugName} FDA EMA approval all indications formulations subcutaneous intravenous oral pending approvals regulatory status`,
          type: "regulatory",
          priority: 1,
          rationale: "Comprehensive regulatory status including ALL approved indications and formulations (IV, subcutaneous, oral, pending)",
          enabled: true,
          userModified: false,
          category: "regulatory_approval",
          riskType: "high"
        },
        {
          id: uuidv4(),
          query: `${drugName} alternative formulations development pipeline subcutaneous oral inhalation pending approvals`,
          type: "regulatory",
          priority: 2,
          rationale: "Identify all alternative formulations in development that could impact study design and competitiveness",
          enabled: true,
          userModified: false,
          category: "formulation_intelligence",
          riskType: "moderate"
        },
        {
          id: uuidv4(),
          query: `competitive landscape ${indication} ongoing clinical trials recruiting site:clinicaltrials.gov`,
          type: "competitive",
          priority: 3,
          rationale: "Assess competitive recruitment challenges and similar studies",
          enabled: true,
          userModified: false,
          category: "competitive",
          riskType: "moderate"
        },
        {
          id: uuidv4(),
          query: `${drugName} patent expiration biosimilar competition timeline`,
          type: "strategic",
          priority: 3,
          rationale: "Evaluate commercial timeline and competitive threats",
          enabled: true,
          userModified: false,
          category: "patent",
          riskType: "high"
        }
      ],
      rationale: 'Comprehensive validation research focusing on regulatory status, competitive landscape, and commercial viability',
      riskCategories: ['regulatory', 'competitive', 'commercial']
    };
  }

  // Generate risk-specific searches based on strategic goals
  getStrategicGoalValidationSearch(goal: string, indication: string): ValidationSearchItem {
    const riskSearches: Record<string, ValidationSearchItem> = {
      expand_label: {
        id: uuidv4(),
        query: `${indication} label expansion regulatory precedents FDA EMA`,
        type: "regulatory",
        priority: 8,
        rationale: "Assess regulatory feasibility for label expansion strategy",
        enabled: true,
        userModified: false,
        category: "regulatory",
        riskType: "moderate"
      },
      defend_market_share: {
        id: uuidv4(),
        query: `${indication} biosimilar competition market entry timeline`,
        type: "competitive",
        priority: 9,
        rationale: "Evaluate competitive threats to market position",
        enabled: true,
        userModified: false,
        category: "competitive", 
        riskType: "showstopper"
      },
      facilitate_market_access: {
        id: uuidv4(),
        query: `${indication} HTA recommendations NICE ICER reimbursement challenges`,
        type: "strategic",
        priority: 8,
        rationale: "Identify market access barriers and reimbursement challenges",
        enabled: true,
        userModified: false,
        category: "market_access",
        riskType: "moderate"
      },
      secure_initial_approval: {
        id: uuidv4(),
        query: `${indication} regulatory pathway FDA breakthrough designation timeline`,
        type: "regulatory",
        priority: 9,
        rationale: "Assess approval timeline and regulatory pathway risks",
        enabled: true,
        userModified: false,
        category: "regulatory",
        riskType: "showstopper"
      }
    };

    return riskSearches[goal] || {
      id: uuidv4(),
      query: `${indication} clinical development risks challenges`,
      type: "strategic",
      priority: 6,
      rationale: "General risk assessment for clinical development",
      enabled: true,
      userModified: false,
      category: "execution",
      riskType: "informational"
    };
  }

  private mapCategoryToType(category: string): string {
    const categoryTypeMap: Record<string, string> = {
      'patent': 'strategic',
      'competitive': 'competitive',
      'regulatory': 'regulatory',
      'market_access': 'strategic',
      'execution': 'strategic'
    };
    return categoryTypeMap[category] || 'strategic';
  }

  private mapPriorityToNumber(priority: string): number {
    const priorityMap: Record<string, number> = {
      'high': 9,
      'medium': 6,
      'low': 3
    };
    return priorityMap[priority] || 6;
  }

  private buildFallbackResearchSummary(strategy: ValidationResearchStrategy, context: ValidationResearchContext) {
    const lines: string[] = [];
    const citations: string[] = [];

    lines.push(`# Validation Research Fallback Summary`);
    lines.push(`Drug: ${context.drugName}`);
    lines.push(`Indication: ${context.indication}`);
    lines.push(`Strategic Goals: ${(context.strategicGoals || []).join(', ') || 'Not specified'}`);
    lines.push("");
    lines.push(`## Search Plan Overview`);

    strategy.searches.forEach((search, index) => {
      lines.push(`### ${index + 1}. ${search.query}`);
      lines.push(`- Category: ${search.category || 'not specified'}`);
      lines.push(`- Priority: ${search.priority}`);
      lines.push(`- Rationale: ${search.rationale}`);
      lines.push("- Status: Not executed (LLM fallback)");
      lines.push("- Expected Insights: Pending manual or future automated execution");
      lines.push("");
    });

    lines.push(`## Risk Categories`);
    lines.push((strategy.riskCategories || []).join(', ') || 'Not specified');

    return {
      content: lines.join('\n'),
      citations
    };
  }
}