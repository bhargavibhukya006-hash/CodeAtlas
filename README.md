# CodeAtlas 🗺️
> **AI-Powered Codebase Intelligence and Change-Impact Analysis**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.19-lightgrey.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![pgvector](https://img.shields.io/badge/pgvector-HNSW-green.svg)](https://github.com/pgvector/pgvector)
[![OpenAI](https://img.shields.io/badge/OpenAI-text--embedding--3--small-orange.svg)](https://openai.com/)

---

## 🌟 Overview

**CodeAtlas** is a developer platform designed to understand complex software repositories and accurately predict the ripple effects of code changes. 

Instead of acting as a generic conversational chatbot, CodeAtlas crawls public GitHub repositories, performs multi-language AST/symbol extraction, generates high-dimensional embeddings for code chunks, indexes them into **PostgreSQL with pgvector**, and constructs a static code relationship graph.

The flagship capability is **Change Impact Analysis**: a developer enters a proposed architectural or feature change (e.g., *"Add Google OAuth authentication"* or *"Migrate MySQL queries to PostgreSQL connection pooling"*), and CodeAtlas returns:
- A technical **summary** of the requested change.
- **Likely affected files** with confidence levels and reasons.
- **Affected components** (services, routes, classes, database models).
- An interactive **dependency cascade graph**.
- An ordered, step-by-step **implementation plan** with clickable source citations.
- **Risk areas** and concrete regression mitigations.
- Complete **grounded repository evidence** with verifiable file and line coordinates (`[path:start-end]`).

---

## ✨ Features

- **🚀 Automated GitHub Repository Indexing**: Ingests public repositories via GitHub REST API, ignoring binary files, lockfiles, build artifacts, and dependencies.
- **🧩 Multi-Language Symbol Extraction & Chunking**: Extracts functions, classes, interfaces, routes, and database models across **TypeScript, JavaScript, Python, Java, Go, C++, and SQL** with line-level boundary preservation.
- **📐 High-Performance Semantic Vector Search**: Batches OpenAI embeddings (`text-embedding-3-small`) and executes cosine similarity searches using `pgvector` with HNSW indexing.
- **🎯 Change Impact Analysis Engine**: Predicts ripple effects through relationship graph expansion (`IMPORTS`, `EXTENDS`, `CALLS`, `DATABASE`), ranking affected components and identifying vulnerabilities before writing code.
- **💬 Grounded Codebase Q&A**: Strict refusal to hallucinate code outside the retrieved chunks. Every factual statement cites verifiable line references (e.g., `[src/auth/authService.ts:15-38]`).
- **📊 Visual Relationship & Cascade Graph**: Displays connections between files, routes, services, and database queries.
- **💻 Dark Developer-Tool UI**: Engineered with Next.js 14, Tailwind CSS, Lucide icons, and Prism.js syntax highlighting.
- **🌱 Instant Demo Mode**: Includes a built-in full-stack microservice fixture so developers can test the entire workflow instantly with 1 click.

---

## 🏗️ Architecture

```
                       ┌────────────────────────┐
                       │   Next.js 14 Frontend  │
                       │  (React, Tailwind CSS) │
                       └───────────┬────────────┘
                                   │ REST API
                                   ▼
                       ┌────────────────────────┐
                       │  Express.js TypeScript │
                       │      Backend API       │
                       └─────┬────────────┬─────┘
                             │            │
           Embeddings & LLM  │            │  Repository Tree & Code
                             ▼            ▼
                    ┌────────────┐   ┌────────────┐
                    │ OpenAI API │   │ GitHub API │
                    └────────────┘   └────────────┘
                             │
                             ▼
                ┌──────────────────────────────┐
                │    PostgreSQL + pgvector     │
                │ ──────────────────────────── │
                │ • repositories               │
                │ • files                      │
                │ • code_chunks (1536-dim HNSW)│
                │ • relationships (graph)      │
                │ • analysis_queries           │
                └──────────────────────────────┘
```

---

## 📁 Folder Structure

```text
codeatlas/
├── frontend/
│   ├── app/
│   │   ├── layout.tsx                     # Root layout with developer theme
│   │   ├── page.tsx                       # Landing page with repo URL input & features
│   │   ├── globals.css                    # Custom scrollbars, syntax tokens, grid backdrop
│   │   └── dashboard/[repositoryId]/
│   │       ├── layout.tsx                 # Dashboard navigation tabs & metrics header
│   │       ├── page.tsx                   # Repository overview & file tree
│   │       ├── search/page.tsx            # Semantic vector code search
│   │       ├── ask/page.tsx               # Grounded codebase Q&A assistant
│   │       └── impact/page.tsx            # Change Impact Analysis interface
│   ├── components/
│   │   ├── RepositoryInput.tsx            # GitHub URL input & quick-select buttons
│   │   ├── IndexingProgress.tsx           # Real-time multi-stage indexing status
│   │   ├── RepositoryStats.tsx            # Repo header with badges and metrics
│   │   ├── SearchBar.tsx                  # Semantic query input with suggestions
│   │   ├── CodeResult.tsx                 # Semantic search result card with match score
│   │   ├── CodeViewer.tsx                 # Syntax-highlighted code viewer modal
│   │   ├── AskPanel.tsx                   # Q&A conversation panel with citations
│   │   ├── SourceReference.tsx            # Clickable citation badge [path:start-end]
│   │   ├── ImpactReport.tsx               # Complete change impact report view
│   │   ├── DependencyGraph.tsx            # Interactive relationship node graph
│   │   ├── FileList.tsx                   # Searchable file explorer
│   │   ├── LoadingState.tsx               # Accessible loading spinner
│   │   └── ErrorState.tsx                 # Actionable error alert with retry
│   ├── lib/
│   │   ├── api.ts                         # Typed REST API client
│   │   └── utils.ts                       # Formatters, language colors, cn helper
│   ├── types/index.ts                     # Shared TypeScript interfaces
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   └── next.config.mjs
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── index.ts                   # Environment configuration loader
│   │   │   └── db.ts                      # PostgreSQL connection pool & pgvector types
│   │   ├── types/index.ts                 # Backend data models & API contracts
│   │   ├── utils/
│   │   │   ├── github.ts                  # GitHub URL parser and validator
│   │   │   ├── fileFilter.ts              # Ignore rules and language detection
│   │   │   ├── chunker.ts                 # Multi-language symbol extraction & chunker
│   │   │   ├── codeRelationships.ts       # Code graph extractor (IMPORTS, EXTENDS, DB)
│   │   │   └── errors.ts                  # AppError hierarchy
│   │   ├── services/
│   │   │   ├── githubService.ts           # GitHub REST API client (tree & contents)
│   │   │   ├── openaiService.ts           # Batch embeddings & chat completions
│   │   │   ├── vectorService.ts           # pgvector cosine similarity & graph expansion
│   │   │   ├── indexingService.ts         # Asynchronous repository indexing pipeline
│   │   │   ├── qaService.ts               # Grounded Q&A with citation extraction
│   │   │   ├── impactService.ts           # Change impact orchestration & JSON recovery
│   │   │   └── prompts/
│   │   │       ├── codebaseQA.ts          # Grounded QA prompt templates
│   │   │       └── impactAnalysis.ts      # Structured change impact prompt templates
│   │   ├── controllers/
│   │   │   └── repositoryController.ts    # Express request controllers
│   │   ├── routes/
│   │   │   └── repositoryRoutes.ts        # REST endpoints
│   │   ├── middleware/
│   │   │   └── errorHandler.ts            # Centralized JSON error middleware
│   │   ├── tests/
│   │   │   ├── github.test.ts             # URL parser tests
│   │   │   ├── fileFilter.test.ts         # File filter and language detection tests
│   │   │   ├── chunker.test.ts            # AST symbol chunker tests
│   │   │   ├── codeRelationships.test.ts  # Dependency relationship extraction tests
│   │   │   ├── impactParser.test.ts       # Impact JSON validation & recovery tests
│   │   │   └── api.test.ts                # REST API integration tests
│   │   ├── app.ts                         # Express app definition & CORS
│   │   └── server.ts                      # Server bootstrap & migration runner
│   ├── package.json
│   ├── tsconfig.json
│   └── jest.config.js
├── database/
│   ├── init.sql                           # Database DDL with pgvector & HNSW index
│   └── migrations/
│       └── 001_initial_schema.sql         # Versioned schema migration
├── docker-compose.yml                     # PostgreSQL 16 + pgvector container
├── .env.example                           # Configuration blueprint
└── README.md
```

---

## 🛠️ Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm** or **pnpm** / **yarn**
- **Docker** and **Docker Compose** (for PostgreSQL + pgvector)
- **OpenAI API Key**: Required for vector embeddings and grounded AI reasoning.
- **GitHub Personal Access Token (Optional)**: Recommended for higher GitHub API rate limits (60/hr unauthenticated vs 5,000/hr authenticated).

---

## ⚙️ Environment Variables

Create `.env` in the project root:

```bash
cp .env.example .env
```

Fill in your configuration:

```env
# Server Port & Mode
PORT=5000
NODE_ENV=development

# PostgreSQL + pgvector Connection
DATABASE_URL=postgresql://codeatlas:codeatlas_secret@localhost:5432/codeatlas_db

# OpenAI API Configuration
OPENAI_API_KEY=sk-proj-your-openai-api-key-here
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_CHAT_MODEL=gpt-4o-mini

# GitHub API Configuration (Optional for public repos)
GITHUB_TOKEN=ghp_your_optional_github_token

# Retrieval & Limits
TOP_K=8
MAX_FILE_SIZE=200000
MAX_FILES=500
MAX_EMBEDDING_BATCH_SIZE=100

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## 🚀 Quickstart Guide

### 1. Start PostgreSQL with pgvector

Launch the database using Docker Compose:

```bash
docker compose up -d
```

Verify that the database is healthy:
```bash
docker ps
```

### 2. Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd ../frontend
npm install
```

### 3. Run Backend Tests & Build

```bash
cd backend
npm test
npm run build
```

### 4. Start the Application

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Or npm start (production dist)
```
The backend starts at `http://localhost:5000`.

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```
The frontend is available at `http://localhost:3000`.

---

## 🧪 Testing the Complete Workflow

1. Navigate to `http://localhost:3000`.
2. On the landing page, click **"Explore Live Auth Microservice Demo"** (or enter a public repository like `https://github.com/expressjs/express`).
3. You will be redirected to the **Repository Dashboard**:
   - Inspect total files, chunks, and detected languages.
4. **Test Change Impact Analysis**:
   - Go to the **Change Impact Analysis** tab.
   - Enter: `"Add Google OAuth authentication login"`.
   - Click **"Analyze Impact"**.
   - Review:
     - The generated architectural summary.
     - Affected files with confidence indicators (`high`/`medium`/`low`).
     - Affected components (routes, auth service, database user model).
     - The interactive **Dependency Graph**.
     - Step-by-step implementation plan with source references.
     - Potential regression risk areas.
     - Click any `[path:start-end]` citation chip to open the **Code Viewer**!
5. **Test Semantic Search**:
   - Go to the **Semantic Search** tab.
   - Enter: `"Where is authentication handled?"`
   - See ranked code chunks with similarity match percentages (e.g. `94% Match`).
6. **Test Ask CodeAtlas**:
   - Go to the **Ask CodeAtlas** tab.
   - Enter: `"How does the login and token signing flow work?"`
   - Review the grounded response citing exact code lines.

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Service health, DB connection status, and AI config flags |
| `POST` | `/api/repositories/index` | Submits public GitHub repository URL for async indexing |
| `POST` | `/api/repositories/demo` | Seeds sample fullstack auth microservice repository |
| `GET` | `/api/repositories/:id` | Returns repository metadata, file count, and chunk count |
| `GET` | `/api/repositories/:id/status`| Polls indexing stage and status message |
| `GET` | `/api/repositories/:id/search?q=` | Semantic vector similarity search via pgvector |
| `POST` | `/api/repositories/:id/ask` | Grounded Q&A against repository code chunks |
| `POST` | `/api/repositories/:id/impact-analysis` | Change impact prediction, dependency graph, and plan |
| `GET` | `/api/repositories/:id/files` | Lists all indexed repository source files |
| `GET` | `/api/repositories/:id/relationships` | Retrieves static code dependency graph edges |

---

## 🛡️ Security & Reliability

- **No Hardcoded Secrets**: All API keys and credentials are read strictly from environment variables.
- **Fail-Safe Offline Mode**: If PostgreSQL or OpenAI credentials are missing, the backend reports informative configuration errors rather than crashing, and supports the local demo dataset for development.
- **Graceful JSON Recovery**: The Change Impact Engine includes regex-assisted JSON recovery if an LLM returns unexpected markdown wrappers.
- **Batched API Requests**: Embeddings are batched in chunks of 100 to avoid OpenAI rate limits.

---

## 🔮 Future Enhancements

- Incremental re-indexing using GitHub webhook events.
- Git diff impact analysis directly from Pull Request URLs.
- Tree-sitter WebAssembly bindings for deep cross-file symbol call graphs.
- Direct automated Pull Request generation based on the implementation plan.

---

## 📄 License

MIT License. Built for advanced codebase intelligence and developer productivity.
