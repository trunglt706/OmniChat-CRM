import NextAuth, { type NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

const providers: any[] = [
  CredentialsProvider({
    name: 'Credentials',
    credentials: {
      email: { label: "Email", type: "email", placeholder: "admin@omnichat.vn" },
      password: { label: "Password", type: "password" }
    },
    async authorize(credentials, req) {
      if (!credentials?.email || !credentials?.password) {
        throw new Error('Vui lòng nhập đầy đủ email và mật khẩu')
      }
      const user = await db.user.findUnique({
        where: { email: credentials.email }
      })
      if (!user) {
        throw new Error('Tài khoản không tồn tại')
      }
      if (!user.isActive) {
        throw new Error('Tài khoản đã bị khóa')
      }
      if (!user.password) {
        throw new Error('Tài khoản này không thiết lập mật khẩu')
      }
      const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
      if (!isPasswordValid) {
        throw new Error('Mật khẩu không chính xác')
      }

      // Generate a unique token for this session
      const sessionToken = crypto.randomUUID()
      // Extract IP and UA if possible (NextAuth req object is limited)
      const forwardedFor = req?.headers?.['x-forwarded-for']
      const ip = Array.isArray(forwardedFor) ? forwardedFor[0] : (forwardedFor || 'Unknown')
      const userAgent = req?.headers?.['user-agent'] || 'Unknown Browser'
      
      try {
        await db.userSession.create({
          data: {
            userId: user.id,
            token: sessionToken,
            ipAddress: ip,
            userAgent: userAgent,
          }
        })
        
        // Also log to AuditLog
        await db.auditLog.create({
          data: {
            userId: user.id,
            action: 'login',
            ipAddress: ip,
            userAgent: userAgent,
          }
        })
      } catch (e) {
        console.error('Failed to log session', e)
      }

      return {
        id: String(user.id),
        email: user.email,
        name: user.name,
        picture: user.avatar,
        role: user.role,
        sessionId: sessionToken
      } as any
    }
  })
]

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  }))
}

export const authOptions: NextAuthOptions = {
  providers,
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // Khi user login qua credentials, `user` object sẽ được truyền vào đây lần đầu
      if (user) {
        token.id = user.id
        token.role = (user as any).role || 'agent'
        token.sessionId = (user as any).sessionId
      }
      // Khi login qua Google
      if (account && profile) {
        (token as any).id = (profile as any).sub || token.sub
        ;(token as any).picture = (profile as any).picture
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = (token as any).id
        ;(session.user as any).role = (token as any).role || 'agent'
        ;(session.user as any).sessionId = (token as any).sessionId
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET || 'omnichat-dev-secret-change-in-production',
}

export default NextAuth(authOptions)
