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
  // Console log received props for debugging
  console.log('LoeDetails received props:', {
    globalLoeDate, 
    timeToLoe,
    estimatedFpiDate
  });

  // Set up default values
  const today = new Date();
  const defaultLoeYears = 10;
  
  // STEP 1: Handle First Patient In (FPI) date
  const defaultFpiDate = estimatedFpiDate || new Date(
    today.getFullYear(),
    today.getMonth() + 12,
    today.getDate()
  ).toISOString().split('T')[0];
  
  // STEP 2: Handle global LOE date - critical to preserve user input
  let formattedLoeDate: string;
  if (globalLoeDate && globalLoeDate.trim() !== '') {
    // Use user-provided LOE date directly
    formattedLoeDate = globalLoeDate;
    console.log('Using user-provided globalLoeDate:', globalLoeDate);
  } else {
    // Only if user didn't provide LOE date, use default
    formattedLoeDate = new Date(
      today.getFullYear() + defaultLoeYears,
      today.getMonth(),
      today.getDate()
    ).toISOString().split('T')[0];
    console.log('Using default LOE date:', formattedLoeDate);
  }
  
  // STEP 3: Calculate estimated data readout date
  const studyDuration = 24; // months (default study duration)
  const fpiDate = new Date(defaultFpiDate);
  const readoutDate = new Date(fpiDate);
  readoutDate.setMonth(fpiDate.getMonth() + studyDuration);
  const estimatedReadoutDate = readoutDate.toISOString().split('T')[0];
  
  console.log('Milestone dates:', {
    fpi: defaultFpiDate,
    readout: estimatedReadoutDate,
    loe: formattedLoeDate
  });
  
  // STEP 4: Calculate time to LOE from data readout
  // Always prioritize the timeToLoe from backend if available
  const calculatedTimeToLoe = (() => {
    // If backend provided a value, use it
    if (timeToLoe !== undefined && !isNaN(timeToLoe)) {
      console.log('Using backend-calculated timeToLoe:', timeToLoe);
      return timeToLoe;
    }
    
    // Otherwise calculate it ourselves
    try {
      const readoutMs = new Date(estimatedReadoutDate).getTime();
      const loeMs = new Date(formattedLoeDate).getTime();
      if (isNaN(readoutMs) || isNaN(loeMs)) {
        throw new Error('Invalid date for time-to-LOE calculation');
      }
      
      const diffMonths = Math.max(0, 
        Math.round((loeMs - readoutMs) / (1000 * 60 * 60 * 24 * 30.5))
      );
      console.log('Calculated time-to-LOE:', diffMonths, 'months');
      return diffMonths;
    } catch (e) {
      console.error('Error calculating time-to-LOE:', e);
      return defaultLoeYears * 12; // Last resort fallback
    }
  })();
  
  // STEP 5: Handle post-LOE value
  const safePostLoeValue = postLoeValue !== undefined && !isNaN(postLoeValue) ? 
    postLoeValue : 0.2; // Default to 20%
  
  // STEP 6: Handle regional LOE data
  const defaultRegionalData: RegionalLoeData[] = regionalLoeData?.length ? regionalLoeData : [
    {
      region: 'United States',
      loeDate: formattedLoeDate,
      hasPatentExtension: false,
      extensionPotential: false,
      notes: 'Estimated LOE date based on standard patent duration'
    },
    {
      region: 'European Union',
      loeDate: formattedLoeDate,
      hasPatentExtension: false,
      extensionPotential: false,
      notes: 'Estimated LOE date based on standard patent duration'
    }
  ];

  // Helper to format date string to a readable format
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    // Ensure date is valid before formatting
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', dateString);
      return 'Invalid Date';
    }
    return date.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Helper to determine badge color based on timeToLoe
  const getLoeStatusColor = () => {
    if (typeof calculatedTimeToLoe !== 'number' || isNaN(calculatedTimeToLoe)) {
      return 'bg-neutral-100 text-neutral-700';
    }
    if (calculatedTimeToLoe < 24) return 'bg-red-100 text-red-800'; // < 2 years: urgent
    if (calculatedTimeToLoe < 60) return 'bg-yellow-100 text-yellow-800'; // < 5 years: warning
    return 'bg-green-100 text-green-800'; // > 5 years: good
  };
  
  // Helper to format time to LOE in a user-friendly way
  const formatTimeToLoe = (months?: number) => {
    const effectiveMonths = months || calculatedTimeToLoe;
    if (typeof effectiveMonths !== 'number' || isNaN(effectiveMonths)) return 'Unknown';
    
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
                {formatDate(formattedLoeDate)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-neutral-dark">Time Until LOE from Data Readout</div>
              <div className="flex items-center">
                <Badge variant="outline" className={getLoeStatusColor()}>
                  {formatTimeToLoe(calculatedTimeToLoe)}
                </Badge>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Clock className="h-4 w-4 text-blue-500 ml-2" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="w-[240px] text-xs">
                        This shows the time between study data readout and Loss of Exclusivity (LOE), representing the commercial window to leverage study results.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {calculatedTimeToLoe < 36 && (
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

          {/* Key Milestone Dates */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-neutral-dark flex items-center">
              <Clock className="h-4 w-4 mr-1 text-primary-dark" />
              Key Milestone Dates
            </div>
            <div className="grid grid-cols-1 gap-2">
              {/* FPI Date */}
              <div className="flex justify-between items-center text-sm border-b pb-1 border-neutral-100">
                <span className="font-medium">First Patient In:</span>
                <span>{formatDate(defaultFpiDate)}</span>
              </div>
              
              {/* Data Readout Date */}
              <div className="flex justify-between items-center text-sm border-b pb-1 border-neutral-100">
                <span className="font-medium">Data Readout:</span>
                <span className="flex items-center">
                  {formatDate(estimatedReadoutDate)}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Clock className="h-4 w-4 text-blue-500 ml-2" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="w-[240px] text-xs">
                          Estimated time when study results will be available. The time until LOE is measured from this date, representing your commercial window.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </span>
              </div>
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