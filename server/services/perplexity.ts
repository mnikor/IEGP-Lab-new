import axios from 'axios';

interface PerplexitySearchResult {
  content: string;
  citations: string[];
}

/**
 * Performs a single web search using the Perplexity API
 * 
 * @param question The search query to send to Perplexity
 * @param domains Optional array of domains to focus search on
 * @param useDeepResearch Whether to use deep research mode for more comprehensive results
 * @returns The search response content and citations
 */
async function performSingleSearch(question: string, domains: string[] | null = null, useDeepResearch: boolean = false): Promise<PerplexitySearchResult> {
  try {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      throw new Error("PERPLEXITY_API_KEY environment variable not found");
    }

    console.log(`Performing Perplexity ${useDeepResearch ? 'Deep Research' : 'search'} with query: "${question}"`);
    
    const payload = {
      model: useDeepResearch ? "sonar-deep-research" : "sonar",
      messages: [
        {
          role: "system",
          content: useDeepResearch 
            ? "You are a senior clinical research expert conducting comprehensive analysis. Provide exhaustive, evidence-based information from multiple reputable sources. Include detailed citations, analyze conflicting evidence, identify research gaps, and provide strategic insights. Structure your response with clear sections, bold headings, and actionable recommendations."
            : "You are a clinical research expert. Provide detailed, evidence-based information from reputable sources. Include citations for all claims and prioritize recent studies and high-quality evidence."
        },
        {
          role: "user",
          content: useDeepResearch 
            ? `Conduct a comprehensive research analysis on: ${question}. 

Please provide a detailed analysis including:
1. **Current State of Evidence**: Latest clinical studies, trials, and research findings with ACTUAL trial numbers (NCT, EudraCT, etc.)
2. **Ongoing Trials**: SPECIFIC ongoing clinical trials with real NCT numbers, enrollment status, and study details
3. **Key Research Insights**: Recent breakthrough studies and their clinical implications  
4. **Regulatory Landscape**: FDA/EMA guidance, approval precedents, and regulatory considerations
5. **Market Dynamics**: Competitive landscape, market access factors, and commercial considerations
6. **Risk Assessment**: Safety profiles, risk management strategies, and mitigation approaches
7. **Strategic Recommendations**: Evidence-based recommendations for clinical development

IMPORTANT: When reporting ongoing trials, provide REAL NCT numbers and specific enrollment details from ClinicalTrials.gov. Do not use hypothetical examples.
Structure your response with bold headings and provide specific, actionable insights with proper citations.`
            : question
        }
      ],
      return_citations: true,
      return_images: false,
      return_related_questions: false,
      search_domain_filter: domains && domains.length > 0 ? domains : undefined,
      search_recency_filter: "year",
      temperature: useDeepResearch ? 0.1 : 0.2,
      max_tokens: useDeepResearch ? 4000 : 2000,
      top_p: 0.9,
      stream: false,
      frequency_penalty: 1
    };

    const response = await axios.post(
      "https://api.perplexity.ai/chat/completions",
      payload,
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        timeout: 30000 // 30 second timeout
      }
    );

    console.log(`Perplexity API response received for query: "${question}"`);
    
    if (!response.data || !response.data.choices || !response.data.choices[0]) {
      throw new Error("Invalid response structure from Perplexity API");
    }

    const content = response.data.choices[0].message.content;
    const citations = response.data.citations || [];
    
    if (!content) {
      throw new Error("Empty content received from Perplexity API");
    }

    console.log(`Perplexity search successful. Content length: ${content.length}, Citations: ${citations.length}`);
    console.log(`First 200 chars of content: ${content.substring(0, 200)}...`);
    console.log(`Citations received: ${JSON.stringify(citations.slice(0, 3))}`);

    return {
      content,
      citations
    };
  } catch (error: any) {
    console.error("Error calling Perplexity API:", error.response?.data || error.message);
    
    // Only use fallback for actual API failures, not for successful responses
    if (error.response?.status === 401) {
      throw new Error("Perplexity API authentication failed - please check API key");
    } else if (error.response?.status === 429) {
      throw new Error("Perplexity API rate limit exceeded - please try again later");
    } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      throw new Error("Perplexity API request timed out - please try again");
    }
    
    // For other errors, throw to be handled by the caller
    throw new Error(`Perplexity API error: ${error.message}`);
  }
}

/**
 * Performs multiple rounds of web searches using the Perplexity API,
 * with each search focusing on a specific aspect of the clinical research
 * 
 * @param baseQuery The base query information (drug, indication, strategic goal)
 * @param domains Optional array of domains to focus search on
 * @returns The combined search results with consolidated citations
 */
export async function perplexityWebSearch(baseQuery: string, domains: string[] | null = null, useDeepResearch: boolean = false): Promise<PerplexitySearchResult> {
  try {
    // Use only the base query to avoid complex query construction issues
    console.log(`Starting ${useDeepResearch ? 'Perplexity Deep Research' : 'simplified Perplexity search'}...`);
    
    // Use a single, clean search query with optional deep research
    const result = await performSingleSearch(baseQuery, domains, useDeepResearch);
    return result;
  } catch (error) {
    console.error("Error in Perplexity search:", error);
    
    // Return fallback response when Perplexity API fails
    return {
      content: `Clinical research guidance for ${baseQuery}:
      
      ## Study Design Considerations
      - Design appropriate for the therapeutic area and indication
      - Consider regulatory precedents and guidance
      - Account for patient population characteristics
      - Select meaningful clinical endpoints
      
      ## Feasibility Factors  
      - Realistic sample size calculations
      - Geographic site distribution
      - Competitive recruitment landscape
      - Timeline and cost projections
      
      Note: Using fallback guidance due to external API limitations.`,
      citations: []
    };
  }
}

/**
 * Specialized function for deep research analysis
 * 
 * @param question The research question
 * @param domains Optional array of domains to focus search on
 * @returns Promise containing comprehensive research results
 */
export async function perplexityDeepResearch(question: string, domains?: string[]): Promise<PerplexitySearchResult> {
  return perplexityWebSearch(question, domains, true);
}
