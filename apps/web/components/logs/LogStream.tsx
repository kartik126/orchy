'use client'

import { useEffect, useRef } from 'react'
import { useLogStream } from '@/hooks/useLogStream'
import LogEntry from './LogEntry'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export default function LogStream({ runId }: { runId?: string }) {
  const { logs, status } = useLogStream(runId)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const totalTokens = logs.reduce((sum, l) => sum + (l.payload.tokensUsed ?? 0), 0)

  const statusVariant =
    status === 'running' ? 'warning' :
    status === 'completed' ? 'success' :
    status === 'failed' ? 'destructive' :
    'secondary'

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 bg-background">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Live Logs</span>
          <Badge variant={statusVariant}>{status}</Badge>
        </div>
        {totalTokens > 0 && (
          <span className="text-xs text-muted-foreground">{totalTokens.toLocaleString()} tokens</span>
        )}
      </div>
      <Separator />
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {logs.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">Waiting for agent activity...</p>
        ) : (
          logs.map((entry, i) => <LogEntry key={i} entry={entry} />)
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
