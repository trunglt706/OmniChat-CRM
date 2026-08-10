import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/session';

const DEFAULT_LIMIT = 15;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

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
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

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

  // Get authenticated user for agent messages
  const authUser = actualSenderType === 'agent' ? await getAuthUser(request) : null;
  const actualSenderName = senderName || authUser?.name || 'Unknown';

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
      senderId: actualSenderType === 'agent' ? (authUser?.id ?? null) : null,
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

  // Gửi tin nhắn ra nền tảng nếu người gửi là agent
  if (actualSenderType === 'agent') {
    const { channelRegistry } = await import('@/lib/channels');
    const conversation = await db.conversation.findUnique({
      where: { id },
      include: { customer: { include: { identities: true } } }
    });

    if (conversation) {
      const channel = conversation.channel;
      const identity = conversation.customer.identities.find(i => i.platform === channel);
      
      // Với Chatwork, to có thể rỗng và dựa vào roomId
      // Với FB comment, to có thể là platformMessageId của tin nhắn cuối
      let to = identity?.platformUserId || '';
      
      if (channel === 'facebook_comment') {
        const lastCustomerMsg = await db.message.findFirst({
          where: { conversationId: id, senderType: 'customer', platformMessageId: { not: null } },
          orderBy: { createdAt: 'desc' }
        });
        if (lastCustomerMsg?.platformMessageId) {
          to = lastCustomerMsg.platformMessageId;
        }
      }

      const configEntry = await db.channelConfig.findUnique({ where: { channel } });
      const config = configEntry ? JSON.parse(configEntry.config) : {};

      const adapter = channelRegistry.get(channel);
      if (adapter && adapter.sendMessage) {
        const result = await adapter.sendMessage(
          to, 
          { content: content || '', messageType, attachmentUrl }, 
          config
        );

        if (!('error' in result) && result.platformMessageId) {
          await db.message.update({
            where: { id: message.id },
            data: { platformMessageId: result.platformMessageId }
          });
        } else if ('error' in result) {
          console.error(`[Outbound Message Error] Channel ${channel}:`, result.error);
        }
      }
    }
  }

  // Trigger automation rules for customer messages
  let automationResult: { ruleName: string; actions: string[] } | null = null;
  if (triggerAutomation && actualSenderType === 'customer' && content) {
    const rules = await db.automationRule.findMany({ where: { enabled: true } });
    const matched = rules.find((r) => content.toLowerCase().includes(r.keyword.toLowerCase()));

    if (matched) {
      const actions: string[] = [];

      if (matched.replyMessage) {
        const botMessage = await db.message.create({
          data: {
            conversationId: id,
            senderType: 'bot',
            senderName: 'Bot',
            messageType: 'text',
            content: matched.replyMessage,
          },
        });
        actions.push('auto_reply');

        // Gửi tin nhắn của Bot ra nền tảng
        const { channelRegistry } = await import('@/lib/channels');
        const conversation = await db.conversation.findUnique({
          where: { id },
          include: { customer: { include: { identities: true } } }
        });
        if (conversation) {
          const channel = conversation.channel;
          const identity = conversation.customer.identities.find(i => i.platform === channel);
          let to = identity?.platformUserId || '';
          const configEntry = await db.channelConfig.findUnique({ where: { channel } });
          const config = configEntry ? JSON.parse(configEntry.config) : {};
          const adapter = channelRegistry.get(channel);
          if (adapter && adapter.sendMessage) {
            const result = await adapter.sendMessage(to, { content: matched.replyMessage }, config);
            if (!('error' in result) && result.platformMessageId) {
              await db.message.update({
                where: { id: botMessage.id },
                data: { platformMessageId: result.platformMessageId }
              });
            }
          }
        }
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