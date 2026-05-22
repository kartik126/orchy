# Runtime package context

This package holds shared TypeScript types used by both `apps/api` and `apps/web`.

## Current exports

### types.ts
Shared type definitions that mirror the Prisma schema but are safe to import on the frontend (no Prisma client dependency):

```ts
export type AgentConfig = {
  id: string
  name: string
  role: string
  systemPrompt: string
  model: string
  tools: string[]
  memoryType: string
  memoryWindow: number
  guardrails: Record<string, unknown> | null
  channelId: string | null
}

export type WorkflowNode = {
  id: string
  type: 'agentNode'
  position: { x: number; y: number }
  data: { agentId: string; label: string; role: string }
}

export type WorkflowEdge = {
  id: string
  source: string
  target: string
}

export type LogEvent = {
  type: 'log' | 'status' | 'message'
  payload: {
    runId: string
    agentName: string
    step: string
    message: string
    latencyMs?: number
    tokensUsed?: number
    timestamp: string
  }
}
```

## Import in web
```ts
import type { AgentConfig, LogEvent } from '@orchy/runtime'
```

## Import in api
```ts
import type { WorkflowNode, WorkflowEdge } from '@orchy/runtime'
```
