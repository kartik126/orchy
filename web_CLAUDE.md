# Web — Frontend context

## Framework
Next.js 14 with App Router. All pages are in `app/`. Use server components by default; add `"use client"` only when you need browser APIs, state, or event handlers.

## Pages
```
app/
├── layout.tsx              ← Root layout with sidebar + topbar
├── page.tsx                ← Redirects to /agents
├── agents/
│   ├── page.tsx            ← Agent list (AgentCard grid)
│   └── [id]/
│       └── page.tsx        ← Agent detail + edit form
├── workflows/
│   ├── page.tsx            ← Workflow list
│   └── [id]/
│       └── page.tsx        ← Workflow builder (React Flow canvas)
├── conversations/
│   └── page.tsx            ← Message history per run
└── logs/
    └── page.tsx            ← Real-time log stream
```

## Component structure
```
components/
├── layout/
│   ├── Sidebar.tsx
│   └── Topbar.tsx
├── agents/
│   ├── AgentCard.tsx
│   ├── AgentForm.tsx       ← Create / edit form
│   └── AgentStatusBadge.tsx
├── workflows/
│   ├── WorkflowCanvas.tsx  ← React Flow wrapper
│   ├── AgentNode.tsx       ← Custom React Flow node
│   └── WorkflowToolbar.tsx
├── conversations/
│   ├── MessageThread.tsx
│   └── MessageBubble.tsx
└── logs/
    ├── LogStream.tsx       ← WebSocket consumer
    └── LogEntry.tsx
```

## API calls
All API calls go through `lib/api.ts`. This file exports typed fetch wrappers:
```ts
export const api = {
  agents: {
    list: () => fetch('/api/v1/agents'),
    create: (data) => fetch('/api/v1/agents', { method: 'POST', body: JSON.stringify(data) }),
    ...
  }
}
```
Next.js is configured to proxy `/api/v1/*` to `http://localhost:3001` via `next.config.js` rewrites. Never hardcode localhost URLs in components.

## WebSocket connection
`lib/ws.ts` exports a singleton WebSocket client. Used in `LogStream.tsx` and `MessageThread.tsx` for live updates. Connect on mount, disconnect on unmount.

```ts
// Usage in a component
import { useLogStream } from '@/hooks/useLogStream'
const { logs } = useLogStream(runId)
```

## React Flow setup (workflow builder)
- `WorkflowCanvas.tsx` wraps `<ReactFlow>` with custom node types
- `AgentNode.tsx` is the custom node — shows agent name, role, status dot
- On save: serialize `nodes` and `edges` arrays → `PUT /api/v1/workflows/:id`
- On run: `POST /api/v1/workflows/:id/run` → subscribe to WebSocket for live updates

## State management
No external state library. Use:
- `useState` / `useReducer` for local component state
- `useSWR` for server data fetching and caching
- WebSocket hook for real-time data

## Styling
Tailwind CSS. Follow these conventions:
- Colors: `slate` for neutrals, `violet` for primary actions, `emerald` for success, `amber` for warnings
- Layout: sidebar is `w-48 fixed left-0`, main content has `ml-48`
- Cards: `bg-white border border-slate-200 rounded-xl p-4`
- Buttons primary: `bg-violet-600 text-white rounded-lg px-4 py-2 text-sm`

## Tool dropdown in AgentForm
Fetch available tools from `GET /api/v1/tools` (returns the keys of `TOOL_REGISTRY`). Render as a multi-select checkbox list. Store selected tools as a string array in form state.

## Key things that are client components (need "use client")
- `AgentForm.tsx` — has form state
- `WorkflowCanvas.tsx` — React Flow requires browser
- `LogStream.tsx` — WebSocket
- `MessageThread.tsx` — WebSocket + scroll behavior
- `Sidebar.tsx` — uses `usePathname` for active link styling
