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
    const apiKey = process.env.PPLX_API_KEY;
    if (!apiKey) {
      throw new Error("PPLX_API_KEY environment variable not found");
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
    throw error;
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
    // Create focused search queries for different aspects
    const searchQueries = [
      // General evidence search
      baseQuery,
      
      // Regulatory status search
      `What is the current regulatory approval status for ${baseQuery.replace('Provide clinical evidence benchmarks for', '')}? Include details about FDA, EMA, and other regulatory bodies approvals, specific indications, and any limitations.`,
      
      // Competitive landscape search
      `What is the competitive landscape and standard of care for ${baseQuery.replace('Provide clinical evidence benchmarks for', '')}? Include information about other treatments, their efficacy, safety profiles, and market positioning.`,
      
      // Recent trials and emerging evidence
      `What are the most recent clinical trials and emerging evidence for ${baseQuery.replace('Provide clinical evidence benchmarks for', '')}? Focus on studies from the last 2-3 years.`
    ];
    
    console.log("Starting multi-round Perplexity search with focused queries...");
    
    // Execute all searches in parallel
    const searchResults = await Promise.all(
      searchQueries.map(query => performSingleSearch(query, domains))
    );
    
    // Combine the results with clear section formatting
    const combinedContent = searchResults.map((result, index) => {
      const sectionTitle = index === 0 ? 'Clinical Evidence' : 
                           index === 1 ? 'Regulatory Status' : 
                           index === 2 ? 'Competitive Landscape' : 'Recent Trials';
      
      // Format the content to highlight key points
      const formattedContent = result.content
        // Highlight study names
        .replace(/\b(CHRYSALIS|PAPILLON|MARIPOSA|TATTON|INSIGHT)\b/g, '**$1**')
        // Format citation references
        .replace(/\[(\d+)\]/g, '[**$1**]')
        // Make percentages and important metrics stand out
        .replace(/(\d+(?:\.\d+)?)%/g, '**$1%**')
        // Add bullets to lists if not already formatted
        .replace(/^(?![\s*•\-])([\w])/gm, '• $1');
      
      return `## Search Round ${index + 1}: ${sectionTitle}\n\n${formattedContent}\n\n`;
    }).join('');
    
    // Consolidate citations, removing duplicates
    const allCitations = searchResults.flatMap(result => result.citations);
    const uniqueCitationsSet = new Set(allCitations);
    const uniqueCitations = Array.from(uniqueCitationsSet);
    
    console.log(`Multi-round search completed. Found ${uniqueCitations.length} unique citations.`);
    
    return {
      content: combinedContent,
      citations: uniqueCitations
    };
  } catch (error) {
    console.error("Error in multi-round Perplexity search:", error);
    throw error;
  }
}
