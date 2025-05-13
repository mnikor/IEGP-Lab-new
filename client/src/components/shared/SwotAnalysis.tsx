import React from 'react';
import { SwotAnalysis as SwotAnalysisType } from '@/lib/types';

interface SwotAnalysisProps {
  swotAnalysis: SwotAnalysisType;
  className?: string;
}

const SwotAnalysis: React.FC<SwotAnalysisProps> = ({ swotAnalysis, className = '' }) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${className}`}>
      <div className="p-3 bg-green-50 border border-green-100 rounded-md">
        <h5 className="text-xs font-medium text-secondary mb-1">Strengths</h5>
        <ul className="text-xs text-neutral-medium space-y-1 ml-4 list-disc">
          {swotAnalysis.strengths.map((strength, index) => (
            <li key={index}>{strength}</li>
          ))}
        </ul>
      </div>
      
      <div className="p-3 bg-red-50 border border-red-100 rounded-md">
        <h5 className="text-xs font-medium text-warning mb-1">Weaknesses</h5>
        <ul className="text-xs text-neutral-medium space-y-1 ml-4 list-disc">
          {swotAnalysis.weaknesses.map((weakness, index) => (
            <li key={index}>{weakness}</li>
          ))}
        </ul>
      </div>
      
      <div className="p-3 bg-blue-50 border border-blue-100 rounded-md">
        <h5 className="text-xs font-medium text-primary mb-1">Opportunities</h5>
        <ul className="text-xs text-neutral-medium space-y-1 ml-4 list-disc">
          {swotAnalysis.opportunities.map((opportunity, index) => (
            <li key={index}>{opportunity}</li>
          ))}
        </ul>
      </div>
      
      <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-md">
        <h5 className="text-xs font-medium text-yellow-700 mb-1">Threats</h5>
        <ul className="text-xs text-neutral-medium space-y-1 ml-4 list-disc">
          {swotAnalysis.threats.map((threat, index) => (
            <li key={index}>{threat}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SwotAnalysis;
