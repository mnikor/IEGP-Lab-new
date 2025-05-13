import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';
import { CurrentEvidence as CurrentEvidenceType } from '@/lib/types';

interface CurrentEvidenceProps {
  currentEvidence?: CurrentEvidenceType;
  className?: string;
}

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
          <p className="whitespace-pre-line mb-4">{currentEvidence.summary}</p>
          
          {currentEvidence.citations && currentEvidence.citations.length > 0 && (
            <>
              <h4 className="font-medium mb-2 mt-4">References:</h4>
              <ul className="space-y-1">
                {currentEvidence.citations.map((citation) => (
                  <li key={citation.id} className="flex items-start">
                    <span className="font-medium text-xs mr-2">[{citation.id}]</span>
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
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CurrentEvidence;