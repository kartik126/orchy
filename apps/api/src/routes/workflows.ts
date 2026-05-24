import { Router } from 'express'
import { prisma } from '../db/client'
import { runWorkflow } from '../runtime/workflowExecutor'
import { refreshBotsForToken } from '../telegram/bot'

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

    // Re-register the bot whenever a telegram workflow is saved
    if (workflow.telegramToken && ['telegram_text', 'telegram_photo'].includes(workflow.channel ?? '')) {
      refreshBotsForToken(req.app, workflow.telegramToken)
    }

    res.json(workflow)
  } catch (err) {
    res.status(500).json({ error: 'Failed to update workflow', code: 'WORKFLOW_UPDATE_ERROR' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const runs = await prisma.workflowRun.findMany({
      where: { workflowId: req.params.id },
      select: { id: true },
    })
    const runIds = runs.map((r: { id: string }) => r.id)
    await prisma.log.deleteMany({ where: { runId: { in: runIds } } })
    await prisma.message.deleteMany({ where: { runId: { in: runIds } } })
    await prisma.workflowRun.deleteMany({ where: { workflowId: req.params.id } })
    await prisma.workflow.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete workflow', code: 'WORKFLOW_DELETE_ERROR' })
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

    // Fire workflow execution async — respond immediately with run ID
    const userMessage = req.body.userMessage ?? 'Tell me about the latest developments in AI'
    runWorkflow(run.id, req.params.id, { text: userMessage }).catch((err) => {
      console.error(`Workflow run ${run.id} failed:`, err)
      prisma.workflowRun.update({
        where: { id: run.id },
        data: { status: 'failed', finishedAt: new Date() },
      }).catch(() => {})
    })

    res.status(201).json(run)
  } catch (err) {
    res.status(500).json({ error: 'Failed to start workflow run', code: 'RUN_CREATE_ERROR' })
  }
})

// Register Telegram webhook for a workflow's TelegramNode token
router.post('/:id/register-telegram', async (req, res) => {
  try {
    const workflow = await prisma.workflow.findUnique({ where: { id: req.params.id } })
    if (!workflow) return res.status(404).json({ error: 'Workflow not found', code: 'NOT_FOUND' })

    const token = workflow.telegramToken
    if (!token) return res.status(400).json({ error: 'No Telegram token configured for this workflow', code: 'NO_TOKEN' })

    const { webhookBaseUrl } = req.body
    if (!webhookBaseUrl) return res.status(400).json({ error: 'webhookBaseUrl is required', code: 'VALIDATION_ERROR' })

    const webhookUrl = `${webhookBaseUrl.replace(/\/$/, '')}/webhook/telegram/${workflow.id}`
    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl }),
    })
    const result = await response.json() as { ok: boolean; description?: string }

    if (!result.ok) {
      return res.status(400).json({ error: result.description ?? 'Telegram rejected the webhook', code: 'TELEGRAM_ERROR' })
    }

    res.json({ ok: true, webhookUrl })
  } catch (err) {
    res.status(500).json({ error: 'Failed to register webhook', code: 'WEBHOOK_REG_ERROR' })
  }
})

export default router
