interface GuidelinesContext {
  indication: string;
  geography: string[];
  therapeuticArea: string;
}

interface GuidelineSource {
  name: string;
  region: string;
  searchTerms: string[];
  priority: number;
}

export class GuidelinesSearcher {
  
  /**
   * Generate guidelines searches based on disease and geography
   */
  generateGuidelinesSearches(context: GuidelinesContext): any[] {
    const { indication, geography, therapeuticArea } = context;
    const searches = [];
    
    // Disease-agnostic guidelines mapping
    const guidelinesSources = this.getGuidelinesSourcesByArea(therapeuticArea);
    
    for (const region of geography) {
      const regionalSources = guidelinesSources.filter(source => 
        source.region === 'global' || source.region.toLowerCase() === region.toLowerCase()
      );
      
      for (const source of regionalSources) {
        searches.push({
          id: `guidelines_${source.name.toLowerCase().replace(/\s+/g, '_')}_${region}`,
          query: `${indication} ${source.searchTerms.join(' ')} treatment guidelines clinical practice guidelines consensus recommendations ${region}`,
          type: 'guidelines',
          priority: source.priority,
          rationale: `${source.name} treatment guidelines for ${indication} in ${region}`,
          enabled: true,
          userModified: false
        });
      }
    }
    
    // Add general evidence-based medicine guidelines
    searches.push({
      id: 'guidelines_evidence_based',
      query: `${indication} evidence based medicine clinical practice guidelines systematic reviews meta-analysis treatment recommendations`,
      type: 'guidelines', 
      priority: 8,
      rationale: 'Evidence-based treatment recommendations and systematic reviews',
      enabled: true,
      userModified: false
    });
    
    return searches;
  }
  
  /**
   * Get guidelines sources based on therapeutic area
   */
  private getGuidelinesSourcesByArea(therapeuticArea: string): GuidelineSource[] {
    const area = therapeuticArea.toLowerCase();
    
    // Oncology guidelines
    if (area.includes('oncology') || area.includes('cancer') || area.includes('tumor')) {
      return [
        { name: 'NCCN', region: 'US', searchTerms: ['NCCN', 'National Comprehensive Cancer Network'], priority: 10 },
        { name: 'ESMO', region: 'EU', searchTerms: ['ESMO', 'European Society Medical Oncology'], priority: 10 },
        { name: 'ASCO', region: 'global', searchTerms: ['ASCO', 'American Society Clinical Oncology'], priority: 9 },
        { name: 'EMA', region: 'EU', searchTerms: ['EMA', 'European Medicines Agency'], priority: 8 },
        { name: 'FDA', region: 'US', searchTerms: ['FDA', 'Food Drug Administration'], priority: 8 },
        { name: 'JSMO', region: 'Asia-Pacific', searchTerms: ['JSMO', 'Japan Society Medical Oncology'], priority: 7 }
      ];
    }
    
    // Cardiology guidelines
    if (area.includes('cardio') || area.includes('heart') || area.includes('vascular')) {
      return [
        { name: 'AHA/ACC', region: 'US', searchTerms: ['AHA', 'ACC', 'American Heart Association', 'American College Cardiology'], priority: 10 },
        { name: 'ESC', region: 'EU', searchTerms: ['ESC', 'European Society Cardiology'], priority: 10 },
        { name: 'CCS', region: 'Canada', searchTerms: ['CCS', 'Canadian Cardiovascular Society'], priority: 8 },
        { name: 'JCS', region: 'Asia-Pacific', searchTerms: ['JCS', 'Japanese Circulation Society'], priority: 7 }
      ];
    }
    
    // Neurology guidelines
    if (area.includes('neuro') || area.includes('brain') || area.includes('cns')) {
      return [
        { name: 'AAN', region: 'US', searchTerms: ['AAN', 'American Academy Neurology'], priority: 10 },
        { name: 'EAN', region: 'EU', searchTerms: ['EAN', 'European Academy Neurology'], priority: 10 },
        { name: 'WFN', region: 'global', searchTerms: ['WFN', 'World Federation Neurology'], priority: 8 },
        { name: 'Movement Disorders Society', region: 'global', searchTerms: ['MDS', 'Movement Disorders Society'], priority: 8 }
      ];
    }
    
    // Endocrinology guidelines
    if (area.includes('diabetes') || area.includes('endocrin') || area.includes('hormone')) {
      return [
        { name: 'ADA', region: 'US', searchTerms: ['ADA', 'American Diabetes Association'], priority: 10 },
        { name: 'EASD', region: 'EU', searchTerms: ['EASD', 'European Association Study Diabetes'], priority: 10 },
        { name: 'IDF', region: 'global', searchTerms: ['IDF', 'International Diabetes Federation'], priority: 9 },
        { name: 'Endocrine Society', region: 'global', searchTerms: ['Endocrine Society'], priority: 8 }
      ];
    }
    
    // Immunology/Rheumatology guidelines
    if (area.includes('immun') || area.includes('rheum') || area.includes('autoimmune')) {
      return [
        { name: 'ACR', region: 'US', searchTerms: ['ACR', 'American College Rheumatology'], priority: 10 },
        { name: 'EULAR', region: 'EU', searchTerms: ['EULAR', 'European League Against Rheumatism'], priority: 10 },
        { name: 'BSR', region: 'UK', searchTerms: ['BSR', 'British Society Rheumatology'], priority: 8 },
        { name: 'APLAR', region: 'Asia-Pacific', searchTerms: ['APLAR', 'Asia Pacific League Associations Rheumatology'], priority: 7 }
      ];
    }
    
    // Infectious diseases guidelines
    if (area.includes('infect') || area.includes('antimicrobial') || area.includes('antibiotic')) {
      return [
        { name: 'IDSA', region: 'US', searchTerms: ['IDSA', 'Infectious Diseases Society America'], priority: 10 },
        { name: 'ESCMID', region: 'EU', searchTerms: ['ESCMID', 'European Society Clinical Microbiology Infectious Diseases'], priority: 10 },
        { name: 'WHO', region: 'global', searchTerms: ['WHO', 'World Health Organization'], priority: 9 },
        { name: 'CDC', region: 'US', searchTerms: ['CDC', 'Centers Disease Control'], priority: 8 }
      ];
    }
    
    // Gastroenterology guidelines
    if (area.includes('gastro') || area.includes('liver') || area.includes('hepat') || area.includes('ibd')) {
      return [
        { name: 'AGA', region: 'US', searchTerms: ['AGA', 'American Gastroenterological Association'], priority: 10 },
        { name: 'EASL', region: 'EU', searchTerms: ['EASL', 'European Association Study Liver'], priority: 10 },
        { name: 'AASLD', region: 'US', searchTerms: ['AASLD', 'American Association Study Liver Diseases'], priority: 9 },
        { name: 'WGO', region: 'global', searchTerms: ['WGO', 'World Gastroenterology Organisation'], priority: 8 }
      ];
    }
    
    // Respiratory guidelines
    if (area.includes('pulmon') || area.includes('respiratory') || area.includes('asthma') || area.includes('copd')) {
      return [
        { name: 'ATS', region: 'US', searchTerms: ['ATS', 'American Thoracic Society'], priority: 10 },
        { name: 'ERS', region: 'EU', searchTerms: ['ERS', 'European Respiratory Society'], priority: 10 },
        { name: 'GOLD', region: 'global', searchTerms: ['GOLD', 'Global Initiative Chronic Obstructive Lung Disease'], priority: 9 },
        { name: 'GINA', region: 'global', searchTerms: ['GINA', 'Global Initiative Asthma'], priority: 9 }
      ];
    }
    
    // Default/Generic medical guidelines for unspecified areas
    return [
      { name: 'Cochrane', region: 'global', searchTerms: ['Cochrane', 'systematic review', 'meta-analysis'], priority: 9 },
      { name: 'WHO', region: 'global', searchTerms: ['WHO', 'World Health Organization'], priority: 8 },
      { name: 'Clinical Practice Guidelines', region: 'global', searchTerms: ['clinical practice guidelines', 'treatment recommendations'], priority: 8 },
      { name: 'Evidence-Based Medicine', region: 'global', searchTerms: ['evidence based medicine', 'clinical evidence'], priority: 7 }
    ];
  }
}