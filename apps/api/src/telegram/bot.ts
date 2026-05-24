import TelegramBot from 'node-telegram-bot-api'
import { Application } from 'express'
import https from 'https'
import { prisma } from '../db/client'
import { runWorkflow } from '../runtime/workflowExecutor'
import { logEmitter } from '../websocket/logEmitter'

function markdownToTelegramHtml(text: string): string {
  return (
    text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/^#{1,6}\s+(.+)$/gm, '<b>$1</b>')
      .replace(/\*\*(.+?)\*\*/gs, '<b>$1</b>')
      .replace(/__(.+?)__/gs, '<b>$1</b>')
      .replace(/\*([^*\n]+?)\*/g, '<i>$1</i>')
      .replace(/_([^_\n]+?)_/g, '<i>$1</i>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^[ \t]*[-*+][ \t]+/gm, '• ')
      .replace(/^[ \t]*\d+\.[ \t]+/gm, '• ')
      .replace(/^---+$/gm, '─────────────')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .trim()
  )
}

function downloadAsBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        const raw = res.headers['content-type'] ?? ''
        const contentType = raw.startsWith('image/') ? raw : 'image/jpeg'
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => chunks.push(chunk))
        res.on('end', () =>
          resolve({ base64: Buffer.concat(chunks).toString('base64'), mimeType: contentType }),
        )
        res.on('error', reject)
      })
      .on('error', reject)
  })
}

type TokenGroup = {
  token: string
  textWorkflowId?: string
  photoWorkflowId?: string
}

function registerBotForToken(app: Application, group: TokenGroup) {
  const { token, textWorkflowId, photoWorkflowId } = group
  const bot = new TelegramBot(token)

  // Register a webhook route for each workflow that uses this token
  const workflowIds = [...new Set([textWorkflowId, photoWorkflowId].filter(Boolean))] as string[]
  for (const wfId of workflowIds) {
    app.post(`/webhook/telegram/${wfId}`, (req, res) => {
      bot.processUpdate(req.body)
      res.sendStatus(200)
    })
  }

  async function runForWorkflow(chatId: number, workflowId: string, input: Omit<Parameters<typeof runWorkflow>[2], 'threadId'>) {
    await bot.sendMessage(chatId, '🔍 Running workflow...')
    try {
      const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } })
      if (!workflow) {
        await bot.sendMessage(chatId, '⚠️ Workflow not found.')
        return
      }
      type FlowNode = { type?: string; data?: { agentId?: string } }
      const nodes = (workflow.nodes as FlowNode[]) ?? []
      if (!nodes.some((n) => n.data?.agentId)) {
        await bot.sendMessage(chatId, `⚠️ The "${workflow.name}" workflow has no agents configured.`)
        return
      }
      const run = await prisma.workflowRun.create({ data: { workflowId, triggeredBy: 'telegram' } })
      const result = await runWorkflow(run.id, workflowId, { ...input, threadId: String(chatId) })
      const html = markdownToTelegramHtml(result.output)
      try {
        await bot.sendMessage(chatId, html, { parse_mode: 'HTML' })
      } catch {
        await bot.sendMessage(chatId, result.output.replace(/[#*_`]/g, ''))
      }
    } catch (err) {
      console.error(`Telegram workflow "${workflowId}" error:`, err)
      logEmitter.error('telegram', 'System', err)
      await bot.sendMessage(chatId, '❌ Something went wrong. Please try again.')
    }
  }

  bot.on('message', async (msg) => {
    if (!msg.text) return
    const target = textWorkflowId ?? photoWorkflowId
    if (!target) return
    await runForWorkflow(msg.chat.id, target, { text: msg.text })
  })

  bot.on('photo', async (msg) => {
    const target = photoWorkflowId ?? textWorkflowId
    if (!target || !msg.photo?.length) return
    try {
      const fileId = msg.photo[msg.photo.length - 1].file_id
      const fileInfo = await bot.getFile(fileId)
      const fileUrl = `https://api.telegram.org/file/bot${token}/${fileInfo.file_path}`
      const { base64, mimeType } = await downloadAsBase64(fileUrl)
      await runForWorkflow(msg.chat.id, target, { imageBase64: base64, mimeType })
    } catch (err) {
      console.error('Photo download error:', err)
      await bot.sendMessage(msg.chat.id, '❌ Could not download the image. Please try again.')
    }
  })

  bot.on('document', async (msg) => {
    const target = photoWorkflowId ?? textWorkflowId
    if (!target || !msg.document) return
    const mime = msg.document.mime_type ?? ''
    if (!mime.startsWith('image/') && mime !== 'application/pdf') {
      await bot.sendMessage(msg.chat.id, '⚠️ Please send invoice images (JPG/PNG) or PDF files.')
      return
    }
    try {
      const fileInfo = await bot.getFile(msg.document.file_id)
      const fileUrl = `https://api.telegram.org/file/bot${token}/${fileInfo.file_path}`
      const { base64, mimeType } = await downloadAsBase64(fileUrl)
      await runForWorkflow(msg.chat.id, target, { imageBase64: base64, mimeType })
    } catch (err) {
      console.error('Document download error:', err)
      await bot.sendMessage(msg.chat.id, '❌ Could not download the file. Please try again.')
    }
  })

  console.log(`Telegram bot registered — text→${textWorkflowId ?? 'n/a'} photo→${photoWorkflowId ?? 'n/a'}`)
  return bot
}

export async function initTelegramBots(app: Application) {
  const workflows = await prisma.workflow.findMany({
    where: { channel: { in: ['telegram_text', 'telegram_photo'] }, telegramToken: { not: null } },
  })

  // Group workflows by token
  const byToken = new Map<string, TokenGroup>()
  for (const wf of workflows) {
    const token = wf.telegramToken!
    const entry: TokenGroup = byToken.get(token) ?? { token }
    if (wf.channel === 'telegram_text') entry.textWorkflowId = wf.id
    if (wf.channel === 'telegram_photo') entry.photoWorkflowId = wf.id
    byToken.set(token, entry)
  }

  if (byToken.size === 0) {
    console.log('No workflows with Telegram channel configured — bots not started')
    return
  }

  for (const group of byToken.values()) {
    registerBotForToken(app, group)
  }
}

// Called after a workflow is saved — re-initialises bots for the affected token
export async function refreshBotsForToken(app: Application, token: string) {
  const workflows = await prisma.workflow.findMany({
    where: { telegramToken: token, channel: { in: ['telegram_text', 'telegram_photo'] } },
  })
  const group: TokenGroup = { token }
  for (const wf of workflows) {
    if (wf.channel === 'telegram_text') group.textWorkflowId = wf.id
    if (wf.channel === 'telegram_photo') group.photoWorkflowId = wf.id
  }
  registerBotForToken(app, group)
}
