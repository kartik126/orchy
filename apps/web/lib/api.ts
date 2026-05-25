const BASE = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/v1`

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  if (res.status === 204) return undefined as T
  return res.json()
}

export type Agent = {
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
  createdAt: string
  updatedAt: string
}

export type Workflow = {
  id: string
  name: string
  nodes: unknown[]
  edges: unknown[]
  channel: string | null
  telegramToken: string | null
  schedule: string | null
  scheduleMsg: string | null
  createdAt: string
  _count?: { runs: number }
}

export const WORKFLOW_CHANNELS = [
  { value: 'telegram_text', label: 'Telegram Text' },
  { value: 'telegram_photo', label: 'Telegram Photo' },
] as const

export type WorkflowChannel = (typeof WORKFLOW_CHANNELS)[number]['value']

export type WorkflowRun = {
  id: string
  workflowId: string
  status: string
  triggeredBy: string
  startedAt: string
  finishedAt: string | null
  error: string | null
  workflow?: { name: string }
}

export type Message = {
  id: string
  runId: string
  fromAgent: string
  toAgent: string
  content: string
  role: string
  createdAt: string
}

export type Log = {
  id: string
  runId: string
  agentName: string
  step: string
  input: string | null
  output: string | null
  tokensUsed: number | null
  latencyMs: number | null
  createdAt: string
}

export const api = {
  agents: {
    list: () => req<Agent[]>('/agents'),
    get: (id: string) => req<Agent>(`/agents/${id}`),
    create: (data: Partial<Agent>) => req<Agent>('/agents', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Agent>) => req<Agent>(`/agents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => req<void>(`/agents/${id}`, { method: 'DELETE' }),
  },
  workflows: {
    list: () => req<Workflow[]>('/workflows'),
    get: (id: string) => req<Workflow>(`/workflows/${id}`),
    create: (data: Partial<Workflow>) => req<Workflow>('/workflows', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Workflow>) => req<Workflow>(`/workflows/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => req<void>(`/workflows/${id}`, { method: 'DELETE' }),
    run: (id: string) => req<WorkflowRun>(`/workflows/${id}/run`, { method: 'POST', body: JSON.stringify({}) }),
  },
  runs: {
    list: () => req<WorkflowRun[]>('/runs'),
    get: (id: string) => req<WorkflowRun>(`/runs/${id}`),
    messages: (id: string) => req<Message[]>(`/runs/${id}/messages`),
    logs: (id: string) => req<Log[]>(`/runs/${id}/logs`),
  },
  tools: {
    list: () => req<string[]>('/tools'),
  },
}

export const fetcher = (url: string) => fetch(url).then((r) => r.json())
