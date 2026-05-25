'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import type { Message, WorkflowRun } from '@/lib/api'
import MessageBubble from '@/components/conversations/MessageBubble'
import MarkdownContent from '@/components/conversations/MarkdownContent'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  completed: 'success',
  running: 'warning',
  failed: 'destructive',
  pending: 'secondary',
}

const TERMINAL = new Set(['completed', 'failed'])

type StreamingMsg = { agentName: string; content: string }

export default function ConversationPage() {
  const { runId } = useParams<{ runId: string }>()
  const [run, setRun] = useState<WorkflowRun | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [streaming, setStreaming] = useState<StreamingMsg | null>(null)
  const [notFound, setNotFound] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    // Initial load
    Promise.all([api.runs.get(runId), api.runs.messages(runId)])
      .then(([r, msgs]) => { setRun(r); setMessages(msgs) })
      .catch(() => setNotFound(true))

    // WebSocket for live updates — derive wss/ws from the API URL so HTTPS pages always use wss
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
    const wsUrl = apiUrl.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://')
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const { type, payload } = JSON.parse(event.data)
        if (payload.runId !== runId) return

        if (type === 'stream_start') {
          setStreaming({ agentName: payload.agentName, content: '' })
        } else if (type === 'token') {
          setStreaming((prev) =>
            prev ? { ...prev, content: prev.content + payload.token } : { agentName: payload.agentName, content: payload.token }
          )
        } else if (type === 'message') {
          setStreaming(null)
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.id)) return prev
            return [...prev, payload as Message]
          })
        } else if (type === 'status') {
          setRun((prev) => prev ? { ...prev, status: payload.status } : prev)
          if (TERMINAL.has(payload.status)) ws.close()
        }
      } catch {
        // ignore malformed frames
      }
    }

    return () => ws.close()
  }, [runId])

  // Scroll to bottom as messages arrive and while streaming
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, streaming?.content])

  if (notFound) {
    return <div className="p-8"><p className="text-muted-foreground">Run not found.</p></div>
  }

  if (!run) {
    return <div className="p-8"><p className="text-muted-foreground text-sm animate-pulse">Loading…</p></div>
  }

  const isLive = !TERMINAL.has(run.status)

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground h-7 px-2">
          <Link href="/conversations">← Back</Link>
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium">{run.workflow?.name}</span>
        <Badge variant={statusVariant[run.status] ?? 'secondary'}>{run.status}</Badge>
        {isLive && (
          <span className="text-xs text-amber-500 animate-pulse">● live</span>
        )}
      </div>

      <div className="max-w-3xl space-y-4">
        {messages.length === 0 && !streaming ? (
          <p className="text-muted-foreground text-sm">
            {isLive ? 'Waiting for messages…' : 'No messages.'}
          </p>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}
        {streaming && (
          <div className="flex flex-col gap-1 items-start">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{streaming.agentName}</span>
              <span className="animate-pulse text-amber-500">● generating</span>
            </div>
            <div className="max-w-2xl px-4 py-3 rounded-xl rounded-tl-sm text-sm leading-relaxed bg-card border text-foreground">
              <MarkdownContent content={streaming.content} />
              <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-current animate-pulse rounded-sm align-text-bottom" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
