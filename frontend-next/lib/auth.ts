import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Apple from 'next-auth/providers/apple';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from './prisma';
import { verifyPassword } from './password';
import { isApplePrivateRelay } from './apple-auth';
import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/error',
    verifyRequest: '/verify',
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // SECURITY: Must be false to prevent account takeover attacks.
      // When true, attackers can link OAuth accounts to existing emails without verification.
      allowDangerousEmailAccountLinking: false,
    }),
    Apple({
      clientId: process.env.APPLE_ID!,
      clientSecret: process.env.APPLE_PRIVATE_KEY!, // NextAuth generates the secret
      authorization: {
        params: {
          scope: 'name email',
        },
      },
      // Note: Apple only sends user's name on first authorization
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        if (!user.emailVerified) {
          throw new Error('Please verify your email before logging in');
        }

        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'apple' && user.email) {
        // Check if this is a private relay email
        if (isApplePrivateRelay(user.email)) {
          try {
            await prisma.user.update({
              where: { email: user.email },
              data: { isPrivateRelayEmail: true },
            });
          } catch (error) {
            // User might not exist yet (first sign in), adapter will create them
            // We'll flag them in the next sign in, or handle in jwt callback
            console.log('Could not flag private relay (user may not exist yet):', error);
          }
        }
      }
      return true;
    },
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.id = user.id;
      }

      // Handle Apple-specific data
      if (account?.provider === 'apple' && profile) {
        // Apple only sends name on first auth - store it
        const appleProfile = profile as { name?: { firstName?: string; lastName?: string } };
        if (appleProfile.name) {
          const fullName = [appleProfile.name.firstName, appleProfile.name.lastName]
            .filter(Boolean)
            .join(' ');
          if (fullName && token.id) {
            try {
              await prisma.user.update({
                where: { id: token.id as string },
                data: { name: fullName },
              });
            } catch (error) {
              console.error('Failed to store Apple user name:', error);
              // Don't fail the login for this
            }
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        // Note: tier and emailVerified fetched in server components, not here
        // (Prisma can't run in Edge Runtime / middleware)
      }
      return session;
    },
    // signIn callback removed - PrismaAdapter handles user creation and emailVerified for OAuth
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
