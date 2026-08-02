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
          authorization: { url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/mock/authorize`, params: {} },
          token: { url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/mock/token` },
          userinfo: { url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/mock/userinfo` },
          profile: (profile: any) => ({
            id: profile.sub,
            name: profile.name,
            email: profile.email,
            image: profile.picture,
          }),
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
        token.email = 'admin@omnichat.vn'
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
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET || 'omnichat-dev-secret-change-in-production',
}

export default NextAuth(authOptions)
