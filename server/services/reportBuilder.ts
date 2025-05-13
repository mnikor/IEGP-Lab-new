import { StudyConcept, SynopsisValidation } from "@shared/schema";
import PDFDocument from 'pdfkit';
import PptxGenJS from 'pptxgenjs';
import { PassThrough } from 'stream';

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
        doc.fontSize(10).font('Helvetica-Bold').text('Strategic Goal: ').font('Helvetica').text(concept.strategicGoal.replace('_', ' '));
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
        doc.moveDown();
        
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
        concept.evidenceSources.forEach((source, i) => {
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
  return new Promise((resolve, reject) => {
    try {
      // Create a new presentation
      const pptx = new PptxGenJS();
      
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
        overviewSlide.addText(`Strategic Goal: ${concept.strategicGoal.replace('_', ' ')} | Phase: ${concept.studyPhase} | Geography: ${concept.geography.join(', ')}`, { x: 0.5, y: 1.8, w: 9, h: 0.5, fontSize: 14, fontFace: 'Arial' });
        
        // Overall Score
        overviewSlide.addText(`Overall Score: ${concept.mcdaScores.overall.toFixed(1)}/5`, { x: 0.5, y: 2.5, w: 9, h: 0.5, fontSize: 16, fontFace: 'Arial', bold: true });
        
        // Add score bar chart
        const scores = [
          { name: 'Scientific Validity', score: concept.mcdaScores.scientificValidity },
          { name: 'Clinical Impact', score: concept.mcdaScores.clinicalImpact },
          { name: 'Commercial Value', score: concept.mcdaScores.commercialValue },
          { name: 'Feasibility', score: concept.mcdaScores.feasibility }
        ];
        
        // Add score text instead of chart (since actual chart creation is complex in pptxgenjs)
        let yPos = 3.2;
        scores.forEach(score => {
          overviewSlide.addText(`${score.name}: ${score.score.toFixed(1)}/5`, { x: 0.5, y: yPos, w: 9, h: 0.4, fontSize: 14, fontFace: 'Arial' });
          yPos += 0.5;
        });
        
        // Feasibility info
        overviewSlide.addText('Feasibility Overview:', { x: 0.5, y: 5.2, w: 9, h: 0.5, fontSize: 14, fontFace: 'Arial', bold: true });
        overviewSlide.addText(`Cost: €${(concept.feasibilityData.estimatedCost / 1000000).toFixed(1)}M | Timeline: ${concept.feasibilityData.timeline} months | ROI: ${concept.feasibilityData.projectedROI.toFixed(1)}x`, { x: 0.5, y: 5.7, w: 9, h: 0.5, fontSize: 14, fontFace: 'Arial' });
        
        // PICO slide
        const picoSlide = pptx.addSlide();
        picoSlide.addText(`Concept ${index + 1}: PICO Framework`, { x: 0.5, y: 0.5, w: 9, h: 0.8, fontSize: 18, fontFace: 'Arial', bold: true });
        
        // Add PICO elements
        picoSlide.addText('Population', { x: 0.5, y: 1.5, w: 9, h: 0.5, fontSize: 16, fontFace: 'Arial', bold: true });
        picoSlide.addText(concept.picoData.population, { x: 0.5, y: 2.0, w: 9, h: 1.0, fontSize: 14, fontFace: 'Arial', bullet: true });
        
        picoSlide.addText('Intervention', { x: 0.5, y: 3.0, w: 9, h: 0.5, fontSize: 16, fontFace: 'Arial', bold: true });
        picoSlide.addText(concept.picoData.intervention, { x: 0.5, y: 3.5, w: 9, h: 1.0, fontSize: 14, fontFace: 'Arial', bullet: true });
        
        picoSlide.addText('Comparator', { x: 0.5, y: 4.5, w: 9, h: 0.5, fontSize: 16, fontFace: 'Arial', bold: true });
        picoSlide.addText(concept.picoData.comparator, { x: 0.5, y: 5.0, w: 9, h: 1.0, fontSize: 14, fontFace: 'Arial', bullet: true });
        
        picoSlide.addText('Outcomes', { x: 0.5, y: 6.0, w: 9, h: 0.5, fontSize: 16, fontFace: 'Arial', bold: true });
        picoSlide.addText(concept.picoData.outcomes, { x: 0.5, y: 6.5, w: 9, h: 1.0, fontSize: 14, fontFace: 'Arial', bullet: true });
        
        // SWOT slide
        const swotSlide = pptx.addSlide();
        swotSlide.addText(`Concept ${index + 1}: SWOT Analysis`, { x: 0.5, y: 0.5, w: 9, h: 0.8, fontSize: 18, fontFace: 'Arial', bold: true });
        
        // Create SWOT quadrants
        swotSlide.addText('Strengths', { x: 0.5, y: 1.5, w: 4.5, h: 0.5, fontSize: 16, fontFace: 'Arial', bold: true, color: '107C10' });
        concept.swotAnalysis.strengths.forEach((strength, i) => {
          swotSlide.addText(strength, { x: 0.5, y: 2.0 + (i * 0.4), w: 4.5, h: 0.4, fontSize: 12, fontFace: 'Arial', bullet: true });
        });
        
        swotSlide.addText('Weaknesses', { x: 5.0, y: 1.5, w: 4.5, h: 0.5, fontSize: 16, fontFace: 'Arial', bold: true, color: 'D83B01' });
        concept.swotAnalysis.weaknesses.forEach((weakness, i) => {
          swotSlide.addText(weakness, { x: 5.0, y: 2.0 + (i * 0.4), w: 4.5, h: 0.4, fontSize: 12, fontFace: 'Arial', bullet: true });
        });
        
        swotSlide.addText('Opportunities', { x: 0.5, y: 4.0, w: 4.5, h: 0.5, fontSize: 16, fontFace: 'Arial', bold: true, color: '0078D4' });
        concept.swotAnalysis.opportunities.forEach((opportunity, i) => {
          swotSlide.addText(opportunity, { x: 0.5, y: 4.5 + (i * 0.4), w: 4.5, h: 0.4, fontSize: 12, fontFace: 'Arial', bullet: true });
        });
        
        swotSlide.addText('Threats', { x: 5.0, y: 4.0, w: 4.5, h: 0.5, fontSize: 16, fontFace: 'Arial', bold: true, color: 'E81123' });
        concept.swotAnalysis.threats.forEach((threat, i) => {
          swotSlide.addText(threat, { x: 5.0, y: 4.5 + (i * 0.4), w: 4.5, h: 0.4, fontSize: 12, fontFace: 'Arial', bullet: true });
        });
        
        // Evidence slide
        const evidenceSlide = pptx.addSlide();
        evidenceSlide.addText(`Concept ${index + 1}: Evidence Sources`, { x: 0.5, y: 0.5, w: 9, h: 0.8, fontSize: 18, fontFace: 'Arial', bold: true });
        
        let evidenceY = 1.5;
        concept.evidenceSources.forEach((source, i) => {
          evidenceSlide.addText(`${i + 1}. ${source.citation}`, { x: 0.5, y: evidenceY, w: 9, h: 0.5, fontSize: 12, fontFace: 'Arial' });
          evidenceY += 0.4;
        });
      });
      
      // Generate the presentation as a buffer
      // For pptxgenjs, we need to use the Write method and handle the Buffer ourselves
      const stream = new PassThrough();
      const chunks: Buffer[] = [];
      
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', (err) => reject(err));
      
      pptx.write('nodebuffer', stream);
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
      
      doc.fontSize(12).font('Helvetica-Bold').text('Population: ');
      doc.fontSize(10).font('Helvetica').text(validation.extractedPico.population);
      doc.moveDown();
      
      doc.fontSize(12).font('Helvetica-Bold').text('Intervention: ');
      doc.fontSize(10).font('Helvetica').text(validation.extractedPico.intervention);
      doc.moveDown();
      
      doc.fontSize(12).font('Helvetica-Bold').text('Comparator: ');
      doc.fontSize(10).font('Helvetica').text(validation.extractedPico.comparator);
      doc.moveDown();
      
      doc.fontSize(12).font('Helvetica-Bold').text('Outcomes: ');
      doc.fontSize(10).font('Helvetica').text(validation.extractedPico.outcomes);
      doc.moveDown(2);
      
      // Benchmark Deltas
      doc.fontSize(16).font('Helvetica-Bold').text('Benchmark Deltas');
      doc.moveDown();
      
      validation.benchmarkDeltas.forEach((delta, index) => {
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
      
      validation.riskFlags.forEach((flag, index) => {
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
      
      const economics = validation.revisedEconomics;
      
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
      
      // Strengths
      doc.fontSize(12).font('Helvetica-Bold').fillColor('107C10').text('Strengths:');
      doc.fillColor('black');
      validation.swotAnalysis.strengths.forEach(strength => {
        doc.fontSize(10).font('Helvetica').text(`• ${strength}`);
      });
      doc.moveDown();
      
      // Weaknesses
      doc.fontSize(12).font('Helvetica-Bold').fillColor('D83B01').text('Weaknesses:');
      doc.fillColor('black');
      validation.swotAnalysis.weaknesses.forEach(weakness => {
        doc.fontSize(10).font('Helvetica').text(`• ${weakness}`);
      });
      doc.moveDown();
      
      // Opportunities
      doc.fontSize(12).font('Helvetica-Bold').fillColor('0078D4').text('Opportunities:');
      doc.fillColor('black');
      validation.swotAnalysis.opportunities.forEach(opportunity => {
        doc.fontSize(10).font('Helvetica').text(`• ${opportunity}`);
      });
      doc.moveDown();
      
      // Threats
      doc.fontSize(12).font('Helvetica-Bold').fillColor('E81123').text('Threats:');
      doc.fillColor('black');
      validation.swotAnalysis.threats.forEach(threat => {
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
