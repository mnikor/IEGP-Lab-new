import { v4 as uuidv4 } from 'uuid';
import type { SearchItem } from '@shared/schema';

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
  
  async generateStrategy(context: StrategyContext): Promise<GeneratedStrategy> {
    const { drugName, indication, strategicGoals, studyPhase, geography } = context;
    
    try {
      // Use OpenAI to generate targeted research strategy
      const openai = new (await import('openai')).default({ apiKey: process.env.OPENAI_API_KEY });
      
      const strategyPrompt = `Create a comprehensive research strategy for a clinical study with the following parameters:
      - Drug: ${drugName}
      - Indication: ${indication}
      - Strategic Goals: ${strategicGoals.join(', ')}
      - Study Phase: ${studyPhase}
      - Geography: ${geography.join(', ')}
      
      CRITICAL: Use flexible search terms that avoid restrictive AND operators. Create searches that cast a wide net to capture relevant information.
      
      Search Strategy Rules:
      1. NEVER use restrictive AND combinations that might miss relevant information
      2. For guidelines: Focus on INDICATION ONLY, not specific drugs (new drugs won't be in guidelines)
      3. For competitive landscape: Include broader therapeutic classes and mechanisms, not just specific drugs
      4. For regulatory: Focus on indication pathways and approval requirements
      5. Use OR-style thinking: "Find information about X OR related therapies OR similar approaches"
      
      Generate 8-12 research queries using these patterns:
      
      GOOD Examples:
      - "${indication} treatment guidelines NCCN ESMO 2024" (NOT "${drugName} AND ${indication} AND guidelines")
      - "${indication} clinical trials recruiting active 2024" (NOT "${drugName} AND ${indication} AND trials")
      - "targeted therapy ${indication} regulatory approval pathway" (NOT "${drugName} AND regulatory AND approval")
      
      Focus areas:
      1. Current treatment guidelines and standard of care (indication-focused)
      2. Competitive therapeutic landscape (broad class coverage)
      3. Regulatory pathways for the indication
      4. Market access considerations
      5. Clinical evidence gaps and unmet needs
      
      Return as JSON with this structure:
      {
        "searches": [
          {
            "query": "broad flexible search query",
            "type": "guidelines",
            "priority": 9,
            "rationale": "why this broad search is valuable"
          }
        ],
        "rationale": "strategy explanation emphasizing comprehensive coverage"
      }`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a clinical research strategist. Generate targeted research queries for comprehensive competitive intelligence and study design optimization." },
          { role: "user", content: strategyPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 2000
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      const searches: SearchItem[] = [];

      // Process AI-generated searches
      if (result.searches && Array.isArray(result.searches)) {
        for (const search of result.searches) {
          searches.push({
            id: uuidv4(),
            query: search.query,
            type: this.validateSearchType(search.type),
            priority: Math.max(1, Math.min(10, search.priority || 5)),
            rationale: search.rationale || 'AI-generated research query',
            enabled: true,
            userModified: false
          });
        }
      }

      // Add strategic goal-specific searches
      for (const goal of strategicGoals) {
        searches.push(this.getStrategicGoalSearch(goal, indication));
      }

      return {
        searches: searches.length > 0 ? searches : this.getDefaultSearches(drugName, indication, strategicGoals, studyPhase, geography),
        rationale: result.rationale || 'AI-generated research strategy'
      };
      
    } catch (error) {
      console.error('Error generating AI strategy, using fallback:', error);
      return this.generateFallbackStrategy(context);
    }
  }

  private inferTherapeuticArea(indication: string): string {
    const lowerIndication = indication.toLowerCase();
    
    if (lowerIndication.includes('cancer') || lowerIndication.includes('tumor') || lowerIndication.includes('carcinoma') || 
        lowerIndication.includes('oncology') || lowerIndication.includes('melanoma') || lowerIndication.includes('lymphoma') ||
        lowerIndication.includes('leukemia') || lowerIndication.includes('sarcoma')) {
      return 'oncology';
    }
    
    if (lowerIndication.includes('diabetes') || lowerIndication.includes('insulin') || lowerIndication.includes('glucose') ||
        lowerIndication.includes('endocrin')) {
      return 'endocrinology';
    }
    
    if (lowerIndication.includes('heart') || lowerIndication.includes('cardio') || lowerIndication.includes('hypertension') ||
        lowerIndication.includes('arrhythmia') || lowerIndication.includes('myocardial')) {
      return 'cardiology';
    }
    
    if (lowerIndication.includes('brain') || lowerIndication.includes('neuro') || lowerIndication.includes('alzheimer') ||
        lowerIndication.includes('parkinson') || lowerIndication.includes('epilepsy') || lowerIndication.includes('stroke')) {
      return 'neurology';
    }
    
    if (lowerIndication.includes('arthritis') || lowerIndication.includes('rheumat') || lowerIndication.includes('lupus') ||
        lowerIndication.includes('psoriasis') || lowerIndication.includes('immune') || lowerIndication.includes('crohn')) {
      return 'immunology';
    }
    
    if (lowerIndication.includes('liver') || lowerIndication.includes('hepat') || lowerIndication.includes('gastro') ||
        lowerIndication.includes('ibd') || lowerIndication.includes('colitis')) {
      return 'gastroenterology';
    }
    
    if (lowerIndication.includes('lung') || lowerIndication.includes('asthma') || lowerIndication.includes('copd') ||
        lowerIndication.includes('respiratory') || lowerIndication.includes('pulmonary')) {
      return 'respiratory';
    }
    
    if (lowerIndication.includes('infection') || lowerIndication.includes('antimicrobial') || lowerIndication.includes('antibiotic') ||
        lowerIndication.includes('sepsis') || lowerIndication.includes('pneumonia')) {
      return 'infectious disease';
    }
    
    return 'general medicine';
  }

  private validateSearchType(type: any): 'core' | 'competitive' | 'regulatory' | 'strategic' | 'therapeutic' | 'guidelines' {
    const validTypes = ['core', 'competitive', 'regulatory', 'strategic', 'therapeutic', 'guidelines'];
    return validTypes.includes(type) ? type as any : 'core';
  }

  private getDefaultSearches(drugName: string, indication: string, strategicGoals: string[], studyPhase: string, geography: string[]): SearchItem[] {
    return this.createFallbackSearches(drugName, indication, strategicGoals, studyPhase, geography);
  }

  private createFallbackSearches(drugName: string, indication: string, strategicGoals: string[], studyPhase: string, geography: string[]): SearchItem[] {
    const searches: SearchItem[] = [
      // Guidelines search - indication only, no drug name
      {
        id: uuidv4(),
        query: `${indication} treatment guidelines NCCN ESMO clinical practice recommendations 2024`,
        type: 'guidelines',
        priority: 10,
        rationale: 'Current standard of care and treatment guidelines for the indication',
        enabled: true,
        userModified: false
      },
      // Competitive landscape - broad therapeutic approach
      {
        id: uuidv4(),
        query: `${indication} clinical trials recruiting active targeted therapy immunotherapy 2024`,
        type: 'competitive',
        priority: 9,
        rationale: 'Ongoing competitive trials across all therapeutic approaches',
        enabled: true,
        userModified: false
      },
      // Regulatory pathway - indication focused
      {
        id: uuidv4(),
        query: `${indication} regulatory approval pathway FDA EMA clinical development guidance`,
        type: 'regulatory',
        priority: 8,
        rationale: 'Regulatory requirements and approval pathways for the indication',
        enabled: true,
        userModified: false
      },
      // Market access considerations
      {
        id: uuidv4(),
        query: `${indication} market access reimbursement payer evidence requirements health economics`,
        type: 'strategic',
        priority: 7,
        rationale: 'Market access landscape and payer requirements',
        enabled: true,
        userModified: false
      },
      // Drug-specific competitive intelligence (only when relevant)
      {
        id: uuidv4(),
        query: `${drugName} clinical development pipeline competitive positioning mechanism of action`,
        type: 'competitive',
        priority: 8,
        rationale: 'Specific competitive intelligence for the drug candidate',
        enabled: true,
        userModified: false
      }
    ];

    // Add strategic goal-specific searches
    for (const goal of strategicGoals) {
      searches.push(this.getStrategicGoalSearch(goal, indication));
    }

    return searches;
  }

  private generateFallbackStrategy(context: StrategyContext): GeneratedStrategy {
    const { drugName, indication, strategicGoals, studyPhase, geography } = context;
    
    const searches = this.createFallbackSearches(drugName, indication, strategicGoals, studyPhase, geography);

    return {
      searches,
      rationale: `Fallback research strategy for ${indication} ${studyPhase} study focusing on ${strategicGoals.join(', ')}`
    };
  }

  private getStrategicGoalSearch(goal: string, indication: string): SearchItem {
    const goalSearchMap: Record<string, { query: string, priority: number, rationale: string }> = {
      expand_label: {
        query: `${indication} label expansion clinical evidence regulatory pathway FDA EMA`,
        priority: 10,
        rationale: 'Regulatory pathway and evidence requirements for label expansion'
      },
      defend_market_share: {
        query: `${indication} competitive landscape emerging therapies market analysis`,
        priority: 8,
        rationale: 'Competitive threat assessment and market dynamics'
      },
      accelerate_uptake: {
        query: `${indication} physician adoption barriers treatment patterns real world evidence`,
        priority: 7,
        rationale: 'Understanding adoption challenges and acceleration opportunities'
      },
      facilitate_market_access: {
        query: `${indication} payer reimbursement health technology assessment coverage decisions`,
        priority: 8,
        rationale: 'Payer landscape and market access requirements'
      },
      generate_real_world_evidence: {
        query: `${indication} real world evidence post market surveillance patient outcomes registries`,
        priority: 7,
        rationale: 'Real world evidence generation strategies and data sources'
      },
      optimise_dosing: {
        query: `${indication} dosing optimization pharmacokinetics dose response clinical studies`,
        priority: 8,
        rationale: 'Dosing strategy optimization and PK/PD considerations'
      },
      validate_biomarker: {
        query: `${indication} biomarker validation predictive markers patient selection companion diagnostics`,
        priority: 8,
        rationale: 'Biomarker strategy and personalized medicine approaches'
      },
      manage_safety_risk: {
        query: `${indication} safety management adverse events risk mitigation REMS programs`,
        priority: 9,
        rationale: 'Safety profile management and risk mitigation strategies'
      },
      extend_lifecycle_combinations: {
        query: `${indication} combination therapy synergistic effects drug interactions clinical development`,
        priority: 8,
        rationale: 'Combination strategies for lifecycle extension'
      },
      secure_initial_approval: {
        query: `${indication} regulatory approval requirements clinical endpoints FDA breakthrough therapy`,
        priority: 10,
        rationale: 'Initial approval pathway and regulatory requirements'
      },
      demonstrate_poc: {
        query: `${indication} proof of concept biomarkers early efficacy signals phase II`,
        priority: 9,
        rationale: 'Proof of concept demonstration and early efficacy indicators'
      },
      gain_approval: {
        query: `${indication} regulatory guidance approval pathways FDA EMA breakthrough designation`,
        priority: 9,
        rationale: 'Regulatory strategy and accelerated approval pathways'
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
}