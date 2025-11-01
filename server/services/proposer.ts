import OpenAI from "openai";
import { Idea, InsertIdea, Review } from "@shared/tournament";
import { calculateFeasibility } from "./feasibilityCalculator";

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
 * Generates a challenger idea based on a champion and its reviews
 * 
 * @param champion The current champion idea
 * @param reviews All reviews for the champion
 * @param round The current tournament round
 * @returns A new challenger idea
 */
export async function generateChallenger(
  champion: Idea,
  reviews: Review[],
  round: number
): Promise<InsertIdea> {
  try {
    if (!llmEnabled) {
      console.warn("Proposer: LLM disabled, generating heuristic challenger");
      return buildDeterministicChallenger(champion, reviews, round);
    }

    // Build the prompt for challenger generation
    const prompt = buildChallengerPrompt(champion, reviews);

    // Generate challenger using OpenAI
    const client = await getOpenAIClient();
    const response = await client.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { 
          role: "system", 
          content: `You are a clinical study concept improver. Your job is to analyze the strengths and weaknesses of a study concept and create an improved version that addresses the concerns while maintaining its strengths. Focus on innovations that make meaningful improvements to the concept.` 
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 1.2, // Higher temperature for more creative challengers
    });

    // Parse the response
    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Generate the challenger ID based on the champion ID
    const nextVersionNumber = round + 1;
    const laneId = champion.laneId;
    const ideaId = `${String.fromCharCode(65 + laneId)}_v${nextVersionNumber}`; // A_v2, B_v2, etc.
    
    // Create the challenger idea with improvements
    type SwotArray = string[];
    type SwotKeys = 'strengths' | 'weaknesses' | 'opportunities' | 'threats';
    const swotFromResult: Partial<Record<SwotKeys, SwotArray>> = (result.swotAnalysis ?? {}) as Partial<Record<SwotKeys, SwotArray>>;
    const castArray = (value: SwotArray | undefined, fallback: SwotArray): SwotArray =>
      Array.isArray(value) ? value : fallback;
    const swotStrengths = castArray(swotFromResult['strengths'], champion.swotAnalysis?.strengths || []);
    const swotWeaknesses = castArray(swotFromResult['weaknesses'], champion.swotAnalysis?.weaknesses || []);
    const swotOpportunities = castArray(swotFromResult['opportunities'], champion.swotAnalysis?.opportunities || []);
    const swotThreats = castArray(swotFromResult['threats'], champion.swotAnalysis?.threats || []);

    const challenger: InsertIdea = {
      ideaId,
      tournamentId: champion.tournamentId,
      laneId: champion.laneId,
      round: round,
      isChampion: false, // Challengers start as non-champions
      parentIdeaId: champion.ideaId, // Reference to the parent champion
      
      // Core study concept details - use provided values or fallback to champion values
      title: result.title || `Improved ${champion.title} (Round ${round + 1})`,
      drugName: result.drugName || champion.drugName,
      indication: result.indication || champion.indication,
      strategicGoals: result.strategicGoals || champion.strategicGoals,
      geography: result.geography || champion.geography,
      studyPhase: result.studyPhase || champion.studyPhase,
      
      // These fields should ideally be improved based on feedback
      targetSubpopulation: result.targetSubpopulation || champion.targetSubpopulation,
      comparatorDrugs: result.comparatorDrugs || champion.comparatorDrugs,
      knowledgeGapAddressed: result.knowledgeGapAddressed || champion.knowledgeGapAddressed,
      innovationJustification: result.innovationJustification || champion.innovationJustification,
      
      // Study design details - use provided values or fallback to champion values
      picoData: result.picoData || champion.picoData,
      mcdaScores: result.mcdaScores || champion.mcdaScores,
      
      // The SWOT analysis should reflect the improvements made
      swotAnalysis: {
        strengths: swotStrengths,
        weaknesses: swotWeaknesses,
        opportunities: swotOpportunities,
        threats: swotThreats
      },
      
      // Feasibility metrics should be adjusted based on improvements
      feasibilityData: result.feasibilityData || champion.feasibilityData,
      
      // Evidence sources may be updated to support the improvements
      evidenceSources: result.evidenceSources || champion.evidenceSources,
      
      // Include improvement rationale if provided
      improvementRationale: result.improvementRationale || `Enhanced version of ${champion.title} addressing reviewer feedback`,
      
      // Track key improvements made if provided
      keyImprovements: result.keyImprovements || [],
      
      // Scoring - will be calculated after review
      overallScore: 0,
      scoreChange: null,
    };

    return challenger;
  } catch (error) {
    console.error("Error generating challenger:", error);
    throw error;
  }
}

function buildDeterministicChallenger(champion: Idea, reviews: Review[], round: number): InsertIdea {
  const nextVersionNumber = round + 1;
  const laneId = champion.laneId;
  const ideaId = `${String.fromCharCode(65 + laneId)}_v${nextVersionNumber}`;

  const aggregatedWeaknesses = reviews.flatMap(review => review.weaknesses || []).slice(0, 3);
  const improvementRationale = aggregatedWeaknesses.length
    ? `Addresses reviewer concerns: ${aggregatedWeaknesses.join("; ")}`
    : `Deterministic improvement of ${champion.title}`;

  const feasibilityData = champion.feasibilityData;

  return {
    ideaId,
    tournamentId: champion.tournamentId,
    laneId: champion.laneId,
    round,
    isChampion: false,
    parentIdeaId: champion.ideaId,
    title: `${champion.title} (Deterministic Challenger)`,
    drugName: champion.drugName,
    indication: champion.indication,
    strategicGoals: champion.strategicGoals,
    geography: champion.geography,
    studyPhase: champion.studyPhase,
    targetSubpopulation: champion.targetSubpopulation,
    comparatorDrugs: champion.comparatorDrugs,
    knowledgeGapAddressed: champion.knowledgeGapAddressed,
    innovationJustification: `${champion.innovationJustification || ""} Deterministic enhancements applied for operational feasibility.`,
    picoData: champion.picoData,
    mcdaScores: champion.mcdaScores,
    swotAnalysis: champion.swotAnalysis,
    feasibilityData,
    evidenceSources: champion.evidenceSources,
    improvementRationale,
    keyImprovements: [
      "Deterministic challenger generated due to LLM disabled mode",
      "Focus on addressing top reviewer weaknesses"
    ],
    overallScore: 0,
    scoreChange: null
  } as InsertIdea;
}

/**
 * Builds a prompt for challenger generation
 */
function buildChallengerPrompt(champion: Idea, reviews: Review[]): string {
  // Calculate average scores by domain to highlight key areas for improvement
  const scoresByDomain: Record<string, number[]> = {};
  
  // Extract domain-specific metrics and collect them
  reviews.forEach(review => {
    Object.entries(review.additionalMetrics || {}).forEach(([key, value]) => {
      if (typeof value === 'number') {
        if (!scoresByDomain[key]) {
          scoresByDomain[key] = [];
        }
        scoresByDomain[key].push(value);
      }
    });
  });
  
  // Calculate averages for each domain
  const domainAverages = Object.entries(scoresByDomain).map(([domain, scores]) => {
    const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return { domain, score: avg };
  }).sort((a, b) => a.score - b.score); // Sort ascending so lowest scores (biggest improvement areas) are first
  
  // Get the lowest scoring domains (biggest improvement opportunities)
  const improvementAreas = domainAverages.slice(0, 3).map(item => item.domain);
  
  // Extract and format reviewer feedback with emphasis on key improvement areas
  const reviewerFeedback = reviews.map(review => {
    return `
    ## ${review.agentId} Review (Score: ${review.score.toFixed(2)})
    ### Strengths:
    ${review.strengths.map(s => `- ${s}`).join('\n')}
    
    ### Weaknesses:
    ${review.weaknesses.map(w => `- ${w}`).join('\n')}
    
    ${Object.entries(review.additionalMetrics || {}).length > 0 ? 
      `### Domain Scores:\n${Object.entries(review.additionalMetrics || {})
        .map(([key, value]) => `- ${key}: ${typeof value === 'number' ? value.toFixed(2) : value}`)
        .join('\n')}` : ''}
    `;
  }).join('\n');
  
  // Create a focused improvement suggestion section
  const improvementFocus = improvementAreas.length > 0 ? 
    `\n# Primary Improvement Areas\nBased on analysis of all reviews, focus improvement efforts on these domains:\n${improvementAreas.map(area => `- ${area.replace(/_/g, ' ')}`).join('\n')}\n` : '';

  return `
  You are a specialized clinical research design expert tasked with creating an improved version of a clinical study concept.
  Analyze the reviewer feedback carefully and create a challenger version that addresses the weaknesses while maintaining or enhancing the strengths.

  # Original Champion Concept
  - Title: ${champion.title}
  - Drug: ${champion.drugName}
  - Indication: ${champion.indication}
  - Strategic Goals: ${champion.strategicGoals.join(', ')}
  - Study Phase: ${champion.studyPhase}
  - Geography: ${champion.geography.join(', ')}
  - Target Subpopulation: ${champion.targetSubpopulation || 'Not specified'}
  - Comparator Drugs: ${champion.comparatorDrugs?.join(', ') || 'Not specified'}
  
  # Knowledge Gap Addressed
  ${champion.knowledgeGapAddressed || 'Not specified'}
  
  # Innovation Justification
  ${champion.innovationJustification || 'Not specified'}
  
  # PICO Framework
  - Population: ${(champion.picoData as any).population || 'Not specified'}
  - Intervention: ${(champion.picoData as any).intervention || 'Not specified'}
  - Comparator: ${(champion.picoData as any).comparator || 'Not specified'}
  - Outcomes: ${(champion.picoData as any).outcomes || 'Not specified'}
  
  # SWOT Analysis
  - Strengths: ${JSON.stringify((champion.swotAnalysis as any).strengths || [])}
  - Weaknesses: ${JSON.stringify((champion.swotAnalysis as any).weaknesses || [])}
  - Opportunities: ${JSON.stringify((champion.swotAnalysis as any).opportunities || [])}
  - Threats: ${JSON.stringify((champion.swotAnalysis as any).threats || [])}
  
  # Feasibility Data
  - Estimated Cost: €${((champion.feasibilityData as any).estimatedCost || 0).toLocaleString() || 'Not specified'}
  - Timeline (months): ${(champion.feasibilityData as any).timeline || 'Not specified'}
  - Projected ROI: ${(champion.feasibilityData as any).projectedROI || 'Not specified'}
  - Recruitment Rate: ${(champion.feasibilityData as any).recruitmentRate || 'Not specified'}
  - Completion Risk: ${(champion.feasibilityData as any).completionRisk || 'Not specified'}
  
  # Reviewer Feedback
  ${reviewerFeedback}
  
  ${improvementFocus}
  
  ## ENHANCEMENT STRATEGY
  Based on the feedback patterns across reviewers, consider these strategic approaches for improvement:
  
  1. For clinical validity weaknesses: Consider refining the scientific rationale, improving endpoint selection, or adjusting inclusion/exclusion criteria to better match the study objectives.
  
  2. For statistical concerns: Consider optimizing sample size calculations, enhancing power analysis, adding adaptive design elements, or incorporating interim analyses for more robust results.
  
  3. For safety issues: Consider implementing additional monitoring procedures, refining safety endpoints, or strengthening risk management plans based on the drug's known safety profile.
  
  4. For regulatory challenges: Consider clarifying approval pathways, enhancing compliance with regulatory guidelines, or strengthening documentation plans for submissions.
  
  5. For economic value questions: Consider strengthening the value proposition, enhancing outcomes relevant to payers, or adding health economic endpoints to demonstrate cost-effectiveness.
  
  6. For operational feasibility problems: Consider simplifying procedures, improving recruitment strategies, or enhancing site support to improve study execution.
  
  ## CRITICAL INSTRUCTIONS:
  1. FIRST, synthesize the feedback across all domains to identify recurring themes and critical weaknesses to address.
  
  2. SECOND, prioritize improvements that will have the greatest impact on overall study quality, feasibility, and alignment with strategic goals.
  
  3. THIRD, create a challenger concept that represents a significant evolution of the champion, not just minor tweaks.
  
  4. FOURTH, ensure your proposal maintains scientific integrity and clinical relevance while addressing practical concerns.
  
  Create a JSON object representing the improved challenger concept with the following format:
  {
    "title": "A descriptive title for the improved study",
    "drugName": "The drug name",
    "indication": "The indication",
    "strategicGoals": ["Array of strategic goals"],
    "geography": ["Array of geography codes"],
    "studyPhase": "The study phase",
    "targetSubpopulation": "The improved target subpopulation",
    "comparatorDrugs": ["Improved array of comparator drugs"],
    "knowledgeGapAddressed": "Improved explanation of the knowledge gap",
    "innovationJustification": "Improved explanation of the innovation",
    "picoData": {
      "population": "Improved description of the population",
      "intervention": "Improved description of the intervention",
      "comparator": "Improved description of the comparator",
      "outcomes": "Improved description of the outcomes"
    },
    "mcdaScores": {
      "scientificValidity": 4.0,
      "clinicalImpact": 4.2,
      "commercialValue": 3.9,
      "feasibility": 3.7,
      "overall": 3.95
    },
    "swotAnalysis": {
      "strengths": ["Improved Strength 1", "Improved Strength 2", "New Strength"],
      "weaknesses": ["Remaining Weakness 1", "New but Lesser Weakness"],
      "opportunities": ["Improved Opportunity 1", "New Opportunity"],
      "threats": ["Reduced Threat 1", "New but Lesser Threat"]
    },
    "feasibilityData": {
      "estimatedCost": 2500000,
      "timeline": 22,
      "projectedROI": 2.8,
      "recruitmentRate": 0.8,
      "completionRisk": 0.25
    },
    "evidenceSources": [
      {
        "title": "Source title",
        "authors": "Optional authors",
        "publication": "Optional publication name",
        "year": 2023,
        "citation": "Full citation string"
      }
    ],
    "improvementsSummary": ["Brief bullet points explaining key improvements made"]
  }
  
  Focus on substantive improvements rather than superficial changes. The challenger should meaningfully address the weaknesses identified by reviewers while maintaining or enhancing the strengths.`;
}