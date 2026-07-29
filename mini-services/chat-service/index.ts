import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:3000'],
    methods: ['GET', 'POST'],
  },
})

const PORT = 3003

io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`)

  socket.on('join_conversation', (conversationId: string) => {
    socket.join(`conversation:${conversationId}`)
  })

  socket.on('leave_conversation', (conversationId: string) => {
    socket.leave(`conversation:${conversationId}`)
  })

  socket.on('typing', (data: { conversationId: string; senderType: string }) => {
    socket.to(`conversation:${data.conversationId}`).emit('user_typing', data)
  })

  socket.on('disconnect', () => {
    console.log(`[WS] Client disconnected: ${socket.id}`)
  })
})

// Simulate incoming messages every 30-60s for demo
setInterval(() => {
  const randomMessages = [
    { conversationId: 'simulate', text: 'Xin chào, tôi cần hỗ trợ' },
  ]
  const msg = randomMessages[Math.floor(Math.random() * randomMessages.length)]
  io.emit('ping', { time: new Date().toISOString() })
}, 30000)

httpServer.listen(PORT, () => {
  console.log(`[WS] Chat service running on port ${PORT}`)
})
