'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { FileText, Search, Receipt, LayoutTemplate } from 'lucide-react'

const TEMPLATES = [
  {
    id: 'research-write',
    icon: Search,
    name: 'Research + Write',
    description: 'Research Agent finds information via web search, Writer Agent turns it into a polished article.',
    agents: ['Research Agent', 'Writer Agent'],
    nodes: [
      { id: 'n1', type: 'agentNode', position: { x: 80, y: 150 }, data: { agentId: '', label: 'Research Agent', role: 'researcher' } },
      { id: 'n2', type: 'agentNode', position: { x: 380, y: 150 }, data: { agentId: '', label: 'Writer Agent', role: 'writer' } },
    ],
    edges: [{ id: 'e1-2', source: 'n1', target: 'n2', animated: true }],
  },
  {
    id: 'invoice-processing',
    icon: Receipt,
    name: 'Invoice Processing',
    description: 'Router decides the intent, then agents handle extraction, categorisation, and logging to the database.',
    agents: ['Router Agent', 'Extractor Agent', 'Mark Paid Agent'],
    nodes: [
      { id: 'n1', type: 'agentNode', position: { x: 80,  y: 150 }, data: { agentId: '', label: 'Router Agent',    role: 'router'    } },
      { id: 'n2', type: 'agentNode', position: { x: 360, y: 60  }, data: { agentId: '', label: 'Extractor Agent', role: 'extractor' } },
      { id: 'n3', type: 'agentNode', position: { x: 360, y: 240 }, data: { agentId: '', label: 'Mark Paid Agent', role: 'mark_paid' } },
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
      { id: 'e1-3', source: 'n1', target: 'n3', animated: true },
    ],
  },
  {
    id: 'research-only',
    icon: FileText,
    name: 'Research Only',
    description: 'A single Research Agent that searches the web and summarises findings directly.',
    agents: ['Research Agent'],
    nodes: [
      { id: 'n1', type: 'agentNode', position: { x: 200, y: 150 }, data: { agentId: '', label: 'Research Agent', role: 'researcher' } },
    ],
    edges: [],
  },
  {
    id: 'blank',
    icon: LayoutTemplate,
    name: 'Blank Canvas',
    description: 'Start with an empty canvas and wire up your own agents from scratch.',
    agents: [],
    nodes: [],
    edges: [],
  },
]

export default function NewWorkflowPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [templateId, setTemplateId] = useState('research-write')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    setError('')
    const template = TEMPLATES.find((t) => t.id === templateId)!
    try {
      const workflow = await api.workflows.create({ name: name.trim(), nodes: template.nodes, edges: template.edges })
      router.push(`/workflows/${workflow.id}`)
    } catch {
      setError('Failed to create workflow')
      setCreating(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">New Workflow</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Pick a template and give it a name</p>
      </div>

      <form onSubmit={handleCreate} className="space-y-6">
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Workflow name</Label>
          <Input
            id="name"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Invoice Pipeline"
          />
        </div>

        <div className="space-y-2">
          <Label>Template</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {TEMPLATES.map((t) => {
              const Icon = t.icon
              const selected = templateId === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplateId(t.id)}
                  className={cn(
                    'text-left p-4 rounded-xl border transition-all',
                    selected
                      ? 'border-foreground bg-foreground/5 ring-1 ring-foreground'
                      : 'border-border hover:border-foreground/40 hover:bg-muted/40',
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn('p-1.5 rounded-md', selected ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground')}>
                      <Icon className="size-3.5" />
                    </div>
                    <span className="text-sm font-medium">{t.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t.description}</p>
                  {t.agents.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {t.agents.map((a) => (
                        <span key={a} className="text-[11px] bg-muted px-1.5 py-0.5 rounded font-medium text-muted-foreground">{a}</span>
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={creating}>
            {creating ? 'Creating...' : 'Create Workflow'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/workflows')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
