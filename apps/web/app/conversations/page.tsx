import Link from 'next/link'
import { api } from '@/lib/api'
import type { WorkflowRun } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export const dynamic = 'force-dynamic'

const statusVariant: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  completed: 'success',
  running: 'warning',
  failed: 'destructive',
  pending: 'secondary',
}

export default async function ConversationsPage() {
  let runs: WorkflowRun[] = []
  try {
    runs = await api.runs.list()
  } catch {
    // API not reachable
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Conversations</h1>
        <p className="text-muted-foreground text-sm mt-1">All workflow runs and message threads</p>
      </div>

      {runs.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed rounded-xl">
          <p className="text-muted-foreground text-sm">No runs yet. Trigger a workflow or send a Telegram message.</p>
        </div>
      ) : (
        <Card>
          {runs.map((run, i) => (
            <div key={run.id}>
              {i > 0 && <Separator />}
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-4">
                  <Badge variant={statusVariant[run.status] ?? 'secondary'}>{run.status}</Badge>
                  <div>
                    <p className="text-sm font-medium">{run.workflow?.name ?? 'Unknown workflow'}</p>
                    <p className="text-xs text-muted-foreground">
                      via {run.triggeredBy} · {new Date(run.startedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" asChild className="text-xs">
                  <Link href={`/conversations/${run.id}`}>View thread →</Link>
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
