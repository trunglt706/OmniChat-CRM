import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const agents = await db.user.findMany({
    select: { id: true, name: true, email: true, avatar: true, role: true, status: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(agents);
}
