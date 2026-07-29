import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const channel = searchParams.get('channel');
  const assigned = searchParams.get('assigned');
  const tag = searchParams.get('tag');
  const search = searchParams.get('search');
  const unread = searchParams.get('unread');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');

  const where: Record<string, unknown> = {};

  if (status && status !== 'all') where.status = status;
  if (channel && channel !== 'all') where.channel = channel;
  if (assigned === 'me') where.ownerId = 'mock_current_user';
  if (assigned === 'unassigned') where.ownerId = null;
  if (tag) {
    where.tags = { some: { tag: { name: tag } } };
  }
  if (search) {
    where.OR = [
      { customer: { name: { contains: search } } },
      { customer: { phone: { contains: search } } },
      { customer: { email: { contains: search } } },
      { subject: { contains: search } },
    ];
  }

  const [conversations, total] = await Promise.all([
    db.conversation.findMany({
      where,
      include: {
        customer: { include: { identities: true } },
        owner: { select: { id: true, name: true, avatar: true, status: true } },
        tags: { include: { tag: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.conversation.count({ where }),
  ]);

  // Mark unread count per conversation
  const withUnread = conversations.map((c) => {
    const msgs = c._count.messages;
    return {
      ...c,
      _count: undefined,
      messageCount: msgs,
      lastMessage: undefined, // will be resolved separately if needed
    };
  });

  return NextResponse.json({ data: withUnread, total, page, limit });
}
