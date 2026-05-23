import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma before any imports that pull it in
vi.mock('../db/client', () => ({
  prisma: {
    agent: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import express from 'express'
import request from 'supertest'
import agentRouter from '../routes/agents.js'
import { prisma } from '../db/client.js'

const app = express()
app.use(express.json())
app.use('/api/v1/agents', agentRouter)

const mockAgent = {
  id: 'test-id-1',
  name: 'Test Agent',
  role: 'researcher',
  systemPrompt: 'You are a test agent.',
  model: 'gemini-2.5-flash',
  tools: ['web_search'],
  memoryType: 'buffer',
  memoryWindow: 10,
  guardrails: null,
  channelId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('Agent API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('POST /api/v1/agents — creates an agent and returns 201', async () => {
    vi.mocked(prisma.agent.create).mockResolvedValue(mockAgent)

    const res = await request(app)
      .post('/api/v1/agents')
      .send({
        name: 'Test Agent',
        role: 'researcher',
        systemPrompt: 'You are a test agent.',
        model: 'gemini-2.5-flash',
        tools: ['web_search'],
      })

    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Test Agent')
    expect(res.body.role).toBe('researcher')
    expect(prisma.agent.create).toHaveBeenCalledOnce()
  })

  it('POST /api/v1/agents — returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/v1/agents')
      .send({ name: 'Incomplete Agent' })

    expect(res.status).toBe(400)
    expect(res.body.code).toBe('VALIDATION_ERROR')
    expect(prisma.agent.create).not.toHaveBeenCalled()
  })

  it('GET /api/v1/agents — returns list of agents', async () => {
    vi.mocked(prisma.agent.findMany).mockResolvedValue([mockAgent])

    const res = await request(app).get('/api/v1/agents')

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].name).toBe('Test Agent')
  })
})
