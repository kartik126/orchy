import { api } from '@/lib/api'
import AgentForm from '@/components/agents/AgentForm'
import { Separator } from '@/components/ui/separator'

export const dynamic = 'force-dynamic'

export default async function EditAgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let agent = null
  try {
    agent = await api.agents.get(id)
  } catch {
    // not found
  }

  if (!agent) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Agent not found.</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Edit Agent</h1>
        <p className="text-muted-foreground text-sm mt-1">{agent.name}</p>
      </div>
      <Separator className="mb-6" />
      <AgentForm agent={agent} />
    </div>
  )
}
