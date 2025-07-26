import axios from 'axios';

interface NCTTrialInfo {
  nctId: string;
  title: string;
  status: string;
  phase: string;
  enrollment: number;
  conditions: string[];
  interventions: string[];
  primaryEndpoints: string[];
  verified: boolean;
  lastUpdated: string;
}

export class NCTVerifier {
  
  /**
   * Verify NCT numbers found in research results
   */
  async verifyNCTNumbers(text: string): Promise<{ verified: NCTTrialInfo[], invalid: string[] }> {
    const nctPattern = /NCT\d{8}/g;
    const foundNCTs = text.match(nctPattern) || [];
    const uniqueNCTs = Array.from(new Set(foundNCTs));
    
    console.log(`Found ${uniqueNCTs.length} unique NCT numbers to verify:`, uniqueNCTs);
    
    const verified: NCTTrialInfo[] = [];
    const invalid: string[] = [];
    
    // Verify each NCT number
    for (const nctId of uniqueNCTs) {
      try {
        const trialInfo = await this.fetchTrialInfo(nctId);
        if (trialInfo) {
          verified.push(trialInfo);
        } else {
          invalid.push(nctId);
        }
      } catch (error: any) {
        console.warn(`Failed to verify ${nctId}:`, error.message);
        invalid.push(nctId);
      }
    }
    
    return { verified, invalid };
  }
  
  /**
   * Fetch trial information from ClinicalTrials.gov API
   */
  private async fetchTrialInfo(nctId: string): Promise<NCTTrialInfo | null> {
    try {
      const url = `https://clinicaltrials.gov/api/v2/studies/${nctId}`;
      const response = await axios.get(url, { timeout: 10000 });
      
      const study = response.data.protocolSection;
      if (!study) return null;
      
      const identification = study.identificationModule || {};
      const status = study.statusModule || {};
      const design = study.designModule || {};
      const conditions = study.conditionsModule || {};
      const arms = study.armsInterventionsModule || {};
      const outcomes = study.outcomesModule || {};
      
      return {
        nctId,
        title: identification.briefTitle || 'Unknown Title',
        status: status.overallStatus || 'Unknown Status',
        phase: Array.isArray(design.phases) ? design.phases.join(', ') : 'Unknown Phase',
        enrollment: status.enrollmentInfo?.count || 0,
        conditions: conditions.conditions || [],
        interventions: arms.interventions?.map((i: any) => i.name) || [],
        primaryEndpoints: outcomes.primaryOutcomes?.map((o: any) => o.measure) || [],
        verified: true,
        lastUpdated: status.lastUpdatePostDate || 'Unknown'
      };
      
    } catch (error: any) {
      console.warn(`ClinicalTrials.gov API error for ${nctId}:`, error.message);
      return null;
    }
  }
  
  /**
   * Format verified trial information as structured text
   */
  formatVerifiedTrials(verified: NCTTrialInfo[]): string {
    if (verified.length === 0) {
      return "No verified clinical trials found.";
    }
    
    let formatted = "## Verified Active Clinical Trials\n\n";
    
    for (const trial of verified) {
      formatted += `### ${trial.nctId} ✅ (Verified)\n`;
      formatted += `**Title:** ${trial.title}\n`;
      formatted += `**Status:** ${trial.status}\n`;
      formatted += `**Phase:** ${trial.phase}\n`;
      formatted += `**Target Enrollment:** ${trial.enrollment} patients\n`;
      
      if (trial.conditions.length > 0) {
        formatted += `**Conditions:** ${trial.conditions.join(', ')}\n`;
      }
      
      if (trial.interventions.length > 0) {
        formatted += `**Interventions:** ${trial.interventions.join(', ')}\n`;
      }
      
      if (trial.primaryEndpoints.length > 0) {
        formatted += `**Primary Endpoints:** ${trial.primaryEndpoints.join('; ')}\n`;
      }
      
      formatted += `**Last Updated:** ${trial.lastUpdated}\n\n`;
    }
    
    return formatted;
  }
}