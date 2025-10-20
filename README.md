# Clinical Study Ideator & Validator

## Overview

Clinical Study Ideator & Validator is an AI-assisted platform that helps clinical development teams rapidly design and evaluate study concepts. It combines multi-source evidence gathering, LLM-generated concepts, structured feasibility analytics, and transparent rationale so teams can iterate quickly while staying within operational constraints.

After the removal of the multi-agent tournament system, the application focuses on two core workflows:

- **Generate Concept:** create new clinical study concepts based on drug, indication, and strategic goals.
- **Validate Study Idea:** critique and refine an existing synopsis against current evidence, feasibility, and regulatory expectations.

## Core Features

### AI-Generated Study Concepts
- Uses Perplexity search (`server/services/perplexity.ts`) to gather up-to-date evidence about the provided drug/indication.
- Synthesizes evidence with OpenAI models (`server/services/openai.ts`) to produce structured concepts containing PICO data, MCDA scores, SWOT analysis, and feasibility estimates.
- Adds deterministic feasibility refinement via `calculateFeasibility()` (`server/services/feasibilityCalculator.ts`) to normalize cost, timeline, and sample-size projections.
- Generates a design rationale block in `server/routes.ts` that ties each recommendation back to strategic goals, feasibility metrics, and MCDA scoring.

### Study Idea Validation
- Accepts a user-provided synopsis and runs targeted Perplexity research to cross-check claims.
- Uses the same OpenAI analysis pipeline with validation-specific prompts to produce actionable feedback, risk flags, and improvement suggestions.
- Supports document uploads through Multer for PICO extraction (`extractTextFromDocument` and `extractPicoFromText`).

### Reporting & Evidence Traceability
- Generates PDF and PPTX summaries (`server/services/reportBuilder.ts`) that include feasibility dashboards and the rationale bullets.
- Provides normalized citations with URLs from Perplexity responses for auditability.

### Frontend Experience
- React + Vite SPA located under `client/` with routes defined in `client/src/App.tsx`.
- Sidebar navigation now contains only "New Concept", "Validate Study Idea", "Reports", and "Help" (`client/src/components/layout/Sidebar.tsx`).
- Concept generation form lives in `client/src/components/concept/ConceptForm.tsx`, while feasibility visualizations render through `client/src/components/shared/FeasibilityDashboard.tsx`.

## Tech Stack
- **Frontend:** React 18, TypeScript, Tailwind, TanStack Query, Wouter router.
- **Backend:** Express + TypeScript, Drizzle ORM with Neon/PostgreSQL, Multer for uploads.
- **AI Services:** OpenAI (Chat Completions) and Perplexity API.
- **Build Tooling:** Vite for client, ESBuild for server bundling, tsx for dev runtime.

## Project Structure
```
client/                  # React SPA
server/                  # Express API
shared/                  # Shared types & database schema
server/routes.ts         # Core API endpoints
server/storage.ts        # Drizzle-backed data access layer
server/services/         # AI, feasibility, SWOT, reporting utilities
```

## Environment Variables
Set the following values (e.g., in `.env` or shell exports) before running:
```
OPENAI_API_KEY=your-openai-key
PERPLEXITY_API_KEY=your-perplexity-key
DATABASE_URL=postgresql://...           # Neon or other Postgres connection
SESSION_SECRET=replace-with-strong-string
```

## Installation & Development
```bash
npm install
npm run dev        # starts Express + Vite on http://localhost:5001
```

For production builds:
```bash
npm run build      # builds client and bundles server to dist/
npm run start      # runs compiled server (expects dist/index.js)
```

## Testing & Linting
Currently there are no automated tests bundled. TypeScript checking can be run with:
```bash
npm run check
```

## Deployment Notes
- The server listens on port 5001 by default (`server/index.ts`). Adjust as needed before deployment.
- Ensure the database schema defined in `shared/schema.ts` has been pushed using Drizzle migrations or `npm run db:push`.
- Since tournaments are removed, confirm that any existing data referencing tournament tables is archived or dropped.

## Roadmap Ideas
- Expand feasibility calculator with geographic/site-specific cost intelligence from `server/data/regionalCostBenchmarks.ts`.
- Add automated regression tests for concept generation and validation endpoints.
- Expose design rationale in downloadable reports for consistent stakeholder communication.
