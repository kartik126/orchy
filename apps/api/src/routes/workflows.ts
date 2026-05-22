import { Router } from 'express'
import { prisma } from '../db/client'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const workflows = await prisma.workflow.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { runs: true } } },
    })
    res.json(workflows)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch workflows', code: 'WORKFLOW_LIST_ERROR' })
  }
})

router.post('/', async (req, res) => {
  const { name, nodes, edges } = req.body
  if (!name) return res.status(400).json({ error: 'name is required', code: 'VALIDATION_ERROR' })
  try {
    const workflow = await prisma.workflow.create({
      data: { name, nodes: nodes ?? [], edges: edges ?? [] },
    })
    res.status(201).json(workflow)
  } catch (err) {
    res.status(500).json({ error: 'Failed to create workflow', code: 'WORKFLOW_CREATE_ERROR' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const workflow = await prisma.workflow.findUnique({ where: { id: req.params.id } })
    if (!workflow) return res.status(404).json({ error: 'Workflow not found', code: 'NOT_FOUND' })
    res.json(workflow)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch workflow', code: 'WORKFLOW_GET_ERROR' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const workflow = await prisma.workflow.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json(workflow)
  } catch (err) {
    res.status(500).json({ error: 'Failed to update workflow', code: 'WORKFLOW_UPDATE_ERROR' })
  }
})

router.post('/:id/run', async (req, res) => {
  try {
    const workflow = await prisma.workflow.findUnique({ where: { id: req.params.id } })
    if (!workflow) return res.status(404).json({ error: 'Workflow not found', code: 'NOT_FOUND' })

    const run = await prisma.workflowRun.create({
      data: {
        workflowId: req.params.id,
        status: 'pending',
        triggeredBy: req.body.triggeredBy ?? 'manual',
      },
    })
    res.status(201).json(run)
  } catch (err) {
    res.status(500).json({ error: 'Failed to start workflow run', code: 'RUN_CREATE_ERROR' })
  }
})

export default router
