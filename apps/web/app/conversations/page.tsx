import Link from 'next/link'
import { api } from '@/lib/api'
import type { WorkflowRun } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'

export const dynamic = 'force-dynamic'

const statusDot: Record<string, string> = {
  completed: 'bg-emerald-500',
  running: 'bg-amber-400',
  failed: 'bg-red-500',
  pending: 'bg-slate-400',
}

const statusColor: Record<string, string> = {
  completed: 'text-emerald-600',
  running: 'text-amber-600',
  failed: 'text-red-600',
  pending: 'text-slate-500',
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
        <h1 className="text-xl font-semibold">Conversations</h1>
        <p className="text-muted-foreground text-sm mt-0.5">All workflow runs and message threads</p>
      </div>

      {runs.length === 0 ? (
        <div className="text-center py-24 border border-dashed rounded-xl bg-background">
          <p className="text-muted-foreground text-sm">No runs yet. Trigger a workflow or send a Telegram message.</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-background overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-28">Status</TableHead>
                <TableHead>Workflow</TableHead>
                <TableHead className="w-32">Triggered by</TableHead>
                <TableHead className="w-44">Started</TableHead>
                <TableHead className="w-24 text-right">Thread</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow key={run.id}>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${statusColor[run.status] ?? 'text-muted-foreground'}`}>
                      <span className={`size-1.5 rounded-full inline-block ${statusDot[run.status] ?? 'bg-slate-400'}`} />
                      {run.status}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium text-sm">{run.workflow?.name ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs font-normal capitalize">{run.triggeredBy}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(run.startedAt).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs">
                      <Link href={`/conversations/${run.id}`}>View →</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
