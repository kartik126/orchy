import { describe, it, expect, vi } from 'vitest'

// Stub out the LLM and tools so no real API calls are made
vi.mock('@langchain/google-genai', () => ({
  ChatGoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    invoke: vi.fn(),
    bindTools: vi.fn().mockReturnThis(),
  })),
}))

vi.mock('@langchain/tavily', () => ({
  TavilySearch: vi.fn().mockImplementation(() => ({
    name: 'web_search',
    description: 'Search the web',
    invoke: vi.fn(),
  })),
}))

vi.mock('@langchain/community/tools/calculator', () => ({
  Calculator: vi.fn().mockImplementation(() => ({
    name: 'calculator',
    description: 'Do maths',
    invoke: vi.fn(),
  })),
}))

import { buildAgent } from '../runtime/agentFactory.js'
import type { Agent } from '@prisma/client'

const fakeAgent: Agent = {
  id: 'agent-1',
  name: 'Research Agent',
  role: 'researcher',
  systemPrompt: 'You are a research assistant.',
  model: 'gemini-2.5-flash',
  tools: ['web_search'],
  memoryType: 'buffer',
  memoryWindow: 10,
  guardrails: null,
  channelId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('buildAgent()', () => {
  it('returns a runnable agent with an invoke method', () => {
    const agent = buildAgent(fakeAgent)
    expect(agent).toBeDefined()
    expect(typeof agent.invoke).toBe('function')
  })

  it('accepts an agent with no tools', () => {
    const noToolAgent = { ...fakeAgent, tools: [] }
    const agent = buildAgent(noToolAgent)
    expect(agent).toBeDefined()
    expect(typeof agent.invoke).toBe('function')
  })

  it('accepts an agent with calculator tool', () => {
    const calcAgent = { ...fakeAgent, tools: ['calculator'] }
    const agent = buildAgent(calcAgent)
    expect(agent).toBeDefined()
  })
})
