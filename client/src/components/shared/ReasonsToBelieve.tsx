import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Info, TrendingUp } from "lucide-react";

interface ReasonsToBelievelProps {
  reasonsToBelieve: {
    scientificRationale?: {
      mechanismOfAction?: string;
      preclinicalData?: string;
      biomarkerSupport?: string;
    };
    clinicalEvidence?: {
      priorPhaseData?: string;
      safetyProfile?: string;
      efficacySignals?: string;
    };
    marketRegulatory?: {
      regulatoryPrecedent?: string;
      unmetNeed?: string;
      competitiveAdvantage?: string;
    };
    developmentFeasibility?: {
      patientAccess?: string;
      endpointViability?: string;
      operationalReadiness?: string;
    };
    overallConfidence?: string;
  };
}

const ReasonsToBelieve: React.FC<ReasonsToBelievelProps> = ({ reasonsToBelieve }) => {
  const getConfidenceColor = (confidence: string) => {
    const level = confidence?.toLowerCase();
    if (level?.includes('high')) return 'bg-green-100 text-green-800';
    if (level?.includes('medium')) return 'bg-yellow-100 text-yellow-800';
    if (level?.includes('low')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getConfidenceIcon = (confidence: string) => {
    const level = confidence?.toLowerCase();
    if (level?.includes('high')) return <CheckCircle className="h-4 w-4" />;
    if (level?.includes('medium')) return <AlertCircle className="h-4 w-4" />;
    if (level?.includes('low')) return <AlertCircle className="h-4 w-4" />;
    return <Info className="h-4 w-4" />;
  };

  if (!reasonsToBelieve || Object.keys(reasonsToBelieve).length === 0) {
    return null;
  }

  return (
    <Card className="border-l-4 border-l-green-500 bg-green-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-green-800 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Reasons to Believe
          </CardTitle>
          {reasonsToBelieve.overallConfidence && (
            <Badge className={`${getConfidenceColor(reasonsToBelieve.overallConfidence)} flex items-center space-x-1`}>
              {getConfidenceIcon(reasonsToBelieve.overallConfidence)}
              <span>{reasonsToBelieve.overallConfidence.split(' ')[0]} Confidence</span>
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {reasonsToBelieve.scientificRationale && (
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center">
              <Info className="h-4 w-4 mr-1" />
              Scientific Rationale
            </h4>
            <div className="space-y-2 text-sm text-blue-800">
              {reasonsToBelieve.scientificRationale.mechanismOfAction && (
                <div>
                  <span className="font-medium">Mechanism:</span> {reasonsToBelieve.scientificRationale.mechanismOfAction}
                </div>
              )}
              {reasonsToBelieve.scientificRationale.preclinicalData && (
                <div>
                  <span className="font-medium">Preclinical:</span> {reasonsToBelieve.scientificRationale.preclinicalData}
                </div>
              )}
              {reasonsToBelieve.scientificRationale.biomarkerSupport && (
                <div>
                  <span className="font-medium">Biomarkers:</span> {reasonsToBelieve.scientificRationale.biomarkerSupport}
                </div>
              )}
            </div>
          </div>
        )}

        {reasonsToBelieve.clinicalEvidence && (
          <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
            <h4 className="font-medium text-purple-900 mb-2 flex items-center">
              <CheckCircle className="h-4 w-4 mr-1" />
              Clinical Evidence
            </h4>
            <div className="space-y-2 text-sm text-purple-800">
              {reasonsToBelieve.clinicalEvidence.priorPhaseData && (
                <div>
                  <span className="font-medium">Prior Data:</span> {reasonsToBelieve.clinicalEvidence.priorPhaseData}
                </div>
              )}
              {reasonsToBelieve.clinicalEvidence.safetyProfile && (
                <div>
                  <span className="font-medium">Safety:</span> {reasonsToBelieve.clinicalEvidence.safetyProfile}
                </div>
              )}
              {reasonsToBelieve.clinicalEvidence.efficacySignals && (
                <div>
                  <span className="font-medium">Efficacy:</span> {reasonsToBelieve.clinicalEvidence.efficacySignals}
                </div>
              )}
            </div>
          </div>
        )}

        {reasonsToBelieve.marketRegulatory && (
          <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
            <h4 className="font-medium text-orange-900 mb-2 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              Market & Regulatory
            </h4>
            <div className="space-y-2 text-sm text-orange-800">
              {reasonsToBelieve.marketRegulatory.regulatoryPrecedent && (
                <div>
                  <span className="font-medium">Regulatory:</span> {reasonsToBelieve.marketRegulatory.regulatoryPrecedent}
                </div>
              )}
              {reasonsToBelieve.marketRegulatory.unmetNeed && (
                <div>
                  <span className="font-medium">Unmet Need:</span> {reasonsToBelieve.marketRegulatory.unmetNeed}
                </div>
              )}
              {reasonsToBelieve.marketRegulatory.competitiveAdvantage && (
                <div>
                  <span className="font-medium">Advantage:</span> {reasonsToBelieve.marketRegulatory.competitiveAdvantage}
                </div>
              )}
            </div>
          </div>
        )}

        {reasonsToBelieve.developmentFeasibility && (
          <div className="bg-teal-50 p-3 rounded-lg border border-teal-200">
            <h4 className="font-medium text-teal-900 mb-2 flex items-center">
              <TrendingUp className="h-4 w-4 mr-1" />
              Development Feasibility
            </h4>
            <div className="space-y-2 text-sm text-teal-800">
              {reasonsToBelieve.developmentFeasibility.patientAccess && (
                <div>
                  <span className="font-medium">Patient Access:</span> {reasonsToBelieve.developmentFeasibility.patientAccess}
                </div>
              )}
              {reasonsToBelieve.developmentFeasibility.endpointViability && (
                <div>
                  <span className="font-medium">Endpoints:</span> {reasonsToBelieve.developmentFeasibility.endpointViability}
                </div>
              )}
              {reasonsToBelieve.developmentFeasibility.operationalReadiness && (
                <div>
                  <span className="font-medium">Operations:</span> {reasonsToBelieve.developmentFeasibility.operationalReadiness}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReasonsToBelieve;