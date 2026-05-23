'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

const TEMPLATES = [
  {
    id: 'research-write',
    name: 'Research + Write',
    description: 'Research Agent finds information, Writer Agent turns it into an article',
    nodes: [
      { id: 'n1', type: 'agentNode', position: { x: 80, y: 150 }, data: { agentId: '', label: 'Research Agent', role: 'researcher' } },
      { id: 'n2', type: 'agentNode', position: { x: 380, y: 150 }, data: { agentId: '', label: 'Writer Agent', role: 'writer' } },
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
    ],
  },
  {
    id: 'research-only',
    name: 'Research Only',
    description: 'A single Research Agent that searches and summarises information',
    nodes: [
      { id: 'n1', type: 'agentNode', position: { x: 200, y: 150 }, data: { agentId: '', label: 'Research Agent', role: 'researcher' } },
    ],
    edges: [],
  },
  {
    id: 'blank',
    name: 'Blank Canvas',
    description: 'Start with an empty canvas and add agents manually',
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
      const workflow = await api.workflows.create({
        name: name.trim(),
        nodes: template.nodes,
        edges: template.edges,
      })
      router.push(`/workflows/${workflow.id}`)
    } catch {
      setError('Failed to create workflow')
      setCreating(false)
    }
  }

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">New Workflow</h1>
      <p className="text-slate-500 text-sm mb-8">Pick a template and give it a name</p>

      <form onSubmit={handleCreate} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Workflow name</label>
          <input
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Research Pipeline"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">Template</label>
          <div className="space-y-2">
            {TEMPLATES.map((t) => (
              <label
                key={t.id}
                className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                  templateId === t.id
                    ? 'border-violet-500 bg-violet-50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="template"
                  value={t.id}
                  checked={templateId === t.id}
                  onChange={() => setTemplateId(t.id)}
                  className="mt-0.5 accent-violet-600"
                />
                <div>
                  <p className="text-sm font-medium text-slate-800">{t.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={creating}
            className="bg-violet-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Workflow'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/workflows')}
            className="border border-slate-200 text-slate-600 rounded-lg px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
