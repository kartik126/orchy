interface LogEvent {
  runId: string
  agentName: string
  step: string
  message: string
  latencyMs?: number
  tokensUsed?: number
  error?: string
}

// broadcast is set by the WebSocket server once it initialises
let broadcastFn: ((data: object) => void) | null = null

export function setBroadcast(fn: (data: object) => void) {
  broadcastFn = fn
}

export const logEmitter = {
  emit(event: LogEvent) {
    const payload = { ...event, timestamp: new Date().toISOString() }
    broadcastFn?.({ type: 'log', payload })
  },
  error(runId: string, agentName: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    const payload = { runId, agentName, step: 'error', message, error: message, timestamp: new Date().toISOString() }
    broadcastFn?.({ type: 'log', payload })
  },
  status(runId: string, status: string) {
    broadcastFn?.({ type: 'status', payload: { runId, status, timestamp: new Date().toISOString() } })
  },
  message(runId: string, msg: { id: string; fromAgent: string; toAgent: string; content: string; role: string; createdAt: Date }) {
    broadcastFn?.({ type: 'message', payload: { runId, ...msg, createdAt: msg.createdAt.toISOString() } })
  },
  streamStart(runId: string, agentName: string) {
    broadcastFn?.({ type: 'stream_start', payload: { runId, agentName } })
  },
  token(runId: string, agentName: string, token: string) {
    broadcastFn?.({ type: 'token', payload: { runId, agentName, token } })
  },
}
