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
  strategicGoal: text("strategic_goal").notNull(),
  geography: text("geography").array().notNull(),
  studyPhase: text("study_phase").notNull(),
  targetSubpopulation: text("target_subpopulation"),
  comparatorDrugs: text("comparator_drugs").array(),
  budgetCeilingEur: real("budget_ceiling_eur"),
  timelineCeilingMonths: integer("timeline_ceiling_months"),
  salesImpactThreshold: real("sales_impact_threshold"),
  knowledgeGapAddressed: text("knowledge_gap_addressed"),
  innovationJustification: text("innovation_justification"),
  // Adding explicit LOE fields at the study concept level (top level) for easier access
  globalLoeDate: text("global_loe_date"),
  timeToLoe: integer("time_to_loe"),
  picoData: json("pico_data").notNull(),
  mcdaScores: json("mcda_scores").notNull(),
  swotAnalysis: json("swot_analysis").notNull(),
  feasibilityData: json("feasibility_data").notNull(),
  evidenceSources: json("evidence_sources").notNull(),
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
  originalFileName: text("original_file_name").notNull(),
  extractedPico: json("extracted_pico").notNull(),
  benchmarkDeltas: json("benchmark_deltas").notNull(),
  riskFlags: json("risk_flags").notNull(),
  revisedEconomics: json("revised_economics").notNull(),
  swotAnalysis: json("swot_analysis").notNull(),
  
  // New fields to match the concept generation output
  mcdaScores: json("mcda_scores"),
  feasibilityData: json("feasibility_data"),
  currentEvidence: json("current_evidence"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSynopsisValidationSchema = createInsertSchema(synopsisValidations).omit({
  id: true,
  createdAt: true,
});

// Input schemas for API requests
export const generateConceptRequestSchema = z.object({
  drugName: z.string().min(1, "Drug name is required"),
  indication: z.string().min(1, "Indication is required"),
  strategicGoal: z.enum(["expand_label", "defend_share", "accelerate_uptake", "real_world_evidence"]),
  geography: z.array(z.string().length(2)).min(1, "At least one geography is required"),
  studyPhasePref: z.enum(["I", "II", "III", "IV", "any"]),
  currentEvidenceRefs: z.array(z.string()).optional(),
  targetSubpopulation: z.string().optional(),
  comparatorDrugs: z.array(z.string()).optional(),
  budgetCeilingEur: z.number().positive().optional(),
  timelineCeilingMonths: z.number().positive().optional(),
  salesImpactThreshold: z.number().positive().optional(),
  
  // Study timeline information
  anticipatedFpiDate: z.string().optional(), // ISO date string for First Patient In
  
  // LOE (Loss of Exclusivity) information
  globalLoeDate: z.string().optional(), // ISO date string
  regionalLoeDates: z.array(z.object({
    region: z.string(),
    date: z.string()
  })).optional(),
  hasPatentExtensionPotential: z.boolean().optional(),
});

export const validateSynopsisRequestSchema = z.object({
  drugName: z.string().min(1, "Drug name is required"),
  indication: z.string().min(1, "Indication is required"),
  strategicGoal: z.enum(["expand_label", "defend_share", "accelerate_uptake", "real_world_evidence"]),
  // No file validation here, it's handled separately with multer
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
