import OpenAI from "openai";
import { v4 as uuidv4 } from 'uuid';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

export class ValidationResearchGenerator {
  
  async generateValidationStrategy(context: ValidationResearchContext): Promise<ValidationResearchStrategy> {
    try {
      // Generate validation-specific research strategy using OpenAI
      const prompt = this.buildValidationPrompt(context);
      
      const response = await openai.chat.completions.create({
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
      const allSearches = [...validationSearches, ...aiSearches.slice(0, 8)]; // Limit total searches
      
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

1. **Patent Intelligence**: Patent expiration timelines, freedom-to-operate, biosimilar competition
2. **Competitive Landscape**: Similar ongoing studies, competitive threats, recruitment challenges
3. **Regulatory Precedents**: Similar approvals, FDA/EMA guidance, breakthrough designations
4. **Market Access Risks**: HTA decisions, reimbursement challenges, cost-effectiveness concerns
5. **Execution Feasibility**: Site availability, patient population, recruitment timelines

Respond in JSON format:
{
  "searches": [
    {
      "query": "specific search query",
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
        query: `${drugName} patent expiration timeline biosimilar competition`,
        type: "strategic",
        priority: 9,
        rationale: `Critical for understanding commercial viability timeline and competitive threats`,
        enabled: true,
        userModified: false,
        category: "patent",
        riskType: "showstopper"
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
        query: `HTA NICE ICER cost effectiveness ${indication} ${drugName.split(' ')[0]}`,
        type: "strategic",
        priority: 7,
        rationale: `Evaluate market access and reimbursement precedents`,
        enabled: true,
        userModified: false,
        category: "market_access",
        riskType: "moderate"
      }
    ];
  }

  private generateFallbackValidationStrategy(context: ValidationResearchContext): ValidationResearchStrategy {
    const { drugName, indication } = context;
    
    return {
      searches: [
        {
          id: uuidv4(),
          query: `${drugName} FDA EMA approval history ${indication} EGFR exon 20 insertion mutations approved indications`,
          type: "regulatory",
          priority: 1,
          rationale: "Verify current regulatory approval status including all approved indications for EGFR mutations",
          enabled: true,
          userModified: false,
          category: "regulatory_approval",
          riskType: "high"
        },
        {
          id: uuidv4(),
          query: `competitive landscape ${indication} ongoing clinical trials recruiting site:clinicaltrials.gov`,
          type: "competitive",
          priority: 2,
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
}