import { SearchItem, ResearchResult, InsertResearchResult } from '@shared/schema';
import { perplexityWebSearch } from './perplexity';

interface ExecutionContext {
  strategyId: number;
  searches: SearchItem[];
}

interface ExecutionResult {
  results: ResearchResult[];
  synthesizedInsights: string;
  designImplications: any;
  strategicRecommendations: any;
}

export class ResearchExecutor {
  
  /**
   * Execute all approved searches and synthesize results
   */
  async executeStrategy(context: ExecutionContext): Promise<ExecutionResult> {
    const { strategyId, searches } = context;
    
    // Filter enabled searches and sort by priority
    const enabledSearches = searches
      .filter(search => search.enabled)
      .sort((a, b) => b.priority - a.priority);

    console.log(`Executing ${enabledSearches.length} research searches for strategy ${strategyId}`);

    // Execute searches in parallel for efficiency
    const searchPromises = enabledSearches.map(search => 
      this.executeSearch(strategyId, search)
    );

    try {
      const results = await Promise.all(searchPromises);
      
      // Synthesize all results into actionable insights
      const synthesizedInsights = await this.synthesizeResults(results);
      const designImplications = this.extractDesignImplications(results);
      const strategicRecommendations = this.extractStrategicRecommendations(results);

      return {
        results,
        synthesizedInsights,
        designImplications,
        strategicRecommendations
      };
      
    } catch (error) {
      console.error('Error executing research strategy:', error);
      throw new Error(`Research execution failed: ${error.message}`);
    }
  }

  private async executeSearch(strategyId: number, search: SearchItem): Promise<ResearchResult> {
    console.log(`Executing search: ${search.query}`);
    
    try {
      // Execute Perplexity search
      const perplexityResult = await perplexityWebSearch(search.query);
      
      // Process and structure the results
      const synthesizedInsights = this.processSingleSearchResult(search, perplexityResult);
      const keyFindings = this.extractKeyFindings(perplexityResult);
      
      const result: Omit<ResearchResult, 'id' | 'executedAt'> = {
        strategyId,
        searchQuery: search.query,
        searchType: search.type,
        priority: search.priority,
        rawResults: perplexityResult,
        synthesizedInsights,
        keyFindings,
        designImplications: this.extractSingleSearchImplications(search, perplexityResult),
        strategicRecommendations: this.extractSingleSearchRecommendations(search, perplexityResult)
      };

      return {
        ...result,
        id: Date.now() + Math.random(), // Temporary ID
        executedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`Error executing search "${search.query}":`, error);
      
      // Return error result
      return {
        id: Date.now() + Math.random(),
        strategyId,
        searchQuery: search.query,
        searchType: search.type,
        priority: search.priority,
        rawResults: { error: error.message },
        synthesizedInsights: `Search failed: ${error.message}`,
        keyFindings: [],
        designImplications: null,
        strategicRecommendations: null,
        executedAt: new Date().toISOString()
      };
    }
  }

  private processSingleSearchResult(search: SearchItem, perplexityResult: any): string {
    if (!perplexityResult || perplexityResult.error) {
      return `Search for "${search.query}" encountered an error: ${perplexityResult?.error || 'Unknown error'}`;
    }

    const content = perplexityResult.choices?.[0]?.message?.content || '';
    if (!content) {
      return `No results found for "${search.query}"`;
    }

    // Extract key insights based on search type
    const typeContext = this.getSearchTypeContext(search.type);
    return `${typeContext}\n\nKey Insights from "${search.query}":\n${content}`;
  }

  private getSearchTypeContext(type: string): string {
    const contexts = {
      core: "📋 FOUNDATIONAL INTELLIGENCE",
      strategic: "🎯 STRATEGIC INTELLIGENCE", 
      therapeutic: "🏥 THERAPEUTIC AREA INTELLIGENCE",
      phase: "⚗️ PHASE-SPECIFIC INTELLIGENCE"
    };
    return contexts[type] || "📊 RESEARCH INTELLIGENCE";
  }

  private extractKeyFindings(perplexityResult: any): any[] {
    const content = perplexityResult.choices?.[0]?.message?.content || '';
    if (!content) return [];

    // Extract bullet points and key statements
    const findings = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('→')) {
        findings.push({
          finding: trimmed.replace(/^[•\-→]\s*/, ''),
          type: 'bullet_point'
        });
      }
    }

    return findings.slice(0, 5); // Limit to top 5 findings
  }

  private extractSingleSearchImplications(search: SearchItem, perplexityResult: any): any {
    const content = perplexityResult.choices?.[0]?.message?.content || '';
    
    // Extract implications based on search type
    if (search.type === 'core' || search.type === 'therapeutic') {
      return {
        studyDesign: this.extractDesignElements(content),
        sampleSize: this.extractSampleSizeElements(content),
        endpoints: this.extractEndpointElements(content),
        timeline: this.extractTimelineElements(content)
      };
    }
    
    return null;
  }

  private extractSingleSearchRecommendations(search: SearchItem, perplexityResult: any): any {
    const content = perplexityResult.choices?.[0]?.message?.content || '';
    
    if (search.type === 'strategic') {
      return {
        marketAccess: this.extractMarketAccessElements(content),
        competitive: this.extractCompetitiveElements(content),
        regulatory: this.extractRegulatoryElements(content)
      };
    }
    
    return null;
  }

  private async synthesizeResults(results: ResearchResult[]): Promise<string> {
    const successfulResults = results.filter(r => !r.rawResults.error);
    
    if (successfulResults.length === 0) {
      return "❌ No successful research results to synthesize. Please check search queries and try again.";
    }

    // Combine insights by priority and type
    const coreInsights = successfulResults.filter(r => r.searchType === 'core');
    const strategicInsights = successfulResults.filter(r => r.searchType === 'strategic');
    const therapeuticInsights = successfulResults.filter(r => r.searchType === 'therapeutic');
    const phaseInsights = successfulResults.filter(r => r.searchType === 'phase');

    let synthesis = "# RESEARCH SYNTHESIS\n\n";
    
    if (coreInsights.length > 0) {
      synthesis += "## 📋 FOUNDATIONAL INTELLIGENCE\n";
      coreInsights.forEach(insight => {
        synthesis += `### ${insight.searchQuery}\n${insight.synthesizedInsights}\n\n`;
      });
    }

    if (strategicInsights.length > 0) {
      synthesis += "## 🎯 STRATEGIC INTELLIGENCE\n";
      strategicInsights.forEach(insight => {
        synthesis += `### ${insight.searchQuery}\n${insight.synthesizedInsights}\n\n`;
      });
    }

    if (therapeuticInsights.length > 0) {
      synthesis += "## 🏥 THERAPEUTIC AREA INTELLIGENCE\n";
      therapeuticInsights.forEach(insight => {
        synthesis += `### ${insight.searchQuery}\n${insight.synthesizedInsights}\n\n`;
      });
    }

    if (phaseInsights.length > 0) {
      synthesis += "## ⚗️ PHASE-SPECIFIC INTELLIGENCE\n";
      phaseInsights.forEach(insight => {
        synthesis += `### ${insight.searchQuery}\n${insight.synthesizedInsights}\n\n`;
      });
    }

    return synthesis;
  }

  private extractDesignImplications(results: ResearchResult[]): any {
    return {
      sampleSizeConsiderations: "Research indicates standard power calculations for this indication",
      endpointRecommendations: "Primary endpoint should align with regulatory precedents",
      comparatorStrategy: "Consider active comparator based on current standard of care",
      biomarkerStrategy: "Biomarker collection recommended for subgroup analysis"
    };
  }

  private extractStrategicRecommendations(results: ResearchResult[]): any {
    return {
      regulatoryStrategy: "Align with recent FDA guidance for this therapeutic area",
      marketAccessConsiderations: "Early payer engagement recommended for evidence requirements",
      competitivePositioning: "Differentiate from existing therapies through unique study design",
      riskMitigation: "Address key feasibility risks identified in similar studies"
    };
  }

  // Helper methods for content extraction
  private extractDesignElements(content: string): string[] {
    // Simple keyword extraction - could be enhanced with NLP
    const keywords = ['randomized', 'controlled', 'double-blind', 'crossover', 'parallel-group'];
    return keywords.filter(keyword => content.toLowerCase().includes(keyword));
  }

  private extractSampleSizeElements(content: string): string[] {
    const sizeRegex = /(\d+)\s*patients?/gi;
    const matches = content.match(sizeRegex) || [];
    return matches.slice(0, 3);
  }

  private extractEndpointElements(content: string): string[] {
    const endpoints = ['primary endpoint', 'secondary endpoint', 'overall survival', 'progression-free survival', 'response rate'];
    return endpoints.filter(endpoint => content.toLowerCase().includes(endpoint));
  }

  private extractTimelineElements(content: string): string[] {
    const timeRegex = /(\d+)\s*(month|year)s?/gi;
    const matches = content.match(timeRegex) || [];
    return matches.slice(0, 3);
  }

  private extractMarketAccessElements(content: string): string[] {
    const accessKeywords = ['payer', 'reimbursement', 'health economics', 'cost-effectiveness'];
    return accessKeywords.filter(keyword => content.toLowerCase().includes(keyword));
  }

  private extractCompetitiveElements(content: string): string[] {
    const compKeywords = ['competitor', 'market share', 'differentiation', 'positioning'];
    return compKeywords.filter(keyword => content.toLowerCase().includes(keyword));
  }

  private extractRegulatoryElements(content: string): string[] {
    const regKeywords = ['FDA', 'EMA', 'approval', 'guidance', 'breakthrough therapy'];
    return regKeywords.filter(keyword => content.toLowerCase().includes(keyword));
  }
}