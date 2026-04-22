import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/connexion",
  },
  providers: [
    // Admin — Credentials (email + password)
    Credentials({
      id: "credentials",
      name: "Admin",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const admin = await prisma.adminUser.findUnique({
          where: { email: credentials.email as string },
        });
        if (!admin) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          admin.password
        );
        if (!valid) return null;

        return {
          id: admin.id,
          email: admin.email,
          name: admin.displayName,
          role: "admin" as const,
        };
      },
    }),

    // Coureur — Google OAuth
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),

    // TODO(PIV.02): EmailProvider (Resend) à ajouter quand le domaine tdf2026.fr sera configuré.
    // Installer `nodemailer`, puis :
    // Email({
    //   server: process.env.EMAIL_SERVER,
    //   from: process.env.EMAIL_FROM,
    // }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Admin via Credentials → toujours autorisé
      if (account?.provider === "credentials") return true;

      // Google OAuth → l'adapter a déjà créé/chargé le User en base.
      // On tente le lien automatique si un Rider a cet email pré-rempli.
      if (account?.provider === "google" && user.email && user.id) {
        const rider = await prisma.rider.findUnique({
          where: { email: user.email },
          include: { user: true },
        });

        if (rider && !rider.user) {
          // Rider sans User lié → on lie automatiquement
          await prisma.user.update({
            where: { id: user.id },
            data: { riderId: rider.id, role: "rider" },
          });
        } else if (rider && rider.user && rider.user.id !== user.id) {
          // Le rider est déjà lié à un autre User — on laisse en pending,
          // l'admin pourra résoudre le conflit.
          console.warn(
            `[auth] Rider ${rider.id} déjà lié à un autre User (${rider.user.id}), nouveau User ${user.id} laissé en pending`
          );
        }
      }

      return true;
    },

    async jwt({ token, user }) {
      // Premier login : user est passé par le provider
      if (user) {
        if ((user as { role?: string }).role === "admin") {
          token.role = "admin";
          token.uid = user.id;
          token.riderId = null;
          return token;
        }
        if (user.id) {
          token.uid = user.id;
        }
      }

      // Pour les comptes non-admin, on relit systématiquement depuis la DB.
      // Why: la session JWT est figée après le login, donc les changements
      // admin (liaison User→Rider, passage pending→rider) ne seraient visibles
      // qu'après logout/login. On accepte 1 query indexée par requête pour
      // que le dashboard reflète l'état DB en temps réel.
      if (token.uid && token.role !== "admin") {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.uid as string },
          select: { role: true, riderId: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.riderId = dbUser.riderId;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.role = token.role as "admin" | "rider" | "pending";
        session.user.riderId = (token.riderId as string | null) ?? null;
      }
      return session;
    },
  },
});
