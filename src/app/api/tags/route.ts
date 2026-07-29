import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  const tags = await db.tag.findMany({
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(tags);
}
