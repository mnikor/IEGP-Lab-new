import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Idea, Review, LaneUpdate } from '@shared/tournament';

/**
 * Calculates the overall score for an idea based on reviewer feedback and strategic goals
 * 
 * @param idea The idea to score
 * @param reviews Array of reviews for the idea
 * @returns The calculated overall score (0-1)
 */
export function calculateOverallScore(idea: Idea, reviews: Review[]): number {
  try {
    // Load strategic goal weights
    const weightsPath = path.join(process.cwd(), 'server', 'strategic_goal_weights.yaml');
    const weightsContent = fs.readFileSync(weightsPath, 'utf8');
    const weights = yaml.load(weightsContent) as any;
    
    // Extract the strategic goals and their weights
    const strategicGoalWeights: {[key: string]: any} = weights.strategic_goals;
    const reviewerAxisMapping: {[key: string]: any} = weights.reviewer_axis_mapping;
    
    // Get the weights for the idea's strategic goals
    const ideaGoalWeights: {[key: string]: number} = {};
    for (const axis of Object.keys(strategicGoalWeights.other)) {
      ideaGoalWeights[axis] = 0;
    }
    
    // Calculate the weighted average of strategic goal weights
    let totalWeight = 0;
    for (const goal of idea.strategicGoals) {
      // Default to 'other' if the goal is not in the weights config
      const goalKey = strategicGoalWeights[goal] ? goal : 'other';
      const weight = 1 / idea.strategicGoals.length; // Equal weight for simplicity
      totalWeight += weight;
      
      // Add this goal's contribution to each axis
      for (const axis of Object.keys(strategicGoalWeights[goalKey])) {
        ideaGoalWeights[axis] += strategicGoalWeights[goalKey][axis] * weight;
      }
    }
    
    // Normalize the weights if needed
    if (totalWeight > 0) {
      for (const axis of Object.keys(ideaGoalWeights)) {
        ideaGoalWeights[axis] /= totalWeight;
      }
    }
    
    // Calculate the axis scores from reviewer scores
    const axisScores: {[key: string]: number} = {};
    for (const axis of Object.keys(ideaGoalWeights)) {
      axisScores[axis] = 0;
      let axisWeightTotal = 0;
      
      // For each reviewer, check if they contribute to this axis
      for (const review of reviews) {
        const agentId = review.agentId;
        if (reviewerAxisMapping[agentId] && reviewerAxisMapping[agentId][axis]) {
          const weight = reviewerAxisMapping[agentId][axis];
          axisScores[axis] += review.score * weight;
          axisWeightTotal += weight;
        }
      }
      
      // Normalize the axis score
      if (axisWeightTotal > 0) {
        axisScores[axis] /= axisWeightTotal;
      }
    }
    
    // Calculate the final score as weighted sum of axis scores
    let finalScore = 0;
    let totalAxisWeight = 0;
    
    for (const axis of Object.keys(ideaGoalWeights)) {
      const weight = ideaGoalWeights[axis];
      finalScore += axisScores[axis] * weight;
      totalAxisWeight += weight;
    }
    
    // Normalize the final score
    if (totalAxisWeight > 0) {
      finalScore /= totalAxisWeight;
    }
    
    // Return the score, ensuring it's within 0-1 range
    return Math.max(0, Math.min(1, finalScore));
  } catch (error) {
    console.error("Error calculating overall score:", error);
    
    // Fallback to simple average of reviewer scores
    if (reviews.length > 0) {
      const avgScore = reviews.reduce((sum, review) => sum + review.score, 0) / reviews.length;
      return avgScore;
    }
    
    return 0.5; // Default score
  }
}

/**
 * Creates lane updates for a tournament round
 * 
 * @param champions Current champion ideas
 * @param challengers Challenger ideas (may be null for initial round)
 * @param championReviews Reviews for champions
 * @param challengerReviews Reviews for challengers (may be null for initial round)
 * @returns Array of lane updates
 */
export function createLaneUpdates(
  champions: Idea[],
  challengers: Idea[] | null,
  championReviews: {[ideaId: string]: Review[]},
  challengerReviews: {[ideaId: string]: Review[]} | null
): LaneUpdate[] {
  const laneUpdates: LaneUpdate[] = [];
  
  // Group champions by lane
  const championsByLane: {[laneId: number]: Idea} = {};
  for (const champion of champions) {
    championsByLane[champion.laneId] = champion;
  }
  
  // Group challengers by lane (if any)
  const challengersByLane: {[laneId: number]: Idea} = {};
  if (challengers) {
    for (const challenger of challengers) {
      challengersByLane[challenger.laneId] = challenger;
    }
  }
  
  // Create updates for each lane
  for (const champion of champions) {
    const laneId = champion.laneId;
    const championIdea = champion;
    const challengerIdea = challengersByLane[laneId];
    
    // Calculate champion score
    const championReviewsForIdea = championReviews[championIdea.ideaId] || [];
    const championScore = calculateOverallScore(championIdea, championReviewsForIdea);
    
    // Create the lane update
    const laneUpdate: LaneUpdate = {
      laneId,
      champion: {
        ideaId: championIdea.ideaId,
        score: championScore
      },
      delta: championIdea.scoreChange || 0
    };
    
    // Add challenger if present
    if (challengerIdea && challengerReviews) {
      const challengerReviewsForIdea = challengerReviews[challengerIdea.ideaId] || [];
      const challengerScore = calculateOverallScore(challengerIdea, challengerReviewsForIdea);
      
      laneUpdate.challenger = {
        ideaId: challengerIdea.ideaId,
        score: challengerScore
      };
    }
    
    laneUpdates.push(laneUpdate);
  }
  
  return laneUpdates;
}

/**
 * Determines if a challenger should replace a champion
 * 
 * @param championScore Score of the current champion
 * @param challengerScore Score of the challenger
 * @param threshold Score improvement threshold for replacement (default: 0.005)
 * @returns True if the challenger should replace the champion
 */
export function shouldReplaceChampion(
  championScore: number,
  challengerScore: number,
  threshold: number = 0.005
): boolean {
  return challengerScore > championScore + threshold;
}

/**
 * Updates champions based on tournament results
 * 
 * @param champions Current champion ideas
 * @param challengers Challenger ideas
 * @param championReviews Reviews for champions
 * @param challengerReviews Reviews for challengers
 * @param threshold Score improvement threshold (default: 0.005)
 * @returns Updated champions and their score changes
 */
export function updateChampions(
  champions: Idea[],
  challengers: Idea[],
  championReviews: {[ideaId: string]: Review[]},
  challengerReviews: {[ideaId: string]: Review[]},
  threshold: number = 0.005
): {newChampions: Idea[], replaced: boolean[]} {
  const newChampions: Idea[] = [];
  const replaced: boolean[] = [];
  
  // Group champions by lane
  const championsByLane: {[laneId: number]: Idea} = {};
  for (const champion of champions) {
    championsByLane[champion.laneId] = champion;
  }
  
  // Group challengers by lane
  const challengersByLane: {[laneId: number]: Idea} = {};
  for (const challenger of challengers) {
    challengersByLane[challenger.laneId] = challenger;
  }
  
  // For each lane, determine if the champion should be replaced
  for (const laneId of Object.keys(championsByLane).map(Number)) {
    const champion = championsByLane[laneId];
    const challenger = challengersByLane[laneId];
    
    if (!challenger) {
      // No challenger for this lane, keep the champion
      newChampions.push(champion);
      replaced.push(false);
      continue;
    }
    
    // Calculate scores
    const championReviewsForLane = championReviews[champion.ideaId] || [];
    const challengerReviewsForLane = challengerReviews[challenger.ideaId] || [];
    
    const championScore = calculateOverallScore(champion, championReviewsForLane);
    const challengerScore = calculateOverallScore(challenger, challengerReviewsForLane);
    
    // Determine if the challenger should replace the champion
    if (shouldReplaceChampion(championScore, challengerScore, threshold)) {
      // Challenger becomes the new champion
      challenger.isChampion = true;
      challenger.scoreChange = challengerScore - championScore;
      newChampions.push(challenger);
      replaced.push(true);
    } else {
      // Keep the current champion
      champion.scoreChange = championScore - (champion.overallScore || championScore);
      newChampions.push(champion);
      replaced.push(false);
    }
  }
  
  return { newChampions, replaced };
}