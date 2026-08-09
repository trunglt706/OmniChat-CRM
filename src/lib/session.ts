import { getToken } from 'next-auth/jwt'
import { db } from '@/lib/db'
import type { NextRequest } from 'next/server'

const SECRET = process.env.NEXTAUTH_SECRET || 'omnichat-dev-secret-change-in-production'

interface SessionUser {
  id: number
  uuid: string
  name: string
  email: string
  role: string
  avatar: string | null
  phone: string | null
  bio: string | null
  status: string
  settings: string | null
}

/**
 * Get the authenticated user from JWT cookie + DB lookup.
 * Returns null if not authenticated.
 */
export async function getAuthUser(req: NextRequest): Promise<SessionUser | null> {
  const useSecureCookies = process.env.NEXTAUTH_URL?.startsWith('https://')
  const cookieName = useSecureCookies ? '__Secure-next-auth.session-token' : 'next-auth.session-token'

  const token = await getToken({
    req,
    secret: SECRET,
    cookieName,
  })

  if (!token || !token.sub) return null

  const userId = Number(token.sub)
  if (isNaN(userId)) return null

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, uuid: true, name: true, email: true, role: true, avatar: true, phone: true, bio: true, status: true, settings: true },
  })

  if (!user) return null

  return {
    id: user.id,
    uuid: user.uuid,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    phone: user.phone,
    bio: user.bio,
    status: user.status,
    settings: user.settings,
  }
}
