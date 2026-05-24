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
import { InfoPopover } from '@/components/ui/info-popover'
import WorkflowToolbar from './WorkflowToolbar'
import SchedulePicker from './SchedulePicker'
import { api, WORKFLOW_CHANNELS } from '@/lib/api'
import type { Agent } from '@/lib/api'

const nodeTypes = { agentNode: AgentNode }

type Props = {
  workflowId: string
  initialNodes: Node[]
  initialEdges: Edge[]
  initialChannel: string | null
  initialTelegramToken: string | null
  initialSchedule: string | null
  initialScheduleMsg: string | null
  agents: Agent[]
}

export default function WorkflowCanvas({ workflowId, initialNodes, initialEdges, initialChannel, initialTelegramToken, initialSchedule, initialScheduleMsg, agents }: Props) {
  const router = useRouter()
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [channel, setChannel] = useState<string>(initialChannel ?? '')
  const [telegramToken, setTelegramToken] = useState<string>(initialTelegramToken ?? '')
  const [webhookStatus, setWebhookStatus] = useState<{ ok: boolean; msg: string } | null>(null)
  const [schedule, setSchedule] = useState<string>(initialSchedule ?? '')
  const [scheduleMsg, setScheduleMsg] = useState<string>(initialScheduleMsg ?? '')
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [toast, setToast] = useState('')

  const isTelegramChannel = channel === 'telegram_text' || channel === 'telegram_photo'

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
        telegramToken: isTelegramChannel ? (telegramToken.trim() || null) : null,
        schedule: schedule || null,
        scheduleMsg: scheduleMsg || null,
      })
      if (isTelegramChannel && telegramToken.trim()) {
        setWebhookStatus({ ok: true, msg: '✓ Saved — webhook registered automatically' })
      } else {
        setWebhookStatus(null)
      }
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
        telegramToken: isTelegramChannel ? (telegramToken.trim() || null) : null,
      })
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/v1/workflows/${workflowId}/run`, {
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
        channel={channel}
        onAddAgent={addAgentNode}
        onSave={handleSave}
        onRun={handleRun}
      />

      <div className="relative z-10 overflow-visible px-4 py-2 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium shrink-0">Channel</span>
          <select
            value={channel}
            onChange={(e) => { setChannel(e.target.value); setWebhookStatus(null) }}
            className="border border-slate-200 rounded-md px-2 py-1 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="">— None —</option>
            {WORKFLOW_CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {isTelegramChannel && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium shrink-0">Telegram Bot Token</span>
              <InfoPopover side="bottom" panelClassName="w-72">
                <p className="mb-1.5 font-medium text-slate-700">Get a Telegram bot token</p>
                <ol className="list-decimal space-y-1 pl-4 text-slate-600">
                  <li>
                    Open Telegram and message{' '}
                    <a
                      href="https://t.me/BotFather"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-slate-800 underline-offset-2 hover:underline"
                    >
                      @BotFather
                    </a>
                  </li>
                  <li>
                    Send <span className="font-mono text-slate-800">/newbot</span> and follow the prompts
                  </li>
                  <li>Choose a display name and username for your bot</li>
                  <li>Copy the token BotFather sends and paste it here</li>
                </ol>
              </InfoPopover>
              <input
                type="text"
                value={telegramToken}
                onChange={(e) => setTelegramToken(e.target.value)}
                placeholder="123456789:AAF..."
                className="border border-slate-200 rounded-md px-2 py-1 text-xs font-mono w-56 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <span className="text-xs text-slate-400">Webhook auto-registers on save</span>
            {webhookStatus && (
              <span className={`text-xs ${webhookStatus.ok ? 'text-emerald-600' : 'text-red-500'}`}>
                {webhookStatus.msg}
              </span>
            )}
          </>
        )}

        <SchedulePicker
          schedule={schedule || null}
          scheduleMsg={scheduleMsg}
          onSave={(s, msg) => { setSchedule(s ?? ''); setScheduleMsg(msg) }}
        />

        <div className="flex items-center gap-1">
          <a
            className="flex items-center gap-2 border border-slate-200 bg-white p-1 rounded-md text-xs text-slate-500 hover:text-slate-700"
            href="https://docs.google.com/spreadsheets/d/14d_-eG2z9F0L4MculJzueWZY1FVkV_voezsixM93ahg/edit?usp=sharing"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src="/sheets.png" alt="" className="h-4 w-4" />
            Google sheet
          </a>
          <InfoPopover side="bottom">
            For demo purposes, you cannot use your own Google Sheet.
          </InfoPopover>
        </div>
      </div>

      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          deleteKeyCode={['Delete', 'Backspace']}
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
