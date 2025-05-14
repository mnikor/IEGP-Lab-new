import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';
import { CurrentEvidence as CurrentEvidenceType } from '@/lib/types';

interface CurrentEvidenceProps {
  currentEvidence?: CurrentEvidenceType;
  className?: string;
}

/**
 * Formats markdown-like titles in the evidence text:
 * - Converts ### or #### to <h3> or <h4> tags with proper styling
 * - Makes section headers and study names bold
 * - Preserves line breaks
 * - Fixes special text-formatting placeholders from Perplexity API
 */
const formatMarkdownTitles = (text: string): string => {
  if (!text) return '';
  
  // First clean up the text by removing raw formatting tags that might appear in headings/titles
  let formattedText = text
    // Handle the specific formatting issues shown in the example
    .replace(/text-sm font-bold my-2>/g, '')
    .replace(/text-base font-bold my-2>/g, '')
    
    // Add more specific patterns for the exact issues observed
    .replace(/(\d+\.\s*)(text-sm font-bold my-2>)(.+)$/gm, '$1<strong>$3</strong>')
    .replace(/^(text-sm font-bold my-2>)(.+)$/gm, '<strong>$2</strong>')
    .replace(/^(text-base font-bold my-2>)(.+)$/gm, '<strong>$2</strong>')
    
    // More aggressively remove all variants of text formatting tags at line beginnings
    .replace(/^text-\w+ font-\w+ my-\d+>/gm, '')
    .replace(/^text-\w+ font-\w+>/gm, '')
    
    // Remove HTML tags that might be included in the response
    .replace(/<div.*?>/g, '')
    .replace(/<\/div>/g, '')
    .replace(/<span.*?>/g, '')
    .replace(/<\/span>/g, '')
    
    // Replace text-base, text-sm, text-* placeholders with proper HTML formatting
    .replace(/text-base font-bold my-2>(.*?)(?=<|$)/g, '<strong>$1</strong>')
    .replace(/text-sm font-bold my-2>(.*?)(?=<|$)/g, '<strong>$1</strong>')
    .replace(/text-\w+ font-bold my-\d+>(.*?)(?=<|$)/g, '<strong>$1</strong>')
    // Handle the specific patterns you're seeing in the output
    .replace(/(^|\n)text-\w+ font-bold my-\d+>([^\n]+)/gm, '$1<strong>$2</strong>')
    .replace(/text-sm font-bold my->/g, '<strong>')
    .replace(/text-base font-bold my->/g, '<strong>')
    
    // Handle span classes for formatting
    .replace(/<span class="text-base font-bold.*?">(.*?)<\/span>/g, '<strong>$1</strong>')
    .replace(/<span class="text-sm font-bold.*?">(.*?)<\/span>/g, '<strong>$1</strong>')
    
    // Clean up formatting tags and attributes
    .replace(/my-\d+>/g, '')
    .replace(/my-\d+->/g, '')
    .replace(/class=".*?"/g, '')
    
    // Handle "text-sm font-bold" patterns in the middle of text
    .replace(/text-sm font-bold\s+(.*?)(?=\n|$)/g, '<strong>$1</strong>')
    .replace(/text-base font-bold\s+(.*?)(?=\n|$)/g, '<strong>$1</strong>')
    .replace(/text-\w+ font-bold\s+(.*?)(?=\n|$)/g, '<strong>$1</strong>')
    
    // Clean up any leftover markers
    .replace(/text-.*?>/g, '')
    .replace(/font-bold/g, '<strong>')
    .replace(/<\/font-bold>/g, '</strong>')
    
    // Fix double line breaks or excessive spacing
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/\s{3,}/g, ' ')
    
    // Final pass to remove any remaining formatting markers
    .replace(/text-\w+ font-bold my-\d+>/g, '')
    .replace(/text-\w+ font-\w+ my-\d+(>|-)(.*)$/gm, '$2');
  
  // Now handle markdown-like headers
  formattedText = formattedText
    .replace(/#{4}\s+(.*?)(?:\n|$)/g, '<h4 class="text-sm font-bold my-2">$1</h4>')
    .replace(/#{3}\s+(.*?)(?:\n|$)/g, '<h3 class="text-base font-bold my-2">$1</h3>')
    .replace(/#{1,2}\s+(.*?)(?:\n|$)/g, '<h2 class="text-lg font-bold my-2">$1</h2>');
  
  // Then handle study names with asterisks or quotes for emphasis
  formattedText = formattedText
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
    .replace(/"([^"]*STUDY[^"]*)"|(["'])(.*?)\2/gi, '<strong>$1$3</strong>');
  
  // Make uppercase lines and capitalized study names bold
  formattedText = formattedText
    .replace(/^([A-Z][A-Z\s]+):?$/gm, '<strong>$1</strong>')
    .replace(/([A-Z][A-Z0-9\s-]+\s+(?:STUDY|TRIAL))/g, '<strong>$1</strong>');
  
  // Section titles that are commonly used in clinical evidence
  const sectionTitles = [
    'Background', 'Methods', 'Results', 'Conclusion', 'Discussion', 
    'Primary Endpoint', 'Secondary Endpoints', 'Adverse Events', 
    'Efficacy', 'Safety', 'Clinical Implications', 'Study Design'
  ];
  
  // Make section titles bold when they appear at the start of a line
  sectionTitles.forEach(title => {
    const regex = new RegExp(`^(${title}\\s*:)`, 'gm');
    formattedText = formattedText.replace(regex, '<strong>$1</strong>');
  });
  
  return formattedText;
};

const CurrentEvidence: React.FC<CurrentEvidenceProps> = ({ currentEvidence, className = '' }) => {
  if (!currentEvidence) {
    return null;
  }

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-neutral-dark">Current Evidence Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-neutral-dark">
          <div className="bg-blue-50 p-3 rounded-md mb-4">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">Existing Research Summary</h4>
            {currentEvidence.summary ? (
              <div 
                className="whitespace-pre-line text-blue-700 prose prose-sm max-w-none prose-headings:mt-2 prose-headings:mb-1 prose-p:my-1" 
                dangerouslySetInnerHTML={{
                  __html: formatMarkdownTitles(currentEvidence.summary)
                }} 
              />
            ) : (
              <div className="whitespace-pre-line text-blue-700 prose prose-sm max-w-none">
                <p>No summary information available for this evidence.</p>
              </div>
            )}
          </div>
          
          {currentEvidence.citations && Array.isArray(currentEvidence.citations) && currentEvidence.citations.length > 0 && (
            <div className="border border-neutral-200 rounded-md p-3">
              <h4 className="font-medium mb-2">Key Literature References:</h4>
              <ul className="space-y-2">
                {currentEvidence.citations.map((citation, index) => {
                  // Skip invalid citations
                  if (!citation || (!citation.url && !citation.title)) {
                    return null;
                  }
                  
                  const citationId = citation.id || `ref-${index + 1}`;
                  const citationUrl = citation.url || '#';
                  const citationTitle = citation.title || citationUrl;
                  
                  return (
                    <li key={citationId} className="flex items-start">
                      <span className="font-medium text-xs mr-2 bg-neutral-100 px-1 py-0.5 rounded">[{citationId}]</span>
                      <a 
                        href={citationUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary-dark hover:underline flex items-center"
                      >
                        {citationTitle}
                        <ExternalLink className="h-3 w-3 ml-1 inline" />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CurrentEvidence;