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
      model: "llama-3.1-sonar-small-128k-online",
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
        }
      }
    );

    return {
      content: response.data.choices[0].message.content,
      citations: response.data.citations || []
    };
  } catch (error) {
    console.error("Error calling Perplexity API:", error);
    
    // If Perplexity API fails, return a fallback response
    return {
      content: `Clinical research information for ${question.substring(0, 100)}... 
      
      This study design should consider:
      - Standard regulatory requirements for the indication
      - Appropriate patient population and sample size
      - Established endpoints and outcomes
      - Cost-effective site selection and geographic distribution
      - Realistic timelines and recruitment projections
      
      Note: External API unavailable - using fallback guidance.`,
      citations: []
    };
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
