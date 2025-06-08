import { StudyConcept, SynopsisValidation } from "@shared/schema";
import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';

// We'll use a dynamic import for pptxgenjs to ensure compatibility
// between development and production environments
let pptxgenjs: any = null;

// JSZip is already included with pptxgenjs, no need for separate import

/**
 * Generates a PDF report for study concepts
 * 
 * @param concepts Array of study concepts to include in the report
 * @returns Buffer containing the PDF file
 */
export async function generatePdfReport(concepts: StudyConcept[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // Create a new PDF document
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];
      const stream = new PassThrough();

      // Collect PDF data chunks
      stream.on('data', (chunk) => buffers.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(buffers)));
      stream.on('error', (err) => reject(err));

      // Pipe the PDF to our stream
      doc.pipe(stream);

      // Add title page
      doc.fontSize(24).font('Helvetica-Bold').text('Clinical Study Concepts', { align: 'center' });
      doc.moveDown();
      doc.fontSize(14).font('Helvetica').text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.moveDown(2);
      
      // Add a summary
      doc.fontSize(12).font('Helvetica-Bold').text('Summary', { underline: true });
      doc.fontSize(10).font('Helvetica').text(`This report contains ${concepts.length} clinical study concepts.`);
      doc.moveDown();
      
      // Add each concept
      concepts.forEach((concept, index) => {
        // Start a new page for each concept (except the first one)
        if (index > 0) {
          doc.addPage();
        } else {
          doc.moveDown(2);
        }
        
        // Concept header
        doc.fontSize(16).font('Helvetica-Bold').text(`Concept ${index + 1}: ${concept.title}`);
        doc.moveDown();
        
        // Concept metadata
        doc.fontSize(10).font('Helvetica-Bold').text('Drug: ').font('Helvetica').text(concept.drugName, { continued: true });
        doc.fontSize(10).font('Helvetica-Bold').text('   Indication: ').font('Helvetica').text(concept.indication);
        doc.fontSize(10).font('Helvetica-Bold').text('Strategic Goals: ').font('Helvetica').text(concept.strategicGoals.join(', ').replace(/_/g, ' '));
        doc.fontSize(10).font('Helvetica-Bold').text('Geography: ').font('Helvetica').text(concept.geography.join(', '));
        doc.fontSize(10).font('Helvetica-Bold').text('Study Phase: ').font('Helvetica').text(concept.studyPhase);
        doc.moveDown();
        
        // PICO Framework
        doc.fontSize(12).font('Helvetica-Bold').text('PICO Framework', { underline: true });
        doc.moveDown(0.5);
        
        // Type assertion for PICO data
        const picoData = concept.picoData as {
          population: string;
          intervention: string;
          comparator: string;
          outcomes: string;
        };
        
        doc.fontSize(10).font('Helvetica-Bold').text('Population: ').font('Helvetica').text(picoData.population);
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica-Bold').text('Intervention: ').font('Helvetica').text(picoData.intervention);
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica-Bold').text('Comparator: ').font('Helvetica').text(picoData.comparator);
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica-Bold').text('Outcomes: ').font('Helvetica').text(picoData.outcomes);
        doc.moveDown();
        
        // MCDA Scores
        doc.fontSize(12).font('Helvetica-Bold').text('MCDA Scores', { underline: true });
        doc.moveDown(0.5);
        
        // Type assertion for MCDA scores
        const mcdaScores = concept.mcdaScores as {
          overall: number;
          scientificValidity: number;
          clinicalImpact: number;
          commercialValue: number;
          feasibility: number;
        };
        
        doc.fontSize(10).font('Helvetica-Bold').text('Overall Score: ').font('Helvetica').text(`${mcdaScores.overall.toFixed(1)}/5`);
        doc.fontSize(10).font('Helvetica-Bold').text('Scientific Validity: ').font('Helvetica').text(`${mcdaScores.scientificValidity.toFixed(1)}/5`);
        doc.fontSize(10).font('Helvetica-Bold').text('Clinical Impact: ').font('Helvetica').text(`${mcdaScores.clinicalImpact.toFixed(1)}/5`);
        doc.fontSize(10).font('Helvetica-Bold').text('Commercial Value: ').font('Helvetica').text(`${mcdaScores.commercialValue.toFixed(1)}/5`);
        doc.fontSize(10).font('Helvetica-Bold').text('Feasibility: ').font('Helvetica').text(`${mcdaScores.feasibility.toFixed(1)}/5`);
        doc.moveDown();
        
        // Feasibility Data
        doc.fontSize(12).font('Helvetica-Bold').text('Feasibility Analysis', { underline: true });
        doc.moveDown(0.5);
        
        // Type assertion for feasibility data
        const feasibilityData = concept.feasibilityData as {
          estimatedCost: number;
          timeline: number;
          projectedROI: number;
          recruitmentRate: number;
          completionRisk: number;
        };
        
        doc.fontSize(10).font('Helvetica-Bold').text('Estimated Cost: ').font('Helvetica').text(`€${(feasibilityData.estimatedCost / 1000000).toFixed(1)}M`);
        doc.fontSize(10).font('Helvetica-Bold').text('Timeline: ').font('Helvetica').text(`${feasibilityData.timeline} months`);
        doc.fontSize(10).font('Helvetica-Bold').text('Projected ROI: ').font('Helvetica').text(`${feasibilityData.projectedROI.toFixed(1)}x`);
        doc.fontSize(10).font('Helvetica-Bold').text('Recruitment Rate: ').font('Helvetica').text(`${(feasibilityData.recruitmentRate * 100).toFixed(0)}%`);
        doc.fontSize(10).font('Helvetica-Bold').text('Completion Risk: ').font('Helvetica').text(`${(feasibilityData.completionRisk * 100).toFixed(0)}%`);
        doc.moveDown(0.5);
        
        // Cost Breakdown
        doc.fontSize(11).font('Helvetica-Bold').text('Cost Breakdown:', { underline: true });
        doc.moveDown(0.3);
        
        // Calculate percentages and display individual cost components
        const totalCost = feasibilityData.estimatedCost;
        const siteCosts = feasibilityData.siteCosts || 0;
        const personnelCosts = feasibilityData.personnelCosts || 0;
        const materialCosts = feasibilityData.materialCosts || 0;
        const monitoringCosts = feasibilityData.monitoringCosts || 0;
        const dataCosts = feasibilityData.dataCosts || 0;
        const regulatoryCosts = feasibilityData.regulatoryCosts || 0;
        
        doc.fontSize(9).font('Helvetica-Bold').text('Site Costs: ').font('Helvetica').text(`€${(siteCosts / 1000).toFixed(0)}K (${((siteCosts / totalCost) * 100).toFixed(0)}%)`);
        doc.fontSize(9).font('Helvetica-Bold').text('Personnel Costs: ').font('Helvetica').text(`€${(personnelCosts / 1000).toFixed(0)}K (${((personnelCosts / totalCost) * 100).toFixed(0)}%)`);
        doc.fontSize(9).font('Helvetica-Bold').text('Materials & Supplies: ').font('Helvetica').text(`€${(materialCosts / 1000).toFixed(0)}K (${((materialCosts / totalCost) * 100).toFixed(0)}%)`);
        doc.fontSize(9).font('Helvetica-Bold').text('Monitoring: ').font('Helvetica').text(`€${(monitoringCosts / 1000).toFixed(0)}K (${((monitoringCosts / totalCost) * 100).toFixed(0)}%)`);
        doc.fontSize(9).font('Helvetica-Bold').text('Data Management: ').font('Helvetica').text(`€${(dataCosts / 1000).toFixed(0)}K (${((dataCosts / totalCost) * 100).toFixed(0)}%)`);
        doc.fontSize(9).font('Helvetica-Bold').text('Regulatory Fees: ').font('Helvetica').text(`€${(regulatoryCosts / 1000).toFixed(0)}K (${((regulatoryCosts / totalCost) * 100).toFixed(0)}%)`);
        doc.fontSize(9).font('Helvetica-Bold').text('Total Cost: ').font('Helvetica').text(`€${(totalCost / 1000).toFixed(0)}K`);
        
        // Timeline Breakdown
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica-Bold').text('Timeline Breakdown:', { underline: true });
        doc.moveDown(0.3);
        
        const recruitmentPeriod = feasibilityData.recruitmentPeriodMonths || Math.round(feasibilityData.timeline * 0.6);
        const followUpPeriod = feasibilityData.followUpPeriodMonths || Math.round(feasibilityData.timeline * 0.4);
        
        doc.fontSize(9).font('Helvetica-Bold').text('Recruitment Period: ').font('Helvetica').text(`${recruitmentPeriod} months`);
        doc.fontSize(9).font('Helvetica-Bold').text('Follow-up Period: ').font('Helvetica').text(`${followUpPeriod} months`);
        doc.fontSize(9).font('Helvetica-Bold').text('Total Timeline: ').font('Helvetica').text(`${feasibilityData.timeline} months`);
        
        // Financial Impact  
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica-Bold').text('Financial Impact:', { underline: true });
        doc.moveDown(0.3);
        
        const projectedRoi = feasibilityData.projectedROI || 2.5;
        const expectedReturn = totalCost * projectedRoi;
        
        doc.fontSize(9).font('Helvetica-Bold').text('Projected ROI: ').font('Helvetica').text(`${projectedRoi.toFixed(1)}x`);
        doc.fontSize(9).font('Helvetica-Bold').text('Expected Return: ').font('Helvetica').text(`€${(expectedReturn / 1000000).toFixed(1)}M`);
        doc.fontSize(9).font('Helvetica-Bold').text('Net Benefit: ').font('Helvetica').text(`€${((expectedReturn - totalCost) / 1000000).toFixed(1)}M`);
        
        doc.moveDown();
        
        // Reasons to Believe
        if (concept.reasonsToBelieve) {
          doc.fontSize(12).font('Helvetica-Bold').text('Reasons to Believe', { underline: true });
          doc.moveDown(0.5);
          
          const reasonsToBelieve = concept.reasonsToBelieve as {
            scientificRationale?: {
              mechanismOfAction?: string;
              preclinicalData?: string;
              biomarkerSupport?: string;
            };
            clinicalEvidence?: {
              priorPhaseData?: string;
              safetyProfile?: string;
              efficacySignals?: string;
            };
            marketRegulatory?: {
              regulatoryPrecedent?: string;
              unmetNeed?: string;
              competitiveAdvantage?: string;
            };
            developmentFeasibility?: {
              patientAccess?: string;
              endpointViability?: string;
              operationalReadiness?: string;
            };
            overallConfidence?: string;
          };
          
          // Scientific Rationale
          if (reasonsToBelieve.scientificRationale) {
            doc.fontSize(10).font('Helvetica-Bold').text('Scientific Rationale:');
            if (reasonsToBelieve.scientificRationale.mechanismOfAction) {
              doc.fontSize(9).font('Helvetica').text(`• Mechanism: ${reasonsToBelieve.scientificRationale.mechanismOfAction}`);
            }
            if (reasonsToBelieve.scientificRationale.preclinicalData) {
              doc.fontSize(9).font('Helvetica').text(`• Preclinical: ${reasonsToBelieve.scientificRationale.preclinicalData}`);
            }
            if (reasonsToBelieve.scientificRationale.biomarkerSupport) {
              doc.fontSize(9).font('Helvetica').text(`• Biomarkers: ${reasonsToBelieve.scientificRationale.biomarkerSupport}`);
            }
            doc.moveDown(0.3);
          }
          
          // Clinical Evidence
          if (reasonsToBelieve.clinicalEvidence) {
            doc.fontSize(10).font('Helvetica-Bold').text('Clinical Evidence:');
            if (reasonsToBelieve.clinicalEvidence.priorPhaseData) {
              doc.fontSize(9).font('Helvetica').text(`• Prior Data: ${reasonsToBelieve.clinicalEvidence.priorPhaseData}`);
            }
            if (reasonsToBelieve.clinicalEvidence.safetyProfile) {
              doc.fontSize(9).font('Helvetica').text(`• Safety: ${reasonsToBelieve.clinicalEvidence.safetyProfile}`);
            }
            if (reasonsToBelieve.clinicalEvidence.efficacySignals) {
              doc.fontSize(9).font('Helvetica').text(`• Efficacy: ${reasonsToBelieve.clinicalEvidence.efficacySignals}`);
            }
            doc.moveDown(0.3);
          }
          
          // Market & Regulatory
          if (reasonsToBelieve.marketRegulatory) {
            doc.fontSize(10).font('Helvetica-Bold').text('Market & Regulatory:');
            if (reasonsToBelieve.marketRegulatory.regulatoryPrecedent) {
              doc.fontSize(9).font('Helvetica').text(`• Regulatory: ${reasonsToBelieve.marketRegulatory.regulatoryPrecedent}`);
            }
            if (reasonsToBelieve.marketRegulatory.unmetNeed) {
              doc.fontSize(9).font('Helvetica').text(`• Unmet Need: ${reasonsToBelieve.marketRegulatory.unmetNeed}`);
            }
            if (reasonsToBelieve.marketRegulatory.competitiveAdvantage) {
              doc.fontSize(9).font('Helvetica').text(`• Advantage: ${reasonsToBelieve.marketRegulatory.competitiveAdvantage}`);
            }
            doc.moveDown(0.3);
          }
          
          // Development Feasibility
          if (reasonsToBelieve.developmentFeasibility) {
            doc.fontSize(10).font('Helvetica-Bold').text('Development Feasibility:');
            if (reasonsToBelieve.developmentFeasibility.patientAccess) {
              doc.fontSize(9).font('Helvetica').text(`• Patient Access: ${reasonsToBelieve.developmentFeasibility.patientAccess}`);
            }
            if (reasonsToBelieve.developmentFeasibility.endpointViability) {
              doc.fontSize(9).font('Helvetica').text(`• Endpoints: ${reasonsToBelieve.developmentFeasibility.endpointViability}`);
            }
            if (reasonsToBelieve.developmentFeasibility.operationalReadiness) {
              doc.fontSize(9).font('Helvetica').text(`• Operations: ${reasonsToBelieve.developmentFeasibility.operationalReadiness}`);
            }
            doc.moveDown(0.3);
          }
          
          // Overall Confidence
          if (reasonsToBelieve.overallConfidence) {
            doc.fontSize(10).font('Helvetica-Bold').text('Overall Confidence: ').font('Helvetica').text(reasonsToBelieve.overallConfidence);
          }
          
          doc.moveDown();
        }
        
        // SWOT Analysis
        doc.fontSize(12).font('Helvetica-Bold').text('SWOT Analysis', { underline: true });
        doc.moveDown(0.5);
        
        // Type assertion for SWOT analysis
        const swotAnalysis = concept.swotAnalysis as {
          strengths: string[];
          weaknesses: string[];
          opportunities: string[];
          threats: string[];
        };
        
        // Strengths
        doc.fontSize(10).font('Helvetica-Bold').text('Strengths:');
        swotAnalysis.strengths.forEach((strength: string) => {
          doc.fontSize(9).font('Helvetica').text(`• ${strength}`);
        });
        doc.moveDown(0.5);
        
        // Weaknesses
        doc.fontSize(10).font('Helvetica-Bold').text('Weaknesses:');
        swotAnalysis.weaknesses.forEach((weakness: string) => {
          doc.fontSize(9).font('Helvetica').text(`• ${weakness}`);
        });
        doc.moveDown(0.5);
        
        // Opportunities
        doc.fontSize(10).font('Helvetica-Bold').text('Opportunities:');
        swotAnalysis.opportunities.forEach((opportunity: string) => {
          doc.fontSize(9).font('Helvetica').text(`• ${opportunity}`);
        });
        doc.moveDown(0.5);
        
        // Threats
        doc.fontSize(10).font('Helvetica-Bold').text('Threats:');
        swotAnalysis.threats.forEach((threat: string) => {
          doc.fontSize(9).font('Helvetica').text(`• ${threat}`);
        });
        doc.moveDown();
        
        // Evidence Sources
        doc.fontSize(12).font('Helvetica-Bold').text('Evidence Sources', { underline: true });
        doc.moveDown(0.5);
        
        // Type assertion for evidence sources
        const evidenceSources = concept.evidenceSources as Array<{
          citation: string;
          url?: string;
        }>;
        
        evidenceSources.forEach((source: any, i: number) => {
          doc.fontSize(9).font('Helvetica').text(`${i + 1}. ${source.citation}`);
        });
      });
      
      // Add footer
      doc.fontSize(8).font('Helvetica').text(`Generated by Clinical Study Ideator & Validator - ${new Date().toISOString()}`, { align: 'center' });
      
      // Finalize the PDF and end the stream
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generates a PowerPoint presentation for study concepts
 * 
 * @param concepts Array of study concepts to include in the presentation
 * @returns Buffer containing the PPTX file
 */
export async function generatePptxReport(concepts: StudyConcept[]): Promise<Buffer> {
  // In production environment, immediately fall back to PDF to avoid module compatibility issues
  if (process.env.NODE_ENV === 'production') {
    console.log('Skipping PPTX generation in production environment, falling back to PDF');
    return generatePdfReport(concepts);
  }
  
  return new Promise(async (resolve, reject) => {
    try {
      // Dynamically import pptxgenjs only when needed (only in development)
      if (!pptxgenjs) {
        try {
          // Try to import using dynamic import
          const module = await import('pptxgenjs');
          pptxgenjs = module.default || module;
        } catch (error) {
          console.error('Error importing pptxgenjs:', error);
          // Fall back to PDF generation on import error
          const pdfBuffer = await generatePdfReport(concepts);
          return resolve(pdfBuffer);
        }
      }
      
      // Create a new presentation
      const pptx = new pptxgenjs();
      
      // Add title slide
      const titleSlide = pptx.addSlide();
      titleSlide.addText('Clinical Study Concepts', { x: 1, y: 1, w: 8, h: 1.5, fontSize: 24, fontFace: 'Arial', bold: true, align: 'center' });
      titleSlide.addText(`Generated: ${new Date().toLocaleDateString()}`, { x: 1, y: 2.5, w: 8, h: 0.5, fontSize: 16, fontFace: 'Arial', align: 'center' });
      titleSlide.addText(`${concepts.length} Concept${concepts.length > 1 ? 's' : ''}`, { x: 1, y: 3.5, w: 8, h: 0.5, fontSize: 14, fontFace: 'Arial', align: 'center' });
      
      // For each concept, add multiple slides
      concepts.forEach((concept, index) => {
        // Overview slide
        const overviewSlide = pptx.addSlide();
        overviewSlide.addText(`Concept ${index + 1}: ${concept.title}`, { x: 0.5, y: 0.5, w: 9, h: 0.8, fontSize: 18, fontFace: 'Arial', bold: true });
        overviewSlide.addText(`Drug: ${concept.drugName} | Indication: ${concept.indication}`, { x: 0.5, y: 1.3, w: 9, h: 0.5, fontSize: 14, fontFace: 'Arial' });
        overviewSlide.addText(`Strategic Goals: ${concept.strategicGoals.join(', ').replace(/_/g, ' ')} | Phase: ${concept.studyPhase} | Geography: ${concept.geography.join(', ')}`, { x: 0.5, y: 1.8, w: 9, h: 0.5, fontSize: 14, fontFace: 'Arial' });
        
        // Type assertion for MCDA scores
        const pptxMcdaScores = concept.mcdaScores as {
          overall: number;
          scientificValidity: number;
          clinicalImpact: number;
          commercialValue: number;
          feasibility: number;
        };
        
        // Overall Score
        overviewSlide.addText(`Overall Score: ${pptxMcdaScores.overall.toFixed(1)}/5`, { x: 0.5, y: 2.5, w: 9, h: 0.5, fontSize: 16, fontFace: 'Arial', bold: true });
        
        // Add score bar chart
        const scores = [
          { name: 'Scientific Validity', score: pptxMcdaScores.scientificValidity },
          { name: 'Clinical Impact', score: pptxMcdaScores.clinicalImpact },
          { name: 'Commercial Value', score: pptxMcdaScores.commercialValue },
          { name: 'Feasibility', score: pptxMcdaScores.feasibility }
        ];
        
        // Add score text instead of chart (since actual chart creation is complex in pptxgenjs)
        let yPos = 3.2;
        scores.forEach(score => {
          overviewSlide.addText(`${score.name}: ${score.score.toFixed(1)}/5`, { x: 0.5, y: yPos, w: 9, h: 0.4, fontSize: 14, fontFace: 'Arial' });
          yPos += 0.5;
        });
        
        // Feasibility info
        overviewSlide.addText('Feasibility Overview:', { x: 0.5, y: 5.2, w: 9, h: 0.5, fontSize: 14, fontFace: 'Arial', bold: true });
        
        // Type assertion for feasibility data
        const pptxFeasibilityData = concept.feasibilityData as {
          estimatedCost: number;
          timeline: number;
          projectedROI: number;
          recruitmentRate: number;
          completionRisk: number;
        };
        
        overviewSlide.addText(`Cost: €${(pptxFeasibilityData.estimatedCost / 1000000).toFixed(1)}M | Timeline: ${pptxFeasibilityData.timeline} months | ROI: ${pptxFeasibilityData.projectedROI.toFixed(1)}x`, { x: 0.5, y: 5.7, w: 9, h: 0.5, fontSize: 14, fontFace: 'Arial' });
        
        // PICO slide
        const picoSlide = pptx.addSlide();
        picoSlide.addText(`Concept ${index + 1}: PICO Framework`, { x: 0.5, y: 0.5, w: 9, h: 0.8, fontSize: 18, fontFace: 'Arial', bold: true });
        
        // Type assertion for PICO data
        const pptxPicoData = concept.picoData as {
          population: string;
          intervention: string;
          comparator: string;
          outcomes: string;
        };
        
        // Add PICO elements
        picoSlide.addText('Population', { x: 0.5, y: 1.5, w: 9, h: 0.5, fontSize: 16, fontFace: 'Arial', bold: true });
        picoSlide.addText(pptxPicoData.population, { x: 0.5, y: 2.0, w: 9, h: 1.0, fontSize: 14, fontFace: 'Arial', bullet: true });
        
        picoSlide.addText('Intervention', { x: 0.5, y: 3.0, w: 9, h: 0.5, fontSize: 16, fontFace: 'Arial', bold: true });
        picoSlide.addText(pptxPicoData.intervention, { x: 0.5, y: 3.5, w: 9, h: 1.0, fontSize: 14, fontFace: 'Arial', bullet: true });
        
        picoSlide.addText('Comparator', { x: 0.5, y: 4.5, w: 9, h: 0.5, fontSize: 16, fontFace: 'Arial', bold: true });
        picoSlide.addText(pptxPicoData.comparator, { x: 0.5, y: 5.0, w: 9, h: 1.0, fontSize: 14, fontFace: 'Arial', bullet: true });
        
        picoSlide.addText('Outcomes', { x: 0.5, y: 6.0, w: 9, h: 0.5, fontSize: 16, fontFace: 'Arial', bold: true });
        picoSlide.addText(pptxPicoData.outcomes, { x: 0.5, y: 6.5, w: 9, h: 1.0, fontSize: 14, fontFace: 'Arial', bullet: true });
        
        // SWOT slide
        const swotSlide = pptx.addSlide();
        swotSlide.addText(`Concept ${index + 1}: SWOT Analysis`, { x: 0.5, y: 0.5, w: 9, h: 0.8, fontSize: 18, fontFace: 'Arial', bold: true });
        
        // Create SWOT quadrants
        // Type assertion for SWOT analysis
        const pptxSwotAnalysis = concept.swotAnalysis as {
          strengths: string[];
          weaknesses: string[];
          opportunities: string[];
          threats: string[];
        };
        
        swotSlide.addText('Strengths', { x: 0.5, y: 1.5, w: 4.5, h: 0.5, fontSize: 16, fontFace: 'Arial', bold: true, color: '107C10' });
        pptxSwotAnalysis.strengths.forEach((strength: string, i: number) => {
          swotSlide.addText(strength, { x: 0.5, y: 2.0 + (i * 0.4), w: 4.5, h: 0.4, fontSize: 12, fontFace: 'Arial', bullet: true });
        });
        
        swotSlide.addText('Weaknesses', { x: 5.0, y: 1.5, w: 4.5, h: 0.5, fontSize: 16, fontFace: 'Arial', bold: true, color: 'D83B01' });
        pptxSwotAnalysis.weaknesses.forEach((weakness: string, i: number) => {
          swotSlide.addText(weakness, { x: 5.0, y: 2.0 + (i * 0.4), w: 4.5, h: 0.4, fontSize: 12, fontFace: 'Arial', bullet: true });
        });
        
        swotSlide.addText('Opportunities', { x: 0.5, y: 4.0, w: 4.5, h: 0.5, fontSize: 16, fontFace: 'Arial', bold: true, color: '0078D4' });
        pptxSwotAnalysis.opportunities.forEach((opportunity: string, i: number) => {
          swotSlide.addText(opportunity, { x: 0.5, y: 4.5 + (i * 0.4), w: 4.5, h: 0.4, fontSize: 12, fontFace: 'Arial', bullet: true });
        });
        
        swotSlide.addText('Threats', { x: 5.0, y: 4.0, w: 4.5, h: 0.5, fontSize: 16, fontFace: 'Arial', bold: true, color: 'E81123' });
        pptxSwotAnalysis.threats.forEach((threat: string, i: number) => {
          swotSlide.addText(threat, { x: 5.0, y: 4.5 + (i * 0.4), w: 4.5, h: 0.4, fontSize: 12, fontFace: 'Arial', bullet: true });
        });
        
        // Evidence slide
        const evidenceSlide = pptx.addSlide();
        evidenceSlide.addText(`Concept ${index + 1}: Evidence Sources`, { x: 0.5, y: 0.5, w: 9, h: 0.8, fontSize: 18, fontFace: 'Arial', bold: true });
        
        // Type assertion for evidence sources
        const pptxEvidenceSources = concept.evidenceSources as Array<{
          citation: string;
          url?: string;
        }>;
        
        let evidenceY = 1.5;
        pptxEvidenceSources.forEach((source: any, i: number) => {
          evidenceSlide.addText(`${i + 1}. ${source.citation}`, { x: 0.5, y: evidenceY, w: 9, h: 0.5, fontSize: 12, fontFace: 'Arial' });
          evidenceY += 0.4;
        });
      });
      
      // Generate the presentation as a buffer using modern API
      // The latest version of pptxgenjs supports writeFile which returns a Promise with the buffer
      // Use writeBuffer instead of writeFile for Node.js environment
      // Cast to any since TypeScript definitions may not be up to date
      (pptx as any).writeBuffer()
        .then((buffer: any) => {
          resolve(Buffer.from(buffer));
        })
        .catch((err: Error) => {
          console.error('Error generating PPTX:', err);
          reject(err);
        });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generates a PDF validation report
 * 
 * @param validation The synopsis validation results
 * @returns Buffer containing the PDF file
 */
export async function generateValidationPdfReport(validation: SynopsisValidation): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // Create a new PDF document
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];
      const stream = new PassThrough();

      // Collect PDF data chunks
      stream.on('data', (chunk) => buffers.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(buffers)));
      stream.on('error', (err) => reject(err));

      // Pipe the PDF to our stream
      doc.pipe(stream);

      // Add title
      doc.fontSize(24).font('Helvetica-Bold').text('Synopsis Validation Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(14).font('Helvetica').text(validation.title, { align: 'center' });
      doc.fontSize(12).font('Helvetica').text(`Original File: ${validation.originalFileName}`, { align: 'center' });
      doc.fontSize(12).font('Helvetica').text(`Generated: ${new Date(validation.createdAt).toLocaleDateString()}`, { align: 'center' });
      doc.moveDown(2);
      
      // Extracted PICO
      doc.fontSize(16).font('Helvetica-Bold').text('Extracted PICO Framework');
      doc.moveDown();
      
      // Type assertion for PICO data in validation
      const validationPico = validation.extractedPico as {
        population: string;
        intervention: string;
        comparator: string;
        outcomes: string;
      };
      
      doc.fontSize(12).font('Helvetica-Bold').text('Population: ');
      doc.fontSize(10).font('Helvetica').text(validationPico.population);
      doc.moveDown();
      
      doc.fontSize(12).font('Helvetica-Bold').text('Intervention: ');
      doc.fontSize(10).font('Helvetica').text(validationPico.intervention);
      doc.moveDown();
      
      doc.fontSize(12).font('Helvetica-Bold').text('Comparator: ');
      doc.fontSize(10).font('Helvetica').text(validationPico.comparator);
      doc.moveDown();
      
      doc.fontSize(12).font('Helvetica-Bold').text('Outcomes: ');
      doc.fontSize(10).font('Helvetica').text(validationPico.outcomes);
      doc.moveDown(2);
      
      // Benchmark Deltas
      doc.fontSize(16).font('Helvetica-Bold').text('Benchmark Deltas');
      doc.moveDown();
      
      // Type assertion for benchmark deltas
      const benchmarkDeltas = validation.benchmarkDeltas as Array<{
        aspect: string;
        current: string;
        suggested: string;
        impact: 'positive' | 'negative' | 'neutral';
      }>;
      
      benchmarkDeltas.forEach((delta: any, index: number) => {
        doc.fontSize(12).font('Helvetica-Bold').text(`${index + 1}. ${delta.aspect}`);
        doc.fontSize(10).font('Helvetica-Bold').text('Current: ').font('Helvetica').text(delta.current);
        doc.fontSize(10).font('Helvetica-Bold').text('Suggested: ').font('Helvetica').text(delta.suggested);
        
        // Color-code impact
        let impactColor = '000000'; // Default black
        if (delta.impact === 'positive') impactColor = '107C10';
        if (delta.impact === 'negative') impactColor = 'D83B01';
        if (delta.impact === 'neutral') impactColor = '0078D4';
        
        doc.fontSize(10).font('Helvetica-Bold').text('Impact: ').fillColor(impactColor).font('Helvetica').text(delta.impact);
        doc.fillColor('black'); // Reset to black
        doc.moveDown();
      });
      doc.moveDown();
      
      // Risk Flags
      doc.fontSize(16).font('Helvetica-Bold').text('Risk Flags');
      doc.moveDown();
      
      // Type assertion for risk flags
      const riskFlags = validation.riskFlags as Array<{
        category: string;
        description: string;
        severity: 'high' | 'medium' | 'low';
        mitigation?: string;
      }>;
      
      riskFlags.forEach((flag: any, index: number) => {
        // Color-code severity
        let severityColor = '000000'; // Default black
        if (flag.severity === 'high') severityColor = 'E81123';
        if (flag.severity === 'medium') severityColor = 'FFB900';
        if (flag.severity === 'low') severityColor = 'FFC83D';
        
        doc.fontSize(12).font('Helvetica-Bold').text(`${index + 1}. ${flag.category}`).fillColor(severityColor).text(`[${flag.severity} risk]`, { align: 'right' });
        doc.fillColor('black'); // Reset to black
        doc.fontSize(10).font('Helvetica').text(flag.description);
        
        if (flag.mitigation) {
          doc.fontSize(10).font('Helvetica-Bold').text('Mitigation: ').font('Helvetica').text(flag.mitigation);
        }
        
        doc.moveDown();
      });
      doc.moveDown();
      
      // Revised Economics
      doc.fontSize(16).font('Helvetica-Bold').text('Revised Economics');
      doc.moveDown();
      
      // Type assertion for revised economics
      const economics = validation.revisedEconomics as {
        originalCost?: number;
        revisedCost: number;
        originalTimeline?: number;
        revisedTimeline: number;
        originalROI?: number;
        revisedROI: number;
        notes: string;
      };
      
      // Cost
      doc.fontSize(12).font('Helvetica-Bold').text('Cost Estimate:');
      if (economics.originalCost) {
        doc.fontSize(10).font('Helvetica').text(`Original: €${(economics.originalCost / 1000000).toFixed(1)}M`);
      }
      doc.fontSize(10).font('Helvetica-Bold').text(`Revised: €${(economics.revisedCost / 1000000).toFixed(1)}M`);
      doc.moveDown();
      
      // Timeline
      doc.fontSize(12).font('Helvetica-Bold').text('Timeline:');
      if (economics.originalTimeline) {
        doc.fontSize(10).font('Helvetica').text(`Original: ${economics.originalTimeline} months`);
      }
      doc.fontSize(10).font('Helvetica-Bold').text(`Revised: ${economics.revisedTimeline} months`);
      doc.moveDown();
      
      // ROI
      doc.fontSize(12).font('Helvetica-Bold').text('ROI Estimate:');
      if (economics.originalROI) {
        doc.fontSize(10).font('Helvetica').text(`Original: ${economics.originalROI.toFixed(1)}x`);
      }
      doc.fontSize(10).font('Helvetica-Bold').text(`Revised: ${economics.revisedROI.toFixed(1)}x`);
      doc.moveDown();
      
      // Notes
      if (economics.notes) {
        doc.fontSize(10).font('Helvetica-Bold').text('Notes:');
        doc.fontSize(10).font('Helvetica').text(economics.notes);
        doc.moveDown();
      }
      
      // SWOT Analysis
      doc.addPage();
      doc.fontSize(16).font('Helvetica-Bold').text('SWOT Analysis');
      doc.moveDown();
      
      // Type assertion for SWOT analysis
      const validationSwot = validation.swotAnalysis as {
        strengths: string[];
        weaknesses: string[];
        opportunities: string[];
        threats: string[];
      };
      
      // Strengths
      doc.fontSize(12).font('Helvetica-Bold').fillColor('107C10').text('Strengths:');
      doc.fillColor('black');
      validationSwot.strengths.forEach((strength: string) => {
        doc.fontSize(10).font('Helvetica').text(`• ${strength}`);
      });
      doc.moveDown();
      
      // Weaknesses
      doc.fontSize(12).font('Helvetica-Bold').fillColor('D83B01').text('Weaknesses:');
      doc.fillColor('black');
      validationSwot.weaknesses.forEach((weakness: string) => {
        doc.fontSize(10).font('Helvetica').text(`• ${weakness}`);
      });
      doc.moveDown();
      
      // Opportunities
      doc.fontSize(12).font('Helvetica-Bold').fillColor('0078D4').text('Opportunities:');
      doc.fillColor('black');
      validationSwot.opportunities.forEach((opportunity: string) => {
        doc.fontSize(10).font('Helvetica').text(`• ${opportunity}`);
      });
      doc.moveDown();
      
      // Threats
      doc.fontSize(12).font('Helvetica-Bold').fillColor('E81123').text('Threats:');
      doc.fillColor('black');
      validationSwot.threats.forEach((threat: string) => {
        doc.fontSize(10).font('Helvetica').text(`• ${threat}`);
      });
      
      // Add footer
      doc.fontSize(8).font('Helvetica').text(`Generated by Clinical Study Ideator & Validator - ${new Date().toISOString()}`, { align: 'center' });
      
      // Finalize the PDF and end the stream
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
