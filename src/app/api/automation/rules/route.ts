import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const rules = await db.automationRule.findMany({
    include: {
      assignTo: { select: { id: true, name: true } },
      tag: { select: { id: true, name: true, color: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(rules);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, keyword, replyMessage, assignToId, tagId, enabled = true } = body;

  const rule = await db.automationRule.create({
    data: { name, keyword, replyMessage, assignToId: assignToId || null, tagId: tagId || null, enabled },
    include: { assignTo: { select: { id: true, name: true } }, tag: { select: { id: true, name: true, color: true } } },
  });

  return NextResponse.json(rule, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const rule = await db.automationRule.update({
    where: { id },
    data: {
      name: data.name,
      keyword: data.keyword,
      replyMessage: data.replyMessage,
      assignToId: data.assignToId || null,
      tagId: data.tagId || null,
      enabled: data.enabled,
    },
    include: { assignTo: { select: { id: true, name: true } }, tag: { select: { id: true, name: true, color: true } } },
  });

  return NextResponse.json(rule);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await db.automationRule.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
