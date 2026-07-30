import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    sub: 'user_01',
    name: 'Phạm Minh Tuấn',
    email: 'tuan.pm@omnichat.vn',
    picture: null,
    role: 'admin',
  })
}
