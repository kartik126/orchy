import Link from 'next/link'
import { api } from '@/lib/api'
import type { Workflow } from '@/lib/api'
import WorkflowCard from '@/components/workflows/WorkflowCard'
import { Button } from '@/components/ui/button'

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
          <h1 className="text-2xl font-bold">Workflows</h1>
          <p className="text-muted-foreground text-sm mt-1">Connect agents into multi-step pipelines</p>
        </div>
        <Button asChild size="sm">
          <Link href="/workflows/new">+ New Workflow</Link>
        </Button>
      </div>

      {workflows.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed rounded-xl">
          <p className="text-muted-foreground text-sm">No workflows yet.</p>
          <Link href="/workflows/new" className="mt-3 inline-block text-sm font-medium underline underline-offset-4">
            Create your first workflow
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map((wf) => (
            <WorkflowCard key={wf.id} workflow={wf} />
          ))}
        </div>
      )}
    </div>
  )
}
