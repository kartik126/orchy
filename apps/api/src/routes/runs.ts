import { Router } from 'express'
import { prisma } from '../db/client'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const runs = await prisma.workflowRun.findMany({
      orderBy: { startedAt: 'desc' },
      include: { workflow: { select: { name: true } } },
    })
    res.json(runs)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch runs', code: 'RUNS_LIST_ERROR' })
  }
})

router.get('/logs/recent', async (req, res) => {
  try {
    const logs = await prisma.log.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    res.json(logs.reverse())
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs', code: 'LOGS_ERROR' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const run = await prisma.workflowRun.findUnique({
      where: { id: req.params.id },
      include: { workflow: { select: { name: true } } },
    })
    if (!run) return res.status(404).json({ error: 'Run not found', code: 'NOT_FOUND' })
    res.json(run)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch run', code: 'RUN_GET_ERROR' })
  }
})

router.get('/:id/messages', async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      where: { runId: req.params.id },
      orderBy: { createdAt: 'asc' },
    })
    res.json(messages)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages', code: 'MESSAGES_ERROR' })
  }
})

router.get('/:id/logs', async (req, res) => {
  try {
    const logs = await prisma.log.findMany({
      where: { runId: req.params.id },
      orderBy: { createdAt: 'asc' },
    })
    res.json(logs)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs', code: 'LOGS_ERROR' })
  }
})

export default router
