import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_LIMIT = 15;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '0') || DEFAULT_LIMIT, 1), 50);
  const before = searchParams.get('before'); // ISO date cursor

  const where: Record<string, unknown> = { conversationId: id };
  if (before) {
    where.createdAt = { lt: new Date(before) };
  }

  const [messages, total] = await Promise.all([
    db.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    db.message.count({ where: { conversationId: id } }),
  ]);

  // Return in ascending order (oldest first) for display
  const sorted = messages.reverse();

  const hasMore = before
    ? messages.length === limit
    : total > limit;

  return NextResponse.json({ data: sorted, total, hasMore });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const {
    content,
    messageType = 'text',
    senderType = 'agent',
    senderName,
    attachmentUrl,
    attachmentName,
    attachmentType,
    triggerAutomation = true,
  } = body;

  const actualSenderType = senderType || 'agent';
  const actualSenderName = senderName || 'Pham Minh Tuan';

  if (actualSenderType === 'agent') {
    await db.message.updateMany({
      where: { conversationId: id, senderType: 'customer', isRead: false },
      data: { isRead: true },
    });
  }

  const message = await db.message.create({
    data: {
      conversationId: id,
      senderType: actualSenderType,
      senderId: actualSenderType === 'agent' ? 'mock_current_user' : null,
      senderName: actualSenderName,
      messageType,
      content: content || null,
      attachmentUrl: attachmentUrl || null,
      attachmentName: attachmentName || null,
      attachmentType: attachmentType || null,
    },
  });

  await db.conversation.update({
    where: { id },
    data: { updatedAt: new Date() },
  });

  // Trigger automation rules for customer messages
  let automationResult: { ruleName: string; actions: string[] } | null = null;
  if (triggerAutomation && actualSenderType === 'customer' && content) {
    const rules = await db.automationRule.findMany({ where: { enabled: true } });
    const matched = rules.find((r) => content.toLowerCase().includes(r.keyword.toLowerCase()));

    if (matched) {
      const actions: string[] = [];

      if (matched.replyMessage) {
        await db.message.create({
          data: {
            conversationId: id,
            senderType: 'bot',
            senderName: 'Bot',
            messageType: 'text',
            content: matched.replyMessage,
          },
        });
        actions.push('auto_reply');
      }

      if (matched.assignToId) {
        await db.conversation.update({
          where: { id },
          data: { ownerId: matched.assignToId, updatedAt: new Date() },
        });
        actions.push('auto_assign');
      }

      if (matched.tagId) {
        await db.conversationTag.create({
          data: { conversationId: id, tagId: matched.tagId },
        }).catch(() => {});
        actions.push('auto_tag');
      }

      automationResult = { ruleName: matched.name, actions };
    }
  }

  return NextResponse.json({ message, automationResult }, { status: 201 });
}