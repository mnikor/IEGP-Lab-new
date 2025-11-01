import OpenAI from "openai";
import type { Idea } from "@shared/tournament";

const llmEnabled = process.env.PORTFOLIO_SUMMARY_USE_LLM === "true";
let openaiClient: OpenAI | null = null;

async function getOpenAIClient(): Promise<OpenAI> {
  if (!llmEnabled) {
    throw new Error("LLM usage disabled");
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable not found");
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  return openaiClient;
}

/**
 * Simplicity Agent - advocates for operational feasibility and execution simplicity
 * Counterbalances the tendency of other agents to over-engineer study designs
 */
export async function evaluateSimplicity(idea: Idea): Promise<{
  simplicityScore: number; // 0-100, higher = simpler/more feasible
  complexityWarnings: string[];
  simplificationSuggestions: string[];
  operationalRisk: 'low' | 'medium' | 'high';
  recommendation: string;
}> {
  if (!llmEnabled) {
    console.warn("Simplicity agent: LLM disabled, providing heuristic evaluation");
    return {
      simplicityScore: 55,
      complexityWarnings: ["Deterministic assessment: review biomarker and operational complexity manually."],
      simplificationSuggestions: ["Prioritize a single primary endpoint and streamline eligibility criteria."],
      operationalRisk: 'medium',
      recommendation: 'Manual simplification review recommended'
    };
  }

  const prompt = `You are a Simplicity Agent focused on operational feasibility and execution success in clinical trials.

Your role is to counterbalance overengineering tendencies by:
- Identifying unnecessary complexity that increases execution risk
- Advocating for focused, achievable study designs
- Highlighting operational challenges that other experts might overlook

Review this study proposal and provide a critical assessment:

STUDY TITLE: ${idea.title}

STRATEGIC GOALS: ${idea.strategicGoals.join(', ')}

GEOGRAPHY: ${idea.geography.join(', ')}

STUDY PHASE: ${idea.studyPhase}

TARGET SUBPOPULATION: ${idea.targetSubpopulation || 'Not specified'}

COMPARATOR DRUGS: ${idea.comparatorDrugs?.join(', ') || 'Not specified'}

PICO DATA: ${JSON.stringify(idea.picoData)}

INNOVATION JUSTIFICATION: ${idea.innovationJustification || 'Not provided'}

Evaluate for:
1. Design complexity that may hinder execution
2. Multiple moving parts that increase failure risk
3. Operational challenges (recruitment, logistics, data collection)
4. Whether simpler alternatives could achieve similar objectives

Provide your assessment as JSON:
{
  "simplicityScore": <0-100, where 100 is maximally simple and feasible>,
  "complexityWarnings": [<list of specific complexity concerns>],
  "simplificationSuggestions": [<concrete suggestions to reduce complexity>],
  "operationalRisk": "<low/medium/high based on execution difficulty>",
  "recommendation": "<overall recommendation on complexity level>"
}

Focus on practical execution rather than scientific elegance. Simple studies that complete successfully are better than complex studies that fail.`;

  try {
    const client = await getOpenAIClient();
    const response = await client.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      simplicityScore: result.simplicityScore || 50,
      complexityWarnings: result.complexityWarnings || [],
      simplificationSuggestions: result.simplificationSuggestions || [],
      operationalRisk: result.operationalRisk || 'medium',
      recommendation: result.recommendation || 'Review for unnecessary complexity'
    };
  } catch (error) {
    console.error("Error in simplicity evaluation:", error);
    return {
      simplicityScore: 50,
      complexityWarnings: ["Unable to evaluate complexity"],
      simplificationSuggestions: ["Consider simplifying study design"],
      operationalRisk: 'medium',
      recommendation: 'Manual review recommended'
    };
  }
}

/**
 * Calculate complexity penalty for tournament scoring
 * Higher complexity reduces the overall tournament score
 */
export function calculateComplexityPenalty(simplicityScore: number, operationalRisk: string): number {
  // Convert simplicity score to penalty (inverse relationship)
  const baseComplexityPenalty = (100 - simplicityScore) / 100; // 0-1 scale
  
  // Additional penalty based on operational risk
  const riskPenalty = {
    'low': 0,
    'medium': 0.1,
    'high': 0.25
  };
  
  return Math.min(0.4, baseComplexityPenalty * 0.3 + (riskPenalty[operationalRisk as keyof typeof riskPenalty] || 0));
}

/**
 * Generate simplified alternative study design
 */
export async function generateSimplifiedAlternative(idea: Idea): Promise<string> {
  if (!llmEnabled) {
    console.warn("Simplicity agent: LLM disabled, returning deterministic alternative");
    return "Recommend a streamlined Phase II randomized study focusing on one primary endpoint with standard-of-care comparator.";
  }

  const prompt = `Given this potentially overengineered study design, propose a simplified alternative that maintains scientific rigor while reducing operational complexity:

CURRENT STUDY: ${idea.title}
STRATEGIC GOALS: ${idea.strategicGoals.join(', ')}
INNOVATION JUSTIFICATION: ${idea.innovationJustification || 'Not provided'}

Create a simplified version that:
- Reduces the number of moving parts
- Focuses on a single primary objective
- Uses standard, proven methodologies
- Minimizes biomarker complexity
- Avoids unnecessary adaptive elements
- Prioritizes execution feasibility

Provide a concise alternative study design (2-3 sentences) that could achieve similar scientific objectives with lower execution risk.`;

  try {
    const client = await getOpenAIClient();
    const response = await client.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4
    });

    return response.choices[0].message.content || 'Consider a standard Phase II randomized study with single primary endpoint.';
  } catch (error) {
    console.error("Error generating simplified alternative:", error);
    return 'Consider a standard Phase II randomized study with single primary endpoint.';
  }
}