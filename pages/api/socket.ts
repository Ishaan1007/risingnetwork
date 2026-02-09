import type { NextApiRequest, NextApiResponse } from 'next'
import { Server, type Socket } from 'socket.io'

type NextApiResponseWithSocket = NextApiResponse & {
  socket: {
    server: {
      io?: Server
    }
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server as any, {
      path: '/api/socket',
      addTrailingSlash: false,
    })

    io.on('connection', (socket: Socket) => {
      socket.on('user:join', ({ userId }: { userId?: string }) => {
        if (userId) socket.join(`user:${userId}`)
      })

      socket.on('invite:send', ({ toUserId, payload }: { toUserId?: string; payload?: any }) => {
        if (!toUserId) return
        io.to(`user:${toUserId}`).emit('invite:received', payload || {})
      })
    })

    res.socket.server.io = io
  }

  res.end()
}
