# Orchy — AI Agent Orchestration Platform

## What this project is
A platform where users can create AI agents, configure them (personality, tools, memory, guardrails), connect them into collaborative workflows, and interact with them through Telegram.

## Tech stack
| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 14 (App Router) | File-based routing, server components, easy API integration |
| Backend | Node.js + Express | Same language as frontend, good LangGraph JS support |
| AI runtime | LangGraph JS (`@langchain/langgraph`) | Stateful agent graphs, native async, good for multi-agent handoffs |
| LLM | Gemini 2.0 Flash (`@langchain/google-genai`) | Available API key, fast, cost-effective |
| Search tool | Tavily (`@langchain/community/tools/tavily_search`) | Native LangChain tool, free tier |
| Database | PostgreSQL via Docker | Production-grade, good for message history and agent state |
| ORM | Prisma | Type-safe, great DX, easy migrations |
| Realtime | WebSockets (`ws` library) | Live log streaming from agent runs to UI |
| Messaging | Telegram Bot API (`node-telegram-bot-api`) | Simple webhook setup, no approval required |
| Workflow UI | React Flow (`@xyflow/react`) | Drag-and-drop node canvas for workflow builder |

## Monorepo structure
```
/
├── apps/
│   ├── web/                    ← Next.js 14 frontend
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── agents/
│   │   │   ├── workflows/
│   │   │   ├── conversations/
│   │   │   └── logs/
│   │   └── components/
│   └── api/                    ← Express backend
│       ├── src/
│       │   ├── index.ts         ← Express app entry
│       │   ├── routes/          ← REST endpoints
│       │   ├── runtime/         ← LangGraph agent engine
│       │   │   ├── agentFactory.ts
│       │   │   ├── toolRegistry.ts
│       │   │   ├── workflowExecutor.ts
│       │   │   └── agents/
│       │   │       ├── researchAgent.ts
│       │   │       └── writerAgent.ts
│       │   ├── telegram/        ← Telegram bot
│       │   │   └── bot.ts
│       │   ├── websocket/       ← WS log streaming
│       │   │   └── logEmitter.ts
│       │   └── db/              ← Prisma client
│       │       └── client.ts
│       └── prisma/
│           └── schema.prisma
├── docker-compose.yml
├── .env.example
└── README.md
```

## Architecture decisions

### Why agent configs live in the DB
Agents are stored as JSON config in Postgres. At runtime, `agentFactory.ts` reads the config and hydrates a real LangGraph agent from it. This means: no code changes to add a new agent, configs are editable via UI, and history is queryable.

### Agent-to-agent communication model
Agents communicate through LangGraph's shared `StateAnnotation`. The Research Agent writes its output to `state.researchResult`. The Writer Agent reads `state.researchResult` as input. The workflow executor coordinates the handoff. All inter-agent messages are also persisted to the `messages` table for the UI to display.

### Persistence strategy
- `agents` table — agent configs (name, prompt, model, tools, memory settings)
- `workflows` table — workflow definitions (list of agent nodes + edges as JSON)
- `workflow_runs` table — each execution instance with status + timestamps
- `messages` table — every message (human→agent, agent→agent, agent→human) with timestamps
- `logs` table — token counts, latency, errors per agent run step

### WebSocket log streaming
When a workflow run starts, the executor emits log events through `logEmitter.ts`. The frontend subscribes via WebSocket. Logs include: step name, agent name, input/output preview, token count, timestamp.

## Environment variables
```
# LLM
GOOGLE_API_KEY=your_gemini_key

# Search
TAVILY_API_KEY=your_tavily_key

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_WEBHOOK_URL=https://your-tunnel-url/webhook/telegram

# Database
DATABASE_URL=postgresql://orchy:orchy@localhost:5432/orchy

# App
API_PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

## Running the project
```bash
# 1. Start database
docker-compose up -d

# 2. Install dependencies
npm install

# 3. Run migrations
cd apps/api && npx prisma migrate dev

# 4. Start API
cd apps/api && npm run dev

# 5. Start frontend
cd apps/web && npm run dev

# 6. Expose API for Telegram webhook (use ngrok or localtunnel)
npx localtunnel --port 3001
```

## Key concepts to understand as you build

### LangGraph StateAnnotation
Every LangGraph agent runs inside a state graph. The state is a typed object that flows through nodes. Each node (function) receives the current state and returns a partial state update. The graph merges updates using reducers.

```ts
// State flows: Telegram → Research node → Writer node → Telegram reply
const WorkflowState = Annotation.Root({
  userMessage: Annotation<string>(),
  researchResult: Annotation<string>(),
  finalArticle: Annotation<string>(),
  messages: Annotation<BaseMessage[]>({ reducer: messagesStateReducer }),
})
```

### Agent factory pattern
`agentFactory.ts` is the core abstraction. It takes an agent DB record and returns a runnable LangGraph node function. This is what makes the platform "configurable" — users never write code.

### Tool registry
`toolRegistry.ts` exports a map of `string → LangChain tool`. The agent config stores `["web_search", "calculator"]` as strings. The factory looks these up and passes real tool objects to the agent.

## Coding conventions
- TypeScript everywhere, strict mode on
- Prisma for all DB access — no raw SQL
- All agent execution goes through `workflowExecutor.ts` — never call LangGraph directly from routes
- Log every agent step to DB + emit via WebSocket simultaneously
- API routes prefix: `/api/v1/`
- Error responses: `{ error: string, code: string }`
- WebSocket message format: `{ type: "log" | "status" | "message", payload: {...} }`
