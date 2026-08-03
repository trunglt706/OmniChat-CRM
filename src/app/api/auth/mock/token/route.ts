import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({
    access_token: 'mock_access_token',
    token_type: 'bearer',
    expires_in: 3600,
  })
}
