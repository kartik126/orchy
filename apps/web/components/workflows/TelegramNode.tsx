'use client'

import { useState } from 'react'
import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react'
import Image from 'next/image'

export type TelegramNodeData = {
  token?: string
  label?: string
  workflowId?: string
  textWorkflowId?: string
}

export default function TelegramNode({ id, data, selected }: NodeProps) {
  const { token } = data as TelegramNodeData
  // workflowId may not be in node data for older nodes — fall back to the URL segment
  const workflowId = (data as TelegramNodeData).workflowId ?? (typeof window !== 'undefined' ? window.location.pathname.split('/').find((seg, i, arr) => arr[i - 1] === 'workflows' && seg !== 'new') : undefined)
  const { deleteElements, updateNodeData } = useReactFlow()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState((data as TelegramNodeData).token ?? '')
  const [textWorkflowDraft, setTextWorkflowDraft] = useState((data as TelegramNodeData).textWorkflowId ?? '')
  const [error, setError] = useState('')
  const [webhookBase, setWebhookBase] = useState('')
  const [registering, setRegistering] = useState(false)
  const [webhookStatus, setWebhookStatus] = useState<{ ok: boolean; msg: string } | null>(null)

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    deleteElements({ nodes: [{ id }] })
  }

  function handleSave() {
    if (!draft.trim()) {
      setError('Bot token is required.')
      return
    }
    // Basic sanity check — Telegram tokens look like 123456:ABC-DEF...
    if (!draft.includes(':')) {
      setError('That doesn\'t look like a valid token. It should contain a colon (:).')
      return
    }
    updateNodeData(id, { token: draft.trim(), textWorkflowId: textWorkflowDraft.trim() || undefined })
    setError('')
    setOpen(false)
  }

  function handleOpen() {
    setDraft((data as TelegramNodeData).token ?? '')
    setTextWorkflowDraft((data as TelegramNodeData).textWorkflowId ?? '')
    setError('')
    setWebhookStatus(null)
    setOpen(true)
  }

  async function handleRegisterWebhook() {
    if (!webhookBase.trim()) {
      setWebhookStatus({ ok: false, msg: 'Enter your public URL first.' })
      return
    }
    setRegistering(true)
    setWebhookStatus(null)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/v1/workflows/${workflowId}/register-telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookBaseUrl: webhookBase.trim() }),
      })
      const json = await res.json()
      if (json.ok) {
        setWebhookStatus({ ok: true, msg: `✓ Webhook registered: ${json.webhookUrl}` })
      } else {
        setWebhookStatus({ ok: false, msg: json.error ?? 'Registration failed.' })
      }
    } catch {
      setWebhookStatus({ ok: false, msg: 'Network error. Is the API running?' })
    } finally {
      setRegistering(false)
    }
  }

  const configured = !!token

  return (
    <>
      {/* Node */}
      <div
        onClick={handleOpen}
        className={`bg-white border-2 rounded-xl px-4 py-3 min-w-[160px] shadow-sm cursor-pointer transition-shadow ${
          selected ? 'border-[#229ED9] shadow-[#229ED9]/20 shadow-md' : 'border-slate-200 hover:border-[#229ED9]/50'
        }`}
      >
        <Handle type="target" position={Position.Left} className="!bg-[#229ED9] !border-[#1a7fa8]" />

        <div className="flex items-center gap-2 mb-1">
          <Image src="/telegram.png" alt="Telegram" width={16} height={16} className="shrink-0 rounded-sm" />
          <span className="text-xs font-semibold text-slate-900 truncate flex-1">Telegram</span>
          {selected && (
            <button
              onClick={handleDelete}
              className="text-slate-300 hover:text-red-500 transition-colors ml-1 leading-none nodrag"
              title="Delete node"
            >
              ✕
            </button>
          )}
        </div>

        <span className={`text-xs pl-6 ${configured ? 'text-emerald-500' : 'text-amber-500'}`}>
          {configured ? '● Connected' : '● Click to configure'}
        </span>

        <Handle type="source" position={Position.Right} className="!bg-[#229ED9] !border-[#1a7fa8]" />
      </div>

      {/* Config popup */}
      {open && (
        <div
          className="fixed inset-0 w-80 bg-black/40 flex items-center justify-center z-50 nodrag nowheel"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <Image src="/telegram.png" alt="Telegram" width={28} height={28} className="rounded-lg" />
              <div>
                <h3 className="text-base text-sm font-semibold text-slate-900">Connect Telegram Bot</h3>
                <p className="text-xs text-slate-500">Enter your bot token to enable Telegram messaging</p>
              </div>
            </div>

            <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-600 leading-relaxed">
              <p className="font-medium text-slate-700 mb-1">How to get a bot token</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Open Telegram and search for <span className="font-mono bg-white px-1 rounded border border-slate-200">@BotFather</span></li>
                <li>Send <span className="font-mono bg-white px-1 rounded border border-slate-200">/newbot</span> and follow the prompts</li>
                <li>Copy the token BotFather gives you — it looks like <span className="font-mono bg-white px-1 rounded border border-slate-200">123456789:AAF...</span></li>
              </ol>
            </div>

            <div className="space-y-1 mb-4">
              <label className="text-xs font-medium text-slate-700">Bot Token</label>
              <input
                autoFocus
                type="text"
                value={draft}
                onChange={(e) => { setDraft(e.target.value); setError('') }}
                placeholder="123456789:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className={`w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 ${
                  error ? 'border-red-400 focus:ring-red-300' : 'border-slate-200 focus:ring-[#229ED9]/40'
                }`}
              />
              {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>

            {/* Text routing — route text messages to a different workflow */}
            <div className="space-y-1 mb-4 pt-3 border-t border-slate-100">
              <label className="text-xs font-medium text-slate-700">Text queries → Workflow ID <span className="text-slate-400 font-normal">(optional)</span></label>
              <input
                type="text"
                value={textWorkflowDraft}
                onChange={(e) => setTextWorkflowDraft(e.target.value)}
                placeholder="Leave empty to handle all messages here"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#229ED9]/40"
              />
              <p className="text-xs text-slate-400">When set, text messages are routed to this workflow. Images always stay here.</p>
            </div>

            {/* Webhook registration — only shown after token is saved */}
            {token && (
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-700">Register Webhook</p>
                <p className="text-xs text-slate-500">Paste your ngrok / public URL so Telegram knows where to send messages.</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={webhookBase}
                    onChange={(e) => { setWebhookBase(e.target.value); setWebhookStatus(null) }}
                    placeholder="https://abc123.ngrok-free.app"
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#229ED9]/40"
                  />
                  <button
                    onClick={handleRegisterWebhook}
                    disabled={registering}
                    className="bg-[#229ED9] text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-[#1a7fa8] disabled:opacity-50 shrink-0"
                  >
                    {registering ? 'Registering...' : 'Register'}
                  </button>
                </div>
                {webhookStatus && (
                  <p className={`text-xs break-all ${webhookStatus.ok ? 'text-emerald-600' : 'text-red-500'}`}>
                    {webhookStatus.msg}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setOpen(false)}
                className="border border-slate-200 text-slate-600 rounded-lg px-4 py-2 text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="bg-[#229ED9] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#1a7fa8]"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
