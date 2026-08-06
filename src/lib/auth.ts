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
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        throw new Error('Vui lòng nhập đầy đủ email và mật khẩu')
      }
      const user = await db.user.findUnique({
        where: { email: credentials.email }
      })
      if (!user) {
        throw new Error('Tài khoản không tồn tại')
      }
      if (!user.password) {
        throw new Error('Tài khoản này không thiết lập mật khẩu')
      }
      const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
      if (!isPasswordValid) {
        throw new Error('Mật khẩu không chính xác')
      }
      return {
        id: String(user.id),
        email: user.email,
        name: user.name,
        picture: user.avatar,
        role: user.role
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
