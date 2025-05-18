import { z } from "zod";
import { pgTable, text, serial, integer, json, timestamp, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Define tournament schema
export const tournaments = pgTable("tournaments", {
  id: serial("id").primaryKey(),
  drugName: text("drug_name").notNull(),
  indication: text("indication").notNull(),
  strategicGoals: json("strategic_goals").notNull(), // Array of {goal: string, weight: number}
  geography: text("geography").array().notNull(),
  studyPhasePref: text("study_phase_pref").notNull(),
  maxRounds: integer("max_rounds").notNull().default(3),
  lanes: integer("lanes").notNull().default(5),
  
  // Additional fields from the New Concept functionality
  budgetCeilingEur: integer("budget_ceiling_eur"),
  timelineCeilingMonths: integer("timeline_ceiling_months"),
  salesImpactThreshold: integer("sales_impact_threshold"),
  anticipatedFpiDate: text("anticipated_fpi_date"),
  globalLoeDate: text("global_loe_date"),
  patentExtensionPotential: boolean("patent_extension_potential").default(false),
  additionalContext: text("additional_context"),
  
  // Tournament status tracking
  currentRound: integer("current_round").notNull().default(0),
  status: text("status").notNull().default("in_progress"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertTournamentSchema = createInsertSchema(tournaments).omit({
  id: true,
  createdAt: true,
  completedAt: true,
  currentRound: true,
  status: true,
});

// Define tournament idea schema
export const ideas = pgTable("ideas", {
  id: serial("id").primaryKey(),
  ideaId: text("idea_id").notNull().unique(), // A_v1, A_v2, B_v1, etc.
  tournamentId: integer("tournament_id").notNull(),
  laneId: integer("lane_id").notNull(),
  round: integer("round").notNull().default(0),
  isChampion: boolean("is_champion").notNull().default(false),
  parentIdeaId: text("parent_idea_id"), // For challengers, references previous champion
  
  // Core study concept data
  title: text("title").notNull(),
  drugName: text("drug_name").notNull(),
  indication: text("indication").notNull(),
  strategicGoals: text("strategic_goals").array().notNull(),
  geography: text("geography").array().notNull(),
  studyPhase: text("study_phase").notNull(),
  targetSubpopulation: text("target_subpopulation"),
  comparatorDrugs: text("comparator_drugs").array(),
  knowledgeGapAddressed: text("knowledge_gap_addressed"),
  innovationJustification: text("innovation_justification"),
  
  // Improvement tracking (for challenger ideas)
  improvementRationale: text("improvement_rationale"), // Why this challenger was created
  keyImprovements: text("key_improvements").array(), // List of key changes from parent
  
  // JSON fields
  picoData: json("pico_data").notNull(),
  mcdaScores: json("mcda_scores").notNull(),
  swotAnalysis: json("swot_analysis").notNull(),
  feasibilityData: json("feasibility_data").notNull(),
  evidenceSources: json("evidence_sources").notNull(),
  
  // Success probability data
  successProbability: real("success_probability"), // Overall probability of success (0-100)
  successFactors: json("success_factors"), // Factors influencing success probability
  
  // Score data
  overallScore: real("overall_score").notNull(),
  scoreChange: real("score_change"), // Delta from previous round (for champions)
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertIdeaSchema = createInsertSchema(ideas).omit({
  id: true,
  createdAt: true,
});

// Define reviewer feedback schema
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  ideaId: text("idea_id").notNull(),
  agentId: text("agent_id").notNull(), // CLIN, STAT, SAF, etc.
  score: real("score").notNull(),
  strengths: text("strengths").array().notNull(),
  weaknesses: text("weaknesses").array().notNull(),
  additionalMetrics: json("additional_metrics").notNull(), // Agent-specific metrics
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});

// Define tournament round schema (for tracking progress)
export const tournamentRounds = pgTable("tournament_rounds", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull(),
  roundNumber: integer("round_number").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  laneUpdates: json("lane_updates").notNull(), // Array of lane update objects
});

export const insertTournamentRoundSchema = createInsertSchema(tournamentRounds).omit({
  id: true,
  startedAt: true,
  completedAt: true,
});

// Request schema for starting a new tournament
export const newTournamentRequestSchema = z.object({
  drugName: z.string().min(1, "Drug name is required"),
  indication: z.string().min(1, "Indication is required"),
  strategicGoals: z.array(z.object({
    goal: z.enum([
      "expand_label", 
      "defend_market_share", 
      "accelerate_uptake", 
      "facilitate_market_access", 
      "generate_real_world_evidence", 
      "optimise_dosing", 
      "validate_biomarker", 
      "manage_safety_risk", 
      "extend_lifecycle_combinations", 
      "secure_initial_approval",
      "demonstrate_poc",
      "other"
    ]),
    weight: z.number().min(0).max(1)
  })).min(1, "At least one strategic goal is required"),
  geography: z.array(z.string().length(2)).min(1, "At least one geography is required"),
  studyPhasePref: z.enum(["I", "II", "III", "IV", "any"]),
  maxRounds: z.number().int().positive().optional().default(3),
  lanes: z.number().int().positive().optional().default(5),
  
  // Optional additional fields from New Concept functionality
  otherStrategicGoalText: z.string().optional(),
  budgetCeilingEur: z.number().int().positive().nullish(),
  timelineCeilingMonths: z.number().int().positive().nullish(),
  salesImpactThreshold: z.number().int().positive().nullish(),
  anticipatedFpiDate: z.string().optional(),
  globalLoeDate: z.string().optional(),
  patentExtensionPotential: z.boolean().optional().default(false),
  additionalContext: z.string().optional(),
});

// Export types
export type Tournament = typeof tournaments.$inferSelect;
export type InsertTournament = z.infer<typeof insertTournamentSchema>;
export type Idea = typeof ideas.$inferSelect;
export type InsertIdea = z.infer<typeof insertIdeaSchema> & {
  improvementRationale?: string;
  keyImprovements?: string[];
  successProbability?: number;
  successFactors?: {
    factors: Array<{
      factor: string;
      impact: number;
      description: string;
      isPositive: boolean;
    }>;
    recommendations: string[];
  };
};
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type TournamentRound = typeof tournamentRounds.$inferSelect;
export type InsertTournamentRound = z.infer<typeof insertTournamentRoundSchema>;
export type NewTournamentRequest = z.infer<typeof newTournamentRequestSchema>;

// Helper types for the API
export type LaneUpdate = {
  laneId: number;
  champion: {
    ideaId: string;
    score: number;
  };
  challenger?: {
    ideaId: string;
    score: number;
  };
  delta?: number; // Champion score change vs previous round
};

export type TournamentRoundUpdate = {
  round: number;
  lanes: LaneUpdate[];
  timestamp: string;
};