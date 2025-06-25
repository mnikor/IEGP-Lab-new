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

## Recent Changes (June 2025)
- ✓ Implemented complete sample size calculation integration with statistical justification
- ✓ Enhanced personnel cost calculations with therapeutic area adjustments (oncology vs other)
- ✓ Added study type differentiation (NIS vs interventional) and geographic complexity factors
- ✓ Validated anti-overengineering system showing proper complexity penalties
- ✓ Created comprehensive business case document for Big Pharma internal use
- ✓ Confirmed system generates studies with proper patient enrollment targets (e.g., 150 patients with 80% power)

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
- **External APIs**: Perplexity for literature search and market intelligence

### Key Services
- **IdeaGenerator**: Tournament-based study concept generation with anti-overengineering
- **FeasibilityCalculator**: Cost, timeline, and risk assessment with sample size integration
- **SimpliciticyAgent**: Complexity penalty algorithm to reduce overengineering
- **SampleSizeCalculator**: Statistical power analysis and patient enrollment projections
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
- Application is fully functional with complete feature set
- Sample size calculations properly integrated into tournament system
- Anti-overengineering system validated and working
- Business case document created for Big Pharma stakeholders
- Ready for deployment and enterprise implementation

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