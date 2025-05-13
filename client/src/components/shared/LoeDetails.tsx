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
  // Skip rendering if no LOE data is available
  if (!globalLoeDate && !regionalLoeData?.length && !timeToLoe) {
    return null;
  }

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
    if (!timeToLoe) return 'bg-neutral-100 text-neutral-700';
    if (timeToLoe < 24) return 'bg-red-100 text-red-800'; // < 2 years: urgent
    if (timeToLoe < 60) return 'bg-yellow-100 text-yellow-800'; // < 5 years: warning
    return 'bg-green-100 text-green-800'; // > 5 years: good
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
                {formatDate(globalLoeDate)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-neutral-dark">Time Until LOE</div>
              <div className="flex items-center">
                <Badge variant="outline" className={getLoeStatusColor()}>
                  {timeToLoe != null ? `${timeToLoe} months` : 'Unknown'}
                </Badge>
                {timeToLoe != null && timeToLoe < 36 && (
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
          {postLoeValue != null && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-neutral-dark">Post-LOE Value Retention</div>
              <div className="flex items-center">
                <Badge variant="outline" className="bg-blue-50 text-blue-800">
                  {Math.round(postLoeValue * 100)}% of peak value
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
          )}

          {/* FPI estimation */}
          {estimatedFpiDate && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-neutral-dark">Estimated FPI Date</div>
              <div className="flex items-center gap-1 text-sm">
                <Clock className="h-4 w-4 text-primary" />
                {formatDate(estimatedFpiDate)}
              </div>
            </div>
          )}

          {/* Regional LOE info */}
          {regionalLoeData && regionalLoeData.length > 0 && (
            <>
              <Separator className="my-2" />
              <div className="space-y-2">
                <div className="text-sm font-medium text-neutral-dark">Regional LOE Dates</div>
                <div className="grid grid-cols-3 gap-2">
                  {regionalLoeData.map((region, index) => (
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