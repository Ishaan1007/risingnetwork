import { io, type Socket } from 'socket.io-client'

let socket: Socket | null = null
let pending: Promise<Socket> | null = null

export async function getSocket(): Promise<Socket> {
  if (socket) return socket
  if (!pending) {
    pending = (async () => {
      await fetch('/api/socket')
      const created = io({ path: '/api/socket' })
      socket = created
      return created
    })()
  }
  return pending
}
