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
      
      CRITICAL: Create intelligent, universal search strategies that work for ANY drug and disease combination. Use flexible search terms that avoid restrictive AND operators.
      
      Universal Search Strategy Rules:
      1. NEVER use restrictive AND combinations that might miss relevant information
      2. For guidelines: Focus on INDICATION ONLY - new drugs won't be in guidelines yet
      3. For competitive landscape: Use therapeutic MECHANISMS and CLASSES, not specific drug names
      4. For regulatory: Focus on indication-specific pathways and requirements
      5. Adapt search complexity based on disease area (oncology vs rare disease vs chronic conditions)
      6. Use disease-agnostic terminology that works across therapeutic areas
      
      Disease-Agnostic Patterns:
      - Guidelines: "{indication} treatment guidelines clinical practice recommendations standard care"
      - Competitive: "{therapeutic_class} {indication} pipeline clinical trials development"  
      - Regulatory: "{indication} regulatory pathway approval requirements clinical endpoints"
      - Market: "{indication} market access coverage reimbursement payer evidence"
      
      Therapeutic Area Intelligence:
      - Oncology: Include "targeted therapy immunotherapy combination treatment"
      - Rare diseases: Include "orphan designation regulatory pathway patient advocacy"
      - Chronic conditions: Include "real world evidence patient outcomes quality life"
      - Infectious diseases: Include "antimicrobial resistance treatment guidelines WHO CDC"
      
      Focus areas:
      1. Current treatment guidelines and standard of care (indication-focused)
      2. Drug-specific competitive intelligence and development status
      3. Competitive therapeutic landscape (broad class coverage)
      4. Regulatory pathways for both indication and drug
      5. Market access considerations
      6. Clinical evidence gaps and drug-specific efficacy data
      
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

  /**
   * Get therapeutic area-specific search terms
   */
  private getTherapeuticAreaTerms(therapeuticArea: string): { competitive: string, regulatory: string, market: string, clinical: string } {
    const termMap: Record<string, { competitive: string, regulatory: string, market: string, clinical: string }> = {
      oncology: {
        competitive: 'targeted therapy immunotherapy combination treatment precision medicine',
        regulatory: 'breakthrough therapy accelerated approval tumor response biomarkers',
        market: 'specialty pharmacy oncology networks value-based care',
        clinical: 'progression free survival overall survival quality of life'
      },
      cardiology: {
        competitive: 'device therapy intervention preventive treatment cardiovascular outcomes',
        regulatory: 'cardiovascular outcomes trials safety endpoints MACE events',
        market: 'cardiology practices hospital systems preventive care coverage',
        clinical: 'cardiovascular events mortality risk reduction'
      },
      neurology: {
        competitive: 'neuroprotective therapy disease modifying treatment symptomatic relief',
        regulatory: 'biomarker endpoints cognitive assessment neuroimaging FDA guidance',
        market: 'neurology specialists care coordination long-term management',
        clinical: 'disease progression cognitive function quality of life'
      },
      endocrinology: {
        competitive: 'glycemic control insulin therapy GLP-1 agonists continuous monitoring',
        regulatory: 'glycemic endpoints cardiovascular safety diabetes guidance',
        market: 'endocrinology practices diabetes educators managed care',
        clinical: 'glycemic control diabetic complications patient adherence'
      },
      immunology: {
        competitive: 'immunosuppressive therapy biologic treatment JAK inhibitors targeted therapy',
        regulatory: 'immunogenicity safety monitoring autoimmune endpoints',
        market: 'rheumatology practices specialty pharmacies prior authorization',
        clinical: 'disease activity patient reported outcomes safety profile'
      },
      'infectious disease': {
        competitive: 'antimicrobial therapy resistance patterns combination treatment prophylaxis',
        regulatory: 'antimicrobial resistance WHO guidelines CDC recommendations',
        market: 'infectious disease specialists hospital formularies stewardship programs',
        clinical: 'clinical cure microbiological response resistance emergence'
      },
      'rare disease': {
        competitive: 'orphan designation rare disease therapy patient advocacy treatment access',
        regulatory: 'orphan drug designation accelerated approval patient registries',
        market: 'rare disease coverage patient assistance ultra-orphan pricing',
        clinical: 'natural history patient registries clinical meaningfulness'
      },
      respiratory: {
        competitive: 'bronchodilator therapy inhaled treatment respiratory function targeted therapy',
        regulatory: 'pulmonary function endpoints respiratory safety FDA guidance',
        market: 'pulmonology practices respiratory therapists managed care',
        clinical: 'respiratory function quality of life exacerbation rates'
      },
      gastroenterology: {
        competitive: 'inflammatory bowel disease hepatology treatment endoscopic intervention',
        regulatory: 'hepatic safety GI endpoints liver function monitoring',
        market: 'gastroenterology practices hepatology centers specialty coverage',
        clinical: 'disease remission liver function patient outcomes'
      }
    };

    return termMap[therapeuticArea] || {
      competitive: 'therapeutic intervention treatment options clinical development',
      regulatory: 'clinical endpoints safety efficacy regulatory guidance',
      market: 'specialist practices coverage decisions reimbursement',
      clinical: 'patient outcomes clinical effectiveness safety profile'
    };
  }

  /**
   * Get relevant guidelines organizations based on therapeutic area and geography
   */
  private getGuidelinesOrganizations(therapeuticArea: string, geography: string[]): string {
    const orgMap: Record<string, string[]> = {
      oncology: ['NCCN', 'ESMO', 'ASCO', 'EMA oncology', 'FDA oncology'],
      cardiology: ['AHA', 'ACC', 'ESC', 'ACP cardiology'],
      neurology: ['AAN', 'EAN', 'WFN', 'ACP neurology'],
      endocrinology: ['ADA', 'EASD', 'IDF', 'Endocrine Society'],
      immunology: ['ACR', 'EULAR', 'BSR', 'APLAR'],
      'infectious disease': ['IDSA', 'ESCMID', 'WHO', 'CDC'],
      respiratory: ['ATS', 'ERS', 'GOLD', 'GINA'],
      gastroenterology: ['AGA', 'EASL', 'AASLD', 'WGO'],
      'rare disease': ['FDA orphan', 'EMA orphan', 'rare disease societies'],
      'general medicine': ['WHO', 'professional societies', 'clinical guidelines']
    };

    const orgs = orgMap[therapeuticArea] || orgMap['general medicine'];
    
    // Filter based on geography if relevant
    if (geography.includes('US')) {
      return orgs.filter(org => !org.includes('ES') || org.includes('NCCN') || org.includes('FDA')).join(' ');
    }
    if (geography.includes('EU')) {
      return orgs.filter(org => !org.includes('AA') || org.includes('ESMO') || org.includes('EMA')).join(' ');
    }
    
    return orgs.join(' ');
  }

  private validateSearchType(type: any): 'core' | 'competitive' | 'regulatory' | 'strategic' | 'therapeutic' | 'guidelines' {
    const validTypes = ['core', 'competitive', 'regulatory', 'strategic', 'therapeutic', 'guidelines'];
    return validTypes.includes(type) ? type as any : 'core';
  }

  private getDefaultSearches(drugName: string, indication: string, strategicGoals: string[], studyPhase: string, geography: string[]): SearchItem[] {
    return this.createFallbackSearches(drugName, indication, strategicGoals, studyPhase, geography);
  }

  private createFallbackSearches(drugName: string, indication: string, strategicGoals: string[], studyPhase: string, geography: string[]): SearchItem[] {
    const therapeuticArea = this.inferTherapeuticArea(indication);
    const therapeuticTerms = this.getTherapeuticAreaTerms(therapeuticArea);
    const guidelinesOrgs = this.getGuidelinesOrganizations(therapeuticArea, geography);
    
    const searches: SearchItem[] = [
      // Universal guidelines search - indication only, adaptive organizations
      {
        id: uuidv4(),
        query: `${indication} treatment guidelines ${guidelinesOrgs} clinical practice recommendations standard care 2024`,
        type: 'guidelines',
        priority: 10,
        rationale: `Current treatment guidelines and standard of care for ${indication} from relevant medical societies`,
        enabled: true,
        userModified: false
      },
      // Therapeutic area-adaptive competitive landscape
      {
        id: uuidv4(),
        query: `${indication} clinical trials recruiting active ${therapeuticTerms.competitive} pipeline development 2024`,
        type: 'competitive',
        priority: 9,
        rationale: `Ongoing competitive trials across ${therapeuticArea} therapeutic approaches`,
        enabled: true,
        userModified: false
      },
      // Universal regulatory pathway
      {
        id: uuidv4(),
        query: `${indication} regulatory approval pathway FDA EMA clinical endpoints ${therapeuticTerms.regulatory}`,
        type: 'regulatory',
        priority: 8,
        rationale: `Regulatory requirements and approval pathways for ${indication}`,
        enabled: true,
        userModified: false
      },
      // Market access with therapeutic area considerations
      {
        id: uuidv4(),
        query: `${indication} market access reimbursement coverage decisions health economics ${therapeuticTerms.market}`,
        type: 'strategic',
        priority: 7,
        rationale: `Market access landscape and payer requirements for ${therapeuticArea}`,
        enabled: true,
        userModified: false
      },
      // Drug-specific clinical trials and development status
      {
        id: uuidv4(),
        query: `${drugName} clinical trials ${indication} pipeline development status phase studies`,
        type: 'competitive',
        priority: 9,
        rationale: `Current development status and clinical trials for ${drugName} in ${indication}`,
        enabled: true,
        userModified: false
      },
      // Drug mechanism and competitive positioning
      {
        id: uuidv4(),
        query: `${drugName} mechanism of action target pathway ${therapeuticTerms.competitive} competitive analysis`,
        type: 'competitive',
        priority: 8,
        rationale: `Mechanism-based competitive positioning and differentiation for ${drugName}`,
        enabled: true,
        userModified: false
      },
      // Drug-specific regulatory and safety profile
      {
        id: uuidv4(),
        query: `${drugName} regulatory status FDA EMA approval timeline safety profile adverse events`,
        type: 'regulatory',
        priority: 8,
        rationale: `Regulatory pathway and safety considerations specific to ${drugName}`,
        enabled: true,
        userModified: false
      },
      // Drug efficacy and clinical evidence
      {
        id: uuidv4(),
        query: `${drugName} efficacy clinical evidence ${indication} patient outcomes response rates`,
        type: 'therapeutic',
        priority: 8,
        rationale: `Clinical evidence and efficacy data for ${drugName} in ${indication}`,
        enabled: true,
        userModified: false
      },
      // Unmet medical needs and opportunities
      {
        id: uuidv4(),
        query: `${indication} unmet medical needs treatment gaps patient outcomes ${therapeuticTerms.clinical}`,
        type: 'therapeutic',
        priority: 7,
        rationale: `Clinical evidence gaps and unmet needs in ${indication}`,
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