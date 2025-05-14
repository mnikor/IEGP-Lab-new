import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { generateConceptRequestSchema, validateSynopsisRequestSchema } from "@shared/schema";
import { perplexityWebSearch } from "./services/perplexity";
import { analyzeWithOpenAI, extractPicoFromText } from "./services/openai";
import { extractTextFromDocument } from "./services/documentParser";
import { calculateFeasibility } from "./services/feasibilityCalculator";
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
    try {
      // Validate request body
      const validationResult = generateConceptRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid request parameters", 
          errors: validationResult.error.errors 
        });
      }

      const data = validationResult.data;
      
      // Log the incoming request data to debug anticipatedFpiDate
      console.log("Received request with anticipatedFpiDate:", data.anticipatedFpiDate);
      
      // Step 1: Perform web search using Perplexity API to gather evidence
      const isOncology = (data.indication || '').toLowerCase().includes('cancer') || 
                         (data.indication || '').toLowerCase().includes('oncol') ||
                         (data.indication || '').toLowerCase().includes('tumor');
      
      // Create a more detailed query that explicitly asks for study design information                   
      const searchQuery = `Provide the latest clinical evidence for ${data.drugName} in ${data.indication} focusing on ${data.strategicGoal.replace('_', ' ')}. 
      Include details about: 
      1. Optimal study design (Phase ${data.studyPhasePref}) 
      2. Typical patient populations and sample sizes 
      3. Common comparators used in similar studies
      4. Standard endpoints and outcomes
      5. Average costs and durations for similar trials${isOncology ? ' in oncology' : ''}
      6. Common inclusion/exclusion criteria 
      7. Geographic patterns/differences in conducting these trials`;
      
      const searchResults = await perplexityWebSearch(searchQuery, [
        "pubmed.ncbi.nlm.nih.gov",
        "clinicaltrials.gov", 
        "nejm.org",
        "accessdata.fda.gov",
        "ema.europa.eu",
        "nature.com"
      ]);

      // Step 2: Generate concepts using OpenAI
      const concepts = await analyzeWithOpenAI(searchResults, data);

      // Step 3: For each concept, calculate feasibility, MCDA scores, and SWOT analysis
      const enrichedConcepts = concepts.map((concept: Partial<StudyConcept>) => {
        const feasibilityData = calculateFeasibility(concept, data);
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
        
        return {
          ...concept,
          feasibilityData,
          mcdaScores,
          swotAnalysis,
          currentEvidence
        };
      });

      // Step 4: Save the concepts to the database
      const savedConcepts = await Promise.all(
        enrichedConcepts.map(concept => storage.createStudyConcept(concept))
      );

      res.json(savedConcepts);
    } catch (error) {
      console.error("Error generating study concepts:", error);
      res.status(500).json({ message: "Failed to generate study concepts" });
    }
  });

  // API Endpoints for synopsis validations
  app.get("/api/synopsis-validations", async (req, res) => {
    try {
      const validations = await storage.getAllSynopsisValidations();
      res.json(validations);
    } catch (error) {
      console.error("Error fetching synopsis validations:", error);
      res.status(500).json({ message: "Failed to fetch synopsis validations" });
    }
  });

  app.get("/api/synopsis-validations/recent", async (req, res) => {
    try {
      const validations = await storage.getRecentSynopsisValidations(5);
      res.json(validations);
    } catch (error) {
      console.error("Error fetching recent synopsis validations:", error);
      res.status(500).json({ message: "Failed to fetch recent synopsis validations" });
    }
  });

  app.get("/api/synopsis-validations/:id", async (req, res) => {
    try {
      const validation = await storage.getSynopsisValidation(parseInt(req.params.id));
      if (!validation) {
        return res.status(404).json({ message: "Synopsis validation not found" });
      }
      res.json(validation);
    } catch (error) {
      console.error("Error fetching synopsis validation:", error);
      res.status(500).json({ message: "Failed to fetch synopsis validation" });
    }
  });

  app.post("/api/synopsis-validations/validate", upload.single('file'), async (req, res) => {
    try {
      // Check for file
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Validate request body
      const validationResult = validateSynopsisRequestSchema.safeParse({
        drugName: req.body.drugName,
        indication: req.body.indication,
        strategicGoal: req.body.strategicGoal
      });

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid request parameters", 
          errors: validationResult.error.errors 
        });
      }

      const data = validationResult.data;
      
      // Step 1: Extract text from the uploaded document
      const text = await extractTextFromDocument(req.file.buffer, req.file.originalname);
      
      // Step 2: Extract PICO from the document text
      const extractedPico = await extractPicoFromText(text);
      
      // Step 3: Perform web search to gather evidence for benchmarking
      const searchQuery = `Provide clinical evidence benchmarks for ${data.drugName} in ${data.indication} focusing on ${data.strategicGoal.replace('_', ' ')}`;
      const searchResults = await perplexityWebSearch(searchQuery, [
        "pubmed.ncbi.nlm.nih.gov",
        "clinicaltrials.gov",
        "nejm.org"
      ]);
      
      // Step 4: Analyze the document against the evidence
      const validationResults = await analyzeWithOpenAI(searchResults, { 
        ...data,
        documentText: text,
        extractedPico
      }, true);
      
      // Step 5: Save the validation to the database
      const savedValidation = await storage.createSynopsisValidation({
        ...validationResults,
        originalFileName: req.file.originalname
      });

      res.json(savedValidation);
    } catch (error) {
      console.error("Error validating synopsis:", error);
      res.status(500).json({ message: "Failed to validate synopsis" });
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

      const pptxBuffer = await generatePptxReport(validConcepts);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
      res.setHeader('Content-Disposition', `attachment; filename=study-concepts-presentation.pptx`);
      res.send(pptxBuffer);
    } catch (error) {
      console.error("Error generating PPTX:", error);
      res.status(500).json({ message: "Failed to generate PPTX presentation" });
    }
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

  const httpServer = createServer(app);
  return httpServer;
}
