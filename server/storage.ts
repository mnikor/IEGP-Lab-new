import { users, studyConcepts, synopsisValidations, researchStrategies, researchResults, savedStudyProposals, chatMessages, type User, type InsertUser, type StudyConcept, type InsertStudyConcept, type SynopsisValidation, type InsertSynopsisValidation, type ResearchStrategy, type InsertResearchStrategy, type ResearchResult, type InsertResearchResult, type SavedStudyProposal, type InsertSavedStudyProposal, type ChatMessage, type InsertChatMessage } from "@shared/schema";
import { tournaments, ideas, reviews, tournamentRounds, type Tournament, type InsertTournament, type Idea, type InsertIdea, type Review, type InsertReview, type TournamentRound, type InsertTournamentRound } from "@shared/tournament";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User methods (retained from template)
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Study concept methods
  getAllStudyConcepts(): Promise<StudyConcept[]>;
  getStudyConcept(id: number): Promise<StudyConcept | undefined>;
  createStudyConcept(concept: InsertStudyConcept): Promise<StudyConcept>;
  updateStudyConcept(id: number, updates: Partial<StudyConcept>): Promise<StudyConcept | null>;
  deleteStudyConcept(id: number): Promise<boolean>;
  getRecentStudyConcepts(limit: number): Promise<StudyConcept[]>;
  
  // Synopsis validation methods
  getAllSynopsisValidations(): Promise<SynopsisValidation[]>;
  getRecentSynopsisValidations(limit: number): Promise<SynopsisValidation[]>;
  getSynopsisValidation(id: number): Promise<SynopsisValidation | undefined>;
  createSynopsisValidation(validation: InsertSynopsisValidation): Promise<SynopsisValidation>;
  deleteSynopsisValidation(id: number): Promise<boolean>;
  
  // Tournament methods
  createTournament(tournament: InsertTournament): Promise<Tournament>;
  getTournament(id: number): Promise<Tournament | undefined>;
  getAllTournaments(): Promise<Tournament[]>;
  
  // Idea methods
  createIdea(idea: InsertIdea): Promise<Idea>;
  getIdea(id: number): Promise<Idea | undefined>;
  getIdeasByTournament(tournamentId: number): Promise<Idea[]>;
  
  // Review methods
  createReview(review: InsertReview): Promise<Review>;
  getReview(id: number): Promise<Review | undefined>;
  getReviewsByTournament(tournamentId: number): Promise<Review[]>;
  
  // Tournament round methods
  createTournamentRound(round: InsertTournamentRound): Promise<TournamentRound>;
  getTournamentRound(id: number): Promise<TournamentRound | undefined>;
  getRoundsByTournament(tournamentId: number): Promise<TournamentRound[]>;
  
  // Research Strategy methods
  createResearchStrategy(strategy: InsertResearchStrategy): Promise<ResearchStrategy>;
  getResearchStrategy(id: number): Promise<ResearchStrategy | undefined>;
  getResearchStrategiesBySession(sessionId: string): Promise<ResearchStrategy[]>;
  updateResearchStrategy(id: number, updates: Partial<ResearchStrategy>): Promise<ResearchStrategy | undefined>;
  
  // Research Result methods
  createResearchResult(result: InsertResearchResult): Promise<ResearchResult>;
  getResearchResult(id: number): Promise<ResearchResult | undefined>;
  getResearchResultsByStrategy(strategyId: number): Promise<ResearchResult[]>;
  
  // Saved Study Proposal methods
  createSavedStudyProposal(proposal: InsertSavedStudyProposal): Promise<SavedStudyProposal>;
  getSavedStudyProposal(id: number): Promise<SavedStudyProposal | undefined>;
  getAllSavedStudyProposals(): Promise<SavedStudyProposal[]>;
  deleteSavedStudyProposal(id: number): Promise<boolean>;
  updateSavedStudyProposal(id: number, updates: Partial<SavedStudyProposal>): Promise<SavedStudyProposal | undefined>;
  
  // Chat Message methods
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessagesByConceptId(conceptId: number): Promise<ChatMessage[]>;
  deleteChatMessagesByConceptId(conceptId: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Study concept methods
  async createStudyConcept(concept: InsertStudyConcept): Promise<StudyConcept> {
    const [created] = await db.insert(studyConcepts).values(concept).returning();
    return created;
  }

  async getStudyConcept(id: number): Promise<StudyConcept | undefined> {
    const [concept] = await db.select().from(studyConcepts).where(eq(studyConcepts.id, id));
    return concept || undefined;
  }

  async getAllStudyConcepts(): Promise<StudyConcept[]> {
    return await db.select().from(studyConcepts).orderBy(desc(studyConcepts.createdAt));
  }

  async getRecentStudyConcepts(limit: number = 10): Promise<StudyConcept[]> {
    return await db.select().from(studyConcepts).orderBy(desc(studyConcepts.createdAt)).limit(limit);
  }

  async updateStudyConcept(id: number, updates: Partial<StudyConcept>): Promise<StudyConcept | null> {
    // Convert any date fields to proper Date objects
    const cleanUpdates = { ...updates };
    if (cleanUpdates.updatedAt && typeof cleanUpdates.updatedAt === 'string') {
      cleanUpdates.updatedAt = new Date(cleanUpdates.updatedAt);
    }
    if (cleanUpdates.createdAt && typeof cleanUpdates.createdAt === 'string') {
      cleanUpdates.createdAt = new Date(cleanUpdates.createdAt);
    }
    
    const [updated] = await db
      .update(studyConcepts)
      .set({
        ...cleanUpdates,
        updatedAt: new Date()
      })
      .where(eq(studyConcepts.id, id))
      .returning();
    return updated || null;
  }

  async deleteStudyConcept(id: number): Promise<boolean> {
    const result = await db.delete(studyConcepts).where(eq(studyConcepts.id, id));
    return result.rowCount > 0;
  }

  // Synopsis validation methods
  async createSynopsisValidation(validation: InsertSynopsisValidation): Promise<SynopsisValidation> {
    const [created] = await db.insert(synopsisValidations).values(validation).returning();
    return created;
  }

  async getSynopsisValidation(id: number): Promise<SynopsisValidation | undefined> {
    const [validation] = await db.select().from(synopsisValidations).where(eq(synopsisValidations.id, id));
    return validation || undefined;
  }

  async getAllSynopsisValidations(): Promise<SynopsisValidation[]> {
    return await db.select().from(synopsisValidations).orderBy(desc(synopsisValidations.createdAt));
  }

  async getRecentSynopsisValidations(limit: number): Promise<SynopsisValidation[]> {
    return await db.select().from(synopsisValidations).orderBy(desc(synopsisValidations.createdAt)).limit(limit);
  }

  async deleteSynopsisValidation(id: number): Promise<boolean> {
    const result = await db.delete(synopsisValidations).where(eq(synopsisValidations.id, id));
    return result.rowCount > 0;
  }

  // Tournament methods
  async createTournament(tournament: InsertTournament): Promise<Tournament> {
    const [created] = await db.insert(tournaments).values(tournament).returning();
    return created;
  }

  async getTournament(id: number): Promise<Tournament | undefined> {
    const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, id));
    return tournament || undefined;
  }

  async getAllTournaments(): Promise<Tournament[]> {
    return await db.select().from(tournaments).orderBy(desc(tournaments.createdAt));
  }

  // Idea methods
  async createIdea(idea: InsertIdea): Promise<Idea> {
    const [created] = await db.insert(ideas).values(idea).returning();
    return created;
  }

  async getIdea(id: number): Promise<Idea | undefined> {
    const [idea] = await db.select().from(ideas).where(eq(ideas.id, id));
    return idea || undefined;
  }

  async getIdeasByTournament(tournamentId: number): Promise<Idea[]> {
    return await db.select().from(ideas).where(eq(ideas.tournamentId, tournamentId));
  }

  // Review methods
  async createReview(review: InsertReview): Promise<Review> {
    const [created] = await db.insert(reviews).values(review).returning();
    return created;
  }

  async getReview(id: number): Promise<Review | undefined> {
    const [review] = await db.select().from(reviews).where(eq(reviews.id, id));
    return review || undefined;
  }

  async getReviewsByTournament(tournamentId: number): Promise<Review[]> {
    return await db.select().from(reviews).where(eq(reviews.tournamentId, tournamentId));
  }

  // Tournament round methods
  async createTournamentRound(round: InsertTournamentRound): Promise<TournamentRound> {
    const [created] = await db.insert(tournamentRounds).values(round).returning();
    return created;
  }

  async getTournamentRound(id: number): Promise<TournamentRound | undefined> {
    const [round] = await db.select().from(tournamentRounds).where(eq(tournamentRounds.id, id));
    return round || undefined;
  }

  async getRoundsByTournament(tournamentId: number): Promise<TournamentRound[]> {
    return await db.select().from(tournamentRounds).where(eq(tournamentRounds.tournamentId, tournamentId)).orderBy(tournamentRounds.roundNumber);
  }

  // Research strategy methods
  async createResearchStrategy(strategy: InsertResearchStrategy): Promise<ResearchStrategy> {
    const [created] = await db.insert(researchStrategies).values(strategy).returning();
    return created;
  }

  async getResearchStrategy(id: number): Promise<ResearchStrategy | undefined> {
    const [strategy] = await db.select().from(researchStrategies).where(eq(researchStrategies.id, id));
    return strategy || undefined;
  }

  async getResearchStrategiesBySession(sessionId: string): Promise<ResearchStrategy[]> {
    return await db.select().from(researchStrategies).where(eq(researchStrategies.sessionId, sessionId)).orderBy(desc(researchStrategies.createdAt));
  }

  async updateResearchStrategy(id: number, updates: Partial<ResearchStrategy>): Promise<ResearchStrategy | undefined> {
    const [updated] = await db.update(researchStrategies).set({
      ...updates,
      updatedAt: new Date()
    }).where(eq(researchStrategies.id, id)).returning();
    return updated || undefined;
  }

  // Research result methods
  async createResearchResult(result: InsertResearchResult): Promise<ResearchResult> {
    const [created] = await db.insert(researchResults).values(result).returning();
    return created;
  }

  async getResearchResult(id: number): Promise<ResearchResult | undefined> {
    const [result] = await db.select().from(researchResults).where(eq(researchResults.id, id));
    return result || undefined;
  }

  async getResearchResultsByStrategy(strategyId: number): Promise<ResearchResult[]> {
    return await db.select().from(researchResults).where(eq(researchResults.strategyId, strategyId)).orderBy(desc(researchResults.priority));
  }

  // Saved study proposal methods
  async createSavedStudyProposal(proposal: InsertSavedStudyProposal): Promise<SavedStudyProposal> {
    const [created] = await db.insert(savedStudyProposals).values(proposal).returning();
    return created;
  }

  async getSavedStudyProposal(id: number): Promise<SavedStudyProposal | undefined> {
    const [proposal] = await db.select().from(savedStudyProposals).where(eq(savedStudyProposals.id, id));
    return proposal || undefined;
  }

  async getAllSavedStudyProposals(): Promise<SavedStudyProposal[]> {
    return await db.select().from(savedStudyProposals).orderBy(desc(savedStudyProposals.createdAt));
  }

  async deleteSavedStudyProposal(id: number): Promise<boolean> {
    const result = await db.delete(savedStudyProposals).where(eq(savedStudyProposals.id, id));
    return result.rowCount > 0;
  }

  async updateSavedStudyProposal(id: number, updates: Partial<SavedStudyProposal>): Promise<SavedStudyProposal | undefined> {
    const [updated] = await db.update(savedStudyProposals).set({
      ...updates,
      updatedAt: new Date()
    }).where(eq(savedStudyProposals.id, id)).returning();
    return updated || undefined;
  }

  // Chat message methods
  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [created] = await db.insert(chatMessages).values(message).returning();
    return created;
  }

  async getChatMessagesByConceptId(conceptId: number): Promise<ChatMessage[]> {
    return await db.select().from(chatMessages).where(eq(chatMessages.conceptId, conceptId)).orderBy(chatMessages.timestamp);
  }

  async deleteChatMessagesByConceptId(conceptId: number): Promise<boolean> {
    const result = await db.delete(chatMessages).where(eq(chatMessages.conceptId, conceptId));
    return result.rowCount > 0;
  }
}

export const storage = new DatabaseStorage();