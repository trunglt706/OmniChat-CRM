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
  const { content, messageType = 'text' } = body;

  // Mark all previous messages as read
  await db.message.updateMany({
    where: { conversationId: id, senderType: 'customer', isRead: false },
    data: { isRead: true },
  });

  const message = await db.message.create({
    data: {
      conversationId: id,
      senderType: 'agent',
      senderId: 'mock_current_user',
      senderName: 'Phạm Minh Tuấn',
      messageType,
      content,
    },
  });

  await db.conversation.update({
    where: { id },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json(message, { status: 201 });
}