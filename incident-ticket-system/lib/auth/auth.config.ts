import type { NextAuthConfig } from "next-auth"
import { Role } from "@prisma/client"

export const authConfig: Partial<NextAuthConfig> = {
  pages: {
    signIn: '/auth/login',
  },
  callbacks: {
    jwt({ token, user }: any) {
      if (user) {
        token.role = user.role
        token.id = user.id
      }
      return token
    },
    session({ session, token }: any) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as Role
      }
      return session
    },
  },
}
