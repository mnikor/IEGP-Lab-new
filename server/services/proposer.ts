import OpenAI from "openai";
import { Idea, InsertIdea, Review } from "@shared/tournament";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable not found");
    }

    // Build the prompt for challenger generation
    const prompt = buildChallengerPrompt(champion, reviews);

    // Generate challenger using OpenAI
    const response = await openai.chat.completions.create({
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
    
    // Create the challenger idea
    const challenger: InsertIdea = {
      ideaId,
      tournamentId: champion.tournamentId,
      laneId: champion.laneId,
      round: round,
      isChampion: false, // Challengers start as non-champions
      parentIdeaId: champion.ideaId, // Reference to the parent champion
      
      title: result.title || `Improved ${champion.title}`,
      drugName: result.drugName || champion.drugName,
      indication: result.indication || champion.indication,
      strategicGoals: result.strategicGoals || champion.strategicGoals,
      geography: result.geography || champion.geography,
      studyPhase: result.studyPhase || champion.studyPhase,
      targetSubpopulation: result.targetSubpopulation || champion.targetSubpopulation,
      comparatorDrugs: result.comparatorDrugs || champion.comparatorDrugs,
      knowledgeGapAddressed: result.knowledgeGapAddressed || champion.knowledgeGapAddressed,
      innovationJustification: result.innovationJustification || champion.innovationJustification,
      
      // Use the provided values or fallback to champion values
      picoData: result.picoData || champion.picoData,
      mcdaScores: result.mcdaScores || champion.mcdaScores,
      swotAnalysis: result.swotAnalysis || champion.swotAnalysis,
      feasibilityData: result.feasibilityData || champion.feasibilityData,
      evidenceSources: result.evidenceSources || champion.evidenceSources,
      
      overallScore: 0, // Will be calculated after review
      scoreChange: null,
    };

    return challenger;
  } catch (error) {
    console.error("Error generating challenger:", error);
    throw error;
  }
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
  You are tasked with creating an improved version of the following clinical study concept.
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
  
  ## CRITICAL INSTRUCTIONS:
  1. FIRST, analyze the feedback to identify the most significant weaknesses.
  2. SECOND, prioritize improvements that will have the greatest impact on the study's validity, feasibility, and alignment with strategic goals.
  3. THIRD, create a challenger concept that meaningfully improves upon the champion while maintaining its core strengths.
  4. FOURTH, ensure the challenger is truly innovative and not just a minor tweak to the champion.
  
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