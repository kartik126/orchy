'use client'

import { useEffect, useState } from 'react'

export type LogEntry = {
  type: 'log' | 'status' | 'message'
  payload: {
    runId: string
    agentName: string
    step: string
    message: string
    latencyMs?: number
    tokensUsed?: number
    error?: string
    timestamp: string
    status?: string
  }
}

type DbLog = {
  id: string
  runId: string
  agentName: string
  step: string
  output: string | null
  tokensUsed: number | null
  latencyMs: number | null
  createdAt: string
}

function dbLogToEntry(log: DbLog): LogEntry {
  const message = log.output ?? ''
  return {
    type: 'log',
    payload: {
      runId: log.runId,
      agentName: log.agentName,
      step: log.step,
      message,
      latencyMs: log.latencyMs ?? undefined,
      tokensUsed: log.tokensUsed ?? undefined,
      error: log.step === 'error' ? message : undefined,
      timestamp: log.createdAt,
    },
  }
}

export function useLogStream(runId?: string) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [status, setStatus] = useState<string>('idle')

  // Hydrate from DB on mount, collapsing start entries that have a later complete/error
  useEffect(() => {
    const url = runId
      ? `/api/v1/runs/${runId}/logs`
      : '/api/v1/runs/logs/recent'

    fetch(url)
      .then((r) => r.json())
      .then((data: DbLog[]) => {
        if (!Array.isArray(data)) return
        // For each agent+run, keep the last (most recent) entry so start is replaced by complete
        const seen = new Map<string, LogEntry>()
        for (const log of data) {
          const key = `${log.runId}:${log.agentName}`
          const entry = dbLogToEntry(log)
          const existing = seen.get(key)
          if (!existing || existing.payload.step === 'start') {
            seen.set(key, entry)
          }
        }
        setLogs((prev) => {
          const dbEntries = Array.from(seen.values())
          if (prev.length === 0) return dbEntries
          // Merge: DB entries as base, append any WS-only entries not already covered
          const dbKeys = new Set(dbEntries.map((e) => `${e.payload.runId}:${e.payload.agentName}`))
          const wsOnly = prev.filter((e) => !dbKeys.has(`${e.payload.runId}:${e.payload.agentName}`))
          return [...dbEntries, ...wsOnly]
        })
      })
      .catch(() => {})
  }, [runId])

  // Append real-time WS events on top, collapsing start → complete/error in place
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'
    const ws = new WebSocket(wsUrl)

    ws.onmessage = (event) => {
      const data: LogEntry = JSON.parse(event.data)
      if (runId && data.payload.runId !== runId) return

      if (data.type === 'status') {
        setStatus(data.payload.status ?? 'unknown')
        return
      }

      setLogs((prev) => {
        // If this is a complete/error event, find and replace the matching start entry
        if (data.payload.step === 'complete' || data.payload.step === 'error') {
          const idx = [...prev].reverse().findIndex(
            (e) =>
              e.payload.agentName === data.payload.agentName &&
              e.payload.runId === data.payload.runId &&
              e.payload.step === 'start',
          )
          if (idx !== -1) {
            const realIdx = prev.length - 1 - idx
            const updated = [...prev]
            updated[realIdx] = data
            return updated
          }
        }
        return [...prev, data]
      })
    }

    return () => ws.close()
  }, [runId])

  return { logs, status }
}
