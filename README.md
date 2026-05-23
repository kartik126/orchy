# Orchy — AI Agent Orchestration Platform

A platform for creating AI agents, connecting them into workflows, and triggering them from Telegram. Built with LangGraph, Gemini, and Next.js.

---

## Architecture

```
Telegram Message
      │
      ▼
Express Webhook (/webhook/telegram)
      │
      ▼
WorkflowExecutor (LangGraph StateGraph)
      │
      ├─── Research Agent (Gemini + Tavily web search)
      │           │
      │           └── writes researchResult → shared state
      │
      └─── Writer Agent (Gemini)
                  │
                  └── reads researchResult, writes finalArticle
      │
      ├── PostgreSQL (messages, logs, run status)
      │
      └── WebSocket broadcast → Next.js live log stream
```

```mermaid
graph TD
    TG[Telegram User] -->|message| WH[Webhook /webhook/telegram]
    WH --> EX[WorkflowExecutor]
    EX --> RA[Research Agent\nGemini + Tavily]
    RA -->|researchResult| WA[Writer Agent\nGemini]
    WA -->|finalArticle| TG
    EX -->|persist| DB[(PostgreSQL)]
    EX -->|broadcast| WS[WebSocket]
    WS --> UI[Next.js Live Logs]
    DB --> UI
```

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Next.js 14 (App Router) | Server components, file routing, easy API proxying |
| Backend | Node.js + Express | LangGraph JS support, same language as frontend |
| AI runtime | LangGraph JS | Fine-grained state control, conditional edges, checkpointing |
| LLM | Gemini 2.5 Flash | Available API key, fast, cost-effective |
| Search | Tavily | Native LangChain tool, generous free tier |
| Database | PostgreSQL (Docker) | Relational, queryable message history |
| ORM | Prisma | Type-safe queries, easy migrations |
| Realtime | WebSockets (ws) | Server-push log streaming without polling |
| Messaging | Telegram Bot API | Webhook setup, no approval required |
| Workflow UI | React Flow (@xyflow/react) | Drag-and-drop node canvas |

## Why LangGraph over CrewAI / AutoGen

LangGraph gives explicit control over the state graph — you see exactly what state flows between agents, can add conditional edges (retry if research returned nothing), and persist checkpoints natively. CrewAI is more opinionated and harder to adapt to a visual workflow builder. The `StateAnnotation` model makes agent-to-agent communication explicit: the Research Agent writes to `state.researchResult`; the Writer Agent reads it. No hidden message passing.

---

## Setup

### Prerequisites
- Node.js ≥ 18
- Docker Desktop
- A free [Tavily API key](https://tavily.com)
- A [Google AI Studio key](https://aistudio.google.com/apikey) (for Gemini)
- A Telegram bot token from [@BotFather](https://t.me/BotFather)

### 1. Clone and install

```bash
git clone <repo-url>
cd ai-agent-orchestration
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```
GOOGLE_API_KEY=your_gemini_key
TAVILY_API_KEY=your_tavily_key
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_WEBHOOK_URL=https://your-tunnel.loca.lt   # see step 5

DATABASE_URL=postgresql://orchy:orchy@localhost:5433/orchy
API_PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

### 3. Start the database

```bash
docker-compose up -d
```

### 4. Run migrations

```bash
cd apps/api && npx prisma migrate dev
```

### 5. Expose the API for Telegram webhooks

Telegram needs a public HTTPS URL to deliver messages. Use localtunnel:

```bash
npx localtunnel --port 3001
```

Copy the tunnel URL into `.env` as `TELEGRAM_WEBHOOK_URL`, then register it:

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=<TUNNEL_URL>/webhook/telegram"
```

Verify: `curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"`

### 6. Start everything

```bash
# From repo root — starts API + frontend together
npm run dev
```

- API: http://localhost:3001
- Frontend: http://localhost:3000
- Health check: http://localhost:3001/health

---

## How to add a new tool

Tools are registered in `apps/api/src/runtime/toolRegistry.ts`.

1. Install the LangChain tool package (or write a `StructuredTool` subclass).
2. Import and add it to `TOOL_REGISTRY`:

```ts
// toolRegistry.ts
import { MyNewTool } from '@langchain/community/tools/my_tool'

export const TOOL_REGISTRY: Record<string, StructuredTool> = {
  web_search: new TavilySearch({ maxResults: 5 }),
  calculator: new Calculator(),
  my_tool: new MyNewTool(),          // ← add here
}
```

3. Restart the API. The new tool name (`"my_tool"`) appears automatically in the Tools endpoint (`GET /api/v1/tools`) and in the agent creation form in the UI.
4. Create or edit an agent and enable the tool from the checkbox list.

---

## How to add a new workflow template

Templates are defined in `apps/web/app/workflows/new/page.tsx`.

1. Open the file and find the `TEMPLATES` array.
2. Add a new entry:

```ts
{
  id: 'my-template',
  name: 'My Template',
  description: 'What this workflow does.',
  nodes: [
    { id: 'node-1', type: 'agentNode', position: { x: 100, y: 150 },
      data: { label: 'First Agent', role: 'researcher', status: 'idle' } },
    { id: 'node-2', type: 'agentNode', position: { x: 400, y: 150 },
      data: { label: 'Second Agent', role: 'writer', status: 'idle' } },
  ],
  edges: [
    { id: 'e1-2', source: 'node-1', target: 'node-2' },
  ],
}
```

3. If your template needs a new execution path (e.g. three agents instead of two), also update `workflowExecutor.ts` to add the new nodes and edges to the LangGraph `StateGraph`.

---

## Running tests

```bash
cd apps/api && npm test
```

10 tests across 3 files:
- **agents.test.ts** — Agent CRUD API (create, validation, list)
- **agentFactory.test.ts** — `buildAgent()` returns a runnable LangGraph agent
- **workflowExecutor.test.ts** — `runDemoWorkflow()` runs, persists messages/logs, emits WS events

---

## Project structure

```
/
├── apps/
│   ├── api/                    Express backend
│   │   ├── src/
│   │   │   ├── index.ts        Entry point
│   │   │   ├── routes/         REST endpoints
│   │   │   ├── runtime/        LangGraph agent engine
│   │   │   │   ├── agentFactory.ts
│   │   │   │   ├── toolRegistry.ts
│   │   │   │   ├── workflowExecutor.ts
│   │   │   │   └── agents/
│   │   │   ├── telegram/       Telegram webhook
│   │   │   ├── websocket/      WS log streaming
│   │   │   └── db/             Prisma client
│   │   └── prisma/
│   │       └── schema.prisma
│   └── web/                    Next.js 14 frontend
│       ├── app/
│       │   ├── agents/
│       │   ├── workflows/
│       │   ├── conversations/
│       │   └── logs/
│       ├── components/
│       └── hooks/
├── docker-compose.yml
└── .env.example
```

## API Reference

| Method | Path | Description |
|---|---|---|
| GET | /health | Health check |
| GET | /api/v1/agents | List all agents |
| POST | /api/v1/agents | Create agent |
| GET | /api/v1/agents/:id | Get agent |
| PUT | /api/v1/agents/:id | Update agent |
| DELETE | /api/v1/agents/:id | Delete agent |
| GET | /api/v1/workflows | List workflows |
| POST | /api/v1/workflows | Create workflow |
| PUT | /api/v1/workflows/:id | Update workflow |
| POST | /api/v1/workflows/:id/run | Trigger a run |
| GET | /api/v1/runs | List all runs |
| GET | /api/v1/runs/:id | Get run status |
| GET | /api/v1/runs/:id/messages | Get run messages |
| GET | /api/v1/runs/:id/logs | Get run logs |
| GET | /api/v1/tools | List available tools |
| POST | /webhook/telegram | Telegram webhook receiver |
