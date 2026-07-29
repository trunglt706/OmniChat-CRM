import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { status } = await request.json();

  const conversation = await db.conversation.update({
    where: { id },
    data: { status, updatedAt: new Date() },
    include: {
      customer: true,
      owner: { select: { id: true, name: true, avatar: true, status: true } },
    },
  });

  // Create system message for status change
  if (status === 'resolved' || status === 'closed') {
    const statusLabels: Record<string, string> = {
      resolved: 'Resolved',
      closed: 'Closed',
      pending: 'Pending',
      open: 'Open',
    };
    await db.message.create({
      data: {
        conversationId: id,
        senderType: 'system',
        senderName: 'Hệ thống',
        messageType: 'event',
        content: `Hội thoại đã được chuyển sang trạng thái ${statusLabels[status] || status}`,
      },
    });
  }

  return NextResponse.json(conversation);
}