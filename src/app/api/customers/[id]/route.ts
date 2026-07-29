import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      identities: true,
      conversations: {
        orderBy: { updatedAt: 'desc' },
        take: 10,
        include: {
          owner: { select: { id: true, name: true, avatar: true } },
          tags: { include: { tag: true } },
        },
      },
      leads: {
        orderBy: { createdAt: 'desc' },
        include: { owner: { select: { id: true, name: true, avatar: true } } },
      },
      notes: {
        orderBy: { createdAt: 'desc' },
        include: { author: { select: { id: true, name: true, avatar: true } } },
      },
    },
  });

  if (!customer) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(customer);
}