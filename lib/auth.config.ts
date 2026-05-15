import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.color = (user as any).color;
        token.initials = (user as any).initials;
        token.guardia = (user as any).guardia;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).color = token.color;
        (session.user as any).initials = token.initials;
        (session.user as any).guardia = token.guardia;
      }
      return session;
    },
  },
};
