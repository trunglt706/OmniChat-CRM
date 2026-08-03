import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { tagId } = await request.json();

  const ct = await db.conversationTag.create({
    data: { conversationId: id, tagId },
    include: { tag: true },
  });

  return NextResponse.json(ct, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const tagId = searchParams.get('tagId');

  if (!tagId) {
    return NextResponse.json({ error: 'tagId is required' }, { status: 400 });
  }

  await db.conversationTag.deleteMany({
    where: { conversationId: id, tagId },
  });

  return NextResponse.json({ success: true });
}
