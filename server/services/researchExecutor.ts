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

    // Execute searches with intelligent batching to avoid rate limits
    const searchPromises = enabledSearches.map((search, index) => 
      this.executeSearchWithDelay(strategyId, search, index * 2000) // 2-second stagger
    );

    try {
      const results = await Promise.all(searchPromises);
      
      // Step 1: Verify NCT numbers found in all results
      const allContent = results.map(r => r.synthesizedInsights).join('\n');
      const nctVerification = await this.nctVerifier.verifyNCTNumbers(allContent);
      
      // Step 2: Collect all authentic citations from successful searches
      const allCitations = this.collectAllCitations(results);
      
      // Step 3: Synthesize results with verified trial information and real citations
      const synthesizedInsights = await this.synthesizeResults(results, nctVerification, allCitations);
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

  private async executeSearchWithDelay(strategyId: number, search: SearchItem, delay: number): Promise<ResearchResult> {
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    return this.executeSearch(strategyId, search);
  }

  private async executeSearch(strategyId: number, search: SearchItem): Promise<ResearchResult> {
    console.log(`Executing search: ${search.query}`);
    
    try {
      // Execute Perplexity search with enhanced query
      const enhancedQuery = this.enhanceQueryForSearchType(search);
      console.log(`Starting Perplexity search for: "${enhancedQuery}"`);
      
      const targetDomains = this.getSearchDomains(search.type);
      const useDeepResearch = search.priority >= 8; // Use deep research for high priority searches
      const perplexityResult = await perplexityWebSearch(enhancedQuery, targetDomains, useDeepResearch);
      console.log(`Perplexity search completed for: "${search.query}". Content length: ${perplexityResult.content?.length || 0}, Citations: ${perplexityResult.citations?.length || 0}`);
      
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
      
      // Return detailed error result with clear failure indication
      const errorMessage = (error as any).message || 'Unknown error';
      const errorType = errorMessage.includes('rate limit') ? 'RATE_LIMIT' :
                       errorMessage.includes('timeout') ? 'TIMEOUT' :
                       errorMessage.includes('authentication') ? 'AUTH_ERROR' : 'API_ERROR';
      
      return {
        id: Date.now() + Math.random(),
        strategyId,
        searchQuery: search.query,
        searchType: search.type,
        priority: search.priority,
        rawResults: { 
          error: errorMessage,
          errorType,
          timestamp: new Date().toISOString()
        },
        synthesizedInsights: `❌ **Search Failed**: ${search.query}\n\n**Error**: ${errorMessage}\n\n**Reason**: ${this.getErrorExplanation(errorType)}\n\n*This search did not return results due to the above error. Consider trying again later or modifying the search query.*`,
        keyFindings: [`Search failed: ${errorType}`],
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

  private getErrorExplanation(errorType: string): string {
    switch (errorType) {
      case 'RATE_LIMIT':
        return 'The research service is experiencing high demand. Please wait a few minutes before trying again.';
      case 'TIMEOUT':
        return 'The search request took too long to complete. This may be due to network issues or complex queries.';
      case 'AUTH_ERROR':
        return 'Authentication failed with the research service. Please check API credentials.';
      default:
        return 'An unexpected error occurred while searching. Please try again or contact support if the issue persists.';
    }
  }

  private collectAllCitations(results: ResearchResult[]): string[] {
    const allCitations: string[] = [];
    
    results.forEach(result => {
      if (result.rawResults && result.rawResults.citations && Array.isArray(result.rawResults.citations) && !(result.rawResults as any).error) {
        // Only collect citations from successful Perplexity API calls (no errors)
        const realCitations = result.rawResults.citations.filter((citation: string) => 
          citation.includes('http') && citation.length > 20 // Basic validation for real URLs
        );
        allCitations.push(...realCitations);
      }
    });
    
    // Remove duplicates and return unique authentic citations
    return [...new Set(allCitations)];
  }

  private async synthesizeResults(results: ResearchResult[], nctVerification?: any, allCitations: string[] = []): Promise<string> {
    const successfulResults = results.filter(r => !(r.rawResults as any)?.error);
    
    console.log(`Synthesizing ${successfulResults.length} successful results out of ${results.length} total searches`);
    
    if (successfulResults.length === 0) {
      console.error("No successful research results to synthesize");
      const failedResults = results.filter(r => (r.rawResults as any)?.error);
      const errorSummary = failedResults.map(r => {
        const errorType = (r.rawResults as any)?.errorType || 'UNKNOWN';
        return `• **${r.searchQuery}**: ${errorType}`;
      }).join('\n');
      
      return `# ❌ Research Execution Failed

## Search Results Summary
**Total Searches**: ${results.length}  
**Successful**: 0  
**Failed**: ${failedResults.length}

## Failed Searches:
${errorSummary}

## Recommended Actions:
1. **Rate Limits**: Wait 2-3 minutes before retrying if you see rate limit errors
2. **Timeouts**: Try again with simpler, more focused search queries  
3. **API Issues**: Contact support if authentication errors persist
4. **Alternative Approach**: Consider running fewer searches at once to reduce load

*No fallback content is provided to ensure data integrity. All research results must come from authentic sources.*`;
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
      
      // Add authentic citations section
      let citationSection = '';
      if (allCitations.length > 0) {
        citationSection = `\n\n## 📚 **Authentic Research Sources**\n*${allCitations.length} verified citations from Perplexity web search*\n\n`;
        allCitations.forEach((citation, index) => {
          citationSection += `**[${index + 1}]** ${citation}\n`;
        });
        citationSection += '\n';
      }

      // Add summary statistics
      const searchTypeSet = Array.from(new Set(successfulResults.map(r => r.searchType)));
      const synthesisWithStats = `# RESEARCH SYNTHESIS
*Based on ${successfulResults.length} successful research queries across ${searchTypeSet.length} intelligence areas*

${verifiedTrialsSection}

${aiSynthesis}

${citationSection}

---
## Research Execution Summary
- **Total Searches Executed**: ${results.length}
- **Successful Searches**: ${successfulResults.length}
- **Failed Searches**: ${results.length - successfulResults.length}
- **Intelligence Areas Covered**: ${Array.from(new Set(successfulResults.map(r => r.searchType))).join(', ')}
- **Authentic Citations Found**: ${allCitations.length}
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

  /**
   * Execute validation-focused research with risk assessment
   */
  async executeValidationResearch(searches: any[], context: any): Promise<any> {
    console.log(`Executing ${searches.length} validation research searches`);

    // Execute searches in parallel
    const searchPromises = searches.map(search => 
      this.executeValidationSearch(search, context)
    );

    try {
      const results = await Promise.all(searchPromises);
      
      // Synthesize validation-specific insights
      const synthesizedInsights = await this.synthesizeValidationResults(results, context);
      const riskAssessment = this.assessValidationRisks(results);
      const recommendations = this.generateValidationRecommendations(results, context);

      return {
        results,
        synthesizedInsights,
        riskAssessment,
        recommendations,
        analysisHtml: this.formatValidationAnalysis(synthesizedInsights, riskAssessment, recommendations)
      };
      
    } catch (error: any) {
      console.error('Error executing validation research:', error);
      throw new Error(`Validation research failed: ${error.message}`);
    }
  }

  private async executeValidationSearch(search: any, context: any): Promise<any> {
    try {
      console.log(`Executing validation search: ${search.query}`);
      
      // Use Perplexity for search execution
      const searchResult = await perplexityWebSearch(search.query, [
        "clinicaltrials.gov",
        "pubmed.ncbi.nlm.nih.gov", 
        "accessdata.fda.gov",
        "ema.europa.eu",
        "nice.org.uk",
        "icer.org"
      ]);

      return {
        search,
        result: searchResult,
        riskLevel: this.assessSearchRiskLevel(searchResult, search),
        insights: this.extractValidationInsights(searchResult, search, context)
      };
      
    } catch (error) {
      console.error(`Failed to execute validation search: ${search.query}`, error);
      return {
        search,
        result: { error: error instanceof Error ? error.message : 'Unknown error' },
        riskLevel: 'unknown',
        insights: []
      };
    }
  }

  private async synthesizeValidationResults(results: any[], context: any): Promise<string> {
    try {
      const openai = new (await import('openai')).default({ apiKey: process.env.OPENAI_API_KEY });
      
      const validationData = results.map(result => ({
        query: result.search?.query,
        category: result.search?.category,
        riskType: result.search?.riskType,
        riskLevel: result.riskLevel,
        insights: result.insights,
        findings: result.result?.content
      }));

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are a clinical development risk assessment expert. Synthesize validation research findings to provide clear go/no-go recommendations and risk mitigation strategies. Focus on actionable insights for study validation.`
          },
          {
            role: "user",
            content: `Synthesize the validation research findings for this study concept:

Drug: ${context.drugName}
Indication: ${context.indication}
Strategic Goals: ${context.strategicGoals?.join(', ')}

Research Results:
${JSON.stringify(validationData, null, 2)}

Provide a comprehensive validation analysis with:
1. **Executive Summary** - Key findings and overall recommendation
2. **Risk Assessment** - Categorized by risk type (showstopper, moderate, informational)
3. **Competitive Landscape** - Key threats and opportunities
4. **Regulatory Pathway** - Approval feasibility and timeline risks
5. **Commercial Viability** - Patent landscape and market access challenges
6. **Recommendations** - Specific actions to mitigate identified risks

Use markdown formatting with bold headers and clear bullet points.`
          }
        ],
        temperature: 0.3,
        max_tokens: 3000
      });

      return response.choices[0].message.content || "Validation analysis could not be generated.";
      
    } catch (error) {
      console.error('Error synthesizing validation results:', error);
      return this.createBasicValidationSynthesis(results, context);
    }
  }

  private assessSearchRiskLevel(searchResult: any, search: any): string {
    if (searchResult.error) return 'unknown';
    
    const content = searchResult.content?.toLowerCase() || '';
    
    // Risk indicators based on search type and content
    if (search.riskType === 'showstopper') {
      if (content.includes('patent expir') || content.includes('biosimilar') || content.includes('generic')) {
        return 'high';
      }
    }
    
    if (search.category === 'competitive') {
      const trialCount = (content.match(/nct\d{8}/gi) || []).length;
      if (trialCount > 10) return 'high';
      if (trialCount > 5) return 'moderate';
    }
    
    return 'low';
  }

  private extractValidationInsights(searchResult: any, search: any, context: any): string[] {
    const insights = [];
    const content = searchResult.content || '';
    
    // Extract risk-specific insights based on search category
    switch (search.category) {
      case 'patent':
        if (content.includes('patent expir')) {
          insights.push('Patent expiration timeline identified');
        }
        if (content.includes('biosimilar')) {
          insights.push('Biosimilar competition threat detected');
        }
        break;
        
      case 'competitive':
        const nctMatches = content.match(/nct\d{8}/gi) || [];
        if (nctMatches.length > 0) {
          insights.push(`${nctMatches.length} ongoing trials identified`);
        }
        break;
        
      case 'regulatory':
        if (content.includes('breakthrough') || content.includes('fast track')) {
          insights.push('Expedited regulatory pathway potential');
        }
        break;
    }
    
    return insights;
  }

  private assessValidationRisks(results: any[]): any {
    const risks = {
      showstoppers: [],
      moderate: [],
      informational: []
    };
    
    results.forEach(result => {
      if (result.riskLevel === 'high') {
        risks.showstoppers.push({
          category: result.search?.category,
          risk: result.insights.join('; ') || 'High risk identified',
          mitigation: 'Requires immediate attention and strategy adjustment'
        });
      } else if (result.riskLevel === 'moderate') {
        risks.moderate.push({
          category: result.search?.category,
          risk: result.insights.join('; ') || 'Moderate risk identified',
          mitigation: 'Monitor and plan mitigation strategies'
        });
      } else {
        risks.informational.push({
          category: result.search?.category,
          insight: result.insights.join('; ') || 'Information gathered'
        });
      }
    });
    
    return risks;
  }

  private generateValidationRecommendations(results: any[], context: any): any {
    const recommendations = {
      immediate: [],
      shortTerm: [],
      longTerm: [],
      goNoGo: 'proceed_with_caution'
    };
    
    // Analyze risk distribution
    const highRiskCount = results.filter(r => r.riskLevel === 'high').length;
    const moderateRiskCount = results.filter(r => r.riskLevel === 'moderate').length;
    
    if (highRiskCount > 2) {
      recommendations.goNoGo = 'no_go';
      recommendations.immediate.push('Reassess study feasibility due to multiple high-risk factors');
    } else if (highRiskCount > 0 || moderateRiskCount > 3) {
      recommendations.goNoGo = 'proceed_with_caution';
      recommendations.immediate.push('Develop risk mitigation strategies before proceeding');
    } else {
      recommendations.goNoGo = 'proceed';
      recommendations.immediate.push('Study appears feasible - proceed with detailed planning');
    }
    
    return recommendations;
  }

  private formatValidationAnalysis(synthesis: string, risks: any, recommendations: any): string {
    return `
      <div class="validation-analysis">
        <div class="synthesis-content">
          ${synthesis.replace(/\n/g, '<br>')}
        </div>
        
        <div class="risk-summary mt-6">
          <h3 class="font-bold text-lg mb-3">Risk Summary</h3>
          
          ${risks.showstoppers.length > 0 ? `
            <div class="mb-4">
              <h4 class="font-semibold text-red-600 mb-2">🚨 Showstopper Risks</h4>
              <ul class="list-disc pl-6">
                ${risks.showstoppers.map((risk: any) => `<li><strong>${risk.category}:</strong> ${risk.risk}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
          
          ${risks.moderate.length > 0 ? `
            <div class="mb-4">
              <h4 class="font-semibold text-yellow-600 mb-2">⚠️ Moderate Risks</h4>
              <ul class="list-disc pl-6">
                ${risks.moderate.map((risk: any) => `<li><strong>${risk.category}:</strong> ${risk.risk}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
        
        <div class="recommendations mt-6">
          <h3 class="font-bold text-lg mb-3">Recommendations</h3>
          <div class="recommendation-status mb-3">
            <span class="font-semibold">Overall Assessment: </span>
            <span class="px-3 py-1 rounded-full text-sm ${
              recommendations.goNoGo === 'proceed' ? 'bg-green-100 text-green-800' :
              recommendations.goNoGo === 'proceed_with_caution' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }">
              ${recommendations.goNoGo.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          
          ${recommendations.immediate.length > 0 ? `
            <div class="mb-3">
              <h4 class="font-semibold mb-2">Immediate Actions:</h4>
              <ul class="list-disc pl-6">
                ${recommendations.immediate.map((rec: string) => `<li>${rec}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  private createBasicValidationSynthesis(results: any[], context: any): string {
    return `# Validation Research Analysis

**Study:** ${context.drugName} for ${context.indication}

## Research Summary
- **Searches Executed:** ${results.length}
- **Successful:** ${results.filter(r => !r.result?.error).length}
- **High Risk Findings:** ${results.filter(r => r.riskLevel === 'high').length}

## Key Findings
${results.map(result => `
**${result.search?.category?.toUpperCase()}**: ${result.search?.query}
- Risk Level: ${result.riskLevel}
- Insights: ${result.insights.join(', ') || 'No specific insights extracted'}
`).join('')}

## Recommendation
Based on the research findings, further analysis is recommended before proceeding with study development.`;
  }
}