import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import http from 'http'
import agentRouter from './routes/agents'
import workflowRouter from './routes/workflows'
import runRouter from './routes/runs'
import toolRouter from './routes/tools'
import { initWebSocket } from './websocket/server'
import { initTelegramWebhook } from './telegram/bot'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() })
})

app.use('/api/v1/agents', agentRouter)
app.use('/api/v1/workflows', workflowRouter)
app.use('/api/v1/runs', runRouter)
app.use('/api/v1/tools', toolRouter)

const server = http.createServer(app)
initWebSocket(server)
initTelegramWebhook(app)

const PORT = process.env.API_PORT || 3001

server.listen(PORT, () => {
  console.log(`API running on port ${PORT}`)
  console.log(`WebSocket ready on ws://localhost:${PORT}`)
})

export { app, server }
