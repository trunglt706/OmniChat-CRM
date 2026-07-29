import NextAuth, { type NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

// For MVP, we use a mock session when GOOGLE_CLIENT_ID is not set.
// When GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are configured,
// real Google OAuth will be used.

const useMockAuth = !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET

export const authOptions: NextAuthOptions = {
  providers: useMockAuth
    ? [
        {
          id: 'mock',
          name: 'Demo Login',
          type: 'oauth',
          clientId: 'mock',
          clientSecret: 'mock',
          authorization: { url: '/api/auth/mock/authorize', params: {} },
          token: { url: '/api/auth/mock/token' },
          userinfo: { url: '/api/auth/mock/userinfo' },
          checks: ['none'],
        } as any,
      ]
    : [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
      ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (useMockAuth) {
        token.id = 'user_01'
        token.role = 'admin'
        return token
      }
      if (account) {
        token.id = profile?.sub || token.sub
        token.picture = profile?.picture
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id
        (session.user as any).role = token.role || 'agent'
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || 'omnichat-dev-secret-change-in-production',
}

export default NextAuth(authOptions)
