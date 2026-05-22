# Orchy — Task Breakdown

## How to use this file
Work through tasks in order. Each task has:
- What to build
- Key concept to understand (since you want to learn, not just ship)
- Acceptance criteria (how you know it's done)

Check off tasks as you complete them: change `[ ]` to `[x]`

---

## Phase 1 — Project setup
*Goal: one command starts everything. Nothing runs yet, but the skeleton is correct.*

### 1.1 Monorepo scaffold
- [x] Create root `package.json` with workspaces: `["apps/*", "packages/*"]`
- [x] Create `apps/api/` directory with its own `package.json` (name: `@orchy/api`)
- [x] Create `apps/web/` directory — run `npx create-next-app@latest` inside it
- [x] Create `packages/runtime/` directory (empty for now, will hold shared types later)
- [x] Add root `npm install` script that installs all workspaces

**Concept:** npm workspaces let you run `npm install` once at the root and have all packages share a single `node_modules`. This avoids duplicate installs and makes cross-package imports easy.

**Done when:** `ls apps/` shows `api/` and `web/`, both have `package.json`

---

### 1.2 Docker + Postgres
- [x] Create `docker-compose.yml` at root
- [ ] Run `docker-compose up -d` and verify it starts (Docker Desktop must be running)
- [ ] Test connection: `psql postgresql://orchy:orchy@localhost:5432/orchy`

**Concept:** Docker runs Postgres in an isolated container so you don't install Postgres locally. The `volumes` key persists data between container restarts.

**Done when:** `docker ps` shows the container running

---

### 1.3 Environment variables
- [x] Create `.env.example` at root with all variables (see CLAUDE.md)
- [ ] Fill in actual keys in `.env`:
  - `GOOGLE_API_KEY` — from Google AI Studio
  - `TAVILY_API_KEY` — from tavily.com (free tier)
  - `TELEGRAM_BOT_TOKEN` — from @BotFather on Telegram
- [x] Add `.env` to `.gitignore`

**Done when:** `.env` exists with all 5 required keys filled in

---

### 1.4 TypeScript setup for API
- [x] Install in `apps/api/`: `typescript ts-node @types/node @types/express nodemon`
- [x] Create `tsconfig.json` with `"strict": true`, `"outDir": "dist"`, `"rootDir": "src"`
- [x] Create `nodemon.json` to watch `src/` and restart on change
- [x] Add scripts to `package.json`: `"dev": "nodemon"`, `"build": "tsc"`
- [x] Create `src/index.ts` with Express server on port 3001

**Done when:** `npm run dev` in `apps/api/` starts the server, `curl localhost:3001/health` returns `{ ok: true }` ✓

---

## Phase 2 — Database schema + REST API
*Goal: agents can be created and fetched via API. No agent logic yet.*

### 2.1 Prisma setup
- [ ] Install in `apps/api/`: `prisma @prisma/client`
- [ ] Run `npx prisma init` — creates `prisma/schema.prisma` and adds `DATABASE_URL` to `.env`
- [ ] Replace the schema with the full Orchy schema:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Agent {
  id           String   @id @default(cuid())
  name         String
  role         String
  systemPrompt String
  model        String   @default("gemini-2.0-flash")
  tools        String[]
  memoryType   String   @default("buffer")
  memoryWindow Int      @default(10)
  guardrails   Json?
  channelId    String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  messages     Message[]
}

model Workflow {
  id        String        @id @default(cuid())
  name      String
  nodes     Json
  edges     Json
  createdAt DateTime      @default(now())
  runs      WorkflowRun[]
}

model WorkflowRun {
  id          String    @id @default(cuid())
  workflowId  String
  workflow    Workflow  @relation(fields: [workflowId], references: [id])
  status      String    @default("pending")
  triggeredBy String    @default("manual")
  startedAt   DateTime  @default(now())
  finishedAt  DateTime?
  messages    Message[]
  logs        Log[]
}

model Message {
  id          String      @id @default(cuid())
  runId       String
  run         WorkflowRun @relation(fields: [runId], references: [id])
  fromAgent   String
  toAgent     String
  content     String
  role        String
  agentId     String?
  agent       Agent?      @relation(fields: [agentId], references: [id])
  createdAt   DateTime    @default(now())
}

model Log {
  id          String      @id @default(cuid())
  runId       String
  run         WorkflowRun @relation(fields: [runId], references: [id])
  agentName   String
  step        String
  input       String?
  output      String?
  tokensUsed  Int?
  latencyMs   Int?
  createdAt   DateTime    @default(now())
}
```

**Concept:** Prisma schema is the single source of truth for your database shape. `npx prisma migrate dev` reads this schema and generates SQL to create/alter tables. `@prisma/client` gives you a fully type-safe DB client — no raw SQL needed.

- [x] Run `npx prisma migrate dev --name init`
- [ ] Verify tables exist: open Prisma Studio with `npx prisma studio`

**Done when:** Prisma Studio shows all 5 tables ✓ (migration applied, 5 tables created)

---

### 2.2 Prisma client singleton
- [x] Create `src/db/client.ts`

**Concept:** This singleton pattern prevents Prisma from creating a new DB connection on every hot-reload during development (which would exhaust the connection pool).

---

### 2.3 Agent CRUD routes
- [x] Create `src/routes/agents.ts` with full CRUD
- [x] Mount in `src/index.ts`

**Done when:** `POST /api/v1/agents` with a JSON body creates a record ✓

---

### 2.4 Workflow CRUD routes
- [x] Create `src/routes/workflows.ts`
- [x] Add `POST /api/v1/workflows/:id/run`
- [x] Create `src/routes/runs.ts` with status, messages, logs endpoints

---

### 2.5 Tools endpoint
- [x] Create `src/routes/tools.ts` — returns `["web_search","calculator"]`

---

## Phase 3 — LangGraph agent runtime
*Goal: a single agent can be instantiated from a DB config and run a task. This is where you understand LangGraph internals.*

### 3.1 Install AI dependencies
- [ ] In `apps/api/` install:
  ```
  @langchain/langgraph
  @langchain/core
  @langchain/google-genai
  @langchain/community
  langchain
  ```

---

### 3.2 Tool registry
- [ ] Create `src/runtime/toolRegistry.ts`:
  ```ts
  import { TavilySearchResults } from '@langchain/community/tools/tavily_search'
  import { Calculator } from '@langchain/community/tools/calculator'
  import { StructuredTool } from '@langchain/core/tools'

  export const TOOL_REGISTRY: Record<string, StructuredTool> = {
    web_search: new TavilySearchResults({ maxResults: 5 }),
    calculator: new Calculator(),
  }

  export function getTools(names: string[]): StructuredTool[] {
    return names
      .filter(name => TOOL_REGISTRY[name])
      .map(name => TOOL_REGISTRY[name])
  }
  ```

**Concept:** Tools are just objects with a `name`, `description`, and `call()` method. LangGraph passes these to the LLM as function definitions. The LLM decides which tool to call; LangGraph executes the actual call and feeds the result back.

---

### 3.3 Agent factory
- [ ] Create `src/runtime/agentFactory.ts`:
  ```ts
  import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
  import { createReactAgent } from '@langchain/langgraph/prebuilt'
  import { SystemMessage } from '@langchain/core/messages'
  import { getTools } from './toolRegistry'
  import type { Agent } from '@prisma/client'

  export function buildAgent(agentConfig: Agent) {
    const llm = new ChatGoogleGenerativeAI({
      model: agentConfig.model,
      apiKey: process.env.GOOGLE_API_KEY,
    })

    const tools = getTools(agentConfig.tools)

    const agent = createReactAgent({
      llm,
      tools,
      messageModifier: new SystemMessage(agentConfig.systemPrompt),
    })

    return agent
  }
  ```

**Concept:** `createReactAgent` builds a ReAct (Reason + Act) loop. The agent: (1) reasons about what to do, (2) decides if a tool is needed, (3) calls the tool, (4) observes the result, (5) repeats until it has an answer. The `messageModifier` injects the system prompt before every LLM call.

**Done when:** You can call `buildAgent(agentRecord)` and get back an agent object

---

### 3.4 Define workflow state
- [ ] Create `src/runtime/state.ts`:
  ```ts
  import { Annotation, messagesStateReducer } from '@langchain/langgraph'
  import { BaseMessage } from '@langchain/core/messages'

  export const WorkflowState = Annotation.Root({
    userMessage: Annotation<string>(),
    researchResult: Annotation<string>({
      reducer: (a, b) => b ?? a,
      default: () => '',
    }),
    finalArticle: Annotation<string>({
      reducer: (a, b) => b ?? a,
      default: () => '',
    }),
    messages: Annotation<BaseMessage[]>({
      reducer: messagesStateReducer,
      default: () => [],
    }),
  })

  export type WorkflowStateType = typeof WorkflowState.State
  ```

**Concept — this is the core of LangGraph:** `Annotation.Root` defines the shape of state that flows through the entire graph. Each field has a `reducer` — a function that merges the old value with a new partial update. `messagesStateReducer` appends new messages to the array rather than replacing it. When a node returns `{ researchResult: "..." }`, the graph merges it into state using the reducer.

---

### 3.5 Research agent node
- [ ] Create `src/runtime/agents/researchAgent.ts`:
  ```ts
  import { HumanMessage } from '@langchain/core/messages'
  import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
  import { createReactAgent } from '@langchain/langgraph/prebuilt'
  import { TavilySearchResults } from '@langchain/community/tools/tavily_search'
  import type { WorkflowStateType } from '../state'

  const llm = new ChatGoogleGenerativeAI({ model: 'gemini-2.0-flash' })
  const tools = [new TavilySearchResults({ maxResults: 5 })]

  const agent = createReactAgent({
    llm,
    tools,
    messageModifier: `You are a research assistant. Given a topic, search the web and return a concise, well-structured summary with key facts and sources. Always cite your sources.`,
  })

  export async function researchNode(state: WorkflowStateType) {
    const result = await agent.invoke({
      messages: [new HumanMessage(state.userMessage)],
    })
    const lastMessage = result.messages[result.messages.length - 1]
    return {
      researchResult: lastMessage.content as string,
      messages: result.messages,
    }
  }
  ```

**Concept — nodes are just async functions:** A LangGraph node is any async function that takes the current state and returns a partial state update. The graph handles merging the return value into the full state using the reducers you defined.

---

### 3.6 Writer agent node
- [ ] Create `src/runtime/agents/writerAgent.ts`:
  ```ts
  import { HumanMessage } from '@langchain/core/messages'
  import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
  import type { WorkflowStateType } from '../state'

  const llm = new ChatGoogleGenerativeAI({ model: 'gemini-2.0-flash' })

  export async function writerNode(state: WorkflowStateType) {
    const prompt = `Based on this research:\n\n${state.researchResult}\n\nWrite a clear, engaging article for a general audience. Use headers and bullet points where appropriate. Keep it under 500 words.`

    const result = await llm.invoke([new HumanMessage(prompt)])

    return {
      finalArticle: result.content as string,
    }
  }
  ```

**Concept — agent-to-agent communication:** The Writer Agent never directly calls the Research Agent. It just reads `state.researchResult` — a value the Research Agent wrote to the shared state. This is the LangGraph model for agent-to-agent communication: shared state, not direct function calls. The graph executor guarantees the Research node runs before the Writer node because of the edges you define.

---

### 3.7 Workflow executor
- [ ] Create `src/runtime/workflowExecutor.ts`:
  ```ts
  import { StateGraph, END } from '@langchain/langgraph'
  import { WorkflowState } from './state'
  import { researchNode } from './agents/researchAgent'
  import { writerNode } from './agents/writerAgent'
  import { prisma } from '../db/client'
  import { logEmitter } from '../websocket/logEmitter'

  export async function runDemoWorkflow(runId: string, userMessage: string) {
    // Update run status
    await prisma.workflowRun.update({
      where: { id: runId },
      data: { status: 'running' },
    })

    // Build the graph
    const graph = new StateGraph(WorkflowState)
      .addNode('research', async (state) => {
        const start = Date.now()
        logEmitter.emit({ runId, agentName: 'Research Agent', step: 'start', message: 'Starting web research...' })

        const result = await researchNode(state)

        const latencyMs = Date.now() - start
        // Persist the message
        await prisma.message.create({
          data: { runId, fromAgent: 'Research Agent', toAgent: 'Writer Agent', content: result.researchResult, role: 'agent' }
        })
        // Persist the log
        await prisma.log.create({
          data: { runId, agentName: 'Research Agent', step: 'complete', output: result.researchResult, latencyMs }
        })
        logEmitter.emit({ runId, agentName: 'Research Agent', step: 'complete', message: 'Research done', latencyMs })
        return result
      })
      .addNode('writer', async (state) => {
        const start = Date.now()
        logEmitter.emit({ runId, agentName: 'Writer Agent', step: 'start', message: 'Writing article...' })

        const result = await writerNode(state)

        const latencyMs = Date.now() - start
        await prisma.message.create({
          data: { runId, fromAgent: 'Writer Agent', toAgent: 'user', content: result.finalArticle, role: 'agent' }
        })
        await prisma.log.create({
          data: { runId, agentName: 'Writer Agent', step: 'complete', output: result.finalArticle, latencyMs }
        })
        logEmitter.emit({ runId, agentName: 'Writer Agent', step: 'complete', message: 'Article ready', latencyMs })
        return result
      })
      .addEdge('__start__', 'research')
      .addEdge('research', 'writer')
      .addEdge('writer', '__end__')
      .compile()

    // Run it
    const finalState = await graph.invoke({ userMessage })

    await prisma.workflowRun.update({
      where: { id: runId },
      data: { status: 'completed', finishedAt: new Date() },
    })

    logEmitter.emit({ runId, agentName: 'system', step: 'done', message: 'Workflow complete' })
    return finalState
  }
  ```

**Concept — StateGraph and edges:** `addNode` registers a function. `addEdge` defines execution order. `'__start__'` and `'__end__'` are built-in sentinel nodes. When you call `graph.invoke({ userMessage })`, LangGraph: (1) initializes state with your input, (2) runs `research` node, (3) merges its return into state, (4) runs `writer` node with the updated state, (5) returns the final state. Edges are the wiring; nodes are the workers.

**Done when:** You can call `runDemoWorkflow(runId, "AI trends 2025")` and see two messages in the DB

---

## Phase 4 — WebSocket log emitter
*Goal: the frontend can watch agent runs in real time.*

### 4.1 WebSocket server
- [ ] Install: `ws @types/ws`
- [ ] Create `src/websocket/server.ts`:
  ```ts
  import { WebSocketServer, WebSocket } from 'ws'
  import http from 'http'

  let wss: WebSocketServer

  export function initWebSocket(server: http.Server) {
    wss = new WebSocketServer({ server })
    wss.on('connection', (ws) => {
      console.log('WS client connected')
      ws.on('close', () => console.log('WS client disconnected'))
    })
  }

  export function broadcast(data: object) {
    if (!wss) return
    const msg = JSON.stringify(data)
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) client.send(msg)
    })
  }
  ```

**Concept:** WebSockets keep a persistent TCP connection open between server and browser. Unlike HTTP (request → response → close), WS allows the server to push data at any time. We use this to stream log events from agent runs without the frontend polling.

- [ ] Update `src/index.ts` to create an `http.Server` from the Express app, pass it to `initWebSocket`, then listen on the server (not `app.listen`)

---

### 4.2 Log emitter
- [ ] Create `src/websocket/logEmitter.ts`:
  ```ts
  import { broadcast } from './server'

  interface LogEvent {
    runId: string
    agentName: string
    step: string
    message: string
    latencyMs?: number
    tokensUsed?: number
  }

  export const logEmitter = {
    emit(event: LogEvent) {
      broadcast({ type: 'log', payload: { ...event, timestamp: new Date().toISOString() } })
    },
    status(runId: string, status: string) {
      broadcast({ type: 'status', payload: { runId, status, timestamp: new Date().toISOString() } })
    },
  }
  ```

**Done when:** Opening `ws://localhost:3001` in a WS client (e.g. Postman) shows log events when a workflow run is triggered

---

## Phase 5 — Telegram bot
*Goal: user sends a message on Telegram, workflow runs, article is sent back.*

### 5.1 Bot setup
- [ ] Install: `node-telegram-bot-api @types/node-telegram-bot-api`
- [ ] Create `src/telegram/bot.ts`:
  ```ts
  import TelegramBot from 'node-telegram-bot-api'
  import { prisma } from '../db/client'
  import { runDemoWorkflow } from '../runtime/workflowExecutor'

  export function initTelegramWebhook(app: Express.Application) {
    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!)

    // Webhook endpoint — Telegram POSTs to this URL
    app.post('/webhook/telegram', (req, res) => {
      bot.processUpdate(req.body)
      res.sendStatus(200)
    })

    bot.on('message', async (msg) => {
      const chatId = msg.chat.id
      const userMessage = msg.text
      if (!userMessage) return

      await bot.sendMessage(chatId, '🔍 Researching your topic...')

      // Create a workflow run record
      const run = await prisma.workflowRun.create({
        data: { workflowId: 'demo', triggeredBy: 'telegram' }
      })

      // Persist the user's message
      await prisma.message.create({
        data: { runId: run.id, fromAgent: 'user', toAgent: 'Research Agent', content: userMessage, role: 'human' }
      })

      try {
        const finalState = await runDemoWorkflow(run.id, userMessage)
        await bot.sendMessage(chatId, finalState.finalArticle, { parse_mode: 'Markdown' })
      } catch (err) {
        await bot.sendMessage(chatId, '❌ Something went wrong. Please try again.')
      }
    })

    return bot
  }
  ```

**Concept — webhooks vs polling:** Telegram offers two ways to receive messages. Polling means your bot constantly asks "any new messages?". Webhooks mean Telegram calls your URL whenever a new message arrives — much more efficient. You need a public URL for webhooks. Use `ngrok` or `localtunnel` to expose your local port.

### 5.2 Register the webhook
- [ ] Expose your API: `npx localtunnel --port 3001` → copy the URL
- [ ] Register with Telegram:
  ```bash
  curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
    -d "url=<YOUR_TUNNEL_URL>/webhook/telegram"
  ```

**Done when:** Sending "AI trends 2025" to your Telegram bot returns a written article within 30 seconds

---

## Phase 6 — Next.js frontend: agent management
*Goal: agents can be created, listed, and edited in the browser.*

### 6.1 Next.js setup
- [ ] Install in `apps/web/`: `swr axios @xyflow/react`
- [ ] Configure `next.config.js` to proxy API calls:
  ```js
  rewrites: async () => [
    { source: '/api/v1/:path*', destination: 'http://localhost:3001/api/v1/:path*' }
  ]
  ```
- [ ] Create `lib/api.ts` with typed fetch wrappers for all endpoints
- [ ] Install Tailwind (comes with create-next-app, just verify `tailwind.config.js` exists)

---

### 6.2 Layout
- [ ] Create `components/layout/Sidebar.tsx` with nav links: Agents, Workflows, Conversations, Logs
- [ ] Use `usePathname()` to highlight the active nav item
- [ ] Create `app/layout.tsx` that renders Sidebar alongside `{children}`

---

### 6.3 Agent list page
- [ ] Create `app/agents/page.tsx`
- [ ] Fetch agents with `useSWR('/api/v1/agents', fetcher)`
- [ ] Render `AgentCard` for each agent showing: name, role, model, tools as tags, status dot
- [ ] Add "New agent" button linking to a modal or `/agents/new`

---

### 6.4 Agent creation form
- [ ] Create `components/agents/AgentForm.tsx` (client component)
- [ ] Fields: name (text), role (text), system prompt (textarea), model (select), tools (multi-checkbox from `/api/v1/tools`), memory window (number)
- [ ] On submit: `POST /api/v1/agents` → redirect to agents list
- [ ] On edit: pre-fill from existing agent, `PUT /api/v1/agents/:id` on submit

**Done when:** Creating an agent in the UI saves it to DB and shows on the list

---

## Phase 7 — Workflow builder
*Goal: user can visually connect agents into a workflow.*

### 7.1 React Flow canvas
- [ ] Create `app/workflows/[id]/page.tsx`
- [ ] Install and import React Flow: `import { ReactFlow, addEdge, useNodesState, useEdgesState } from '@xyflow/react'`
- [ ] Create `components/workflows/AgentNode.tsx` — custom node showing agent name + role
- [ ] Register custom node types: `const nodeTypes = { agentNode: AgentNode }`
- [ ] Load workflow nodes/edges from `GET /api/v1/workflows/:id`

**Concept — React Flow:** React Flow renders a canvas where nodes are React components positioned at (x, y) coordinates. Edges are SVG paths between nodes. The library handles drag-and-drop, pan/zoom, and edge routing. Your job: define node/edge data shapes and render them.

### 7.2 Save workflow
- [ ] Add a "Save" button that calls `PUT /api/v1/workflows/:id` with current `{ nodes, edges }`
- [ ] Add a "Run" button that calls `POST /api/v1/workflows/:id/run`, then redirects to the logs page for that run

### 7.3 Pre-built templates
- [ ] Create "Research + Write" template: two nodes (Research Agent → Writer Agent) pre-connected
- [ ] Create "Research only" template: single Research Agent node
- [ ] Show template buttons on the workflow list page that pre-populate a new workflow

**Done when:** You can open the workflow builder, see two agent nodes connected by an arrow, hit "Run", and see logs appear

---

## Phase 8 — Conversations UI
*Goal: all messages (human ↔ agent and agent ↔ agent) are visible in the UI.*

### 8.1 Conversations page
- [ ] Create `app/conversations/page.tsx`
- [ ] Fetch all workflow runs: `GET /api/v1/runs` (add this endpoint)
- [ ] List runs with: trigger source (telegram/manual), status, start time, agent count

### 8.2 Message thread
- [ ] Create `app/conversations/[runId]/page.tsx`
- [ ] Fetch messages: `GET /api/v1/runs/:id/messages`
- [ ] Render `MessageBubble` for each message — differentiate human vs agent vs agent-to-agent visually
- [ ] Add WebSocket subscription to append new messages in real time during a run

**Done when:** After a Telegram-triggered run, the conversations page shows the full thread: user message → research output → final article

---

## Phase 9 — Live monitoring
*Goal: real-time log stream with token costs.*

### 9.1 Log stream page
- [ ] Create `app/logs/page.tsx`
- [ ] Create `hooks/useLogStream.ts` — opens WebSocket, listens for `{ type: "log" }` messages, appends to local state array
- [ ] Create `components/logs/LogEntry.tsx` — shows: timestamp, agent name, step, message, latency badge
- [ ] Auto-scroll to bottom when new logs arrive

### 9.2 Token tracking
- [ ] Update `workflowExecutor.ts` to extract token usage from LangGraph response metadata
- [ ] Store in `Log.tokensUsed` in DB
- [ ] Show a running total "tokens used this run" at the top of the log page

**Concept — token metadata:** When you call `llm.invoke()`, the response includes `usage_metadata` with `input_tokens` and `output_tokens`. LangGraph propagates this in the final state. You can sum up tokens across all nodes to get the run total.

**Done when:** Triggering a Telegram run shows live log entries in the browser as the agents execute

---

## Phase 10 — README + demo prep
*Goal: the repo is submittable.*

### 10.1 README.md
- [ ] Write architecture overview with a diagram (can use Mermaid in Markdown)
- [ ] Document setup steps: clone → `.env` → docker up → migrate → npm dev
- [ ] Explain runtime choice (LangGraph) and justify it
- [ ] Add a section: "How to add a new tool" with exact steps
- [ ] Add a section: "How to add a new workflow template" with exact steps

### 10.2 Architecture diagram
- [ ] Create a diagram showing:
  ```
  Telegram → Webhook → WorkflowExecutor → [Research Agent → Writer Agent] → Telegram
                                                    ↓
                                               PostgreSQL
                                                    ↓
                               WebSocket → Next.js Live Logs
  ```

### 10.3 Demo recording
- [ ] Open Telegram, send a topic (e.g. "latest developments in quantum computing")
- [ ] Screen record: Telegram message sent → logs page showing agents running live → Telegram reply arriving → conversations page showing full thread
- [ ] Record the agent creation UI: create a new agent, set system prompt and tools, save

### 10.4 Code quality checks
- [ ] Add error handling to all Express routes (try/catch, return 500 on failure)
- [ ] Add input validation to `POST /api/v1/agents` (check required fields exist)
- [ ] Write at least 3 tests (use `vitest` or `jest`):
  - Agent creation via API
  - `buildAgent()` returns a runnable agent
  - Workflow executor runs without throwing

---

## Stretch goals (if time permits)
- [ ] Add conditional edge: if `researchResult` is empty, retry research before passing to writer
- [ ] Add agent schedules: store a cron expression in the agent config, use `node-cron` to trigger runs
- [ ] Add guardrails: check `agent.guardrails.maxTokens` and abort if exceeded
- [ ] Deploy to Railway or Render with a single `railway up` command

---

## Quick reference — commands you'll run often
```bash
# Start DB
docker-compose up -d

# Run DB migrations after schema changes
cd apps/api && npx prisma migrate dev --name <description>

# Open Prisma Studio (DB GUI)
cd apps/api && npx prisma studio

# Start API
cd apps/api && npm run dev

# Start frontend
cd apps/web && npm run dev

# Expose local port for Telegram webhook
npx localtunnel --port 3001

# Register Telegram webhook
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" -d "url=<TUNNEL_URL>/webhook/telegram"

# Check webhook is registered
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```
