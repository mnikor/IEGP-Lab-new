import React from 'react';
import { SwotAnalysis as SwotAnalysisType } from '@/lib/types';
import { HelpCircle } from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SwotAnalysisProps {
  swotAnalysis: SwotAnalysisType;
  className?: string;
}

const SwotAnalysis: React.FC<SwotAnalysisProps> = ({ swotAnalysis, className = '' }) => {
  return (
    <div className={className}>
      <div className="flex items-center mb-2">
        <h4 className="text-sm font-medium text-neutral-dark">SWOT Analysis</h4>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="ml-1 inline-flex text-neutral-medium cursor-help">
                <HelpCircle className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="font-semibold">Strengths, Weaknesses, Opportunities, Threats</p>
              <p className="text-xs mt-1">A strategic planning framework that assesses:</p>
              <ul className="text-xs mt-1 list-disc pl-4 space-y-1">
                <li><span className="font-medium">Strengths:</span> Internal advantages of the study</li>
                <li><span className="font-medium">Weaknesses:</span> Internal limitations to address</li>
                <li><span className="font-medium">Opportunities:</span> External factors that could benefit the study</li>
                <li><span className="font-medium">Threats:</span> External challenges that might impact success</li>
              </ul>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
    </div>
  );
};

export default SwotAnalysis;
