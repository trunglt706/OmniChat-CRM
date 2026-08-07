import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/session';
import { getRedis } from '@/lib/redis';

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { conversationId, isTyping } = body;
  
  if (!conversationId) return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 });

  const key = `typing:${conversationId}:${user.id}`;
  const redis = getRedis();
  
  if (isTyping) {
    // Set with 3 seconds expiration
    await redis.set(key, user.name || 'User', 3);
  } else {
    await redis.del(key);
  }

  return NextResponse.json({ success: true });
}
