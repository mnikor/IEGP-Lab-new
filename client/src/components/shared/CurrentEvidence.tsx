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
  
  // First clean up the text to handle Perplexity API text-formatting placeholders
  let formattedText = text
    // Replace text-base, text-sm, text-* placeholders with proper HTML
    .replace(/text-base font-bold my-2>(.*?)(?=<|$)/g, '<strong>$1</strong>')
    .replace(/text-sm font-bold my->/g, '<strong>')
    .replace(/text-sm font-bold my-2>(.*?)(?=<|$)/g, '<strong>$1</strong>')
    .replace(/text-base font-bold my->/g, '<strong>')
    // Clean up formatting tags
    .replace(/my-\d+>/g, '>')
    .replace(/my-\d+->/g, '>')
    // Handle "text-sm font-bold" patterns
    .replace(/text-sm font-bold\s+(.*?)(?=\n|$)/g, '<strong>$1</strong>')
    .replace(/text-base font-bold\s+(.*?)(?=\n|$)/g, '<strong>$1</strong>')
    // Clean up any leftover markers
    .replace(/text-.*?>/g, '>')
    .replace(/font-bold/g, '<strong>')
    .replace(/<\/font-bold>/g, '</strong>');
  
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
            <div className="whitespace-pre-line text-blue-700 prose prose-sm max-w-none" dangerouslySetInnerHTML={{
              __html: formatMarkdownTitles(currentEvidence.summary)
            }} />
          </div>
          
          {currentEvidence.citations && currentEvidence.citations.length > 0 && (
            <div className="border border-neutral-200 rounded-md p-3">
              <h4 className="font-medium mb-2">Key Literature References:</h4>
              <ul className="space-y-2">
                {currentEvidence.citations.map((citation) => (
                  <li key={citation.id} className="flex items-start">
                    <span className="font-medium text-xs mr-2 bg-neutral-100 px-1 py-0.5 rounded">[{citation.id}]</span>
                    <a 
                      href={citation.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary-dark hover:underline flex items-center"
                    >
                      {citation.title || citation.url}
                      <ExternalLink className="h-3 w-3 ml-1 inline" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CurrentEvidence;