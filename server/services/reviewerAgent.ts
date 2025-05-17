import OpenAI from "openai";
import { Idea, InsertReview, Review } from "@shared/tournament";
import * as fs from 'fs';
import * as path from 'path';
import { storage } from '../storage';

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Define the list of reviewer agent IDs
export const REVIEWER_AGENTS = ['CLIN', 'STAT', 'SAF', 'REG', 'HEOR', 'OPS', 'PADV', 'ETH', 'COMM', 'SUC'];

/**
 * Gets the prompt template for a specific agent
 * 
 * @param agentId The ID of the agent (e.g., 'CLIN', 'STAT')
 * @returns The prompt template for the agent
 */
function getAgentPrompt(agentId: string): string {
  try {
    const promptPath = path.join(process.cwd(), 'server', 'prompt_bank', `${agentId}.md`);
    return fs.readFileSync(promptPath, 'utf8');
  } catch (error) {
    console.error(`Error reading prompt for agent ${agentId}:`, error);
    throw new Error(`Failed to load prompt for agent ${agentId}`);
  }
}

/**
 * Runs a single reviewer agent on an idea
 * 
 * @param idea The idea to review
 * @param agentId The ID of the agent to run
 * @returns The review results from the agent
 */
export async function runReviewerAgent(idea: Idea, agentId: string): Promise<InsertReview> {
  try {
    // Get the agent prompt template
    const systemPrompt = getAgentPrompt(agentId);
    
    // Build the user prompt with the idea details
    const userPrompt = buildIdeaReviewPrompt(idea);
    
    // Call OpenAI to get the review
    const response = await openai.chat.completions.create({
      model: "gpt-4.1", 
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // Lower temperature for more consistent reviews
    });
    
    // Parse the response
    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Extract common fields
    const { agent_id, score, strengths, weaknesses, ...additionalMetrics } = result;
    
    // Create the review object
    const review: InsertReview = {
      ideaId: idea.ideaId,
      agentId: agent_id || agentId, // Fallback to the input agent ID if not returned
      score: typeof score === 'number' ? score : 0.5, // Default to 0.5 if no score
      strengths: Array.isArray(strengths) ? strengths : [],
      weaknesses: Array.isArray(weaknesses) ? weaknesses : [],
      additionalMetrics: additionalMetrics || {}, // Store any additional metrics the agent returned
    };
    
    return review;
  } catch (error: any) {
    console.error(`Error running reviewer agent ${agentId}:`, error);
    
    // Return a fallback review with an error message
    return {
      ideaId: idea.ideaId,
      agentId,
      score: 0,
      strengths: [],
      weaknesses: [`Error processing review: ${error.message || 'Unknown error'}`],
      additionalMetrics: {},
    };
  }
}

/**
 * Process the success probability assessment from SUC agent and update the idea
 * 
 * @param idea The idea to update
 * @param sucReview The review from the Success Probability Expert
 */
async function processSuccessProbabilityAssessment(idea: Idea, sucReview: InsertReview): Promise<void> {
  try {
    if (!sucReview || !sucReview.additionalMetrics) {
      console.error(`No valid SUC review additionalMetrics found for idea ${idea.ideaId}`);
      return;
    }
    
    // Extract success probability data from the SUC review
    const additionalMetrics = sucReview.additionalMetrics as Record<string, any>;
    const success_probability = additionalMetrics.success_probability;
    const success_factors = additionalMetrics.success_factors;
    const mitigation_recommendations = additionalMetrics.mitigation_recommendations;
    
    if (typeof success_probability !== 'number') {
      console.error(`Invalid success probability value for idea ${idea.ideaId}`);
      return;
    }
    
    // Update the idea with the success probability data
    await storage.updateIdea(idea.ideaId, {
      successProbability: success_probability,
      successFactors: {
        factors: success_factors || [],
        recommendations: mitigation_recommendations || []
      }
    });
    
    console.log(`Updated idea ${idea.ideaId} with success probability assessment: ${success_probability}%`);
  } catch (error) {
    console.error(`Error processing success probability for idea ${idea.ideaId}:`, error);
  }
}

/**
 * Runs all reviewer agents on an idea in parallel
 * 
 * @param idea The idea to review
 * @returns Array of reviews from all agents
 */
export async function reviewIdeaWithAllAgents(idea: Idea): Promise<InsertReview[]> {
  try {
    // Run all agents in parallel for efficiency
    const reviewPromises = REVIEWER_AGENTS.map(agentId => 
      runReviewerAgent(idea, agentId)
    );
    
    // Wait for all reviews to complete
    const reviews = await Promise.all(reviewPromises);
    
    // Find the SUC review if it exists
    const sucReview = reviews.find(review => review.agentId === 'SUC');
    
    // Process the success probability assessment if available
    if (sucReview) {
      await processSuccessProbabilityAssessment(idea, sucReview);
    }
    
    return reviews;
  } catch (error) {
    console.error("Error reviewing idea with all agents:", error);
    throw error;
  }
}

/**
 * Builds a prompt for idea review
 */
function buildIdeaReviewPrompt(idea: Idea): string {
  return `
  Review the following clinical study concept and provide your expert analysis:

  # Study Concept
  - Title: ${idea.title}
  - Drug: ${idea.drugName}
  - Indication: ${idea.indication}
  - Strategic Goals: ${idea.strategicGoals.join(', ')}
  - Study Phase: ${idea.studyPhase}
  - Geography: ${idea.geography.join(', ')}
  - Target Subpopulation: ${idea.targetSubpopulation || 'Not specified'}
  - Comparator Drugs: ${idea.comparatorDrugs?.join(', ') || 'Not specified'}
  
  # Knowledge Gap Addressed
  ${idea.knowledgeGapAddressed || 'Not specified'}
  
  # Innovation Justification
  ${idea.innovationJustification || 'Not specified'}
  
  # PICO Framework
  - Population: ${(idea.picoData as any).population || 'Not specified'}
  - Intervention: ${(idea.picoData as any).intervention || 'Not specified'}
  - Comparator: ${(idea.picoData as any).comparator || 'Not specified'}
  - Outcomes: ${(idea.picoData as any).outcomes || 'Not specified'}
  
  # SWOT Analysis
  - Strengths: ${JSON.stringify((idea.swotAnalysis as any).strengths || [])}
  - Weaknesses: ${JSON.stringify((idea.swotAnalysis as any).weaknesses || [])}
  - Opportunities: ${JSON.stringify((idea.swotAnalysis as any).opportunities || [])}
  - Threats: ${JSON.stringify((idea.swotAnalysis as any).threats || [])}
  
  # Feasibility Data
  - Estimated Cost: €${((idea.feasibilityData as any).estimatedCost || 0).toLocaleString() || 'Not specified'}
  - Timeline (months): ${(idea.feasibilityData as any).timeline || 'Not specified'}
  - Projected ROI: ${(idea.feasibilityData as any).projectedROI || 'Not specified'}
  - Recruitment Rate: ${(idea.feasibilityData as any).recruitmentRate || 'Not specified'}
  - Completion Risk: ${(idea.feasibilityData as any).completionRisk || 'Not specified'}
  
  Please analyze this concept from your specific expertise perspective and provide a detailed assessment in the requested JSON format. Be thorough but fair in your critique.`;
}