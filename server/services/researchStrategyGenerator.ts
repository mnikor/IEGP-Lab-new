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
      
      Generate 8-12 specific, actionable research queries that will provide the most valuable insights for this study concept. Each query should be highly specific and targeted to find real, current information.
      
      Focus on:
      1. Competitive landscape and ongoing trials (with specific NCT numbers)
      2. Regulatory pathways and requirements
      3. Market access and reimbursement considerations
      4. Clinical evidence gaps and opportunities
      5. Treatment guidelines and standard of care
      
      For each search, provide:
      - A specific, targeted query
      - Search type (core, competitive, regulatory, strategic, therapeutic, guidelines)
      - Priority (1-10)
      - Rationale for why this search is important
      
      Return as JSON array with this structure:
      {
        "searches": [
          {
            "query": "specific search query",
            "type": "competitive",
            "priority": 9,
            "rationale": "why this search is critical"
          }
        ],
        "rationale": "overall strategy explanation"
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
      {
        id: uuidv4(),
        query: `Clinical trial design ${indication} study considerations regulatory requirements`,
        type: 'core',
        priority: 9,
        rationale: 'Foundational clinical study design intelligence',
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
        query: `${indication} expanded indications label expansion clinical evidence regulatory pathway`,
        priority: 10,
        rationale: 'Critical regulatory and clinical data for label expansion strategy'
      },
      defend_market_share: {
        query: `Competitive landscape ${indication} market share analysis emerging therapies`,
        priority: 8,
        rationale: 'Competitive intelligence for market defense'
      },
      accelerate_uptake: {
        query: `${indication} physician adoption treatment patterns real world evidence uptake barriers`,
        priority: 7,
        rationale: 'Market access and adoption intelligence'
      },
      facilitate_market_access: {
        query: `${indication} payer landscape reimbursement health technology assessment`,
        priority: 8,
        rationale: 'Payer and market access strategy intelligence'
      },
      generate_real_world_evidence: {
        query: `${indication} real world evidence post-market surveillance patient outcomes`,
        priority: 7,
        rationale: 'Real world evidence generation strategy'
      },
      optimise_dosing: {
        query: `${indication} optimal dosing regimens pharmacokinetics dose response`,
        priority: 8,
        rationale: 'Dosing optimization clinical evidence'
      },
      validate_biomarker: {
        query: `${indication} biomarker validation predictive biomarkers patient selection`,
        priority: 8,
        rationale: 'Biomarker validation and personalized medicine'
      },
      manage_safety_risk: {
        query: `${indication} safety profile risk management adverse events post-market`,
        priority: 9,
        rationale: 'Safety management and risk mitigation strategy'
      },
      extend_lifecycle_combinations: {
        query: `${indication} combination therapy drug interactions synergistic effects`,
        priority: 8,
        rationale: 'Lifecycle extension through combination strategies'
      },
      secure_initial_approval: {
        query: `${indication} approval requirements regulatory guidance clinical endpoints`,
        priority: 10,
        rationale: 'Initial approval pathway and requirements'
      },
      demonstrate_poc: {
        query: `${indication} proof of concept early efficacy signals biomarkers`,
        priority: 9,
        rationale: 'Proof of concept demonstration strategy'
      },
      gain_approval: {
        query: `FDA EMA regulatory guidance ${indication} approval pathways breakthrough designation`,
        priority: 9,
        rationale: 'Critical regulatory strategy and pathway optimization'
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