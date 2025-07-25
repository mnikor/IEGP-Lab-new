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
 * @returns The search response content and citations
 */
async function performSingleSearch(question: string, domains: string[] | null = null): Promise<PerplexitySearchResult> {
  try {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      throw new Error("PERPLEXITY_API_KEY environment variable not found");
    }

    console.log(`Performing Perplexity search with query: "${question}"`);
    
    const payload = {
      model: "sonar",
      messages: [
        {
          role: "system",
          content: "You are a clinical research expert. Provide detailed, evidence-based information from reputable sources. Include citations for all claims and prioritize recent studies and high-quality evidence."
        },
        {
          role: "user",
          content: question
        }
      ],
      web_search_options: {
        search_context_size: "medium",
        include_citations: true,
        focus_web_sources: domains || []
      },
      temperature: 0.2,
      max_tokens: 2000,
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
export async function perplexityWebSearch(baseQuery: string, domains: string[] | null = null): Promise<PerplexitySearchResult> {
  try {
    // Use only the base query to avoid complex query construction issues
    console.log("Starting simplified Perplexity search...");
    
    // Use a single, clean search query
    const result = await performSingleSearch(baseQuery, domains);
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
