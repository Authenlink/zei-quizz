import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users, workspaces } from "@/lib/schema";
import type { UserRole } from "@/lib/authz";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            image: users.image,
            password: users.password,
            accountType: users.accountType,
            role: users.role,
            workspaceId: users.workspaceId,
          })
          .from(users)
          .where(eq(users.email, credentials.email as string))
          .limit(1);

        if (user.length === 0) {
          return null;
        }

        const foundUser = user[0];

        if (!foundUser.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          foundUser.password
        );

        if (!isPasswordValid) {
          return null;
        }

        // Récupérer le nom du workspace si l'utilisateur en a un
        let workspaceName: string | null = null;
        if (foundUser.workspaceId) {
          const [ws] = await db
            .select({ name: workspaces.name })
            .from(workspaces)
            .where(eq(workspaces.id, foundUser.workspaceId))
            .limit(1);
          workspaceName = ws?.name ?? null;
        }

        return {
          id: foundUser.id.toString(),
          email: foundUser.email,
          name: foundUser.name || undefined,
          image: foundUser.image || undefined,
          accountType: foundUser.accountType as "user" | "business",
          role: foundUser.role as UserRole,
          workspaceId: foundUser.workspaceId ?? null,
          workspaceName,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt" as const,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        token.accountType = user.accountType;
        token.role = user.role;
        token.workspaceId = user.workspaceId ?? null;
        token.workspaceName = user.workspaceName ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string | undefined;
        session.user.accountType = token.accountType;
        // JWT créés avant l’ajout du champ : reconnexion recommandée
        session.user.role = (token.role as UserRole | undefined) ?? "staff";
        session.user.workspaceId = (token.workspaceId as number | null) ?? null;
        session.user.workspaceName = (token.workspaceName as string | null) ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    signOut: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export const { GET, POST } = handlers;