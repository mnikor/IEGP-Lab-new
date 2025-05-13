import axios from 'axios';

/**
 * Performs a web search using the Perplexity API
 * 
 * @param question The search query to send to Perplexity
 * @param domains Optional array of domains to focus search on
 * @returns The search response content and citations
 */
export async function perplexityWebSearch(question: string, domains: string[] | null = null): Promise<{
  content: string;
  citations: string[];
}> {
  try {
    const apiKey = process.env.PPLX_API_KEY;
    if (!apiKey) {
      throw new Error("PPLX_API_KEY environment variable not found");
    }

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
