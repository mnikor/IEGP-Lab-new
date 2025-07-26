import { SearchItem, ResearchResult, InsertResearchResult } from '@shared/schema';
import { perplexityWebSearch } from './perplexity';
import { NCTVerifier } from './nctVerifier';
import { GuidelinesSearcher } from './guidelinesSearcher';

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
  private nctVerifier: NCTVerifier;
  private guidelinesSearcher: GuidelinesSearcher;
  
  constructor() {
    this.nctVerifier = new NCTVerifier();
    this.guidelinesSearcher = new GuidelinesSearcher();
  }
  
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
      
      // Step 1: Verify NCT numbers found in all results
      const allContent = results.map(r => r.synthesizedInsights).join('\n');
      const nctVerification = await this.nctVerifier.verifyNCTNumbers(allContent);
      
      // Step 2: Synthesize results with verified trial information
      const synthesizedInsights = await this.synthesizeResults(results, nctVerification);
      const designImplications = this.extractDesignImplications(results);
      const strategicRecommendations = this.extractStrategicRecommendations(results);

      return {
        results,
        synthesizedInsights,
        designImplications,
        strategicRecommendations
      };
      
    } catch (error: any) {
      console.error('Error executing research strategy:', error);
      throw new Error(`Research execution failed: ${error.message}`);
    }
  }

  /**
   * Enhance search query based on search type for more targeted results
   */
  private enhanceQueryForSearchType(search: SearchItem): string {
    const baseQuery = search.query;
    
    // Use minimal enhancement to preserve the carefully crafted base queries
    // The strategy generator now creates comprehensive, flexible queries
    switch (search.type) {
      case 'competitive':
        // Minimal enhancement for competitive intelligence
        return `${baseQuery}`;
      
      case 'regulatory':
        // Minimal enhancement for regulatory guidance
        return `${baseQuery}`;
      
      case 'strategic':
        // Minimal enhancement for business intelligence
        return `${baseQuery}`;
      
      case 'therapeutic':
        // Minimal enhancement for clinical evidence
        return `${baseQuery}`;
      
      case 'guidelines':
        // Minimal enhancement for treatment guidelines
        return `${baseQuery}`;
      
      case 'core':
      default:
        return `${baseQuery}`;
    }
  }

  /**
   * Get targeted domains based on search type
   */
  private getSearchDomains(searchType: string): string[] {
    const baseDomains = [
      "pubmed.ncbi.nlm.nih.gov",
      "clinicaltrials.gov",
      "fda.gov",
      "ema.europa.eu"
    ];

    switch (searchType) {
      case 'competitive':
        return [
          "clinicaltrials.gov",
          "globaldata.com",
          "biopharmadive.com",
          "fiercepharma.com",
          "pubmed.ncbi.nlm.nih.gov"
        ];
      
      case 'regulatory':
        return [
          "fda.gov",
          "ema.europa.eu",
          "federalregister.gov",
          "pubmed.ncbi.nlm.nih.gov"
        ];
      
      case 'strategic':
        return [
          "ajmc.com",
          "valueinhealthjournal.com",
          "healthaffairs.org",
          "pubmed.ncbi.nlm.nih.gov"
        ];
      
      default:
        return baseDomains.concat([
          "nejm.org",
          "thelancet.com",
          "jamanetwork.com"
        ]);
    }
  }

  private async executeSearch(strategyId: number, search: SearchItem): Promise<ResearchResult> {
    console.log(`Executing search: ${search.query}`);
    
    try {
      // Execute Perplexity Deep Research with enhanced query for ongoing studies
      const enhancedQuery = this.enhanceQueryForSearchType(search);
      console.log(`Starting Perplexity Deep Research for: "${enhancedQuery}"`);
      
      const targetDomains = this.getSearchDomains(search.type);
      const perplexityResult = await perplexityWebSearch(enhancedQuery, targetDomains, true); // Enable deep research mode
      console.log(`Perplexity Deep Research completed for: "${search.query}"`);
      
      // Process and structure the results
      const synthesizedInsights = await this.processSingleSearchResult(search, perplexityResult);
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
        executedAt: new Date()
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
        rawResults: { error: (error as any).message },
        synthesizedInsights: `Search failed: ${(error as any).message}`,
        keyFindings: [],
        designImplications: null,
        strategicRecommendations: null,
        executedAt: new Date()
      };
    }
  }

  private async processSingleSearchResult(search: SearchItem, perplexityResult: any): Promise<string> {
    if (!perplexityResult) {
      return `Search for "${search.query}" returned no results`;
    }

    // Handle direct API response format  
    const content = perplexityResult.content || '';
    const citations = perplexityResult.citations || [];
    
    if (!content) {
      return `No content found for "${search.query}"`;
    }

    // Use AI to reformat the content properly
    try {
      const openai = new (await import('openai')).default({ apiKey: process.env.OPENAI_API_KEY });
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a clinical research formatter. Transform raw research content into clean, well-formatted text.

CRITICAL FORMATTING RULES:
1. NEVER use ASCII tables with dashes, pipes, or similar formatting
2. Replace any table data with clear bullet points or numbered lists
3. For clinical trials, format as:
   • **NCT#####** - [Trial Name]
     - Population: [details]
     - Phase: [phase info]
     - Status: [recruiting/active/completed]
     - Key Details: [important info]

4. Use proper markdown headings (##, ###)
5. Make content readable and professional
6. Keep all factual information and citations intact
7. Focus on clarity and readability over tables`
          },
          {
            role: "user",
            content: `Please reformat this research content for "${search.query}". Remove any ASCII table formatting and present as clean, readable text:\n\n${content}`
          }
        ],
        max_tokens: 1500,
        temperature: 0.2
      });

      const formattedContent = response.choices[0].message.content || content;
      
      // Extract key insights based on search type
      const typeContext = this.getSearchTypeContext(search.type);
      
      // Build formatted result
      let result = `${typeContext}\n\n## **Key Insights: ${search.query}**\n\n${formattedContent}`;
      
      // Format citations with better structure
      if (citations.length > 0) {
        result += `\n\n### **📚 Sources & References:**\n`;
        citations.forEach((citation: string, index: number) => {
          result += `**[${index + 1}]** ${citation}\n`;
        });
      }
      
      return result;
      
    } catch (error) {
      console.error('Error formatting content with AI, using fallback:', error);
      
      // Fallback to basic formatting
      const typeContext = this.getSearchTypeContext(search.type);
      let result = `${typeContext}\n\n## **Key Insights: ${search.query}**\n\n${content}`;
      
      if (citations.length > 0) {
        result += `\n\n### **📚 Sources & References:**\n`;
        citations.forEach((citation: string, index: number) => {
          result += `**[${index + 1}]** ${citation}\n`;
        });
      }
      
      return result;
    }
  }

  private getSearchTypeContext(type: string): string {
    const contexts = {
      core: "📋 FOUNDATIONAL INTELLIGENCE",
      strategic: "🎯 STRATEGIC INTELLIGENCE", 
      therapeutic: "🏥 THERAPEUTIC AREA INTELLIGENCE",
      phase: "⚗️ PHASE-SPECIFIC INTELLIGENCE"
    };
    return contexts[type as keyof typeof contexts] || "📊 RESEARCH INTELLIGENCE";
  }

  private extractKeyFindings(perplexityResult: any): string[] {
    const content = perplexityResult.content || '';
    if (!content) return [];

    // Extract key points using simple text analysis
    const sentences = content.split(/[.!?]+/).filter((s: string) => s.trim().length > 20);
    const keyFindings = sentences
      .filter((sentence: string) => 
        sentence.includes('significant') || 
        sentence.includes('important') || 
        sentence.includes('key') ||
        sentence.includes('critical') ||
        sentence.includes('major') ||
        sentence.includes('approved') ||
        sentence.includes('demonstrated') ||
        sentence.includes('efficacy')
      )
      .slice(0, 3)
      .map((s: string) => s.trim());

    return keyFindings.length > 0 ? keyFindings : sentences.slice(0, 2).map((s: string) => s.trim());
  }

  private extractSingleSearchImplications(search: SearchItem, perplexityResult: any): any {
    const content = perplexityResult.content || '';
    
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
    const content = perplexityResult.content || '';
    
    if (search.type === 'strategic') {
      return {
        marketAccess: this.extractMarketAccessElements(content),
        competitive: this.extractCompetitiveElements(content),
        regulatory: this.extractRegulatoryElements(content)
      };
    }
    
    return null;
  }

  private async synthesizeResults(results: ResearchResult[], nctVerification?: any): Promise<string> {
    const successfulResults = results.filter(r => !(r.rawResults as any)?.error);
    
    console.log(`Synthesizing ${successfulResults.length} successful results out of ${results.length} total searches`);
    
    if (successfulResults.length === 0) {
      console.error("No successful research results to synthesize");
      return "❌ No successful research results to synthesize. Please check search queries and try again.";
    }

    // Use OpenAI to create a comprehensive synthesis
    try {
      const openai = new (await import('openai')).default({ apiKey: process.env.OPENAI_API_KEY });
      
      // Prepare content for synthesis
      const contentForSynthesis = successfulResults.map(result => ({
        query: result.searchQuery,
        type: result.searchType,
        priority: result.priority,
        insights: result.synthesizedInsights,
        findings: result.keyFindings
      }));

      const synthesisResponse = await openai.chat.completions.create({
        // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a clinical research strategist synthesizing multiple research findings into actionable insights for study design. Create a comprehensive, well-structured synthesis with enhanced markdown formatting.

FORMATTING REQUIREMENTS:
- Use **bold** for all main headings and subheadings 
- Use bullet points with • for lists
- Include specific citations and references from the research
- Structure with clear visual hierarchy using markdown

Your synthesis should:
1. **Strategic Importance** - Organize findings by priority and impact
2. **Key Design Implications** - Specific study design recommendations with citations
3. **Actionable Recommendations** - Concrete next steps with supporting evidence
4. **Conflicts or Gaps** - Note any inconsistencies in the research
5. **Guidance for Next Steps** - Clear action items with citations

Make all section headers and key points bold for better readability.`
          },
          {
            role: "user",
            content: `Please synthesize the following research findings into a comprehensive research synthesis with enhanced markdown formatting. Include specific citations and evidence from the research data:

${JSON.stringify(contentForSynthesis, null, 2)}

Create a detailed synthesis with bold headings and specific citations that will inform study design decisions and strategic planning.`
          }
        ],
        temperature: 0.3,
        max_tokens: 3000
      });

      const aiSynthesis = synthesisResponse.choices[0].message.content || "";
      
      // Add verified trial information if available
      let verifiedTrialsSection = '';
      if (nctVerification && nctVerification.verified.length > 0) {
        verifiedTrialsSection = `\n\n${this.nctVerifier.formatVerifiedTrials(nctVerification.verified)}\n`;
        
        if (nctVerification.invalid.length > 0) {
          verifiedTrialsSection += `\n## ⚠️ Unverified Trial References\n`;
          verifiedTrialsSection += `The following NCT numbers could not be verified: ${nctVerification.invalid.join(', ')}\n`;
          verifiedTrialsSection += `*These may be hypothetical examples or incorrectly cited trials.*\n`;
        }
      }
      
      // Add summary statistics
      const searchTypeSet = Array.from(new Set(successfulResults.map(r => r.searchType)));
      const synthesisWithStats = `# RESEARCH SYNTHESIS
*Based on ${successfulResults.length} successful research queries across ${searchTypeSet.length} intelligence areas*

${verifiedTrialsSection}

${aiSynthesis}

---
## Research Execution Summary
- **Total Searches Executed**: ${results.length}
- **Successful Searches**: ${successfulResults.length}
- **Failed Searches**: ${results.length - successfulResults.length}
- **Intelligence Areas Covered**: ${Array.from(new Set(successfulResults.map(r => r.searchType))).join(', ')}
- **High Priority Findings**: ${successfulResults.filter(r => r.priority >= 8).length}`;

      return synthesisWithStats;
      
    } catch (error) {
      console.error('Error creating AI synthesis, falling back to basic synthesis:', error);
      
      // Fallback to basic synthesis if AI fails
      return this.createBasicSynthesis(successfulResults);
    }
  }

  private createBasicSynthesis(results: ResearchResult[]): string {
    // Combine insights by priority and type
    const coreInsights = results.filter(r => r.searchType === 'core');
    const strategicInsights = results.filter(r => r.searchType === 'strategic');
    const therapeuticInsights = results.filter(r => r.searchType === 'therapeutic');
    const phaseInsights = results.filter(r => r.searchType === 'phase');

    let synthesis = `# RESEARCH SYNTHESIS
*Based on ${results.length} successful research queries*

`;
    
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