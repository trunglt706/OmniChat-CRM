import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { phone: { contains: search } },
      { email: { contains: search } },
    ];
  }

  const customers = await db.customer.findMany({
    where,
    include: { identities: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return NextResponse.json(customers);
}
