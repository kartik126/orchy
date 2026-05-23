'use client'

import { useState } from 'react'
import type { Agent } from '@/lib/api'

type Props = {
  agents: Agent[]
  saving: boolean
  running: boolean
  onAddAgent: (agent: Agent) => void
  onSave: () => void
  onRun: (userMessage: string) => void
}

export default function WorkflowToolbar({ agents, saving, running, onAddAgent, onSave, onRun }: Props) {
  const [showRun, setShowRun] = useState(false)
  const [topic, setTopic] = useState('')

  function handleRun() {
    if (!topic.trim()) return
    onRun(topic.trim())
    setShowRun(false)
    setTopic('')
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-slate-200">
      {/* Add agent dropdown */}
      <div className="relative group">
        <button className="border border-slate-200 text-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-slate-50 flex items-center gap-1">
          + Add Agent ▾
        </button>
        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[180px] hidden group-hover:block">
          {agents.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-400">No agents. Create one first.</p>
          ) : (
            agents.map((a) => (
              <button
                key={a.id}
                onClick={() => onAddAgent(a)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 border-b border-slate-100 last:border-0"
              >
                <span className="font-medium text-slate-800">{a.name}</span>
                <span className="text-slate-400 ml-1">({a.role})</span>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1" />

      <button
        onClick={onSave}
        disabled={saving}
        className="border border-slate-200 text-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save'}
      </button>

      <button
        onClick={() => setShowRun(true)}
        disabled={running}
        className="bg-violet-600 text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-violet-700 disabled:opacity-50"
      >
        {running ? 'Running...' : '▶ Run'}
      </button>

      {/* Run modal */}
      {showRun && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-base font-semibold text-slate-900 mb-1">Run Workflow</h3>
            <p className="text-sm text-slate-500 mb-4">Enter a topic for the Research + Write pipeline</p>
            <input
              autoFocus
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRun()}
              placeholder="e.g. Latest developments in quantum computing"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowRun(false)}
                className="border border-slate-200 text-slate-600 rounded-lg px-4 py-2 text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRun}
                disabled={!topic.trim()}
                className="bg-violet-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
              >
                Run
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
