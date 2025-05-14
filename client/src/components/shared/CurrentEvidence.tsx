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
  
  // First directly replace the exact pattern seen in the screenshot
  let formattedText = text
    // Remove tailwind-style formatting tags
    .replace(/text-base font-bold my-2>/g, '')
    .replace(/text-sm font-bold my-2>/g, '')
    .replace(/text-base font-bold my-\d+>/g, '')
    .replace(/text-sm font-bold my-\d+>/g, '')
    .replace(/text-base font-bold/g, '')
    .replace(/text-sm font-bold/g, '')
    
    // More general replacement patterns for tailwind classes
    .replace(/text-\w+ font-\w+ my-\d+>/g, '')
    .replace(/text-\w+ font-\w+>/g, '')
    .replace(/text-\w+ font-\w+/g, '')
    
    // Remove any HTML tags that might be included in the response
    .replace(/<div.*?>/g, '')
    .replace(/<\/div>/g, '')
    .replace(/<span.*?>/g, '')
    .replace(/<\/span>/g, '')
    
    // Clean up any remaining tailwind classes
    .replace(/\btext-\w+\b/g, '')
    .replace(/\bfont-\w+\b/g, '')
    .replace(/\bmy-\d+\b/g, '')
    
    // Convert markdown headers to HTML
    .replace(/#{4}\s+(.*?)(?:\n|$)/g, '<h4 class="text-sm font-bold my-2">$1</h4>')
    .replace(/#{3}\s+(.*?)(?:\n|$)/g, '<h3 class="text-base font-bold my-2">$1</h3>')
    .replace(/#{1,2}\s+(.*?)(?:\n|$)/g, '<h2 class="text-lg font-bold my-2">$1</h2>')
    
    // Make numbered sections bold
    .replace(/(\d+\.\s*)([A-Z][^.\n]+)/g, '$1<strong>$2</strong>')
    
    // Add bold formatting
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<strong>$1</strong>');
  
  // Fix line breaks
  formattedText = formattedText.replace(/\n/g, '<br>');
  
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
                    // Format search round headers
                    .replace(/##\s+Search\s+Round\s+(\d+):\s+([\w\s]+)/g, '<h3 class="text-base font-bold mt-4 mb-2 text-blue-800 border-b border-blue-200 pb-1">Search Round $1: $2</h3>')
                    // Add some spacing between sections
                    .replace(/<\/h3>/g, '</h3><div class="mb-2"></div>')
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