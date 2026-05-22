# API — Backend context

## Entry point
`src/index.ts` — creates Express app, attaches routers, starts WebSocket server, initialises Telegram bot

## Runtime layer (most important)
The `src/runtime/` directory is the heart of the platform. Understand this before touching routes.

### agentFactory.ts
Takes an `Agent` record from DB → returns a LangGraph `CompiledStateGraph` node.

Key things it does:
1. Reads `agent.tools` (string array) → calls `toolRegistry.getTools(agent.tools)`
2. Reads `agent.model` → creates a `ChatGoogleGenerativeAI` instance
3. Reads `agent.systemPrompt` → wraps it as a `SystemMessage`
4. Calls `createReactAgent({ llm, tools, messageModifier: systemPrompt })`
5. Returns the compiled agent

### toolRegistry.ts
A plain object map: `Record<string, StructuredTool>`. Add tools here to make them available in the UI dropdown.

Current tools:
- `web_search` → `TavilySearchResults` (max 5 results)
- `calculator` → `Calculator` from langchain

### workflowExecutor.ts
Orchestrates multi-agent workflows. Given a `WorkflowRun` record:
1. Builds a `StateGraph` with nodes for each agent in the workflow
2. Adds edges based on the workflow's edge config
3. Compiles and invokes the graph
4. Emits log events at each step via `logEmitter`
5. Persists messages + logs to DB after each step

### agents/researchAgent.ts
A pre-configured agent node (not using agentFactory — this is the hardcoded demo agent).
- Tools: `web_search`
- Output: structured research summary written to `state.researchResult`

### agents/writerAgent.ts
Reads `state.researchResult`, writes a formatted article to `state.finalArticle`.
- No tools needed
- System prompt focused on formatting and tone

## Prisma schema summary
See `prisma/schema.prisma` for full schema. Quick reference:

```
Agent        { id, name, role, systemPrompt, model, tools[], memoryType, memoryWindow, guardrails, channelId, createdAt }
Workflow     { id, name, nodes (JSON), edges (JSON), createdAt }
WorkflowRun  { id, workflowId, status, startedAt, finishedAt, triggeredBy }
Message      { id, runId, fromAgent, toAgent, content, role, createdAt }
Log          { id, runId, agentName, step, input, output, tokensUsed, latencyMs, createdAt }
```

## Express routes
```
GET    /api/v1/agents           → list all agents
POST   /api/v1/agents           → create agent
GET    /api/v1/agents/:id       → get agent
PUT    /api/v1/agents/:id       → update agent
DELETE /api/v1/agents/:id       → delete agent

GET    /api/v1/workflows        → list workflows
POST   /api/v1/workflows        → create workflow
GET    /api/v1/workflows/:id    → get workflow with nodes/edges
PUT    /api/v1/workflows/:id    → update workflow
POST   /api/v1/workflows/:id/run → trigger a workflow run

GET    /api/v1/runs/:id         → get run status
GET    /api/v1/runs/:id/messages → get all messages for a run
GET    /api/v1/runs/:id/logs    → get all logs for a run

POST   /webhook/telegram        → Telegram webhook endpoint
```

## WebSocket protocol
Server emits JSON messages to all connected clients:
```ts
{ type: "log",     payload: { runId, agentName, step, message, tokensUsed, latencyMs, timestamp } }
{ type: "status",  payload: { runId, status: "running" | "completed" | "failed" } }
{ type: "message", payload: { runId, from, to, content, timestamp } }
```

## Adding a new tool
1. Import or create the tool in `toolRegistry.ts`
2. Add it to the `TOOL_REGISTRY` map with a string key
3. It will automatically appear in the frontend agent creation form

## Adding a new workflow template
Create a new file in `src/runtime/templates/`. Export a function that returns a `{ nodes, edges }` object matching the workflow JSON schema. Register it in `workflowTemplates.ts`.
