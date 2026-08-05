import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const { tagId: tagIdStr } = await request.json();
  const tagId = Number(tagIdStr);

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
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const tagIdStr = searchParams.get('tagId');

  if (!tagIdStr) {
    return NextResponse.json({ error: 'tagId is required' }, { status: 400 });
  }
  const tagId = Number(tagIdStr);

  await db.conversationTag.deleteMany({
    where: { conversationId: id, tagId },
  });

  return NextResponse.json({ success: true });
}
