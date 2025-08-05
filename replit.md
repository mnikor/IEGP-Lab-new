# Clinical Study Ideator & Validator

## Overview
The Clinical Study Ideator & Validator is an application designed to generate and validate clinical study concepts. Its core purpose is to address the over-complexification often seen in clinical trials by integrating an anti-overengineering system that penalizes complexity. It leverages AI for concept generation, conducts comprehensive feasibility analysis including cost breakdowns and timeline projections, performs statistical sample size calculations, and aligns study designs with strategic business goals like label expansion and market access. The system is designed to work reliably across various disease and study types, providing therapeutic area-specific intelligence and realistic cost modeling.

## User Preferences
- Focus on practical, executable study designs over theoretical complexity
- Emphasize cost-effectiveness and realistic timelines
- Prioritize regulatory compliance and approval probability
- Value evidence-based decision making with statistical rigor

## System Architecture

### UI/UX Decisions
The application uses Shadcn/ui and Tailwind CSS for a modern and responsive user interface. Key UI enhancements include a consistent "Situational Analysis" modal for organized tabbed research intelligence display, professional table styling with highlighted NCT numbers, and immediate access to research results upon completion.

### Technical Implementations
The system is built as a full-stack application.
- **Frontend**: Developed with React and TypeScript, using Vite for bundling, Wouter for routing, TanStack Query for server state management, and React Hook Form with Zod for form validation.
- **Backend**: Implemented with Express.js and TypeScript, utilizing in-memory storage (MemStorage) for current data persistence with an interface for future database migration. OpenAI SDK is used for AI integration.

### Feature Specifications
- **AI-Powered Concept Generation**: Utilizes OpenAI's latest models for study concept generation, enhanced by real-time literature search.
- **Anti-Overengineering System**: Implements a complexity penalty algorithm that reduces scores for overly complex designs.
- **Tournament-Based Optimization**: Employs a multi-round evaluation system to systematically refine study concepts.
- **Integrated Statistical Analysis**: Provides comprehensive statistical power analysis for sample size calculations.
- **Feasibility Analysis**: Offers detailed cost breakdowns, timeline projections, and risk assessments.
- **Strategic Goal Alignment**: Maps study designs to business objectives (e.g., label expansion, market access).
- **Therapeutic Area Intelligence**: Incorporates comprehensive analysis for various therapeutic areas (oncology, immunology, neurology, cardiovascular, rare disease, infectious) to provide context-aware calculations and cost multipliers.
- **Dynamic SWOT Analysis**: Generates intelligent, context-aware SWOT analyses using therapeutic area expertise and market intelligence.
- **Research Strategy Integration**: Seamlessly integrates AI-driven research strategy into workflows, synthesizing findings from external research.
- **AI Chat Recalculation**: AI chat intelligently detects user intent, distinguishing between actionable changes and advisory discussions, and triggers recalculations for critical study parameter changes while preserving conversational context.

### System Design Choices
The architecture emphasizes modularity with distinct services:
- `IdeaGenerator`: Handles tournament-based concept generation.
- `FeasibilityCalculator`: Manages cost, timeline, and risk assessments.
- `TherapeuticAreaEngine`: Provides therapeutic area-specific intelligence.
- `SimpliciticyAgent`: Implements the complexity penalty.
- `SampleSizeCalculator`: Performs statistical power analysis.
- `SwotGenerator`: Creates dynamic SWOT analyses.
- `ResearchStrategyGenerator`: Generates AI-driven research strategies.
- `ResearchExecutor`: Integrates with external APIs for research execution and synthesis.
- `Aggregator`: Synthesizes data for final concept optimization.

## External Dependencies
- **OpenAI**: Used for AI-powered concept generation, analysis, intent detection, and synthesis.
- **Perplexity API**: Specifically `sonar` and `sonar-deep-research` models, integrated for real-time, comprehensive clinical evidence research and market intelligence.
- **ClinicalTrials.gov API**: Utilized for real-time validation of clinical trial numbers (NCTs).
- **PubMed**: Referenced for authentic citations in research intelligence.
- **FDA, EMA**: Referenced for authentic regulatory citations.