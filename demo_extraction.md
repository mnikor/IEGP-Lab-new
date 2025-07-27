# Study Synopsis Data Extraction Demo

## What Gets Extracted from Your Document:

### 1. PICO Framework (extractPicoFromText function)
The system uses OpenAI's gpt-4o model to extract:

**Population**: 
- Patient demographics (age, gender, ethnicity)
- Inclusion/exclusion criteria
- Sample size (if specified)
- Disease stage/severity
- Prior treatments
- Performance status

**Intervention**:
- Study drug name and dosing
- Administration route and schedule  
- Combination therapies
- Treatment duration

**Comparator**:
- Control arm details
- Standard of care definitions
- Placebo specifications
- Active comparator drugs

**Outcomes**:
- Primary endpoints
- Secondary endpoints
- Safety measures
- Biomarker assessments
- Quality of life measures

### 2. Sample Text Input Analysis:
Input: "Phase III study: Adults 18-75 with Stage IV melanoma, ECOG 0-1. Primary endpoint: PFS. Secondary: OS, ORR. N=400 patients, 50 sites, 24 months enrollment."

**Extracted PICO**:
- Population: "Adults aged 18-75 with Stage IV melanoma, ECOG 0-1, adequate organ function"
- Intervention: "Pembrolizumab monotherapy"
- Comparator: "Standard of care treatment"
- Outcomes: "Primary: progression-free survival (PFS). Secondary: overall survival (OS), objective response rate (ORR)"

### 3. Enhanced Processing:
- Original population N=400 gets updated with AI-calculated feasibility
- Sample size recalculated based on therapeutic area and phase
- Site count optimized for geography
- Timeline adjusted for realistic recruitment

### 4. Complete Data Integration:
The extracted data is combined with:
- Real-time literature search results
- Cost and timeline feasibility analysis
- Regulatory precedent analysis
- Competitive landscape assessment
- SWOT analysis based on extracted parameters

This creates a comprehensive validation report that builds upon your original synopsis while providing enhanced feasibility insights.