import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { 
  generateConceptRequestSchema, 
  validateSynopsisRequestSchema,
  StudyConcept,
  SynopsisValidation
} from "@shared/schema";
// Import tournament routes
import tournamentRoutes from "./routes/tournament";
import { perplexityWebSearch } from "./services/perplexity";
import { analyzeWithOpenAI, extractPicoFromText } from "./services/openai";
import { extractTextFromDocument } from "./services/documentParser";
import { calculateFeasibility } from "./services/feasibilityCalculator";
import type { ConceptWithFeasibility } from "./services/feasibilityCalculator";
import { scoreMcda } from "./services/mcdaScorer";
import { generateSwot } from "./services/swotGenerator";
import { generatePdfReport, generateSingleConceptPdfReport, generatePptxReport, generateValidationPdfReport, generateProposalPdfReport } from "./services/reportBuilder";
import { ResearchStrategyGenerator } from "./services/researchStrategyGenerator";
import { ResearchExecutor } from "./services/researchExecutor";
import { ValidationResearchGenerator } from "./services/validationResearchGenerator";
import { ConceptRefiner } from "./services/conceptRefiner";
import { 
  researchStrategyRequestSchema, 
  amendStrategyRequestSchema, 
  executeStrategyRequestSchema 
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure multer for file uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
  });

  // API Endpoints for study concepts
  app.get("/api/study-concepts", async (req, res) => {
    try {
      const concepts = await storage.getAllStudyConcepts();
      res.json(concepts);
    } catch (error) {
      console.error("Error fetching study concepts:", error);
      res.status(500).json({ message: "Failed to fetch study concepts" });
    }
  });

  app.get("/api/study-concepts/recent", async (req, res) => {
    try {
      const concepts = await storage.getRecentStudyConcepts(5);
      res.json(concepts);
    } catch (error) {
      console.error("Error fetching recent study concepts:", error);
      res.status(500).json({ message: "Failed to fetch recent study concepts" });
    }
  });

  app.get("/api/study-concepts/:id", async (req, res) => {
    try {
      const concept = await storage.getStudyConcept(parseInt(req.params.id));
      if (!concept) {
        return res.status(404).json({ message: "Study concept not found" });
      }
      res.json(concept);
    } catch (error) {
      console.error("Error fetching study concept:", error);
      res.status(500).json({ message: "Failed to fetch study concept" });
    }
  });

  app.post("/api/study-concepts/generate", async (req, res) => {
    console.log("=== CONCEPT GENERATION ENDPOINT HIT ===");
    console.log("Request body:", JSON.stringify(req.body));
    
    try {
      // Validate request body
      console.log("Attempting to validate request data...");
      const validationResult = generateConceptRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.error("Validation failed:", validationResult.error.errors);
        return res.status(400).json({ 
          message: "Invalid request parameters", 
          errors: validationResult.error.errors 
        });
      }

      console.log("Request validation successful");
      const data = validationResult.data;
      
      // Log the incoming request data to debug anticipatedFpiDate
      console.log("Received request with anticipatedFpiDate:", data.anticipatedFpiDate);
      
      // Step 1: Use existing research strategy results or perform new search
      let searchResults;
      
      if (data.researchStrategyId) {
        // Use existing research strategy results to avoid duplicate searches
        console.log("Using existing research strategy results:", data.researchStrategyId);
        try {
          const researchResults = await storage.getResearchResultsByStrategy(data.researchStrategyId);
          if (researchResults && researchResults.length > 0) {
            // Synthesize research results into a comprehensive evidence base
            const synthesizedEvidence = researchResults
              .map(result => `${result.synthesizedInsights}\n\nKey Findings: ${Array.isArray(result.keyFindings) ? result.keyFindings.join(', ') : 'No key findings available'}`)
              .join('\n\n---\n\n');
            
            searchResults = {
              content: synthesizedEvidence,
              citations: researchResults.flatMap(r => (r.rawResults as any)?.citations || [])
            };
            console.log("Successfully integrated research strategy results");
          } else {
            console.log("No research results found, falling back to new search");
            searchResults = await performNewSearch(data);
          }
        } catch (error) {
          console.error("Error retrieving research strategy results:", error);
          searchResults = await performNewSearch(data);
        }
      }

      const performNewSearch = async (data: any) => {
        console.log("Performing new Perplexity search");
        const isOncology = (data.indication || '').toLowerCase().includes('cancer') || 
                           (data.indication || '').toLowerCase().includes('oncol') ||
                           (data.indication || '').toLowerCase().includes('tumor');
        
        const strategicGoalsFocus = data.strategicGoals.map((goal: string) => goal.replace('_', ' ')).join(' and ');
        const searchQuery = `${data.drugName} ${data.indication} ${strategicGoalsFocus} Phase ${data.studyPhasePref} clinical trials study design`;
        
        return await perplexityWebSearch(searchQuery, [
          "pubmed.ncbi.nlm.nih.gov",
          "clinicaltrials.gov", 
          "nejm.org",
          "accessdata.fda.gov",
          "ema.europa.eu",
          "nature.com"
        ]);
      };

      if (!data.researchStrategyId) {
        searchResults = await performNewSearch(data);
      }

      // Step 2: Generate concepts using OpenAI with selected model
      const concepts = await analyzeWithOpenAI(searchResults, data, false, data.aiModel || "gpt-4o");

      // Step 3: For each concept, calculate feasibility, MCDA scores, and SWOT analysis
      // Added debug logs for anticipatedFpiDate
      console.log("Request data - data.anticipatedFpiDate:", data.anticipatedFpiDate);
      console.log("Request data - data.globalLoeDate:", data.globalLoeDate);
      
      const enrichedConcepts = await Promise.all(concepts.map(async (concept: Partial<StudyConcept>) => {
        // Debug each concept
        console.log("Processing concept:", concept.title);
        console.log("Concept input data:", {
          studyPhase: concept.studyPhase,
          strategicGoals: concept.strategicGoals,
          geography: concept.geography,
          indication: concept.indication,
          feasibilityData: concept.feasibilityData
        });
        
        const feasibilityData = await calculateFeasibility(concept, data);
        
        // Debug the calculated feasibility data
        console.log("Calculated feasibility data - ROI Debug:", {
          estimatedCost: feasibilityData.estimatedCost,
          projectedROI: feasibilityData.projectedROI,
          projectedROIType: typeof feasibilityData.projectedROI,
          completionRisk: feasibilityData.completionRisk,
          recruitmentRate: feasibilityData.recruitmentRate,
          timeline: feasibilityData.timeline,
          strategicGoals: concept.strategicGoals,
          studyPhase: concept.studyPhase
        });
        
        // Add more debugging for LOE date
        console.log("After calculation - feasibilityData.estimatedFpiDate:", feasibilityData.estimatedFpiDate);
        console.log("After calculation - feasibilityData.globalLoeDate:", feasibilityData.globalLoeDate);
        
        const mcdaScores = scoreMcda(concept, data);
        const swotAnalysis = generateSwot(concept, searchResults);
        
        // Format citations with sources
        const currentEvidence = {
          summary: searchResults.content,
          citations: searchResults.citations.map((citation, index) => ({
            id: index + 1,
            url: citation,
            title: `Source ${index + 1}` // We could parse the URL to get a better title, but this is simpler
          }))
        };
        
        // Update PICO population field to reflect calculated sample size
        const correctedPicoData = {
          ...concept.picoData,
          population: updatePicoPopulationWithSampleSize(
            concept.picoData?.population || "Study population",
            feasibilityData.sampleSize,
            concept.indication || data.indication,
            concept.targetSubpopulation
          )
        };
        
        // Make sure we explicitly include the globalLoeDate and timeToLoe in the resulting concept object
        // CRITICAL: Remove concept.feasibilityData from spread to prevent AI hardcoded values from overriding calculations
        const { feasibilityData: _, ...conceptWithoutFeasibilityData } = concept;
        
        return {
          ...conceptWithoutFeasibilityData,
          // Ensure the user-specified globalLoeDate is properly preserved at the top level
          globalLoeDate: data.globalLoeDate,
          // Also ensure the timeToLoe value is preserved at the top level
          timeToLoe: feasibilityData.timeToLoe,
          // Use corrected PICO data with actual sample size
          picoData: correctedPicoData,
          // ALWAYS use calculated feasibility data, never AI-generated values
          feasibilityData: {
            ...feasibilityData,
            // Explicitly ensure ROI is included
            projectedROI: feasibilityData.projectedROI,
            completionRisk: feasibilityData.completionRisk,
            recruitmentRate: feasibilityData.recruitmentRate,
            // Ensure the timeToLoe value is correctly set from data readout to LOE
            timeToLoe: feasibilityData.timeToLoe,
            // Make sure the globalLoeDate is preserved in the feasibilityData
            globalLoeDate: data.globalLoeDate || feasibilityData.globalLoeDate
          },
          // Store comprehensive AI analysis data for transparency
          aiAnalysis: feasibilityData.aiAnalysis || null,
          mcdaScores,
          swotAnalysis,
          currentEvidence
        };
      }));

      // Step 4: Save the concepts to the database
      const savedConcepts = await Promise.all(
        enrichedConcepts.map((concept: Partial<StudyConcept>) => storage.createStudyConcept(concept))
      );

      // Step 5: Automatically save as a study proposal for persistence
      if (savedConcepts.length > 0) {
        try {
          // Fetch research results if researchStrategyId is provided
          let researchResults = null;
          if (data.researchStrategyId) {
            try {
              const results = await storage.getResearchResultsByStrategy(data.researchStrategyId);
              if (results.length > 0) {
                // Store research results in structured JSON format for proper display
                researchResults = JSON.stringify(results);
              }
            } catch (error) {
              console.error("Error fetching research results:", error);
            }
          }

          const proposalData = {
            title: `${data.drugName} in ${data.indication} Study Proposal`,
            drugName: data.drugName,
            indication: data.indication,
            studyPhase: data.studyPhasePref || 'Phase III',
            strategicGoals: data.strategicGoals,
            geography: data.geography || ['US', 'EU'],
            researchStrategyId: data.researchStrategyId || null,
            researchResults: researchResults, // Include the formatted research results
            generatedConcepts: savedConcepts,
            userInputs: {
              drugName: data.drugName,
              indication: data.indication,
              studyPhasePref: data.studyPhasePref,
              strategicGoals: data.strategicGoals,
              geography: data.geography,
              targetSubpopulation: data.targetSubpopulation,
              comparatorDrugs: data.comparatorDrugs,
              budgetCeilingEur: data.budgetCeilingEur,
              timelineCeilingMonths: data.timelineCeilingMonths,
              globalLoeDate: data.globalLoeDate,
              hasPatentExtensionPotential: data.hasPatentExtensionPotential,
              anticipatedFpiDate: data.anticipatedFpiDate,
              aiModel: data.aiModel,
              researchStrategyId: data.researchStrategyId
            },
            conceptCount: savedConcepts.length
          };

          await storage.createSavedStudyProposal(proposalData);
          console.log("Successfully saved study proposal for persistence");
        } catch (error) {
          console.error("Error saving study proposal:", error);
          // Don't fail the entire request if proposal saving fails
        }
      }

      res.json(savedConcepts);
    } catch (error) {
      console.error("Error generating study concepts:", error);
      
      // More detailed error logging
      if (error instanceof Error) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      
      res.status(500).json({ 
        message: "Failed to generate study concepts", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // DELETE endpoint for study concepts
  app.delete("/api/study-concepts/:id", async (req, res) => {
    try {
      const conceptId = parseInt(req.params.id);
      const concept = await storage.getStudyConcept(conceptId);
      
      if (!concept) {
        return res.status(404).json({ message: "Study concept not found" });
      }
      
      await storage.deleteStudyConcept(conceptId);
      res.json({ message: "Study concept deleted successfully" });
    } catch (error) {
      console.error("Error deleting study concept:", error);
      res.status(500).json({ message: "Failed to delete study concept" });
    }
  });

  // PDF generation endpoint for study concepts
  app.get("/api/study-concepts/:id/pdf", async (req, res) => {
    try {
      const conceptId = parseInt(req.params.id);
      const concept = await storage.getStudyConcept(conceptId);
      
      if (!concept) {
        return res.status(404).json({ message: "Study concept not found" });
      }
      
      console.log('Generating PDF for concept:', conceptId);
      const pdfBuffer = await generateSingleConceptPdfReport(concept);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${concept.title.replace(/[^a-zA-Z0-9]/g, '_')}_concept.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating concept PDF:', error);
      res.status(500).json({ message: 'Failed to generate PDF' });
    }
  });

  // API Endpoints for study idea validations
  app.get("/api/study-idea-validations", async (req, res) => {
    try {
      const validations = await storage.getAllSynopsisValidations();
      res.json(validations);
    } catch (error) {
      console.error("Error fetching study idea validations:", error);
      res.status(500).json({ message: "Failed to fetch study idea validations" });
    }
  });

  app.get("/api/study-idea-validations/recent", async (req, res) => {
    try {
      const validations = await storage.getRecentSynopsisValidations(5);
      res.json(validations);
    } catch (error) {
      console.error("Error fetching recent study idea validations:", error);
      res.status(500).json({ message: "Failed to fetch recent study idea validations" });
    }
  });

  app.get("/api/study-idea-validations/:id", async (req, res) => {
    try {
      const validation = await storage.getSynopsisValidation(parseInt(req.params.id));
      if (!validation) {
        return res.status(404).json({ message: "Study idea validation not found" });
      }
      res.json(validation);
    } catch (error) {
      console.error("Error fetching study idea validation:", error);
      res.status(500).json({ message: "Failed to fetch study idea validation" });
    }
  });

  // DELETE endpoint for study idea validations
  app.delete("/api/study-idea-validations/:id", async (req, res) => {
    try {
      const validationId = parseInt(req.params.id);
      const validation = await storage.getSynopsisValidation(validationId);
      
      if (!validation) {
        return res.status(404).json({ message: "Study idea validation not found" });
      }
      
      await storage.deleteSynopsisValidation(validationId);
      res.json({ message: "Study idea validation deleted successfully" });
    } catch (error) {
      console.error("Error deleting study idea validation:", error);
      res.status(500).json({ message: "Failed to delete study idea validation" });
    }
  });

  app.post("/api/study-idea-validations/validate", upload.single('file'), async (req, res) => {
    try {
      console.log("Validating study idea with body:", {
        drugName: req.body.drugName,
        indication: req.body.indication,
        strategicGoal: req.body.strategicGoal,
        hasStudyIdeaText: !!req.body.studyIdeaText,
        hasFile: !!req.file
      });
      
      // Log incoming request data for debugging
      console.log("Received form data:", req.body);
      if (req.body.strategicGoals) {
        console.log("Strategic goals from form:", req.body.strategicGoals);
      }
      if (req.body['strategicGoals[]']) {
        console.log("Strategic goals array from form:", req.body['strategicGoals[]']);
      }
      
      // Check if research results are provided
      let existingResearchResults = null;
      if (req.body.researchResults) {
        try {
          existingResearchResults = JSON.parse(req.body.researchResults);
          console.log("Research Intelligence provided - enhancing validation with existing data");
          console.log("Research results structure:", {
            hasResults: !!existingResearchResults?.results,
            resultsCount: existingResearchResults?.results?.length || 0,
            firstResultHasContent: !!existingResearchResults?.results?.[0]?.content
          });
        } catch (e) {
          console.warn("Failed to parse research results:", e);
        }
      }
      
      // Also check for researchStrategyId parameter
      if (req.body.researchStrategyId && !existingResearchResults) {
        try {
          const strategyId = parseInt(req.body.researchStrategyId);
          console.log("Looking for research strategy ID:", strategyId);
          const strategy = await storage.getResearchStrategy(strategyId);
          if (strategy) {
            existingResearchResults = strategy;
            console.log("Found research strategy:", {
              hasResults: !!strategy.results,
              resultsCount: strategy.results?.length || 0
            });
          } else {
            console.log("No research strategy found for ID:", strategyId);
          }
        } catch (e) {
          console.warn("Failed to fetch research strategy:", e);
        }
      }
      
      // Handle strategic goals - could be an array or a single value from the form
      let strategicGoals = req.body.strategicGoals || req.body['strategicGoals[]'];
      
      // Ensure strategicGoals is an array
      if (strategicGoals && !Array.isArray(strategicGoals)) {
        strategicGoals = [strategicGoals];
      }
      
      // Validate request body
      const validationResult = validateSynopsisRequestSchema.safeParse({
        drugName: req.body.drugName,
        indication: req.body.indication,
        strategicGoals: strategicGoals || [],
        studyIdeaText: req.body.studyIdeaText,
        additionalContext: req.body.additionalContext,
        aiModel: req.body.aiModel || "gpt-4o"
      });

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid request parameters", 
          errors: validationResult.error.errors 
        });
      }

      const data = validationResult.data;
      
      // Get text either from uploaded file or directly from studyIdeaText
      let text: string;
      let originalFileName: string = "text-input.txt";
      
      console.log("Processing validation with studyIdeaText:", data.studyIdeaText?.substring(0, 50));
      
      if (req.file) {
        // If file is uploaded, extract text from it
        console.log("Using uploaded file:", req.file.originalname);
        text = await extractTextFromDocument(req.file.buffer, req.file.originalname);
        originalFileName = req.file.originalname;
      } else if (data.studyIdeaText && data.studyIdeaText.trim()) {
        // If study idea text is provided, use it directly
        console.log("Using provided study idea text");
        text = data.studyIdeaText;
      } else {
        // Neither file nor text provided
        console.log("No file or study idea text provided");
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Step 2: Extract PICO from the document text
      const extractedPico = await extractPicoFromText(text);
      
      // Step 3: Use existing research if available, otherwise perform comprehensive research
      let searchResults;
      let detailedResearchResults = null;
      
      if (existingResearchResults && existingResearchResults.results && Array.isArray(existingResearchResults.results) && existingResearchResults.results.length > 0) {
        console.log("Using existing Research Intelligence data for validation");
        
        // Check if the research results have meaningful content
        const hasRealContent = existingResearchResults.results.some((result: any) => {
          const content = result.content || result.rawResults?.content || '';
          return content && content.trim() && !content.includes('undefined');
        });
        
        if (hasRealContent) {
          console.log("Research results contain meaningful content - using for validation");
          // Use the existing research results instead of duplicating search
          searchResults = {
            content: existingResearchResults.results.map((result: any) => 
              `**${result.search?.query || result.searchQuery}**\n${result.content || result.rawResults?.content || ''}`
            ).join('\n\n'),
            citations: existingResearchResults.results.flatMap((result: any) => 
              result.citations || result.rawResults?.citations || []
            )
          };
          
          // Store the detailed research for Situational Analysis (properly formatted)
          detailedResearchResults = existingResearchResults.results.map((result: any) => ({
            id: result.id || Math.random().toString(36).substr(2, 9),
            searchQuery: result.search?.query || result.searchQuery || 'Research Query',
            searchType: result.search?.type || result.searchType || 'therapeutic',
            priority: result.search?.priority || result.priority || 1,
            rawResults: {
              content: result.content || result.rawResults?.content || '',
              citations: result.citations || result.rawResults?.citations || []
            },
            synthesizedInsights: result.synthesizedInsights,
            keyFindings: result.keyFindings,
            designImplications: result.designImplications,
            strategicRecommendations: result.strategicRecommendations,
            content: result.content || result.rawResults?.content || '',
            citations: result.citations || result.rawResults?.citations || []
          }));
        } else {
          console.log("Research results exist but contain no meaningful content - performing new research");
          existingResearchResults = null; // Force new research
        }
      } else {
        console.log("No existing research available - performing comprehensive validation research");
        
        // Use ValidationResearchGenerator for comprehensive research  
        const validationResearchGenerator = new ValidationResearchGenerator();
        const comprehensiveResearch = await validationResearchGenerator.generateValidationResearch({
          drugName: data.drugName,
          indication: data.indication,
          strategicGoals: data.strategicGoals
        });
        
        // Execute the research strategy
        const researchExecutor = new ResearchExecutor();
        const researchResults = await researchExecutor.executeResearch(comprehensiveResearch.searches);
        
        // Format for AI analysis
        searchResults = {
          content: researchResults.map((result: any) => 
            `**${result.searchQuery}**\n${result.rawResults.content || result.content || ''}`
          ).join('\n\n'),
          citations: researchResults.flatMap((result: any) => result.rawResults?.citations || result.citations || [])
        };
        
        // Store detailed research results for Situational Analysis
        detailedResearchResults = researchResults.map((result: any) => ({
          id: result.id || Math.random().toString(36).substr(2, 9),
          searchQuery: result.searchQuery,
          searchType: result.searchType || 'therapeutic',
          priority: result.priority || 1,
          rawResults: result.rawResults || { content: result.content, citations: result.citations },
          synthesizedInsights: result.synthesizedInsights,
          keyFindings: result.keyFindings,
          designImplications: result.designImplications,
          strategicRecommendations: result.strategicRecommendations,
          content: result.rawResults?.content || result.content,
          citations: result.rawResults?.citations || result.citations || []
        }));
      }
      
      // Include additional context in analysis if provided
      let enrichedText = text;
      if (data.additionalContext && data.additionalContext.trim()) {
        enrichedText += "\n\nAdditional Context:\n" + data.additionalContext;
      }
      
      // Step 4: Calculate feasibility data first using the same method as concept generation
      const tempConcept = {
        drugName: data.drugName,
        indication: data.indication,
        strategicGoals: data.strategicGoals,
        geography: req.body.geography ? (Array.isArray(req.body.geography) ? req.body.geography : [req.body.geography]) : ["US", "EU"],
        studyPhase: data.studyPhasePref || "any",
        targetSubpopulation: req.body.targetSubpopulation || null,
        comparatorDrugs: req.body.comparatorDrugs ? (Array.isArray(req.body.comparatorDrugs) ? req.body.comparatorDrugs : [req.body.comparatorDrugs]) : ["Standard of Care"],
        budgetCeilingEur: req.body.budgetCeilingEur ? parseInt(req.body.budgetCeilingEur) : undefined,
        timelineCeilingMonths: req.body.timelineCeilingMonths ? parseInt(req.body.timelineCeilingMonths) : undefined,
        globalLoeDate: req.body.globalLoeDate || null,
        hasPatentExtensionPotential: req.body.hasPatentExtensionPotential === 'true'
      };
      
      const feasibilityData = await calculateFeasibility(tempConcept, data);
      
      // Step 5: Analyze the document against evidence with feasibility context
      const validationResults = await analyzeWithOpenAI(searchResults, { 
        ...data,
        documentText: enrichedText,
        extractedPico,
        calculatedFeasibility: feasibilityData // Pass calculated feasibility to AI for consistent analysis
      }, true, data.aiModel || "gpt-4o");
      
      // Override AI feasibility data with calculated values for consistency
      validationResults.feasibilityData = feasibilityData;
      
      // Ensure revised economics uses the calculated feasibility cost
      if (validationResults.revisedEconomics) {
        validationResults.revisedEconomics.revisedCost = feasibilityData.totalCost;
        validationResults.revisedEconomics.revisedTimeline = feasibilityData.timeline;
        validationResults.revisedEconomics.revisedROI = feasibilityData.projectedROI;
        validationResults.revisedEconomics.notes = `Costs account for increased sample size and extended recruitment. ${validationResults.revisedEconomics.notes || ''}`.trim();
      }
      
      // Fix PICO population field to reflect actual calculated sample size (same as concept generation)
      if (validationResults.extractedPico && feasibilityData.sampleSize) {
        validationResults.extractedPico = {
          ...validationResults.extractedPico,
          population: updatePicoPopulationWithSampleSize(
            validationResults.extractedPico?.population,
            feasibilityData.sampleSize,
            data.indication,
            tempConcept.targetSubpopulation
          )
        };
      }
      
      // Set the current evidence with clean content and proper citations
      console.log("Setting detailed evidence with search results length:", searchResults.content.length);
      console.log("Citations received:", searchResults.citations.length);
      
      validationResults.currentEvidence = {
        summary: searchResults.content, // Use clean content directly
        citations: searchResults.citations.map((citation, index) => ({
          id: `${index + 1}`,
          title: citation,
          url: citation
        }))
      };
      
      // Step 5: Save the validation to the database with detailed research results
      const savedValidation = await storage.createSynopsisValidation({
        ...validationResults,
        strategicGoals: data.strategicGoals || [], // Ensure strategic goals are array, not null
        drugName: data.drugName,
        indication: data.indication,
        originalFileName: originalFileName,
        studyIdeaText: data.studyIdeaText,
        additionalContext: data.additionalContext,
        researchResults: detailedResearchResults ? JSON.stringify(detailedResearchResults) : null // Store detailed research for Situational Analysis
      });

      // Add metadata about research data usage for client-side handling
      const responseData = {
        ...savedValidation,
        usedExistingResearch: !!existingResearchResults,
        existingResearchData: existingResearchResults
      };

      res.json(responseData);
    } catch (error) {
      console.error("Error validating study idea:", error);
      res.status(500).json({ message: "Failed to validate study idea" });
    }
  });

  // Export endpoints
  app.get("/api/export/pdf", async (req, res) => {
    try {
      const idStr = req.query.ids as string;
      if (!idStr) {
        return res.status(400).json({ message: "No concept IDs provided" });
      }

      const ids = idStr.split(',').map(id => parseInt(id.trim()));
      const concepts = await Promise.all(ids.map(id => storage.getStudyConcept(id)));
      const validConcepts = concepts.filter(Boolean);

      if (validConcepts.length === 0) {
        return res.status(404).json({ message: "No valid concepts found" });
      }

      const pdfBuffer = await generatePdfReport(validConcepts);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=study-concepts-report.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF report" });
    }
  });

  app.get("/api/export/pptx", async (req, res) => {
    try {
      const idStr = req.query.ids as string;
      if (!idStr) {
        return res.status(400).json({ message: "No concept IDs provided" });
      }

      const ids = idStr.split(',').map(id => parseInt(id.trim()));
      const concepts = await Promise.all(ids.map(id => storage.getStudyConcept(id)));
      const validConcepts = concepts.filter(Boolean);

      if (validConcepts.length === 0) {
        return res.status(404).json({ message: "No valid concepts found" });
      }

      try {
        // Try to generate PPTX
        const pptxBuffer = await generatePptxReport(validConcepts);
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
        res.setHeader('Content-Disposition', `attachment; filename=study-concepts-presentation.pptx`);
        res.send(pptxBuffer);
      } catch (pptxError) {
        // If PPTX generation fails, fall back to PDF
        console.error("Error generating PPTX, falling back to PDF:", pptxError);
        
        // Generate PDF instead
        const pdfBuffer = await generatePdfReport(validConcepts);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=study-concepts-presentation.pdf`);
        res.send(pdfBuffer);
      }
    } catch (error) {
      console.error("Error generating export:", error);
      res.status(500).json({ message: "Failed to generate presentation" });
    }
  });

  // Backward compatibility routes to ensure existing API calls continue to work
  app.get("/api/synopsis-validations", (req, res) => {
    res.redirect(307, '/api/study-idea-validations'); // 307 preserves the HTTP method
  });
  
  app.get("/api/synopsis-validations/recent", (req, res) => {
    res.redirect(307, '/api/study-idea-validations/recent');
  });
  
  app.get("/api/synopsis-validations/:id", (req, res) => {
    res.redirect(307, `/api/study-idea-validations/${req.params.id}`);
  });
  
  // Add redirect for POST requests to validation endpoint
  app.post("/api/synopsis-validations/validate", upload.single('file'), (req, res, next) => {
    console.log("Redirecting from /api/synopsis-validations/validate to /api/study-idea-validations/validate");
    req.url = '/api/study-idea-validations/validate';
    next();
  });

  app.get("/api/export/validation-pdf", async (req, res) => {
    try {
      const id = parseInt(req.query.id as string);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid validation ID" });
      }

      const validation = await storage.getSynopsisValidation(id);
      if (!validation) {
        return res.status(404).json({ message: "Validation not found" });
      }

      const pdfBuffer = await generateValidationPdfReport(validation);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=validation-report.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating validation PDF:", error);
      res.status(500).json({ message: "Failed to generate validation PDF report" });
    }
  });

  // Research Strategy API endpoints
  const researchStrategyGenerator = new ResearchStrategyGenerator();
  const researchExecutor = new ResearchExecutor();

  // Generate AI-driven research strategy
  app.post("/api/research-strategies/generate", async (req, res) => {
    try {
      const validationResult = researchStrategyRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid request data",
          errors: validationResult.error.errors
        });
      }

      const data = validationResult.data;
      const sessionId = data.sessionId || `session_${Date.now()}`;

      // Generate AI strategy
      const strategy = await researchStrategyGenerator.generateStrategy({
        drugName: data.drugName,
        indication: data.indication,
        strategicGoals: data.strategicGoals,
        studyPhase: data.studyPhase,
        geography: data.geography
      });

      // Save to storage
      const researchStrategy = await storage.createResearchStrategy({
        sessionId,
        drugName: data.drugName,
        indication: data.indication,
        strategicGoals: data.strategicGoals,
        studyPhase: data.studyPhase,
        geography: data.geography,
        proposedSearches: strategy.searches,
        aiRationale: strategy.rationale,
        status: "proposed"
      });

      res.json(researchStrategy);
    } catch (error) {
      console.error("Error generating research strategy:", error);
      res.status(500).json({ message: "Failed to generate research strategy" });
    }
  });

  // Get research strategy by ID
  app.get("/api/research-strategies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const strategy = await storage.getResearchStrategy(id);
      
      if (!strategy) {
        return res.status(404).json({ message: "Research strategy not found" });
      }

      res.json(strategy);
    } catch (error) {
      console.error("Error fetching research strategy:", error);
      res.status(500).json({ message: "Failed to fetch research strategy" });
    }
  });

  // Get research strategies by session
  app.get("/api/research-strategies/session/:sessionId", async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      const strategies = await storage.getResearchStrategiesBySession(sessionId);
      res.json(strategies);
    } catch (error) {
      console.error("Error fetching research strategies:", error);
      res.status(500).json({ message: "Failed to fetch research strategies" });
    }
  });

  // Amend research strategy (user modifications)
  app.post("/api/research-strategies/amend", async (req, res) => {
    try {
      const validationResult = amendStrategyRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid amendment data",
          errors: validationResult.error.errors
        });
      }

      const { strategyId, modifiedSearches, userNotes } = validationResult.data;
      
      const existing = await storage.getResearchStrategy(strategyId);
      if (!existing) {
        return res.status(404).json({ message: "Research strategy not found" });
      }

      // Track amendment history
      const amendmentHistory = existing.amendmentHistory || [];
      amendmentHistory.push({
        timestamp: new Date().toISOString(),
        originalSearches: existing.proposedSearches,
        modifiedSearches: modifiedSearches,
        userNotes: userNotes
      });

      const updated = await storage.updateResearchStrategy(strategyId, {
        userModifiedSearches: modifiedSearches,
        userNotes,
        amendmentHistory,
        status: "amended"
      });

      res.json(updated);
    } catch (error) {
      console.error("Error amending research strategy:", error);
      res.status(500).json({ message: "Failed to amend research strategy" });
    }
  });

  // Execute research strategy
  app.post("/api/research-strategies/execute", async (req, res) => {
    try {
      const validationResult = executeStrategyRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid execution request",
          errors: validationResult.error.errors
        });
      }

      const { strategyId } = validationResult.data;
      
      const strategy = await storage.getResearchStrategy(strategyId);
      if (!strategy) {
        return res.status(404).json({ message: "Research strategy not found" });
      }

      // Use user-modified searches if available, otherwise use proposed searches
      const searchesToExecute = strategy.userModifiedSearches || strategy.proposedSearches;

      // Execute the research strategy
      const executionResult = await researchExecutor.executeStrategy({
        strategyId,
        searches: searchesToExecute
      });

      // Save results to storage
      const resultPromises = executionResult.results.map(result => 
        storage.createResearchResult({
          strategyId: result.strategyId,
          searchQuery: result.searchQuery,
          searchType: result.searchType,
          priority: result.priority,
          rawResults: result.rawResults,
          synthesizedInsights: result.synthesizedInsights,
          keyFindings: result.keyFindings,
          designImplications: result.designImplications,
          strategicRecommendations: result.strategicRecommendations
        })
      );

      await Promise.all(resultPromises);

      // Update strategy as executed
      await storage.updateResearchStrategy(strategyId, {
        status: "executed",
        executedAt: new Date()
      });

      res.json({
        strategyId,
        status: "executed",
        synthesizedInsights: executionResult.synthesizedInsights,
        designImplications: executionResult.designImplications,
        strategicRecommendations: executionResult.strategicRecommendations,
        totalSearches: executionResult.results.length,
        successfulSearches: executionResult.results.filter(r => !r.rawResults.error).length,
        researchResults: executionResult.results,
        totalCitations: executionResult.results.reduce((acc, r) => acc + (r.rawResults?.citations?.length || 0), 0)
      });

    } catch (error) {
      console.error("Error executing research strategy:", error);
      res.status(500).json({ message: "Failed to execute research strategy" });
    }
  });

  // Get research results for a strategy
  app.get("/api/research-strategies/:id/results", async (req, res) => {
    try {
      const strategyId = parseInt(req.params.id);
      const results = await storage.getResearchResultsByStrategy(strategyId);
      res.json(results);
    } catch (error) {
      console.error("Error fetching research results:", error);
      res.status(500).json({ message: "Failed to fetch research results" });
    }
  });

  // Saved Study Proposal management routes
  // Test Perplexity API endpoint for debugging
  app.post("/api/test-perplexity", async (req, res) => {
    try {
      const apiKey = process.env.PERPLEXITY_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: "PERPLEXITY_API_KEY not found" });
      }
      
      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "sonar",
          messages: [{ role: "user", content: "test query about amivantamab NSCLC" }],
          max_tokens: 100
        })
      });

      if (response.ok) {
        const data = await response.json();
        res.json({ success: true, message: "API key is valid", response: data });
      } else {
        const errorText = await response.text();
        res.status(response.status).json({ 
          success: false, 
          status: response.status,
          error: errorText.substring(0, 500) 
        });
      }
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  app.get("/api/saved-proposals", async (req, res) => {
    try {
      const proposals = await storage.getAllSavedStudyProposals();
      
      // Backfill research results for existing proposals that don't have them
      const updatedProposals = await Promise.all(
        proposals.map(async (proposal) => {
          // If proposal has a researchStrategyId but no researchResults, fetch and update  
          if (proposal.researchStrategyId && (!proposal.researchResults || proposal.researchResults === null || proposal.researchResults === '')) {
            console.log(`Backfilling research results for proposal ${proposal.id} with strategy ${proposal.researchStrategyId}`);
            try {
              const results = await storage.getResearchResultsByStrategy(proposal.researchStrategyId);
              console.log(`Found ${results.length} research results for strategy ${proposal.researchStrategyId}`);
              
              if (results.length > 0) {
                // Store research results in structured JSON format for proper display
                const structuredResults = JSON.stringify(results);

                console.log(`Structured results length: ${structuredResults.length} characters`);

                // Update the proposal with research results
                const updatedProposal = await storage.updateSavedStudyProposal(proposal.id, {
                  researchResults: structuredResults
                });
                
                console.log(`Updated proposal result:`, updatedProposal ? 'success' : 'failed');
                return updatedProposal || proposal;
              }
            } catch (error) {
              console.error(`Error backfilling research results for proposal ${proposal.id}:`, error);
            }
          }
          return proposal;
        })
      );
      
      res.json(updatedProposals);
    } catch (error) {
      console.error("Error fetching saved proposals:", error);
      res.status(500).json({ message: "Failed to fetch saved proposals" });
    }
  });

  app.get("/api/saved-proposals/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const proposal = await storage.getSavedStudyProposal(id);
      
      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }
      
      res.json(proposal);
    } catch (error) {
      console.error("Error fetching proposal:", error);
      res.status(500).json({ message: "Failed to fetch proposal" });
    }
  });

  // Add a simple PATCH route to update proposals
  app.patch("/api/saved-proposals/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const updatedProposal = await storage.updateSavedStudyProposal(id, updates);
      
      if (!updatedProposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }
      
      res.json(updatedProposal);
    } catch (error) {
      console.error("Error updating proposal:", error);
      res.status(500).json({ message: "Failed to update proposal" });
    }
  });

  app.delete("/api/saved-proposals/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteSavedStudyProposal(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Proposal not found" });
      }
      
      res.json({ message: "Proposal deleted successfully" });
    } catch (error) {
      console.error("Error deleting proposal:", error);
      res.status(500).json({ message: "Failed to delete proposal" });
    }
  });

  app.get("/api/saved-proposals/:id/pdf", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const proposal = await storage.getSavedStudyProposal(id);
      
      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }

      // Generate PDF from the proposal data
      const pdfBuffer = await generateProposalPdfReport(proposal);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${proposal.drugName.replace(/[^a-zA-Z0-9]/g, '_')}_${proposal.indication.replace(/[^a-zA-Z0-9]/g, '_')}_study_proposal.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating proposal PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });



  // Validation research routes
  app.post("/api/validation-research/generate-strategy", async (req, res) => {
    try {
      const { drugName, indication, strategicGoals, studyPhase, geography, additionalContext } = req.body;
      
      const generator = new ValidationResearchGenerator();
      const strategy = await generator.generateValidationStrategy({
        drugName,
        indication,
        strategicGoals: strategicGoals || [],
        studyPhase,
        geography,
        additionalContext
      });
      
      res.json(strategy);
    } catch (error) {
      console.error("Error generating validation research strategy:", error);
      res.status(500).json({ message: "Failed to generate validation research strategy" });
    }
  });

  app.post("/api/validation-research/execute", async (req, res) => {
    try {
      const { searches, context } = req.body;
      
      // Execute research using existing ResearchExecutor
      const executor = new ResearchExecutor();
      const results = await executor.executeValidationResearch(searches, context);
      
      res.json(results);
    } catch (error) {
      console.error("Error executing validation research:", error);
      res.status(500).json({ message: "Failed to execute validation research" });
    }
  });

  // API endpoint for concept refinement
  app.post("/api/study-concepts/:id/refine", async (req, res) => {
    try {
      const conceptId = parseInt(req.params.id);
      const { message, currentConcept } = req.body;
      
      if (!message || !currentConcept) {
        return res.status(400).json({ error: "Message and current concept are required" });
      }
      
      // Save user message to database
      await storage.createChatMessage({
        conceptId: conceptId,
        type: 'user',
        content: message
      });

      // Get full chat history for context and convert format
      const fullChatHistory = await storage.getChatMessagesByConceptId(conceptId);
      
      // Convert database chat format to OpenAI format
      const formattedHistory = fullChatHistory
        .filter(msg => msg.type !== 'system') // Exclude system messages
        .map(msg => ({
          role: msg.type === 'user' ? 'user' as const : 'assistant' as const,
          content: msg.content
        }));
      
      const conceptRefiner = new ConceptRefiner();
      const result = await conceptRefiner.refineStudyConcept({
        message,
        currentConcept,
        conversationHistory: formattedHistory
      });
      
      // Save assistant response to database - ensure proper serialization of complex objects
      const sanitizedCascadingAnalysis = result.cascadingAnalysis ? {
        timelineImpact: typeof result.cascadingAnalysis.timelineImpact === 'string' 
          ? result.cascadingAnalysis.timelineImpact 
          : JSON.stringify(result.cascadingAnalysis.timelineImpact),
        resourceImpact: typeof result.cascadingAnalysis.resourceImpact === 'string' 
          ? result.cascadingAnalysis.resourceImpact 
          : JSON.stringify(result.cascadingAnalysis.resourceImpact),
        financialImpact: typeof result.cascadingAnalysis.financialImpact === 'string' 
          ? result.cascadingAnalysis.financialImpact 
          : JSON.stringify(result.cascadingAnalysis.financialImpact),
        regulatoryImpact: typeof result.cascadingAnalysis.regulatoryImpact === 'string' 
          ? result.cascadingAnalysis.regulatoryImpact 
          : JSON.stringify(result.cascadingAnalysis.regulatoryImpact),
        strategicImpact: typeof result.cascadingAnalysis.strategicImpact === 'string' 
          ? result.cascadingAnalysis.strategicImpact 
          : JSON.stringify(result.cascadingAnalysis.strategicImpact)
      } : null;

      await storage.createChatMessage({
        conceptId: conceptId,
        type: 'assistant',
        content: result.explanation,
        changes: result.changes || null,
        cascadingAnalysis: sanitizedCascadingAnalysis
      });
      
      // Note: We no longer update the concept in storage - changes are only shown in chat
      res.json({
        ...result,
        chatHistory: await storage.getChatMessagesByConceptId(conceptId)
      });
    } catch (error) {
      console.error("Error refining concept:", error);
      res.status(500).json({ error: "Failed to refine concept" });
    }
  });

  // API endpoint for getting refinement suggestions
  app.get("/api/study-concepts/:id/suggestions", async (req, res) => {
    try {
      const conceptId = parseInt(req.params.id);
      const concept = await storage.getStudyConcept(conceptId);
      
      if (!concept) {
        return res.status(404).json({ error: "Concept not found" });
      }
      
      const conceptRefiner = new ConceptRefiner();
      const suggestions = await conceptRefiner.generateRefinementSuggestions(concept);
      
      res.json({ suggestions });
    } catch (error) {
      console.error("Error generating suggestions:", error);
      res.status(500).json({ error: "Failed to generate suggestions" });
    }
  });

  // Register tournament routes
  app.use('/api/tournaments', tournamentRoutes);

  // Register chat message routes
  await registerChatRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}

/**
 * Updates PICO population field to include actual calculated sample size
 * Helper function copied from ideaGenerator.ts to ensure consistency
 */
function updatePicoPopulationWithSampleSize(
  originalPopulation: string | undefined | null,
  calculatedSampleSize: number,
  indication: string,
  targetSubpopulation?: string | null
): string {
  // Handle undefined or null originalPopulation
  if (!originalPopulation || typeof originalPopulation !== 'string') {
    const sampleSizeText = `n=${calculatedSampleSize} patients with ${indication}${targetSubpopulation ? ` (${targetSubpopulation})` : ''}`;
    return `${sampleSizeText}, meeting study inclusion criteria`;
  }

  // Remove any existing patient numbers that might conflict
  let cleanedPopulation = originalPopulation
    .replace(/\b\d{3,4}\s+(?:patients?|subjects?|adults?|participants?)\b/gi, '')
    .replace(/\bn\s*=\s*\d{3,4}\b/gi, '')
    .replace(/\btotal\s+of\s+\d{3,4}\b/gi, '')
    .replace(/\bapproximately\s+\d{3,4}\b/gi, '')
    .trim();
  
  // Clean up any double spaces or formatting issues
  cleanedPopulation = cleanedPopulation.replace(/\s+/g, ' ').trim();
  
  // Add the correct sample size at the beginning for clarity
  const sampleSizeText = `n=${calculatedSampleSize} patients with ${indication}${targetSubpopulation ? ` (${targetSubpopulation})` : ''}`;
  
  // If the cleaned population is very short or generic, enhance it
  if (cleanedPopulation.length < 30) {
    return `${sampleSizeText}, meeting study inclusion criteria`;
  }
  
  // Otherwise, prepend the sample size to the existing description
  return `${sampleSizeText}. ${cleanedPopulation}`;
}

// Export function needs to be at end of file
export async function registerChatRoutes(app: Express) {
  // API endpoints for chat messages
  app.get("/api/study-concepts/:id/chat-messages", async (req, res) => {
    try {
      const conceptId = parseInt(req.params.id);
      
      if (isNaN(conceptId)) {
        return res.status(400).json({ message: "Invalid concept ID" });
      }
      
      const chatMessages = await storage.getChatMessagesByConceptId(conceptId);
      res.json(chatMessages);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ message: "Failed to fetch chat messages" });
    }
  });

  app.delete("/api/study-concepts/:id/chat-messages", async (req, res) => {
    try {
      const conceptId = parseInt(req.params.id);
      
      if (isNaN(conceptId)) {
        return res.status(400).json({ message: "Invalid concept ID" });
      }
      
      const success = await storage.deleteChatMessagesByConceptId(conceptId);
      res.json({ success, message: success ? "Chat history cleared" : "No messages found" });
    } catch (error) {
      console.error("Error clearing chat messages:", error);
      res.status(500).json({ message: "Failed to clear chat messages" });
    }
  });
}
