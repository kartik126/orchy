import { WebSocketServer, WebSocket } from 'ws'
import http from 'http'
import { setBroadcast } from './logEmitter'

let wss: WebSocketServer

export function initWebSocket(server: http.Server) {
  wss = new WebSocketServer({ server })

  wss.on('connection', (ws) => {
    console.log('WS client connected')
    ws.on('close', () => console.log('WS client disconnected'))
  })

  setBroadcast((data) => {
    const msg = JSON.stringify(data)
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) client.send(msg)
    })
  })
}
