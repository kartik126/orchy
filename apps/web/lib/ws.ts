const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'

let socket: WebSocket | null = null

export function getSocket(): WebSocket {
  if (!socket || socket.readyState === WebSocket.CLOSED) {
    socket = new WebSocket(WS_URL)
  }
  return socket
}

export function closeSocket() {
  socket?.close()
  socket = null
}
