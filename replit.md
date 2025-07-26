# Clinical Study Ideator & Validator

## Project Overview
A comprehensive clinical study concept generation and validation application featuring OpenAI's o3 reasoning model integration, enhanced feasibility analysis with cost breakdowns, anti-overengineering tournament system, and complete statistical sample size calculations. The application addresses the tendency for clinical trials to become unnecessarily complex by implementing complexity penalties while ensuring proper patient enrollment targets and statistical foundations for study designs.

## Key Features
- **AI-Powered Study Concept Generation**: Uses OpenAI's latest models (gpt-4o) with real-time literature search via Perplexity
- **Anti-Overengineering System**: Complexity penalty algorithm (up to 30%) that reduces scores for overcomplex designs
- **Tournament-Based Optimization**: Multi-round evaluation system that systematically improves study concepts
- **Integrated Sample Size Calculations**: Statistical power analysis with 80% power and proper justification
- **Comprehensive Feasibility Analysis**: Cost breakdowns including personnel (25-30% of budget), timeline projections, and risk assessment
- **Strategic Goal Alignment**: Maps study designs to business objectives (label expansion, market access, etc.)

## Recent Changes (July 2025)
- ✓ **Comprehensive Generalization**: Rebuilt system to work reliably for any disease and study type, not just psoriasis examples
- ✓ **Therapeutic Area Intelligence Engine**: Added comprehensive therapeutic area analysis (oncology, immunology, neurology, cardiovascular, rare disease, infectious) with context-aware calculations
- ✓ **Enhanced Biologics Detection**: Improved high-cost therapy detection with comprehensive drug naming patterns and therapeutic area indicators
- ✓ **Robust Sample Size Calculations**: Fixed consistency issues with study-specific statistical power analysis and therapeutic area adjustments
- ✓ **Dynamic SWOT Analysis**: Replaced generic templates with intelligent, context-aware analysis using therapeutic area expertise and market intelligence
- ✓ **Integrated Cost Modeling**: Applied therapeutic area cost multipliers for realistic Phase III biologics costs (€15-50M+ range)
- ✓ **Data-Driven Analysis**: Enhanced all calculations to be based on study characteristics rather than hardcoded examples
- ✓ **Research Strategy Integration**: Seamlessly integrated AI-driven research strategy functionality into ConceptForm workflow with Perplexity API execution and OpenAI synthesis
- ✓ **Perplexity Deep Research Implementation**: Successfully integrated `sonar-deep-research` model with comprehensive analysis prompts for enhanced clinical evidence research
- ✓ **Duplicate Search Prevention**: Fixed concept generation to properly reuse existing research strategy results via researchStrategyId parameter, eliminating redundant API calls
- ✓ **Enhanced Research Quality**: Deep Research provides structured analysis with strategic importance, design implications, and actionable recommendations with proper citation formatting
- ✓ **Consistent Situational Analysis UI**: Replaced research sidebar with Tournament-style "Situational Analysis" modal for consistent UX across applications, eliminating scrolling issues and providing organized tabbed research intelligence display
- ✓ **Fixed Duplicate Confidence Labels**: Removed duplicate confidence badges from ReasonsToBelieve component to show single accurate confidence level
- ✓ **Enhanced Clinical Trial Search**: Improved Perplexity queries to find real ongoing trials with actual NCT numbers instead of hypothetical examples, using site:clinicaltrials.gov with recruitment status filters
- ✓ **Universal Drug/Disease Support**: Fixed research strategy to work generically for any drug and disease combination using proper variable substitution, not limited to specific examples
- ✓ **Improved Table Formatting**: Enhanced competitive analysis table display with professional styling and highlighted NCT numbers for better readability
- ✓ **Immediate Research Results Access**: Added "View Results" button to show research findings immediately when complete, with option to add additional targeted searches
- ✓ **Enhanced Research UX**: Users can now review research insights before concept generation and run supplementary research if gaps are identified
- ✓ **Fixed Table Formatting**: Completely rebuilt table detection and formatting system for proper display of clinical trial data with NCT highlighting
- ✓ **Cumulative Research Functionality**: "Add More Research" now preserves previous results and appends new findings for comprehensive analysis
- ✓ **Improved Data Persistence**: Research results accumulate across multiple research sessions rather than being replaced
- ✓ **Universal Search Strategy Overhaul**: Removed restrictive AND operators, implemented intelligent therapeutic area-adaptive search patterns
- ✓ **Disease-Agnostic Intelligence**: System now works universally for any drug/disease combination with therapeutic area-specific terminology
- ✓ **Adaptive Guidelines Integration**: Guidelines searches focus on indication-only with relevant medical societies (NCCN, ESMO, AHA, etc.)
- ✓ **Flexible Competitive Landscape**: Captures all therapeutic classes and mechanisms, not limited to specific drugs or classes
- ✓ **Enhanced NCT Verification**: Real-time validation via ClinicalTrials.gov API prevents hallucinated trial numbers

## Project Architecture

### Frontend (React + TypeScript)
- **Framework**: Vite + React with TypeScript
- **Routing**: Wouter for client-side routing
- **UI Components**: Shadcn/ui + Tailwind CSS
- **State Management**: TanStack Query for server state
- **Forms**: React Hook Form with Zod validation

### Backend (Express + TypeScript)
- **Server**: Express.js with TypeScript
- **Storage**: In-memory storage (MemStorage) with interface for future database migration
- **AI Integration**: OpenAI SDK for concept generation and analysis
- **External APIs**: Perplexity Deep Research (`sonar-deep-research`) for comprehensive clinical evidence research and market intelligence

### Key Services
- **IdeaGenerator**: Tournament-based study concept generation with anti-overengineering
- **FeasibilityCalculator**: Cost, timeline, and risk assessment with therapeutic area intelligence
- **TherapeuticAreaEngine**: Comprehensive therapeutic area analysis with context-aware multipliers
- **SimpliciticyAgent**: Complexity penalty algorithm to reduce overengineering
- **SampleSizeCalculator**: Statistical power analysis with therapeutic area adjustments
- **SwotGenerator**: Dynamic SWOT analysis using therapeutic area expertise and market intelligence
- **ResearchStrategyGenerator**: AI-driven research strategy generation with targeted query creation
- **ResearchExecutor**: Perplexity API integration for real-time research execution and OpenAI synthesis
- **Aggregator**: Data synthesis and final concept optimization

### Database Schema
- **Users**: Authentication and user management
- **StudyConcepts**: Individual study concept storage
- **SynopsisValidations**: Study synopsis analysis results
- **Tournaments**: Multi-round optimization sessions
- **Ideas**: Tournament study concepts with feasibility data
- **Reviews**: Evaluation and scoring data
- **TournamentRounds**: Round-by-round progression tracking

## User Preferences
- Focus on practical, executable study designs over theoretical complexity
- Emphasize cost-effectiveness and realistic timelines
- Prioritize regulatory compliance and approval probability
- Value evidence-based decision making with statistical rigor

## Current Status
- **Fully Generalized System**: Works reliably for any disease area and study type
- **Therapeutic Area Intelligence**: Comprehensive analysis covering oncology, immunology, neurology, cardiovascular, rare disease, and infectious disease
- **Enhanced Cost Accuracy**: Realistic Phase III biologics costs (€15-50M+ range) with therapeutic area multipliers
- **Dynamic SWOT Analysis**: Context-aware analysis with real competitive intelligence and market insights
- **Robust Sample Size Calculations**: Study-specific calculations with proper statistical justification
- **Quality Improvements Documented**: Comprehensive plan addressing previous consistency issues
- **Ready for Production**: Enterprise-ready system with reliable underlying calculation engines

## Environment Setup
- Node.js application with TypeScript
- OpenAI API integration (OPENAI_API_KEY required)
- Development server runs on port 5000
- Frontend served via Vite development server

## Deployment Notes
- Uses Replit's built-in deployment system
- No Docker or containerization required
- Environment variables managed through Replit secrets
- Ready for production deployment