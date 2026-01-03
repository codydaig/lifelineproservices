import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { authAdapter } from "@workspace/db/adapter";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: authAdapter,
  providers: [Google],
  session: {
    strategy: "jwt", // Use JWT for sessions (works in Edge Runtime)
  },
  callbacks: {
    authorized: async ({ auth }) => {
      // Logged in users are authenticated, otherwise redirect to login page
      return !!auth;
    },
    async jwt({ token, user, account }) {
      // Persist user info in the JWT
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    // https://authjs.dev/guides/extending-the-session
    async session({ session, token }) {
      // Add user ID to the session from JWT
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
