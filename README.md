# Orchy — AI Agent Orchestration Platform

A platform for creating AI agents, configuring them with tools, memory and guardrails, connecting them into multi-agent workflows, and triggering them from Telegram or on a schedule.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        TRIGGERS                                  │
│                                                                  │
│  Telegram Photo ──┐                                              │
│  Telegram Text  ──┼──► Webhook /webhook/telegram/{workflowId}   │
│  Manual Run     ──┤                                              │
│  Cron Schedule  ──┘                                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    workflowExecutor.ts                           │
│                                                                  │
│   Topo-sort nodes  →  for each AgentNode:                       │
│     ┌──────────────────────────────────────┐                    │
│     │  agentFactory.ts                      │                    │
│     │  • Gemini 2.5 Flash (LLM)            │                    │
│     │  • Tools (Tavily, invoices, sheets)   │                    │
│     │  • MemorySaver checkpointer           │                    │
│     │  • Guardrails injected to prompt      │                    │
│     └──────────────────────────────────────┘                    │
│   route/halt signals  →  skip or stop pipeline                  │
└────────────┬────────────────────────┬───────────────────────────┘
             │                        │
             ▼                        ▼
    ┌─────────────────┐     ┌──────────────────────┐
    │   PostgreSQL     │     │  WebSocket broadcast  │
    │  (Prisma ORM)    │     │  → Next.js live logs  │
    │                  │     │  → conversation view  │
    │  agents          │     └──────────────────────┘
    │  workflows       │
    │  workflow_runs   │
    │  messages        │
    │  logs            │
    │  invoices        │
    └─────────────────┘
```

```mermaid
graph TD
    TG_P[Telegram Photo] -->|image| WH
    TG_T[Telegram Text] -->|text| WH
    MAN[Manual / UI Run] --> WH
    CRON[node-cron Scheduler] --> WH
    WH[WorkflowExecutor] --> A1[Agent 1\nGemini + Tools]
    A1 -->|output| A2[Agent 2\nGemini + Tools]
    A2 -->|final output| REPLY[Telegram Reply / UI]
    WH -->|persist| DB[(PostgreSQL)]
    WH -->|broadcast| WS[WebSocket]
    WS --> UI[Next.js\nLive Logs + Conversations]
    DB --> UI
    A1 <-->|checkpointer| MEM[MemorySaver\nper-user thread]
    A2 <-->|checkpointer| MEM
```

---

## Tech Stack & Runtime Choices

| Layer | Choice | Why |
|---|---|---|
| **Frontend** | Next.js 14 (App Router) | Server components for fast initial load; file-based routing; built-in API proxying to Express |
| **Backend** | Node.js + Express | Same language as frontend; first-class LangGraph JS support; straightforward webhook handling |
| **AI runtime** | LangGraph JS (`@langchain/langgraph`) | Explicit state graph with topo-sorted node execution, conditional halt/route signals, and native `MemorySaver` checkpointing — see detailed justification below |
| **LLM** | Gemini 2.5 Flash (`@langchain/google-genai`) | Fast, multimodal (handles invoice images natively), cost-effective, generous free tier |
| **Search tool** | Tavily (`@langchain/tavily`) | Native LangChain tool; structured results; free tier sufficient for demos |
| **Database** | PostgreSQL via Docker | Relational queries over run history and invoices; Prisma migrations keep schema in sync |
| **ORM** | Prisma | Type-safe queries; auto-generated client; migration workflow fits monorepo |
| **Realtime** | `ws` WebSocket library | Server-push log streaming without polling; lightweight; no socket.io overhead |
| **Messaging** | Telegram Bot API (`node-telegram-bot-api`) | Webhook setup requires no app-store approval; supports text, photos, and documents |
| **Workflow UI** | React Flow (`@xyflow/react`) | Drag-and-drop node canvas; custom node types; edge routing built-in |
| **Scheduling** | `node-cron` | Zero-dependency cron runner; integrates directly with the workflow executor |

### Why LangGraph over CrewAI / AutoGen

**LangGraph** gives you explicit control over the execution graph:

- **State is typed and visible** — you see exactly what flows between agents (`state.researchResult`, `state.finalArticle`). No hidden message passing.
- **Conditional edges** — agents can emit `{ "route": "writer" }` or `{ "halt": true }` JSON signals to skip downstream nodes or stop the pipeline early. This is how the invoice workflow skips the writer if no invoice is found.
- **Native checkpointing** — `MemorySaver` (or a Postgres checkpointer) persists conversation state between runs, keyed by `thread_id`. Each Telegram user gets a separate memory thread.
- **Tool calling is first-class** — `createReactAgent` handles the LLM ↔ tool loop natively; no custom prompt engineering required.

**CrewAI** is more opinionated (role-based crews, sequential/hierarchical process) and harder to adapt to a visual builder where users define their own graph topology.

**AutoGen** is better suited for autonomous back-and-forth conversations between agents, not structured pipelines where a human-defined graph matters.

---

## Features

| Feature | Details |
|---|---|
| **Agent builder** | Name, role, system prompt, model, tools, memory type/window, guardrails |
| **Guardrails** | Banned topics (injected into system prompt), tone rules, max output tokens |
| **Memory** | `buffer` — last N message pairs via LangGraph MemorySaver; `none` — fresh context each run |
| **Workflow canvas** | Drag-and-drop React Flow canvas; topo-sorted multi-agent pipelines |
| **Channel routing** | `telegram_text` → text workflows; `telegram_photo` → image/invoice workflows |
| **Scheduling** | Cron-based triggers with a friendly UI picker; custom trigger message |
| **Invoice processing** | Extract from photo/PDF → Postgres + Google Sheets; anomaly detection; mark paid via chat |
| **Google Sheets sync** | Auto-write headers; mirror DB updates back to sheet |
| **Live logs** | WebSocket-streamed per-step logs with token count and latency |
| **Conversations** | Live-polling message view per run; auto-scroll; `● live` indicator |
| **Templates** | Pre-built workflow starters (Research+Write, Invoice Processing, etc.) |

---

## Setup

### Prerequisites

- Node.js ≥ 18
- Docker Desktop
- [Google AI Studio key](https://aistudio.google.com/apikey) (Gemini)
- [Tavily API key](https://tavily.com)
- Telegram bot token from [@BotFather](https://t.me/BotFather)
- (Optional) Google service account JSON for Sheets integration

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

Edit `.env`:

```env
# LLM
GOOGLE_API_KEY=your_gemini_key

# Search
TAVILY_API_KEY=your_tavily_key

# Database
DATABASE_URL=postgresql://orchy:orchy@localhost:5433/orchy

# App
API_PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# Google Sheets (optional — required for invoice workflows)
GOOGLE_SHEET_ID=your_sheet_id
GOOGLE_SERVICE_ACCOUNT_PATH=/absolute/path/to/service-account.json
```

> **Telegram tokens** are no longer in `.env`. They are configured per-workflow in the workflow canvas (Channel → Bot Token field).

### 3. Start the database

```bash
docker-compose up -d
```

### 4. Run migrations

```bash
cd apps/api && npx prisma migrate dev
```

### 5. Start everything

```bash
# From repo root
npm run dev
```

- Frontend: http://localhost:3000
- API: http://localhost:3001
- Health check: http://localhost:3001/health

### 6. Connect a Telegram bot

1. Create a bot via [@BotFather](https://t.me/BotFather) and copy the token
2. Expose the API publicly (ngrok recommended):
   ```bash
   ngrok http 3001
   ```
3. Open a workflow in the canvas
4. Set **Channel** to `Telegram Text` or `Telegram Photo`
5. Paste the bot token in the **Bot Token** field
6. Paste the ngrok URL and click **Register Webhook**
7. Save the workflow

To route text queries and photo processing through the same bot, create two workflows with the same token — one with `Telegram Text`, one with `Telegram Photo`.

### 7. Google Sheets setup (optional)

Required only for invoice-processing workflows.

1. Create a Google Cloud project and enable the Sheets API
2. Create a service account and download the JSON key
3. Share your Google Sheet with the service account email (Editor access)
4. Set `GOOGLE_SHEET_ID` and `GOOGLE_SERVICE_ACCOUNT_PATH` in `.env`

---

## How memory works

Each agent maintains a separate conversation thread per context:

| Trigger | Thread ID | Effect |
|---|---|---|
| Telegram user A | `agentId:chatId` | Each user has isolated memory |
| Telegram user B | `agentId:chatId` | No bleed between users |
| Manual run | `agentId:workflowId` | All manual runs of a workflow share context |
| Scheduled run | `agentId:workflowId` | Same thread as manual runs |

`memoryWindow` controls how many past human+AI exchange pairs are kept in context. Set `memoryType: none` to disable memory entirely for stateless agents.

Memory is held in-process via LangGraph's `MemorySaver`. It resets on API restart. For production persistence, swap the checkpointer for `@langchain/langgraph-checkpoint-postgres`.

---

## How to add a new tool

1. Add a `StructuredTool` subclass in `apps/api/src/runtime/tools/`
2. Register it in `apps/api/src/runtime/toolRegistry.ts`:

```ts
import { MyTool } from './tools/myTool'

export const TOOL_REGISTRY: Record<string, StructuredTool> = {
  web_search: new TavilySearchResults({ maxResults: 5 }),
  my_tool: new MyTool(),   // ← add here
}
```

3. Restart the API. The tool appears automatically in the agent creation form.

---

## How to add a new channel

1. Add the channel value to `WORKFLOW_CHANNELS` in `apps/web/lib/api.ts`
2. Create a handler (e.g. `apps/api/src/slack/bot.ts`) that:
   - Receives inbound events from the channel
   - Finds workflows by `channel` field
   - Calls `runWorkflow(run.id, workflowId, { text, threadId })`
   - Sends the result back through the channel
3. Register the webhook route in `apps/api/src/index.ts`

---

## Project structure

```
/
├── apps/
│   ├── api/                         Express backend
│   │   ├── src/
│   │   │   ├── index.ts             Entry point
│   │   │   ├── routes/              REST endpoints
│   │   │   │   ├── agents.ts
│   │   │   │   ├── workflows.ts     Includes /register-telegram
│   │   │   │   ├── runs.ts
│   │   │   │   └── tools.ts
│   │   │   ├── runtime/             LangGraph agent engine
│   │   │   │   ├── agentFactory.ts  Builds agents with memory + guardrails
│   │   │   │   ├── toolRegistry.ts  Tool name → LangChain tool map
│   │   │   │   ├── workflowExecutor.ts  Topo-sort + run pipeline
│   │   │   │   └── tools/           Custom tools (invoice, sheets)
│   │   │   ├── telegram/            Per-workflow Telegram bots
│   │   │   │   └── bot.ts           Channel-based routing
│   │   │   ├── scheduler.ts         node-cron workflow scheduler
│   │   │   ├── websocket/           WS log streaming
│   │   │   │   └── logEmitter.ts
│   │   │   └── db/
│   │   │       └── client.ts
│   │   └── prisma/
│   │       └── schema.prisma
│   └── web/                         Next.js 14 frontend
│       ├── app/
│       │   ├── agents/              Agent CRUD
│       │   ├── workflows/           Workflow list + canvas builder
│       │   ├── conversations/       Run message history (live polling)
│       │   └── logs/                Live WebSocket log stream
│       ├── components/
│       │   ├── agents/              AgentCard, AgentForm
│       │   ├── workflows/           WorkflowCanvas, AgentNode, SchedulePicker
│       │   ├── conversations/       MessageBubble
│       │   ├── logs/                LogEntry, LogStream
│       │   └── layout/              Sidebar
│       └── hooks/
│           └── useLogStream.ts      WebSocket + DB log hydration
├── docker-compose.yml
└── .env.example
```

---

## API Reference

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/v1/agents` | List agents |
| POST | `/api/v1/agents` | Create agent |
| GET | `/api/v1/agents/:id` | Get agent |
| PUT | `/api/v1/agents/:id` | Update agent |
| DELETE | `/api/v1/agents/:id` | Delete agent |
| GET | `/api/v1/workflows` | List workflows |
| POST | `/api/v1/workflows` | Create workflow |
| GET | `/api/v1/workflows/:id` | Get workflow |
| PUT | `/api/v1/workflows/:id` | Update workflow (nodes, channel, token, schedule) |
| DELETE | `/api/v1/workflows/:id` | Delete workflow |
| POST | `/api/v1/workflows/:id/run` | Trigger manual run |
| POST | `/api/v1/workflows/:id/register-telegram` | Register Telegram webhook |
| GET | `/api/v1/runs` | List all runs |
| GET | `/api/v1/runs/:id` | Get run status |
| GET | `/api/v1/runs/:id/messages` | Get run messages |
| GET | `/api/v1/runs/:id/logs` | Get run logs |
| GET | `/api/v1/tools` | List available tools |
| POST | `/webhook/telegram/:workflowId` | Telegram webhook receiver |

---

## Running tests

```bash
cd apps/api && npm test
```

Tests cover: Agent CRUD API, `buildAgent()` factory, `runWorkflow()` executor (messages, logs, WS events).
