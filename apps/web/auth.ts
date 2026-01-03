import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { authAdapter } from "@workspace/db/adapter";

export const { handlers, signIn, signOut, auth, unstable_update } = NextAuth({
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
    async jwt({ token, user, trigger, session }) {
      // Persist user info in the JWT
      if (user?.id) {
        token.id = user.id;
      }
      if (trigger === "update") {
        if (session?.organizationId) {
          token.organizationId = session.organizationId;
        } else if (session?.user?.organizationId) {
          token.organizationId = session.user.organizationId;
        }
      }
      return token;
    },
    // https://authjs.dev/guides/extending-the-session
    async session({ session, token }) {
      // Add user ID and organization ID to the session from JWT
      if (token?.id && session.user) {
        session.user.id = token.id;
        session.user.organizationId = token.organizationId;
      }
      return session;
    },
  },
});
