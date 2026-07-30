import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const messages = await db.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(messages);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { content, messageType = 'text', senderType = 'agent', senderName, triggerAutomation = true } = body;

  const actualSenderType = senderType || 'agent';
  const actualSenderName = senderName || 'Phạm Minh Tuấn';

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
      content,
    },
  });

  await db.conversation.update({
    where: { id },
    data: { updatedAt: new Date() },
  });

  // Trigger automation rules for customer messages
  let automationResult = null;
  if (triggerAutomation && actualSenderType === 'customer' && content) {
    const rules = await db.automationRule.findMany({ where: { enabled: true } });
    const matched = rules.find((r) => content.toLowerCase().includes(r.keyword.toLowerCase()));

    if (matched) {
      const actions: string[] = [];

      // Auto-reply
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

      // Auto-assign
      if (matched.assignToId) {
        await db.conversation.update({
          where: { id },
          data: { ownerId: matched.assignToId, updatedAt: new Date() },
        });
        actions.push('auto_assign');
      }

      // Auto-tag
      if (matched.tagId) {
        await db.conversationTag.create({
          data: { conversationId: id, tagId: matched.tagId },
        }).catch(() => {}); // ignore duplicate
        actions.push('auto_tag');
      }

      automationResult = { ruleName: matched.name, actions };
    }
  }

  return NextResponse.json({ message, automationResult }, { status: 201 });
}