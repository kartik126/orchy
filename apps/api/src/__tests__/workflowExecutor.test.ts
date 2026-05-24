import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AIMessage, HumanMessage } from '@langchain/core/messages'

const mockAgentInvoke = vi.fn()

vi.mock('../db/client', () => ({
  prisma: {
    workflowRun: {
      update: vi.fn().mockResolvedValue({}),
    },
    workflow: {
      findUnique: vi.fn(),
    },
    agent: {
      findUnique: vi.fn(),
    },
    message: {
      create: vi.fn().mockResolvedValue({}),
    },
    log: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}))

vi.mock('../websocket/logEmitter', () => ({
  logEmitter: {
    emit: vi.fn(),
    error: vi.fn(),
    status: vi.fn(),
  },
}))

vi.mock('../runtime/agentFactory', () => ({
  buildAgent: vi.fn(() => ({ invoke: mockAgentInvoke })),
}))

import { runWorkflow } from '../runtime/workflowExecutor.js'
import { prisma } from '../db/client.js'
import { logEmitter } from '../websocket/logEmitter.js'

const WORKFLOW_ID = 'wf-1'
const AGENT_ID = 'agent-1'

const mockWorkflow = {
  id: WORKFLOW_ID,
  nodes: [{ id: 'n1', data: { agentId: AGENT_ID, label: 'Research Agent' } }],
  edges: [],
}

const mockAgent = {
  id: AGENT_ID,
  name: 'Research Agent',
  role: 'researcher',
  systemPrompt: 'You are a researcher.',
  model: 'gemini-2.5-flash',
  tools: ['web_search'],
  memoryType: 'buffer',
  memoryWindow: 10,
  guardrails: null,
  channelId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockAIMessage = new AIMessage({ content: 'Research result here.' })

describe('runWorkflow()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.workflow.findUnique).mockResolvedValue(mockWorkflow as never)
    vi.mocked(prisma.agent.findUnique).mockResolvedValue(mockAgent as never)
    mockAgentInvoke.mockResolvedValue({ messages: [new HumanMessage('hi'), mockAIMessage] })
  })

  it('runs without throwing and returns output', async () => {
    const result = await runWorkflow('run-1', WORKFLOW_ID, { text: 'AI trends 2025' })
    expect(result).toBeDefined()
    expect(result.output).toBe('Research result here.')
  })

  it('updates run status to running then completed', async () => {
    await runWorkflow('run-2', WORKFLOW_ID, { text: 'quantum computing' })
    const updateCalls = vi.mocked(prisma.workflowRun.update).mock.calls
    const statuses = updateCalls.map((c: unknown[]) => (c[0] as { data: { status: string } }).data.status)
    expect(statuses).toContain('running')
    expect(statuses).toContain('completed')
  })

  it('persists one message and two logs per agent', async () => {
    await runWorkflow('run-3', WORKFLOW_ID, { text: 'climate change' })
    expect(prisma.message.create).toHaveBeenCalledTimes(1)
    // start log + complete log = 2
    expect(prisma.log.create).toHaveBeenCalledTimes(2)
  })

  it('emits WebSocket status events', async () => {
    await runWorkflow('run-4', WORKFLOW_ID, { text: 'space exploration' })
    expect(logEmitter.status).toHaveBeenCalledWith('run-4', 'running')
    expect(logEmitter.status).toHaveBeenCalledWith('run-4', 'completed')
  })

  it('marks run as failed and emits error log when agent throws', async () => {
    mockAgentInvoke.mockRejectedValueOnce(new Error('API quota exceeded'))

    await expect(runWorkflow('run-5', WORKFLOW_ID, { text: 'topic' })).rejects.toThrow(
      'API quota exceeded',
    )

    expect(logEmitter.error).toHaveBeenCalledWith('run-5', 'Research Agent', expect.any(Error))
    expect(logEmitter.status).toHaveBeenCalledWith('run-5', 'failed')

    const updateCalls = vi.mocked(prisma.workflowRun.update).mock.calls
    const statuses = updateCalls.map((c: unknown[]) => (c[0] as { data: { status: string } }).data.status)
    expect(statuses).toContain('failed')
  })

  it('throws when workflow has no configured agent nodes', async () => {
    vi.mocked(prisma.workflow.findUnique).mockResolvedValueOnce({
      ...mockWorkflow,
      nodes: [],
    } as never)

    await expect(runWorkflow('run-6', WORKFLOW_ID, { text: 'test' })).rejects.toThrow(
      'no configured agent nodes',
    )
    expect(logEmitter.status).toHaveBeenCalledWith('run-6', 'failed')
  })

  it('runs multiple agents in topological order', async () => {
    const twoNodeWorkflow = {
      id: WORKFLOW_ID,
      nodes: [
        { id: 'n1', data: { agentId: 'agent-a', label: 'Agent A' } },
        { id: 'n2', data: { agentId: 'agent-b', label: 'Agent B' } },
      ],
      edges: [{ source: 'n1', target: 'n2' }],
    }
    vi.mocked(prisma.workflow.findUnique).mockResolvedValueOnce(twoNodeWorkflow as never)
    vi.mocked(prisma.agent.findUnique)
      .mockResolvedValueOnce({ ...mockAgent, id: 'agent-a', name: 'Agent A' } as never)
      .mockResolvedValueOnce({ ...mockAgent, id: 'agent-b', name: 'Agent B' } as never)

    mockAgentInvoke
      .mockResolvedValueOnce({ messages: [new AIMessage('output from A')] })
      .mockResolvedValueOnce({ messages: [new AIMessage('output from B')] })

    const result = await runWorkflow('run-7', WORKFLOW_ID, { text: 'multi-agent test' })
    expect(result.output).toBe('output from B')
    expect(mockAgentInvoke).toHaveBeenCalledTimes(2)
  })
})
