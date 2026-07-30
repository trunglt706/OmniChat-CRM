import { NextResponse } from 'next/server'

export async function GET() {
  const base = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const redirect = `${base}/api/auth/callback/mock?code=mock_oauth_code`
  return NextResponse.redirect(redirect)
}
