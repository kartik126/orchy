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
