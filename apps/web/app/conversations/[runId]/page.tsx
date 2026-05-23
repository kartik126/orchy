import { api } from '@/lib/api'
import MessageBubble from '@/components/conversations/MessageBubble'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  completed: 'success',
  running: 'warning',
  failed: 'destructive',
  pending: 'secondary',
}

export default async function ConversationPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params
  const [run, messages] = await Promise.all([
    api.runs.get(runId).catch(() => null),
    api.runs.messages(runId).catch(() => []),
  ])

  if (!run) {
    return <div className="p-8"><p className="text-muted-foreground">Run not found.</p></div>
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground h-7 px-2">
          <Link href="/conversations">← Back</Link>
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium">{run.workflow?.name}</span>
        <Badge variant={statusVariant[run.status] ?? 'secondary'}>{run.status}</Badge>
      </div>

      <div className="max-w-3xl space-y-4">
        {messages.length === 0 ? (
          <p className="text-muted-foreground text-sm">No messages yet.</p>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}
      </div>
    </div>
  )
}
