'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ReactFlow,
  addEdge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import AgentNode from './AgentNode'
import WorkflowToolbar from './WorkflowToolbar'
import { api, WORKFLOW_CHANNELS } from '@/lib/api'
import type { Agent } from '@/lib/api'

const nodeTypes = { agentNode: AgentNode }

type Props = {
  workflowId: string
  initialNodes: Node[]
  initialEdges: Edge[]
  initialChannel: string | null
  agents: Agent[]
}

export default function WorkflowCanvas({ workflowId, initialNodes, initialEdges, initialChannel, agents }: Props) {
  const router = useRouter()
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [channel, setChannel] = useState<string>(initialChannel ?? '')
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [toast, setToast] = useState('')

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) => addEdge({ ...connection, animated: true }, eds)),
    [setEdges],
  )

  function addAgentNode(agent: Agent) {
    const id = `node-${Date.now()}`
    const x = 100 + (nodes.length % 4) * 220
    const y = 100 + Math.floor(nodes.length / 4) * 150
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: 'agentNode',
        position: { x, y },
        data: { agentId: agent.id, label: agent.name, role: agent.role },
      },
    ])
  }

  async function handleSave() {
    setSaving(true)
    try {
      await api.workflows.update(workflowId, {
        nodes: nodes as unknown[],
        edges: edges as unknown[],
        channel: channel || null,
      })
      showToast('Saved')
    } catch {
      showToast('Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleRun(userMessage: string) {
    setRunning(true)
    try {
      await api.workflows.update(workflowId, {
        nodes: nodes as unknown[],
        edges: edges as unknown[],
        channel: channel || null,
      })
      const res = await fetch(`/api/v1/workflows/${workflowId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage, triggeredBy: 'manual' }),
      })
      const run = await res.json()
      router.push(`/conversations/${run.id}`)
    } catch {
      showToast('Run failed')
      setRunning(false)
    }
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  return (
    <div className="flex flex-col h-full">
      <WorkflowToolbar
        agents={agents}
        saving={saving}
        running={running}
        onAddAgent={addAgentNode}
        onSave={handleSave}
        onRun={handleRun}
      />

      <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 flex items-center gap-3 text-sm">
        <span className="text-slate-500 font-medium shrink-0">Telegram channel</span>
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className="border border-slate-200 rounded-md px-2 py-1 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
        >
          <option value="">— None —</option>
          {WORKFLOW_CHANNELS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        {channel && (
          <span className="text-xs text-slate-400">
            Telegram will route <b>{WORKFLOW_CHANNELS.find((c) => c.value === channel)?.label.toLowerCase()}</b> messages to this workflow
          </span>
        )}
      </div>

      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          fitViewOptions={{ padding: 0.3 }}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  )
}
