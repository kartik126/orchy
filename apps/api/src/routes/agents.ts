import { Router } from 'express'
import { prisma } from '../db/client'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const agents = await prisma.agent.findMany({ orderBy: { createdAt: 'desc' } })
    res.json(agents)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch agents', code: 'AGENT_LIST_ERROR' })
  }
})

router.post('/', async (req, res) => {
  const { name, role, systemPrompt, model, tools, memoryType, memoryWindow, guardrails, channelId } = req.body
  if (!name || !role || !systemPrompt) {
    return res.status(400).json({ error: 'name, role, and systemPrompt are required', code: 'VALIDATION_ERROR' })
  }
  try {
    const agent = await prisma.agent.create({
      data: { name, role, systemPrompt, model, tools: tools ?? [], memoryType, memoryWindow, guardrails, channelId },
    })
    res.status(201).json(agent)
  } catch (err) {
    res.status(500).json({ error: 'Failed to create agent', code: 'AGENT_CREATE_ERROR' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const agent = await prisma.agent.findUnique({ where: { id: req.params.id } })
    if (!agent) return res.status(404).json({ error: 'Agent not found', code: 'NOT_FOUND' })
    res.json(agent)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch agent', code: 'AGENT_GET_ERROR' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const agent = await prisma.agent.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json(agent)
  } catch (err) {
    res.status(500).json({ error: 'Failed to update agent', code: 'AGENT_UPDATE_ERROR' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await prisma.agent.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete agent', code: 'AGENT_DELETE_ERROR' })
  }
})

export default router
