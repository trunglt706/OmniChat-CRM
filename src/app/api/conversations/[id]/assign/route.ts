import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const { ownerId } = await request.json();

  const conversation = await db.conversation.update({
    where: { id },
    data: { ownerId: ownerId ? Number(ownerId) : null, updatedAt: new Date() },
    include: {
      owner: { select: { id: true, name: true, avatar: true, status: true } },
    },
  });

  return NextResponse.json(conversation);
}
