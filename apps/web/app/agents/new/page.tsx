import AgentForm from '@/components/agents/AgentForm'
import { Separator } from '@/components/ui/separator'

export default function NewAgentPage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">New Agent</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure a new AI agent with a custom role and tools</p>
      </div>
      <Separator className="mb-6" />
      <AgentForm />
    </div>
  )
}
