'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import type { Agent } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

const MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-2.0-flash-lite']
const MEMORY_TYPES = [
  { value: 'buffer', label: 'Buffer — keep last N messages' },
  { value: 'summary', label: 'Summary — compress older context' },
  { value: 'none', label: 'None — no memory' },
]

type Guardrails = { maxTokens?: number; bannedTopics?: string; tone?: string }
type Props = { agent?: Agent }

export default function AgentForm({ agent }: Props) {
  const router = useRouter()
  const [tools, setTools] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const existingGuardrails = (agent?.guardrails ?? {}) as Guardrails

  const [form, setForm] = useState({
    name: agent?.name ?? '',
    role: agent?.role ?? '',
    systemPrompt: agent?.systemPrompt ?? '',
    model: agent?.model ?? 'gemini-2.5-flash',
    tools: agent?.tools ?? [] as string[],
    memoryType: agent?.memoryType ?? 'buffer',
    memoryWindow: agent?.memoryWindow ?? 10,
    guardrails: {
      maxTokens: existingGuardrails.maxTokens ?? '',
      bannedTopics: existingGuardrails.bannedTopics ?? '',
      tone: existingGuardrails.tone ?? '',
    },
  })

  useEffect(() => {
    api.tools.list().then(setTools).catch(() => {})
  }, [])

  function set(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function toggleTool(tool: string) {
    set('tools', form.tools.includes(tool)
      ? form.tools.filter((t) => t !== tool)
      : [...form.tools, tool])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = {
        ...form,
        guardrails: {
          maxTokens: form.guardrails.maxTokens ? Number(form.guardrails.maxTokens) : undefined,
          bannedTopics: form.guardrails.bannedTopics || undefined,
          tone: form.guardrails.tone || undefined,
        },
      }
      if (agent) {
        await api.agents.update(agent.id, payload)
      } else {
        await api.agents.create(payload)
      }
      router.push('/agents')
      router.refresh()
    } catch {
      setError('Failed to save agent. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          required
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Research Agent"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Input
          id="role"
          required
          value={form.role}
          onChange={(e) => set('role', e.target.value)}
          placeholder="researcher"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="systemPrompt">System Prompt</Label>
        <Textarea
          id="systemPrompt"
          required
          rows={5}
          value={form.systemPrompt}
          onChange={(e) => set('systemPrompt', e.target.value)}
          placeholder="You are a research assistant. Search the web and summarise findings clearly..."
        />
      </div>

      <div className="space-y-2">
        <Label>Model</Label>
        <Select value={form.model} onValueChange={(v) => set('model', v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODELS.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label>Tools</Label>
        {tools.length === 0 ? (
          <p className="text-muted-foreground text-xs">Loading tools...</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tools.map((tool) => {
              const selected = form.tools.includes(tool)
              return (
                <button
                  key={tool}
                  type="button"
                  onClick={() => toggleTool(tool)}
                  className="cursor-pointer"
                >
                  <Badge
                    variant={selected ? 'default' : 'outline'}
                    className="cursor-pointer select-none"
                  >
                    {tool}
                  </Badge>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Memory Type</Label>
        <Select value={form.memoryType} onValueChange={(v) => set('memoryType', v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MEMORY_TYPES.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {form.memoryType !== 'none' && (
        <div className="space-y-2">
          <Label htmlFor="memoryWindow">Memory Window</Label>
          <p className="text-muted-foreground text-xs">Number of messages to keep in context</p>
          <Input
            id="memoryWindow"
            type="number"
            min={1}
            max={100}
            value={form.memoryWindow}
            onChange={(e) => set('memoryWindow', Number(e.target.value))}
            className="w-28"
          />
        </div>
      )}

      <Separator />

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Guardrails</h3>
          <p className="text-muted-foreground text-xs mt-0.5">Constraints enforced on every agent response</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxTokens">Max output tokens</Label>
          <Input
            id="maxTokens"
            type="number"
            min={1}
            placeholder="e.g. 1024 (no limit if blank)"
            value={form.guardrails.maxTokens}
            onChange={(e) => set('guardrails', { ...form.guardrails, maxTokens: e.target.value })}
            className="w-48"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bannedTopics">Banned topics</Label>
          <p className="text-muted-foreground text-xs">Comma-separated topics the agent must refuse to discuss</p>
          <Input
            id="bannedTopics"
            placeholder="e.g. politics, violence, competitor names"
            value={form.guardrails.bannedTopics}
            onChange={(e) => set('guardrails', { ...form.guardrails, bannedTopics: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tone">Tone / style rule</Label>
          <Input
            id="tone"
            placeholder="e.g. always reply in formal English"
            value={form.guardrails.tone}
            onChange={(e) => set('guardrails', { ...form.guardrails, tone: e.target.value })}
          />
        </div>
      </div>

      <Separator />

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : agent ? 'Update Agent' : 'Create Agent'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/agents')}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
