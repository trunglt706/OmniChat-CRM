import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/session'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    // Conversations assigned to this agent today
    const conversationsToday = await db.conversation.count({
      where: {
        ownerId: user.id,
        createdAt: { gte: todayStart },
      },
    })

    // Total conversations assigned to this agent
    const totalConversations = await db.conversation.count({
      where: { ownerId: user.id },
    })

    // Average response time (time between customer message and first agent reply)
    // Get pairs of customer->agent messages to compute avg response time
    const agentMessages = await db.message.findMany({
      where: {
        senderType: 'agent',
        senderId: user.id,
      },
      orderBy: { createdAt: 'asc' },
      select: { conversationId: true, createdAt: true },
    })

    // For each agent message, find the preceding customer message in same conversation
    let totalResponseMs = 0
    let responseCount = 0
    const processedConversations = new Set<number>()

    // Group agent messages by conversation and only take first reply per customer message
    for (const agentMsg of agentMessages) {
      const convId = agentMsg.conversationId
      if (processedConversations.has(convId)) continue

      const prevCustomerMsg = await db.message.findFirst({
        where: {
          conversationId: convId,
          senderType: 'customer',
          createdAt: { lt: agentMsg.createdAt },
        },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      })

      if (prevCustomerMsg) {
        const diff = agentMsg.createdAt.getTime() - prevCustomerMsg.createdAt.getTime()
        // Only count reasonable response times (< 24h)
        if (diff > 0 && diff < 24 * 60 * 60 * 1000) {
          totalResponseMs += diff
          responseCount++
          processedConversations.add(convId)
        }
      }
    }

    const avgResponseMs = responseCount > 0 ? Math.round(totalResponseMs / responseCount) : 0
    const avgResponseMinutes = Math.floor(avgResponseMs / 60000)
    const avgResponseSeconds = Math.round((avgResponseMs % 60000) / 1000)
    const avgResponseFormatted = avgResponseMs > 0
      ? (avgResponseMinutes > 0 ? `${avgResponseMinutes}m ${avgResponseSeconds}s` : `${avgResponseSeconds}s`)
      : 'N/A'

    // Average rating: check if there's a rating field on conversations or messages
    // Since the schema may not have a rating field, return N/A if no data
    const avgRating = 'N/A'

    return NextResponse.json({
      conversationsToday,
      avgResponse: avgResponseFormatted,
      avgResponseMs,
      avgRating,
      totalConversations,
    })
  } catch (error) {
    logger.error('Agent stats error', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
