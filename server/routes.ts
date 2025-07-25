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
import { generatePdfReport, generatePptxReport, generateValidationPdfReport } from "./services/reportBuilder";

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
      
      // Step 1: Perform web search using Perplexity API to gather evidence
      const isOncology = (data.indication || '').toLowerCase().includes('cancer') || 
                         (data.indication || '').toLowerCase().includes('oncol') ||
                         (data.indication || '').toLowerCase().includes('tumor');
      
      // Create a simplified search query to avoid API errors
      const strategicGoalsFocus = data.strategicGoals.map(goal => goal.replace('_', ' ')).join(' and ');
      const searchQuery = `${data.drugName} ${data.indication} ${strategicGoalsFocus} Phase ${data.studyPhasePref} clinical trials study design`;
      
      const searchResults = await perplexityWebSearch(searchQuery, [
        "pubmed.ncbi.nlm.nih.gov",
        "clinicaltrials.gov", 
        "nejm.org",
        "accessdata.fda.gov",
        "ema.europa.eu",
        "nature.com"
      ]);

      // Step 2: Generate concepts using OpenAI with selected model
      const concepts = await analyzeWithOpenAI(searchResults, data, false, data.aiModel || "gpt-4o");

      // Step 3: For each concept, calculate feasibility, MCDA scores, and SWOT analysis
      // Added debug logs for anticipatedFpiDate
      console.log("Request data - data.anticipatedFpiDate:", data.anticipatedFpiDate);
      console.log("Request data - data.globalLoeDate:", data.globalLoeDate);
      
      const enrichedConcepts = concepts.map((concept: Partial<StudyConcept>) => {
        // Debug each concept
        console.log("Processing concept:", concept.title);
        console.log("Concept input data:", {
          studyPhase: concept.studyPhase,
          strategicGoals: concept.strategicGoals,
          geography: concept.geography,
          indication: concept.indication,
          feasibilityData: concept.feasibilityData
        });
        
        const feasibilityData = calculateFeasibility(concept, data);
        
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
        
        // Make sure we explicitly include the globalLoeDate and timeToLoe in the resulting concept object
        return {
          ...concept,
          // Ensure the user-specified globalLoeDate is properly preserved at the top level
          globalLoeDate: data.globalLoeDate,
          // Also ensure the timeToLoe value is preserved at the top level
          timeToLoe: feasibilityData.timeToLoe,
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
          mcdaScores,
          swotAnalysis,
          currentEvidence
        };
      });

      // Step 4: Save the concepts to the database
      const savedConcepts = await Promise.all(
        enrichedConcepts.map((concept: Partial<StudyConcept>) => storage.createStudyConcept(concept))
      );

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
      
      // Step 3: Perform web search to gather evidence for benchmarking
      // Create a more detailed query similar to the one used in concept generation
      const isOncology = (data.indication || '').toLowerCase().includes('cancer') || 
                         (data.indication || '').toLowerCase().includes('oncol') ||
                         (data.indication || '').toLowerCase().includes('tumor');
                         
      const strategicGoalsFocus = data.strategicGoals.map(goal => goal.replace('_', ' ')).join(' and ');
      
      // Use a more detailed query similar to concept generation
      const searchQuery = `Provide clinical evidence benchmarks for ${data.drugName} in ${data.indication} focusing on ${strategicGoalsFocus}. 
      Include details about: 
      1. Optimal study design${data.studyPhasePref ? ` (Phase ${data.studyPhasePref})` : ''} 
      2. Typical patient populations and sample sizes 
      3. Common comparators used in similar studies
      4. Standard endpoints and outcomes
      5. Average costs and durations for similar trials${isOncology ? ' in oncology' : ''}
      6. Common inclusion/exclusion criteria 
      7. Geographic patterns/differences in conducting these trials`;
      
      // Use the same comprehensive domain list as concept generation
      const searchResults = await perplexityWebSearch(searchQuery, [
        "pubmed.ncbi.nlm.nih.gov",
        "clinicaltrials.gov", 
        "nejm.org",
        "accessdata.fda.gov",
        "ema.europa.eu",
        "nature.com"
      ]);
      
      // Include additional context in analysis if provided
      let enrichedText = text;
      if (data.additionalContext && data.additionalContext.trim()) {
        enrichedText += "\n\nAdditional Context:\n" + data.additionalContext;
      }
      
      // Step 4: Analyze the document against the evidence with selected model
      const validationResults = await analyzeWithOpenAI(searchResults, { 
        ...data,
        documentText: enrichedText,
        extractedPico
      }, true, data.aiModel || "gpt-4o");
      
      // Step 5: Calculate feasibility data for the validation results
      // Create a temporary concept-like object for feasibility calculation
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
      
      // Calculate feasibility data using the same method as concept generation
      const feasibilityData = calculateFeasibility(tempConcept, data);
      
      // Add feasibility data to validation results
      validationResults.feasibilityData = feasibilityData;
      
      // Fix PICO population field to reflect actual calculated sample size (same as concept generation)
      if (validationResults.extractedPico && feasibilityData.sampleSize) {
        validationResults.extractedPico = {
          ...validationResults.extractedPico,
          population: updatePicoPopulationWithSampleSize(
            validationResults.extractedPico.population,
            feasibilityData.sampleSize,
            data.indication,
            tempConcept.targetSubpopulation
          )
        };
      }
      
      // Always override the current evidence field with the detailed multi-round search results
      // This ensures all search rounds are properly displayed
      console.log("Setting detailed evidence with search results length:", searchResults.content.length);
      
      // Extract sections from the content for better formatting
      const sections = searchResults.content.split('## Search Round');
      const formattedSummary = sections.length > 1 
        ? sections.map(section => {
            // For the first section (which doesn't have the prefix)
            if (!section.includes('Clinical Evidence') && !section.includes('Regulatory Status')) {
              return section;
            }
            // Make the section titles more prominent
            return section.replace(/(\d+): (.*?)$/m, '**$1: $2**');
          }).join('\n\n## Search Round')
        : searchResults.content;
      
      validationResults.currentEvidence = {
        summary: formattedSummary,
        citations: searchResults.citations.map((citation, index) => ({
          id: `${index + 1}`,
          title: citation,
          url: citation
        }))
      };
      
      // Step 5: Save the validation to the database
      const savedValidation = await storage.createSynopsisValidation({
        ...validationResults,
        originalFileName: originalFileName,
        studyIdeaText: data.studyIdeaText,
        additionalContext: data.additionalContext
      });

      res.json(savedValidation);
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

  // Register tournament routes
  app.use('/api/tournaments', tournamentRoutes);

  const httpServer = createServer(app);
  return httpServer;
}

/**
 * Updates PICO population field to include actual calculated sample size
 * Helper function copied from ideaGenerator.ts to ensure consistency
 */
function updatePicoPopulationWithSampleSize(
  originalPopulation: string,
  calculatedSampleSize: number,
  indication: string,
  targetSubpopulation?: string | null
): string {
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
