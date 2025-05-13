import React from 'react';
import { CalendarClock, AlertCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { RegionalLoeData } from '@/lib/types';

interface LoeDetailsProps {
  globalLoeDate?: string;
  regionalLoeData?: RegionalLoeData[];
  timeToLoe?: number;
  postLoeValue?: number;
  estimatedFpiDate?: string;
  className?: string;
}

/**
 * Component to display Loss of Exclusivity (LOE) information
 */
const LoeDetails: React.FC<LoeDetailsProps> = ({ 
  globalLoeDate, 
  regionalLoeData, 
  timeToLoe, 
  postLoeValue, 
  estimatedFpiDate,
  className = ''
}) => {
  // Always render the component with default values if no LOE data is available
  // Calculate reasonable defaults

  // Generate default LOE date (typically ~10-12 years after current date for new drugs)
  const defaultLoeYears = 10;
  const today = new Date();
  const defaultLoeDate = globalLoeDate || new Date(
    today.getFullYear() + defaultLoeYears,
    today.getMonth(),
    today.getDate()
  ).toISOString();
  
  // Default time to LOE (in months)
  const defaultTimeToLoe = timeToLoe || (defaultLoeYears * 12);
  
  // Default post-LOE value (percentage)
  const safePostLoeValue = postLoeValue !== undefined && !isNaN(postLoeValue) ? 
    postLoeValue : 0.2; // Default to 20%

  // Default FPI date (current date plus 3 months for setup)
  const defaultFpiDate = estimatedFpiDate || new Date(
    today.getFullYear(),
    today.getMonth() + 3,
    today.getDate()
  ).toISOString();
  
  // Default regional LOE data if not provided
  const defaultRegionalData: RegionalLoeData[] = regionalLoeData?.length ? regionalLoeData : [
    {
      region: 'United States',
      loeDate: defaultLoeDate,
      hasPatentExtension: false,
      extensionPotential: false,
      notes: 'Estimated LOE date based on standard patent duration'
    },
    {
      region: 'European Union',
      loeDate: defaultLoeDate,
      hasPatentExtension: false,
      extensionPotential: false,
      notes: 'Estimated LOE date based on standard patent duration'
    }
  ];

  // Helper to format date string to a readable format
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Determine color based on time to LOE
  const getLoeStatusColor = () => {
    const effectiveTimeToLoe = defaultTimeToLoe;
    
    if (!effectiveTimeToLoe || typeof effectiveTimeToLoe !== 'number' || isNaN(effectiveTimeToLoe)) {
      return 'bg-neutral-100 text-neutral-700';
    }
    if (effectiveTimeToLoe < 24) return 'bg-red-100 text-red-800'; // < 2 years: urgent
    if (effectiveTimeToLoe < 60) return 'bg-yellow-100 text-yellow-800'; // < 5 years: warning
    return 'bg-green-100 text-green-800'; // > 5 years: good
  };
  
  // Helper to format time to LOE
  const formatTimeToLoe = (months?: number) => {
    const effectiveMonths = months || defaultTimeToLoe;
    if (!effectiveMonths || isNaN(effectiveMonths)) return 'Unknown';
    if (effectiveMonths < 12) return `${effectiveMonths} months`;
    const years = Math.floor(effectiveMonths / 12);
    const remainingMonths = effectiveMonths % 12;
    return remainingMonths > 0 ? 
      `${years} year${years > 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}` : 
      `${years} year${years > 1 ? 's' : ''}`;
  };

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-primary-dark" />
          Patent Exclusivity Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Main LOE info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-neutral-dark">Global LOE Date</div>
              <div className="text-sm">
                {formatDate(defaultLoeDate)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-neutral-dark">Time Until LOE</div>
              <div className="flex items-center">
                <Badge variant="outline" className={getLoeStatusColor()}>
                  {formatTimeToLoe(defaultTimeToLoe)}
                </Badge>
                {defaultTimeToLoe < 36 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle className="h-4 w-4 text-red-500 ml-2" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="w-[200px] text-xs">
                          Warning: LOE will occur before the full value of this study can be realized.
                          Consider study design modifications or patent extension strategies.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          </div>

          {/* Post-LOE value retention */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-neutral-dark">Post-LOE Value Retention</div>
            <div className="flex items-center">
              <Badge variant="outline" className="bg-blue-50 text-blue-800">
                {Math.round(Math.max(0, Math.min(1, safePostLoeValue)) * 100)}% of peak value
              </Badge>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="ml-2 text-xs text-neutral-medium cursor-help">(i)</div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-[200px] text-xs">
                      Estimated percentage of annual revenue retained after patent expiration.
                      Higher values mean better sustainability after generic entry.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* FPI estimation */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-neutral-dark">Estimated FPI Date</div>
            <div className="flex items-center gap-1 text-sm">
              <Clock className="h-4 w-4 text-primary" />
              {formatDate(defaultFpiDate)}
            </div>
          </div>

          {/* Regional LOE info */}
          {defaultRegionalData && defaultRegionalData.length > 0 && (
            <>
              <Separator className="my-2" />
              <div className="space-y-2">
                <div className="text-sm font-medium text-neutral-dark">Regional LOE Dates</div>
                <div className="grid grid-cols-3 gap-2">
                  {defaultRegionalData.map((region, index) => (
                    <div key={index} className="p-2 rounded-md border border-neutral-100 text-xs">
                      <div className="font-semibold">{region.region}</div>
                      <div>{formatDate(region.loeDate)}</div>
                      {region.extensionPotential && (
                        <Badge variant="outline" className="mt-1 bg-green-50 text-green-800 text-[10px]">
                          Extension potential
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LoeDetails;