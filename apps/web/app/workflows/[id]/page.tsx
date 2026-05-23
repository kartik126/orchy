import { api } from '@/lib/api'
import WorkflowCanvas from '@/components/workflows/WorkflowCanvas'
import type { Node, Edge } from '@xyflow/react'

export const dynamic = 'force-dynamic'

export default async function WorkflowBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [workflow, agents] = await Promise.all([
    api.workflows.get(id).catch(() => null),
    api.agents.list().catch(() => []),
  ])

  if (!workflow) {
    return <div className="p-8"><p className="text-slate-500">Workflow not found.</p></div>
  }

  const initialNodes = (workflow.nodes ?? []) as Node[]
  const initialEdges = (workflow.edges ?? []) as Edge[]

  return (
    <div className="flex flex-col h-screen">
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center gap-3 shrink-0">
        <a href="/workflows" className="text-slate-400 hover:text-slate-600 text-sm">← Workflows</a>
        <span className="text-slate-300">/</span>
        <h1 className="text-sm font-semibold text-slate-800">{workflow.name}</h1>
      </div>
      <div className="flex-1 overflow-hidden">
        <WorkflowCanvas
          workflowId={id}
          initialNodes={initialNodes}
          initialEdges={initialEdges}
          initialChannel={workflow.channel ?? null}
          agents={agents}
        />
      </div>
    </div>
  )
}
