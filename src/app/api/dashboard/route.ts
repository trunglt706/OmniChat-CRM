import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    totalConversations,
    openConversations,
    pendingConversations,
    resolvedToday,
    totalMessages,
    todayMessages,
    unresolvedBreach,
    channelStats,
    agentStats,
    leads,
    customers,
  ] = await Promise.all([
    db.conversation.count(),
    db.conversation.count({ where: { status: 'open' } }),
    db.conversation.count({ where: { status: 'pending' } }),
    db.conversation.count({ where: { status: 'resolved', updatedAt: { gte: todayStart } } }),
    db.message.count(),
    db.message.count({ where: { createdAt: { gte: todayStart } } }),
    db.conversation.count({
      where: {
        status: 'open',
        slaFirstResponse: { lt: now },
      },
    }),
    db.conversation.findMany({
      include: {
        owner: { select: { id: true, name: true } },
        messages: { select: { id: true, senderType: true, createdAt: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    }),
    // Channel distribution
    db.conversation.groupBy({
      by: ['channel'],
      _count: { id: true },
    }),
    // Agent performance
    db.user.findMany({
      select: {
        id: true, name: true, role: true, status: true,
        assignedConvos: {
          where: { status: { in: ['open', 'pending'] } },
          select: { id: true },
        },
      },
    }),
    db.lead.findMany({
      select: { id: true, status: true, value: true, source: true, probability: true },
    }),
    db.customer.count(),
  ]);

  // Calculate SLA metrics
  const slaBreached = unresolvedBreach;

  // Agent performance with message counts
  const agentPerformance = await Promise.all(
    agentStats.map(async (agent) => {
      const agentMessages = await db.message.count({
        where: { senderType: 'agent', senderId: agent.id },
      });
      const agentResolved = await db.conversation.count({
        where: { ownerId: agent.id, status: 'resolved' },
      });
      return {
        id: agent.id,
        name: agent.name,
        role: agent.role,
        status: agent.status,
        activeConversations: agent.assignedConvos.length,
        totalMessages: agentMessages,
        resolvedConversations: agentResolved,
      };
    })
  );

  // Lead funnel
  const leadFunnel = leads.reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Lead value by source
  const leadBySource = leads.reduce((acc, lead) => {
    const src = lead.source || 'other';
    if (!acc[src]) acc[src] = { count: 0, value: 0 };
    acc[src].count++;
    acc[src].value += lead.value || 0;
    return acc;
  }, {} as Record<string, { count: number; value: number }>);

  // Conversation trend (last 7 days)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
  const recentConvos = await db.conversation.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    select: { createdAt: true, channel: true, status: true },
  });

  const dailyTrend: Record<string, { total: number; resolved: number; channels: Record<string, number> }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = d.toISOString().split('T')[0];
    dailyTrend[key] = { total: 0, resolved: 0, channels: {} };
  }
  for (const c of recentConvos) {
    const key = c.createdAt.toISOString().split('T')[0];
    if (dailyTrend[key]) {
      dailyTrend[key].total++;
      if (c.status === 'resolved') dailyTrend[key].resolved++;
      dailyTrend[key].channels[c.channel] = (dailyTrend[key].channels[c.channel] || 0) + 1;
    }
  }

  return NextResponse.json({
    summary: {
      totalConversations,
      openConversations,
      pendingConversations,
      resolvedToday,
      totalMessages,
      todayMessages,
      totalCustomers: customers,
      slaBreached,
    },
    channelDistribution: channelStats.map((cs) => ({
      channel: cs.channel,
      count: cs._count.id,
    })),
    agentPerformance,
    leadFunnel,
    leadBySource,
    dailyTrend: Object.entries(dailyTrend).map(([date, data]) => ({
      date,
      ...data,
    })),
  });
}