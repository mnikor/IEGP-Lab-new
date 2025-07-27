import { pgTable, text, serial, integer, json, timestamp, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model (retained from template)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Study concept model
export const studyConcepts = pgTable("study_concepts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  drugName: text("drug_name").notNull(),
  indication: text("indication").notNull(),
  strategicGoals: text("strategic_goals").array().notNull(),
  otherStrategicGoalText: text("other_strategic_goal_text"),
  geography: text("geography").array().notNull(),
  studyPhase: text("study_phase").notNull(),
  targetSubpopulation: text("target_subpopulation"),
  comparatorDrugs: text("comparator_drugs").array(),
  budgetCeilingEur: real("budget_ceiling_eur"),
  timelineCeilingMonths: integer("timeline_ceiling_months"),
  salesImpactThreshold: real("sales_impact_threshold"),
  knowledgeGapAddressed: text("knowledge_gap_addressed"),
  innovationJustification: text("innovation_justification"),
  reasonsToBelieve: json("reasons_to_believe").notNull(),
  // Adding explicit LOE fields at the study concept level (top level) for easier access
  globalLoeDate: text("global_loe_date"),
  timeToLoe: integer("time_to_loe"),
  picoData: json("pico_data").notNull(),
  mcdaScores: json("mcda_scores").notNull(),
  swotAnalysis: json("swot_analysis").notNull(),
  feasibilityData: json("feasibility_data").notNull(),
  evidenceSources: json("evidence_sources").notNull(),
  aiAnalysis: json("ai_analysis"), // Enhanced AI analysis data including justification and statistical plan
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStudyConceptSchema = createInsertSchema(studyConcepts).omit({
  id: true,
  createdAt: true,
});

// Synopsis validation model
export const synopsisValidations = pgTable("synopsis_validations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  drugName: text("drug_name").notNull(),
  indication: text("indication").notNull(),
  strategicGoals: text("strategic_goals").array().notNull(),
  otherStrategicGoalText: text("other_strategic_goal_text"),
  originalFileName: text("original_file_name"), // Optional now, since we allow text input
  
  // Fields for text-based study ideas
  studyIdeaText: text("study_idea_text"),
  additionalContext: text("additional_context"),
  
  // Fields matching study concepts for consistency
  geography: text("geography").array(),
  studyPhase: text("study_phase"),
  targetSubpopulation: text("target_subpopulation"),
  comparatorDrugs: text("comparator_drugs").array(),
  budgetCeilingEur: real("budget_ceiling_eur"),
  timelineCeilingMonths: integer("timeline_ceiling_months"),
  salesImpactThreshold: real("sales_impact_threshold"),
  
  // LOE fields
  globalLoeDate: text("global_loe_date"),
  timeToLoe: integer("time_to_loe"),
  anticipatedFpiDate: text("anticipated_fpi_date"),
  
  // Content extraction fields
  extractedPico: json("extracted_pico").notNull(),
  benchmarkDeltas: json("benchmark_deltas").notNull(),
  riskFlags: json("risk_flags").notNull(),
  revisedEconomics: json("revised_economics").notNull(),
  swotAnalysis: json("swot_analysis").notNull(),
  
  // Analysis fields
  mcdaScores: json("mcda_scores"),
  feasibilityData: json("feasibility_data"),
  currentEvidence: json("current_evidence"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSynopsisValidationSchema = createInsertSchema(synopsisValidations).omit({
  id: true,
  createdAt: true,
});

// Available AI models for concept generation and validation
export const aiModelSchema = z.enum(["gpt-4o", "gpt-4-turbo", "o3-mini", "o3"]);

// Input schemas for API requests
export const generateConceptRequestSchema = z.object({
  drugName: z.string().min(1, "Drug name is required"),
  indication: z.string().min(1, "Indication is required"),
  strategicGoals: z.array(z.enum([
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
  ])).min(1, "At least one strategic goal is required"),
  otherStrategicGoalText: z.string().optional(),
  geography: z.array(z.string().length(2)).min(1, "At least one geography is required"),
  studyPhasePref: z.enum(["I", "II", "III", "IV", "any"]),
  currentEvidenceRefs: z.array(z.string()).optional(),
  targetSubpopulation: z.string().optional(),
  comparatorDrugs: z.array(z.string()).optional(),
  budgetCeilingEur: z.number().positive().optional(),
  timelineCeilingMonths: z.number().positive().optional(),
  salesImpactThreshold: z.number().positive().optional(),
  
  // AI model selection
  aiModel: aiModelSchema.default("gpt-4o"),
  
  // Study timeline information
  anticipatedFpiDate: z.string().optional(), // ISO date string for First Patient In
  
  // LOE (Loss of Exclusivity) information
  globalLoeDate: z.string().optional(), // ISO date string
  regionalLoeDates: z.array(z.object({
    region: z.string(),
    date: z.string()
  })).optional(),
  hasPatentExtensionPotential: z.boolean().optional(),
  numberOfConcepts: z.number().min(1).max(10).default(3),
  
  // Research strategy integration
  researchStrategyId: z.number().optional(),
});

export const validateSynopsisRequestSchema = z.object({
  // AI model selection
  aiModel: aiModelSchema.default("gpt-4o"),
  drugName: z.string().min(1, "Drug name is required"),
  indication: z.string().min(1, "Indication is required"),
  strategicGoals: z.array(z.enum([
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
  ])).min(1, "At least one strategic goal is required"),
  otherStrategicGoalText: z.string().optional(),
  // Study idea can be provided as text or file upload
  studyIdeaText: z.string().optional(),
  // Additional context field for regulatory approval dates, market access estimates, etc.
  additionalContext: z.string().optional(),
  // No file validation here, it's handled separately with multer
  
  // Additional fields from generate concept
  geography: z.array(z.string().length(2)).min(1, "At least one geography is required").optional(),
  studyPhasePref: z.enum(["I", "II", "III", "IV", "any"]).optional(),
  targetSubpopulation: z.string().optional(),
  comparatorDrugs: z.array(z.string()).optional(),
  budgetCeilingEur: z.number().positive().optional(),
  timelineCeilingMonths: z.number().positive().optional(),
  salesImpactThreshold: z.number().positive().optional(),
  
  // LOE and timeline information
  anticipatedFpiDate: z.string().optional(), // ISO date string for First Patient In
  globalLoeDate: z.string().optional(), // ISO date string for global LOE
  regionalLoeDates: z.array(z.object({
    region: z.string(),
    date: z.string()
  })).optional(),
  hasPatentExtensionPotential: z.boolean().optional(),
});

// Research Strategy models
export const researchStrategies = pgTable("research_strategies", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(), // Links to concept generation session
  drugName: text("drug_name").notNull(),
  indication: text("indication").notNull(),
  strategicGoals: text("strategic_goals").array().notNull(),
  studyPhase: text("study_phase").notNull(),
  geography: text("geography").array().notNull(),
  
  // AI-generated strategy
  proposedSearches: json("proposed_searches").notNull(), // Array of SearchItem objects
  aiRationale: text("ai_rationale").notNull(),
  
  // User amendments
  userModifiedSearches: json("user_modified_searches"), // User's final version
  userNotes: text("user_notes"),
  amendmentHistory: json("amendment_history"), // Track changes made
  
  // Status tracking
  status: text("status").notNull().default("proposed"), // proposed, amended, approved, executed
  approvedAt: timestamp("approved_at"),
  executedAt: timestamp("executed_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const researchResults = pgTable("research_results", {
  id: serial("id").primaryKey(),
  strategyId: serial("strategy_id").references(() => researchStrategies.id),
  searchQuery: text("search_query").notNull(),
  searchType: text("search_type").notNull(), // "core", "competitive", "regulatory", "strategic", "therapeutic", "guidelines"
  priority: integer("priority").notNull().default(5),
  
  // Search results
  rawResults: json("raw_results").notNull(), // Raw Perplexity response
  synthesizedInsights: text("synthesized_insights").notNull(),
  keyFindings: json("key_findings").notNull(), // Array of structured findings
  
  // Impact on study design
  designImplications: json("design_implications"), // Impact on sample size, timeline, etc.
  strategicRecommendations: json("strategic_recommendations"), // Business recommendations
  
  executedAt: timestamp("executed_at").defaultNow().notNull(),
});

// Saved Study Proposals table
export const savedStudyProposals = pgTable("saved_study_proposals", {
  id: serial("id").primaryKey(),
  drugName: text("drug_name").notNull(),
  indication: text("indication").notNull(),
  strategicGoals: text("strategic_goals").array().notNull(),
  geography: text("geography").array().notNull(),
  researchStrategyId: integer("research_strategy_id"),
  generatedConcepts: json("generated_concepts").notNull(), // Array of study concepts
  researchResults: json("research_results"), // Formatted research strategy results
  userInputs: json("user_inputs").notNull(), // Complete form inputs for regeneration
  title: text("title").notNull(), // Auto-generated descriptive title
  conceptCount: integer("concept_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertResearchStrategySchema = createInsertSchema(researchStrategies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertResearchResultSchema = createInsertSchema(researchResults).omit({
  id: true,
  executedAt: true,
});

export const insertSavedStudyProposalSchema = createInsertSchema(savedStudyProposals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Search item validation schema
export const searchItemSchema = z.object({
  id: z.string(),
  query: z.string(),
  type: z.enum(["core", "competitive", "regulatory", "strategic", "therapeutic", "guidelines"]),
  priority: z.number().min(1).max(10).default(5),
  rationale: z.string(),
  enabled: z.boolean().default(true),
  userModified: z.boolean().default(false),
});

export type SearchType = z.infer<typeof searchItemSchema>['type'];

export const researchStrategyRequestSchema = z.object({
  drugName: z.string().min(1),
  indication: z.string().min(1),
  strategicGoals: z.array(z.string()).min(1),
  studyPhase: z.string(),
  geography: z.array(z.string()).min(1),
  sessionId: z.string().optional(),
});

export const amendStrategyRequestSchema = z.object({
  strategyId: z.number(),
  modifiedSearches: z.array(searchItemSchema),
  userNotes: z.string().optional(),
});

export const executeStrategyRequestSchema = z.object({
  strategyId: z.number(),
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type StudyConcept = typeof studyConcepts.$inferSelect;
export type InsertStudyConcept = z.infer<typeof insertStudyConceptSchema>;
export type SynopsisValidation = typeof synopsisValidations.$inferSelect;
export type InsertSynopsisValidation = z.infer<typeof insertSynopsisValidationSchema>;
export type GenerateConceptRequest = z.infer<typeof generateConceptRequestSchema>;
export type ValidateSynopsisRequest = z.infer<typeof validateSynopsisRequestSchema>;
export type AIModel = z.infer<typeof aiModelSchema>;
export type ResearchStrategy = typeof researchStrategies.$inferSelect;
export type InsertResearchStrategy = z.infer<typeof insertResearchStrategySchema>;
export type ResearchResult = typeof researchResults.$inferSelect;
export type InsertResearchResult = z.infer<typeof insertResearchResultSchema>;
export type SearchItem = z.infer<typeof searchItemSchema>;
export type ResearchStrategyRequest = z.infer<typeof researchStrategyRequestSchema>;
export type AmendStrategyRequest = z.infer<typeof amendStrategyRequestSchema>;
export type ExecuteStrategyRequest = z.infer<typeof executeStrategyRequestSchema>;
export type SavedStudyProposal = typeof savedStudyProposals.$inferSelect;
export type InsertSavedStudyProposal = z.infer<typeof insertSavedStudyProposalSchema>;
