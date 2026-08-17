import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/utils/Prisma/Client";

// No @auth/prisma-adapter here on purpose: an adapter manages its own user/
// session/account tables and expects to own the shape of `users`. We're
// migrating an existing `users` table with our own columns (fpo_name,
// password_hash, email_verified_at, reset_token...), so instead we read/
// write it directly in `authorize` below and keep sessions as JWTs. No
// extra session table, and it's edge/Node-runtime friendly either way.

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/Login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        const user = await prisma.users.findUnique({
          where: { email },
        });

        if (!user || !user.password_hash) return null;

        const passwordsMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordsMatch) return null;

        if (!user.email_verified_at) {
          // Thrown errors from authorize() surface as ?error=... on the
          // signIn() call site — the Login server action turns this into
          // a friendly message rather than a generic "invalid credentials".
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        // Whatever's returned here becomes `user` in the jwt() callback
        // on first sign-in. Keep it minimal — no password_hash, ever.
        return {
          id: user.id,
          email: user.email,
          name: user.fpo_name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});