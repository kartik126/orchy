'use client'

import { Handle, Position, type NodeProps, useReactFlow } from '@xyflow/react'

export type AgentNodeData = {
  label: string
  role: string
  agentId: string
}

export default function AgentNode({ id, data, selected }: NodeProps) {
  const { label, role } = data as AgentNodeData
  const { deleteElements } = useReactFlow()

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    deleteElements({ nodes: [{ id }] })
  }

  return (
    <div className={`bg-white border-2 rounded-xl px-4 py-3 min-w-[160px] shadow-sm transition-shadow ${
      selected ? 'border-violet-500 shadow-violet-100 shadow-md' : 'border-slate-200'
    }`}>
      <Handle type="target" position={Position.Left} className="!bg-violet-400 !border-violet-600" />

      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
        <span className="text-xs font-semibold text-slate-900 truncate flex-1">{label as string}</span>
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
      <span className="text-xs text-slate-400 pl-4">{role as string}</span>

      <Handle type="source" position={Position.Right} className="!bg-violet-400 !border-violet-600" />
    </div>
  )
}
