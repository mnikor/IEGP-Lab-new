import React from 'react';
import { PicoData } from '@/lib/types';

interface PicoFrameworkProps {
  picoData: PicoData;
  className?: string;
}

const PicoFramework: React.FC<PicoFrameworkProps> = ({ picoData, className = '' }) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
      <div className="border border-neutral-light rounded p-3">
        <h4 className="text-sm font-medium text-primary mb-1">Population</h4>
        <p className="text-sm text-neutral-medium">{picoData?.population || 'Not specified'}</p>
      </div>
      
      <div className="border border-neutral-light rounded p-3">
        <h4 className="text-sm font-medium text-primary mb-1">Intervention</h4>
        <p className="text-sm text-neutral-medium">{picoData?.intervention || 'Not specified'}</p>
      </div>
      
      <div className="border border-neutral-light rounded p-3">
        <h4 className="text-sm font-medium text-primary mb-1">Comparator</h4>
        <p className="text-sm text-neutral-medium">{picoData?.comparator || 'Not specified'}</p>
      </div>
      
      <div className="border border-neutral-light rounded p-3">
        <h4 className="text-sm font-medium text-primary mb-1">Outcomes</h4>
        <p className="text-sm text-neutral-medium">{picoData?.outcomes || 'Not specified'}</p>
      </div>
    </div>
  );
};

export default PicoFramework;
