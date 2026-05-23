import TelegramBot from 'node-telegram-bot-api'
import { Express } from 'express'
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

async function findWorkflowByChannel(channel: string) {
  return prisma.workflow.findFirst({ where: { channel } })
}

export function initTelegramWebhook(app: Express) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN not set — Telegram bot disabled')
    return null
  }

  const bot = new TelegramBot(token)

  app.post('/webhook/telegram', (req, res) => {
    bot.processUpdate(req.body)
    res.sendStatus(200)
  })

  async function runChannel(
    chatId: number,
    channel: string,
    input: Parameters<typeof runWorkflow>[2],
    pendingMsg: string,
    noWorkflowMsg: string,
  ) {
    await bot.sendMessage(chatId, pendingMsg)
    try {
      const workflow = await findWorkflowByChannel(channel)
      if (!workflow) {
        await bot.sendMessage(chatId, noWorkflowMsg)
        return
      }
      const nodes = (workflow.nodes as Array<{ data?: { agentId?: string } }>) ?? []
      if (!nodes.some((n) => n.data?.agentId)) {
        await bot.sendMessage(
          chatId,
          `⚠️ The "${workflow.name}" workflow has no agents configured. Add agents in the Orchy UI.`,
        )
        return
      }
      const run = await prisma.workflowRun.create({ data: { workflowId: workflow.id, triggeredBy: 'telegram' } })
      const result = await runWorkflow(run.id, workflow.id, input)
      const html = markdownToTelegramHtml(result.output)
      try {
        await bot.sendMessage(chatId, html, { parse_mode: 'HTML' })
      } catch {
        await bot.sendMessage(chatId, result.output.replace(/[#*_`]/g, ''))
      }
    } catch (err) {
      console.error(`Telegram channel "${channel}" error:`, err)
      logEmitter.error('telegram', 'System', err)
      await bot.sendMessage(chatId, '❌ Something went wrong. Please try again.')
    }
  }

  // Text message → workflow with channel = 'telegram_text'
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id
    const userMessage = msg.text
    if (!userMessage) return
    await runChannel(
      chatId,
      'telegram_text',
      { text: userMessage },
      '🔍 Running workflow...',
      '⚠️ No workflow is assigned to Telegram text messages. Open a workflow in the Orchy UI and set its channel to "Telegram Text".',
    )
  })

  // Photo message → workflow with channel = 'telegram_photo'
  bot.on('photo', async (msg) => {
    const chatId = msg.chat.id
    if (!msg.photo?.length) return
    try {
      const fileId = msg.photo[msg.photo.length - 1].file_id
      const fileInfo = await bot.getFile(fileId)
      const fileUrl = `https://api.telegram.org/file/bot${token}/${fileInfo.file_path}`
      const { base64, mimeType } = await downloadAsBase64(fileUrl)
      await runChannel(
        chatId,
        'telegram_photo',
        { imageBase64: base64, mimeType },
        '🧾 Processing image...',
        '⚠️ No workflow is assigned to Telegram photos. Open a workflow in the Orchy UI and set its channel to "Telegram Photo".',
      )
    } catch (err) {
      console.error('Photo download error:', err)
      await bot.sendMessage(chatId, '❌ Could not download the image. Please try again.')
    }
  })

  return bot
}
