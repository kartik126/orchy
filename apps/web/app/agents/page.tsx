import Link from 'next/link'
import { api } from '@/lib/api'
import type { Agent } from '@/lib/api'
import AgentCard from '@/components/agents/AgentCard'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function AgentsPage() {
  let agents: Agent[] = []
  try {
    agents = await api.agents.list()
  } catch {
    // API not reachable yet
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Agents</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure AI agents with custom prompts and tools</p>
        </div>
        <Button asChild size="sm">
          <Link href="/agents/new">+ New Agent</Link>
        </Button>
      </div>

      {agents.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed rounded-xl">
          <p className="text-muted-foreground text-sm">No agents yet.</p>
          <Link href="/agents/new" className="mt-3 inline-block text-sm font-medium underline underline-offset-4">
            Create your first agent
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  )
}
