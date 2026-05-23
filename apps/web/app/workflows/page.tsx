import Link from 'next/link'
import { api } from '@/lib/api'
import type { Workflow } from '@/lib/api'
import WorkflowRow from '@/components/workflows/WorkflowRow'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableHead, TableRow } from '@/components/ui/table'
import { Plus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function WorkflowsPage() {
  let workflows: Workflow[] = []
  try {
    workflows = await api.workflows.list()
  } catch {
    // API not reachable
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Workflows</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Connect agents into multi-step pipelines</p>
        </div>
        <Button asChild size="sm" className="gap-1.5">
          <Link href="/workflows/new"><Plus className="size-3.5" />New Workflow</Link>
        </Button>
      </div>

      {workflows.length === 0 ? (
        <div className="text-center py-24 border border-dashed rounded-xl bg-background">
          <p className="text-muted-foreground text-sm">No workflows yet.</p>
          <Link href="/workflows/new" className="mt-2 inline-block text-sm font-medium underline underline-offset-4">
            Create your first workflow
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border bg-background overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-56">Name</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead className="w-24">Runs</TableHead>
                <TableHead className="w-36">Created</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workflows.map((wf) => (
                <WorkflowRow key={wf.id} workflow={wf} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
