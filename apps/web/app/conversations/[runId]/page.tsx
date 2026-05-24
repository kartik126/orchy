'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import type { Message, WorkflowRun } from '@/lib/api'
import MessageBubble from '@/components/conversations/MessageBubble'
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

export default function ConversationPage() {
  const { runId } = useParams<{ runId: string }>()
  const [run, setRun] = useState<WorkflowRun | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [notFound, setNotFound] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function fetchAll() {
    try {
      const [r, msgs] = await Promise.all([
        api.runs.get(runId),
        api.runs.messages(runId),
      ])
      setRun(r)
      setMessages(msgs)
      if (TERMINAL.has(r.status) && intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    } catch {
      setNotFound(true)
    }
  }

  useEffect(() => {
    fetchAll()
    intervalRef.current = setInterval(fetchAll, 2000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [runId])

  // Scroll to bottom when messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

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
        {messages.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {isLive ? 'Waiting for messages…' : 'No messages.'}
          </p>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
