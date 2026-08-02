import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete('next-auth.session-token')
  response.cookies.delete('next-auth.callback-url')
  return response
}

export async function GET() {
  return POST()
}