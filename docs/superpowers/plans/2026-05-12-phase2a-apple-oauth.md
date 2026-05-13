# Phase 2A: Apple OAuth

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Apple Sign In as an OAuth provider, strategic for future iOS app and user trust.

**Architecture:** Extends NextAuth.js with Apple provider. Handles Apple's private relay email feature.

**Tech Stack:** Next.js 16, NextAuth.js v5, Apple OAuth

**Prerequisites:** Phase 1 complete with fixes (password reset, rate limiting)

**Note:** Twitter/X OAuth has been deferred (see Phase 2B) due to API instability and no competitor usage.

---

## Pre-Implementation: Apple Developer Setup

Before coding, complete these Apple Developer portal steps:

- [ ] **Step 1: Create App ID**
  1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers/list)
  2. Click "+" to create new identifier
  3. Select "App IDs" → Continue
  4. Select "App" → Continue
  5. Description: "speech-to-text.me"
  6. Bundle ID: `me.speechtotext.web` (or similar)
  7. Enable "Sign in with Apple" capability
  8. Register

- [ ] **Step 2: Create Services ID**
  1. Click "+" → Select "Services IDs" → Continue
  2. Description: "speech-to-text.me Web"
  3. Identifier: `me.speechtotext.web.service`
  4. Register
  5. Click on the service ID to configure
  6. Enable "Sign in with Apple"
  7. Configure:
     - Domains: `speech-to-text.me`, `localhost`
     - Return URLs: `https://speech-to-text.me/api/auth/callback/apple`, `http://localhost:3001/api/auth/callback/apple`

- [ ] **Step 3: Create Private Key**
  1. Go to Keys section
  2. Click "+" to create new key
  3. Key Name: "speech-to-text Sign In"
  4. Enable "Sign in with Apple"
  5. Configure → Select primary App ID
  6. Register
  7. Download the `.p8` file (you can only download once!)
  8. Note the Key ID

- [ ] **Step 4: Gather credentials**
  You need:
  - Team ID (from Membership details)
  - Services ID (Client ID): `me.speechtotext.web.service`
  - Key ID (from the key you created)
  - Private Key (contents of .p8 file)

---

## Task 1: Configure Apple OAuth Provider

**Files:**
- Modify: `frontend-next/lib/auth.ts`
- Modify: `frontend-next/.env.local`
- Create: `frontend-next/lib/apple-auth.ts`

- [ ] **Step 1: Add Apple environment variables**

Add to `frontend-next/.env.local`:

```bash
# Apple OAuth
APPLE_ID=me.speechtotext.web.service
APPLE_TEAM_ID=YOUR_TEAM_ID
APPLE_KEY_ID=YOUR_KEY_ID
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
YOUR_KEY_CONTENT_HERE
-----END PRIVATE KEY-----"
```

- [ ] **Step 2: Create Apple auth helper**

```typescript
// frontend-next/lib/apple-auth.ts

/**
 * Checks if an email is an Apple private relay email
 * Format: xyz123@privaterelay.appleid.com
 */
export function isApplePrivateRelay(email: string): boolean {
  return email.endsWith('@privaterelay.appleid.com');
}

/**
 * Apple's private relay emails are unique per app per user.
 * They forward to the user's real email but we can't know what that is.
 * We should treat them as valid emails but flag them for support purposes.
 */
export function normalizeAppleEmail(email: string): string {
  return email.toLowerCase().trim();
}
```

- [ ] **Step 3: Add Apple provider to NextAuth**

Update `frontend-next/lib/auth.ts`:

```typescript
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
    error: '/login',
    verifyRequest: '/verify',
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
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

        const email = (credentials.email as string).toLowerCase().trim();
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
            await prisma.user.update({
              where: { id: token.id as string },
              data: { name: fullName },
            });
          }
        }
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
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
```

- [ ] **Step 4: Verify Apple configuration**

```bash
cd frontend-next && pnpm dev
# Navigate to /login
# "Continue with Apple" button should appear
```

---

## Task 2: Add Apple Sign In Button

**Files:**
- Modify: `frontend-next/components/auth/social-buttons.tsx`

- [ ] **Step 1: Update social buttons with Apple**

```typescript
// frontend-next/components/auth/social-buttons.tsx
'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

export function SocialButtons() {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleSocialLogin = async (provider: string) => {
    setIsLoading(provider);
    try {
      await signIn(provider, { callbackUrl: '/dashboard' });
    } catch (error) {
      console.error('Social login error:', error);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Google Button */}
      <button
        onClick={() => handleSocialLogin('google')}
        disabled={isLoading !== null}
        className="w-full flex items-center justify-center gap-3 h-11 px-6 rounded-xl border-2 border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading === 'google' ? (
          <LoadingSpinner />
        ) : (
          <GoogleIcon />
        )}
        Continue with Google
      </button>

      {/* Apple Button */}
      <button
        onClick={() => handleSocialLogin('apple')}
        disabled={isLoading !== null}
        className="w-full flex items-center justify-center gap-3 h-11 px-6 rounded-xl border-2 border-slate-900 bg-slate-900 text-white font-medium hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading === 'apple' ? (
          <LoadingSpinner />
        ) : (
          <AppleIcon />
        )}
        Continue with Apple
      </button>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
  );
}
```

---

## Task 3: Handle Apple Private Relay Emails

**Files:**
- Modify: `frontend-next/prisma/schema.prisma`
- Create migration

- [ ] **Step 1: Add isPrivateRelayEmail flag to User model**

Add to User model in `frontend-next/prisma/schema.prisma`:

```prisma
model User {
  // ... existing fields

  // Flag for Apple private relay emails
  isPrivateRelayEmail  Boolean   @default(false)

  // ... rest of fields
}
```

- [ ] **Step 2: Run migration**

```bash
cd frontend-next && npx prisma migrate dev --name add_private_relay_flag
```

- [ ] **Step 3: Update auth callbacks to detect private relay**

In `frontend-next/lib/auth.ts`, update the signIn callback:

```typescript
callbacks: {
  // ... existing callbacks

  async signIn({ user, account }) {
    if (account?.provider === 'apple' && user.email) {
      // Check if this is a private relay email
      if (isApplePrivateRelay(user.email)) {
        await prisma.user.update({
          where: { email: user.email },
          data: { isPrivateRelayEmail: true },
        });
      }
    }
    return true;
  },
}
```

---

## Task 4: Add Connected Accounts to Settings

**Files:**
- Create: `frontend-next/app/(protected)/dashboard/settings/page.tsx`
- Create: `frontend-next/components/settings/connected-accounts.tsx`

- [ ] **Step 1: Create connected accounts component**

```typescript
// frontend-next/components/settings/connected-accounts.tsx
import { prisma } from '@/lib/prisma';

interface ConnectedAccountsProps {
  userId: string;
}

export async function ConnectedAccounts({ userId }: ConnectedAccountsProps) {
  const accounts = await prisma.account.findMany({
    where: { userId },
    select: {
      provider: true,
      createdAt: true,
    },
  });

  const providers = {
    google: { name: 'Google', icon: '🔵' },
    apple: { name: 'Apple', icon: '🍎' },
    credentials: { name: 'Email/Password', icon: '📧' },
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900">Connected Accounts</h3>
      <p className="text-sm text-slate-600">
        These accounts are linked to your profile.
      </p>

      <div className="space-y-2">
        {accounts.length === 0 ? (
          <p className="text-slate-500 text-sm">No connected accounts</p>
        ) : (
          accounts.map((account) => {
            const provider = providers[account.provider as keyof typeof providers] || {
              name: account.provider,
              icon: '🔗',
            };
            return (
              <div
                key={account.provider}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{provider.icon}</span>
                  <div>
                    <p className="font-medium text-slate-900">{provider.name}</p>
                    <p className="text-xs text-slate-500">
                      Connected {account.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                  Connected
                </span>
              </div>
            );
          })
        )}
      </div>

      <p className="text-xs text-slate-500 mt-4">
        Account linking and unlinking will be available in a future update.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create settings page**

```typescript
// frontend-next/app/(protected)/dashboard/settings/page.tsx
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConnectedAccounts } from '@/components/settings/connected-accounts';

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
        <p className="text-slate-600">Manage your account settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <p className="text-slate-900">{session.user.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Name</label>
            <p className="text-slate-900">{session.user.name || 'Not set'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <ConnectedAccounts userId={session.user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Add settings link to dashboard layout**

Update `frontend-next/app/(protected)/layout.tsx` to include settings navigation:

```typescript
<div className="flex items-center space-x-4">
  <Link href="/dashboard/settings" className="text-sm text-slate-600 hover:text-slate-900">
    Settings
  </Link>
  <span className="text-sm text-slate-600">{session.user.email}</span>
  <SignOutButton />
</div>
```

---

## Task 5: Add OAuth Error Handling

**Files:**
- Create: `frontend-next/app/(auth)/error/page.tsx`
- Modify: `frontend-next/lib/auth.ts`

- [ ] **Step 1: Create error page for OAuth failures**

```typescript
// frontend-next/app/(auth)/error/page.tsx
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const errorMessages: Record<string, string> = {
  Configuration: 'There is a problem with the server configuration.',
  AccessDenied: 'You do not have permission to sign in.',
  Verification: 'The verification link may have expired or already been used.',
  OAuthSignin: 'Error occurred while starting the sign-in process.',
  OAuthCallback: 'Error occurred while processing the sign-in.',
  OAuthCreateAccount: 'Could not create account with this provider.',
  EmailCreateAccount: 'Could not create account with this email.',
  Callback: 'Error occurred during the callback.',
  OAuthAccountNotLinked: 'This email is already associated with another account.',
  Default: 'An unexpected error occurred.',
};

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const error = searchParams.error || 'Default';
  const errorMessage = errorMessages[error] || errorMessages.Default;

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <CardTitle>Authentication Error</CardTitle>
        <CardDescription>{errorMessage}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error === 'OAuthAccountNotLinked' && (
          <p className="text-sm text-slate-600 text-center">
            Try signing in with the same method you used when you first created your account.
          </p>
        )}

        <div className="flex flex-col gap-2">
          <Link href="/login">
            <Button className="w-full">Try again</Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="w-full">Go home</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Update auth config to use error page**

In `frontend-next/lib/auth.ts`, ensure the error page is configured:

```typescript
pages: {
  signIn: '/login',
  signOut: '/login',
  error: '/error', // Updated to dedicated error page
  verifyRequest: '/verify',
},
```

---

## Validation Checkpoint

After completing all tasks, verify:

- [ ] Apple Developer portal configured with Services ID and key
- [ ] Environment variables set for Apple OAuth
- [ ] Apple Sign In button appears on login/signup pages
- [ ] Can sign up with Apple (test with real Apple ID)
- [ ] Can sign in with Apple
- [ ] Apple private relay emails are flagged correctly
- [ ] Settings page shows connected Apple account
- [ ] OAuth errors redirect to error page with message
- [ ] Can still sign in with Google (no regression)

---

## Notes

### Apple-Specific Behaviors

1. **Name only sent once**: Apple only sends the user's name on the FIRST authorization. If you miss it, you can't get it again without the user revoking and re-authorizing.

2. **Private relay emails**: Apple's "Hide My Email" creates unique relay addresses. They work like normal emails but you can't see the real address.

3. **Safari on macOS/iOS preferred**: Apple Sign In works best in Safari. Other browsers may have issues.

4. **Button styling guidelines**: Apple has strict guidelines for button appearance. The black button with Apple logo is compliant.

---

## Next Phase

After validation passes, proceed to **Phase 3A: Migration Infrastructure**

(Note: Phase 2B - Twitter/X OAuth is deferred due to API instability and low priority)
