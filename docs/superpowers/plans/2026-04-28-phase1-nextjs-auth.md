# Phase 1: Next.js Setup + Auth Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up Next.js 14 with App Router, NextAuth.js authentication (Google OAuth + Email/Password), and email verification.

**Architecture:** New Next.js frontend alongside existing React frontend. Shares Prisma schema with NestJS backend. NextAuth handles session management with JWT in httpOnly cookies.

**Tech Stack:** Next.js 14 (App Router), NextAuth.js v5, Prisma, Tailwind CSS, Resend (email), bcrypt

---

## File Structure

```
frontend-next/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── verify/page.tsx
│   │   └── layout.tsx
│   ├── (protected)/
│   │   ├── dashboard/page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   └── auth/[...nextauth]/route.ts
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   └── card.tsx
│   └── auth/
│       ├── login-form.tsx
│       ├── signup-form.tsx
│       └── social-buttons.tsx
├── lib/
│   ├── auth.ts
│   ├── prisma.ts
│   ├── email.ts
│   └── password.ts
├── prisma/
│   └── schema.prisma (symlink to backend)
├── .env.local
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.js
```

---

## Task 1: Create Next.js Project

**Files:**
- Create: `frontend-next/package.json`
- Create: `frontend-next/tsconfig.json`
- Create: `frontend-next/next.config.js`
- Create: `frontend-next/tailwind.config.ts`
- Create: `frontend-next/postcss.config.js`

- [ ] **Step 1: Create Next.js project**

```bash
cd /Users/nakahara/Documents/speech-to-text
npx create-next-app@latest frontend-next --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-pnpm
```

Expected output: Project created successfully

- [ ] **Step 2: Verify project structure**

```bash
ls frontend-next/
```

Expected: `app/`, `public/`, `package.json`, `tailwind.config.ts`, etc.

- [ ] **Step 3: Install additional dependencies**

```bash
cd frontend-next && pnpm add next-auth@beta @prisma/client bcryptjs resend zod && pnpm add -D prisma @types/bcryptjs
```

- [ ] **Step 4: Update next.config.js**

```javascript
// frontend-next/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
};

module.exports = nextConfig;
```

- [ ] **Step 5: Test dev server starts**

```bash
cd frontend-next && pnpm dev
```

Expected: Server running on http://localhost:3000

- [ ] **Step 6: Commit**

```bash
git add frontend-next/
git commit -m "feat: initialize Next.js 14 project with App Router"
```

---

## Task 2: Set Up Prisma Schema

**Files:**
- Create: `frontend-next/prisma/schema.prisma`
- Create: `frontend-next/lib/prisma.ts`

- [ ] **Step 1: Create Prisma schema with updated User model**

```prisma
// frontend-next/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                   String    @id @default(cuid())
  email                String    @unique
  emailVerified        DateTime?
  passwordHash         String?
  name                 String?
  image                String?

  // Social provider IDs
  googleId             String?   @unique
  appleId              String?   @unique
  twitterId            String?   @unique

  // Subscription
  tier                 String    @default("free")
  stripeCustomerId     String?   @unique
  stripeSubscriptionId String?
  subscriptionStatus   String?
  subscriptionEndsAt   DateTime?

  // Relations
  transcriptions       Transcription[]
  pdfConversions       PdfConversion[]
  shares               Share[]
  usageCounter         UsageCounter?
  accounts             Account[]
  sessions             Session[]

  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  @@map("users")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}

model UsageCounter {
  id                   String   @id @default(cuid())
  userId               String   @unique
  user                 User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  transcriptionsToday  Int      @default(0)
  transcriptionsDate   String   @db.VarChar(10)
  ocrThisMonth         Int      @default(0)
  ocrMonth             String   @db.VarChar(7)

  @@map("usage_counters")
}

model Transcription {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  transcript    String   @db.Text
  corrected     String?  @db.Text
  summary       String?  @db.Text
  language      String?  @db.VarChar(10)

  audioKey      String?
  audioSize     Int?
  audioDuration Float?
  fileName      String?  @db.VarChar(255)

  createdAt     DateTime @default(now())

  @@index([userId])
  @@index([createdAt])
  @@map("transcriptions")
}

model PdfConversion {
  id            String    @id @default(cuid())
  shortId       String    @unique @db.VarChar(10)
  userId        String?
  user          User?     @relation(fields: [userId], references: [id], onDelete: SetNull)

  status        String    @db.VarChar(20)
  fileName      String?   @db.VarChar(255)
  fileSize      Int?
  extractedText String?   @db.Text
  textLength    Int?
  pageCount     Int?
  language      String?   @db.VarChar(10)
  voice         String?   @db.VarChar(20)
  audioFormat   String?   @db.VarChar(10)
  audioSize     Int?
  audioDuration Float?
  audioData     String?   @db.Text
  mp3Key        String?
  errorMessage  String?   @db.Text
  createdAt     DateTime  @default(now())
  completedAt   DateTime?
  expiresAt     DateTime
  ipAddress     String?

  @@index([shortId])
  @@index([userId])
  @@index([status])
  @@index([expiresAt])
  @@map("pdf_conversions")
}

model Share {
  id              String   @id @default(cuid())
  shortId         String   @unique @db.VarChar(20)

  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  transcriptionId String?
  pdfConversionId String?

  transcript      String?  @db.Text
  corrected       String?  @db.Text
  summary         String?  @db.Text
  language        String?  @db.VarChar(10)

  passwordHash    String?

  expiresAt       DateTime
  createdAt       DateTime @default(now())

  @@index([shortId])
  @@index([userId])
  @@index([expiresAt])
  @@map("shares")
}

model RateLimit {
  id            String    @id @default(cuid())
  ipAddress     String
  date          String    @db.VarChar(10)
  count         Int       @default(0)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@unique([ipAddress, date])
  @@index([ipAddress])
  @@index([date])
  @@map("rate_limits")
}

model Language {
  id            String    @id @default(cuid())
  code          String    @unique @db.VarChar(10)
  name          String    @db.VarChar(100)
  nativeName    String    @db.VarChar(100)
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())

  @@map("languages")
}

model ContactSubmission {
  id          String    @id @default(cuid())
  name        String    @db.VarChar(100)
  email       String    @db.VarChar(255)
  subject     String    @db.VarChar(255)
  message     String    @db.Text
  ipAddress   String?
  userAgent   String?   @db.Text
  isRead      Boolean   @default(false)
  createdAt   DateTime  @default(now())

  @@index([isRead])
  @@index([createdAt])
  @@map("contact_submissions")
}

model ShareAnalytics {
  id            String    @id @default(cuid())
  shareId       String
  eventType     String    @db.VarChar(50)
  ipAddress     String?
  userAgent     String?   @db.Text
  referer       String?   @db.Text
  createdAt     DateTime  @default(now())

  @@index([shareId])
  @@index([eventType])
  @@index([createdAt])
  @@map("share_analytics")
}
```

- [ ] **Step 2: Create Prisma client singleton**

```typescript
// frontend-next/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

- [ ] **Step 3: Create .env.local file**

```bash
# frontend-next/.env.local
DATABASE_URL="postgresql://speechtotext:speechtotext123@localhost:5432/speechtotext"

NEXTAUTH_URL="http://localhost:3001"
NEXTAUTH_SECRET="your-secret-key-generate-with-openssl-rand-base64-32"

GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

RESEND_API_KEY=""
EMAIL_FROM="noreply@speech-to-text.me"
```

- [ ] **Step 4: Generate Prisma client**

```bash
cd frontend-next && npx prisma generate
```

- [ ] **Step 5: Create migration (if needed)**

```bash
cd frontend-next && npx prisma migrate dev --name add_auth_tables
```

- [ ] **Step 6: Commit**

```bash
git add frontend-next/prisma/ frontend-next/lib/prisma.ts
git commit -m "feat: add Prisma schema with auth tables"
```

---

## Task 3: Set Up NextAuth.js

**Files:**
- Create: `frontend-next/lib/auth.ts`
- Create: `frontend-next/app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Create password utilities**

```typescript
// frontend-next/lib/password.ts
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  return { valid: true };
}
```

- [ ] **Step 2: Create NextAuth configuration**

```typescript
// frontend-next/lib/auth.ts
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from './prisma';
import { verifyPassword } from './password';
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
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }
      if (account?.provider === 'google') {
        // Update googleId on login
        await prisma.user.update({
          where: { id: token.id as string },
          data: { googleId: account.providerAccountId },
        });
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;

        // Fetch latest user data including tier
        const user = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { tier: true, emailVerified: true },
        });

        if (user) {
          session.user.tier = user.tier;
          session.user.emailVerified = user.emailVerified;
        }
      }
      return session;
    },
    async signIn({ user, account }) {
      // For OAuth providers, auto-verify email
      if (account?.provider !== 'credentials' && user.email) {
        await prisma.user.update({
          where: { email: user.email },
          data: { emailVerified: new Date() },
        });
      }
      return true;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
```

- [ ] **Step 3: Add type declarations**

```typescript
// frontend-next/types/next-auth.d.ts
import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      tier?: string;
      emailVerified?: Date | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    tier?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
  }
}
```

- [ ] **Step 4: Create API route handler**

```typescript
// frontend-next/app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
```

- [ ] **Step 5: Install PrismaAdapter**

```bash
cd frontend-next && pnpm add @auth/prisma-adapter
```

- [ ] **Step 6: Commit**

```bash
git add frontend-next/lib/auth.ts frontend-next/lib/password.ts frontend-next/app/api/auth/ frontend-next/types/
git commit -m "feat: configure NextAuth with Google and Credentials providers"
```

---

## Task 4: Set Up Email Service (Resend)

**Files:**
- Create: `frontend-next/lib/email.ts`
- Create: `frontend-next/app/api/auth/verify/route.ts`

- [ ] **Step 1: Create email utilities**

```typescript
// frontend-next/lib/email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${process.env.NEXTAUTH_URL}/verify?token=${token}`;

  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'noreply@speech-to-text.me',
    to: email,
    subject: 'Verify your email - speech-to-text.me',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Welcome to speech-to-text.me!</h1>
        <p>Please verify your email address by clicking the button below:</p>
        <a href="${verifyUrl}" style="display: inline-block; background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Verify Email
        </a>
        <p style="color: #666; font-size: 14px;">
          Or copy and paste this link into your browser:<br>
          <a href="${verifyUrl}">${verifyUrl}</a>
        </p>
        <p style="color: #666; font-size: 14px;">
          This link expires in 24 hours.
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'noreply@speech-to-text.me',
    to: email,
    subject: 'Reset your password - speech-to-text.me',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Reset Your Password</h1>
        <p>Click the button below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Reset Password
        </a>
        <p style="color: #666; font-size: 14px;">
          If you didn't request this, you can safely ignore this email.
        </p>
        <p style="color: #666; font-size: 14px;">
          This link expires in 1 hour.
        </p>
      </div>
    `,
  });
}

export function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
```

- [ ] **Step 2: Create verification API route**

```typescript
// frontend-next/app/api/auth/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=missing_token', request.url));
  }

  const verificationToken = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!verificationToken) {
    return NextResponse.redirect(new URL('/login?error=invalid_token', request.url));
  }

  if (verificationToken.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token } });
    return NextResponse.redirect(new URL('/login?error=expired_token', request.url));
  }

  // Verify the user
  await prisma.user.update({
    where: { email: verificationToken.identifier },
    data: { emailVerified: new Date() },
  });

  // Delete the token
  await prisma.verificationToken.delete({ where: { token } });

  return NextResponse.redirect(new URL('/login?verified=true', request.url));
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend-next/lib/email.ts frontend-next/app/api/auth/verify/
git commit -m "feat: add email verification with Resend"
```

---

## Task 5: Create UI Components

**Files:**
- Create: `frontend-next/components/ui/button.tsx`
- Create: `frontend-next/components/ui/input.tsx`
- Create: `frontend-next/components/ui/card.tsx`

- [ ] **Step 1: Create Button component**

```typescript
// frontend-next/components/ui/button.tsx
import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', isLoading, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

    const variants = {
      default: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500',
      outline: 'border border-gray-300 bg-white hover:bg-gray-50 focus-visible:ring-gray-500',
      ghost: 'hover:bg-gray-100 focus-visible:ring-gray-500',
    };

    const sizes = {
      default: 'h-10 px-4 py-2',
      sm: 'h-8 px-3 text-sm',
      lg: 'h-12 px-6 text-lg',
    };

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg className="mr-2 h-4 w-4 animate-spin\" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
```

- [ ] **Step 2: Create Input component**

```typescript
// frontend-next/components/ui/input.tsx
import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          type={type}
          className={cn(
            'flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
```

- [ ] **Step 3: Create Card component**

```typescript
// frontend-next/components/ui/card.tsx
import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('rounded-xl border border-gray-200 bg-white shadow-sm', className)}
      {...props}
    />
  )
);
Card.displayName = 'Card';

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-xl font-semibold leading-none tracking-tight', className)} {...props} />
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-gray-500', className)} {...props} />
  )
);
CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
```

- [ ] **Step 4: Create utils file**

```typescript
// frontend-next/lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 5: Install clsx and tailwind-merge**

```bash
cd frontend-next && pnpm add clsx tailwind-merge
```

- [ ] **Step 6: Commit**

```bash
git add frontend-next/components/ui/ frontend-next/lib/utils.ts
git commit -m "feat: add base UI components"
```

---

## Task 6: Create Auth Pages

**Files:**
- Create: `frontend-next/app/(auth)/layout.tsx`
- Create: `frontend-next/app/(auth)/login/page.tsx`
- Create: `frontend-next/app/(auth)/signup/page.tsx`
- Create: `frontend-next/app/(auth)/verify/page.tsx`
- Create: `frontend-next/components/auth/login-form.tsx`
- Create: `frontend-next/components/auth/signup-form.tsx`
- Create: `frontend-next/components/auth/social-buttons.tsx`

- [ ] **Step 1: Create auth layout**

```typescript
// frontend-next/app/(auth)/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create social buttons component**

```typescript
// frontend-next/components/auth/social-buttons.tsx
'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
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
      <Button
        variant="outline"
        className="w-full"
        onClick={() => handleSocialLogin('google')}
        isLoading={isLoading === 'google'}
        disabled={isLoading !== null}
      >
        <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Continue with Google
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Create login form**

```typescript
// frontend-next/components/auth/login-form.tsx
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const verified = searchParams.get('verified');
  const errorParam = searchParams.get('error');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error === 'CredentialsSignin'
          ? 'Invalid email or password'
          : result.error
        );
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {verified && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          Email verified successfully! You can now log in.
        </div>
      )}

      {errorParam === 'expired_token' && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          Verification link expired. Please sign up again.
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <Input
          id="password"
          type="password"
          placeholder="********"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
        />
      </div>

      <Button type="submit" className="w-full" isLoading={isLoading}>
        Sign in
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: Create signup form**

```typescript
// frontend-next/components/auth/signup-form.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function SignupForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create account');
        return;
      }

      router.push('/verify?email=' + encodeURIComponent(formData.email));
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Name
        </label>
        <Input
          id="name"
          type="text"
          placeholder="John Doe"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <Input
          id="password"
          type="password"
          placeholder="Min 8 chars, 1 letter, 1 number"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
          Confirm Password
        </label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="********"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          required
        />
      </div>

      <Button type="submit" className="w-full" isLoading={isLoading}>
        Create account
      </Button>
    </form>
  );
}
```

- [ ] **Step 5: Create signup API route**

```typescript
// frontend-next/app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, validatePassword } from '@/lib/password';
import { sendVerificationEmail, generateToken } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });

    // Generate verification token
    const token = generateToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    // Send verification email
    await sendVerificationEmail(email, token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 6: Create login page**

```typescript
// frontend-next/app/(auth)/login/page.tsx
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoginForm } from '@/components/auth/login-form';
import { SocialButtons } from '@/components/auth/social-buttons';

export default function LoginPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to your account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <SocialButtons />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">Or continue with</span>
          </div>
        </div>

        <LoginForm />

        <p className="text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium text-blue-600 hover:underline">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 7: Create signup page**

```typescript
// frontend-next/app/(auth)/signup/page.tsx
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SignupForm } from '@/components/auth/signup-form';
import { SocialButtons } from '@/components/auth/social-buttons';

export default function SignupPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Create an account</CardTitle>
        <CardDescription>Get started with speech-to-text.me</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <SocialButtons />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">Or continue with</span>
          </div>
        </div>

        <SignupForm />

        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 8: Create verify page**

```typescript
// frontend-next/app/(auth)/verify/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function VerifyPage({
  searchParams,
}: {
  searchParams: { email?: string };
}) {
  const email = searchParams.email;

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Check your email</CardTitle>
        <CardDescription>
          We&apos;ve sent a verification link to{' '}
          {email && <strong>{email}</strong>}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center space-y-4">
          <div className="text-6xl">📧</div>
          <p className="text-sm text-gray-600">
            Click the link in your email to verify your account. The link expires in 24 hours.
          </p>
          <p className="text-sm text-gray-500">
            Didn&apos;t receive the email? Check your spam folder or{' '}
            <a href="/signup" className="text-blue-600 hover:underline">
              try again
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 9: Commit**

```bash
git add frontend-next/app/\(auth\)/ frontend-next/components/auth/ frontend-next/app/api/auth/signup/
git commit -m "feat: add login, signup, and verify pages"
```

---

## Task 7: Create Protected Dashboard Route

**Files:**
- Create: `frontend-next/app/(protected)/layout.tsx`
- Create: `frontend-next/app/(protected)/dashboard/page.tsx`
- Create: `frontend-next/middleware.ts`

- [ ] **Step 1: Create middleware for route protection**

```typescript
// frontend-next/middleware.ts
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith('/login') ||
                     req.nextUrl.pathname.startsWith('/signup') ||
                     req.nextUrl.pathname.startsWith('/verify');
  const isProtectedPage = req.nextUrl.pathname.startsWith('/dashboard');

  // Redirect logged-in users away from auth pages
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
  }

  // Redirect non-logged-in users to login from protected pages
  if (!isLoggedIn && isProtectedPage) {
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

- [ ] **Step 2: Create protected layout**

```typescript
// frontend-next/app/(protected)/layout.tsx
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-900">speech-to-text.me</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{session.user.email}</span>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Create dashboard page**

```typescript
// frontend-next/app/(protected)/dashboard/page.tsx
import { auth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Welcome back, {session?.user?.name || 'User'}!
        </h2>
        <p className="text-gray-600">
          Your current plan: <span className="font-medium capitalize">{session?.user?.tier || 'Free'}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">
              Transcriptions Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">0 / 5</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">
              PDF Conversions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">0 / 5</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">
              Total History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">0</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No transcriptions yet. Start transcribing to see your history here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Update root layout**

```typescript
// frontend-next/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'speech-to-text.me',
  description: 'Convert speech to text instantly with AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

- [ ] **Step 5: Create simple home page**

```typescript
// frontend-next/app/page.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white to-gray-100">
      <div className="text-center space-y-6 px-4">
        <h1 className="text-5xl font-bold text-gray-900">
          speech-to-text.me
        </h1>
        <p className="text-xl text-gray-600 max-w-md">
          Convert speech to text instantly with AI. Record or upload audio and get accurate transcriptions.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/signup">
            <Button size="lg">Get Started</Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg">Sign In</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add frontend-next/app/\(protected\)/ frontend-next/middleware.ts frontend-next/app/layout.tsx frontend-next/app/page.tsx
git commit -m "feat: add protected dashboard route with middleware"
```

---

## Task 8: Update Next.js Port and Test

**Files:**
- Modify: `frontend-next/package.json`

- [ ] **Step 1: Update dev script to use port 3001**

```json
// In frontend-next/package.json, update scripts section:
{
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "lint": "next lint"
  }
}
```

- [ ] **Step 2: Start the dev server**

```bash
cd frontend-next && pnpm dev
```

- [ ] **Step 3: Test the flow**

Manual testing checklist:
1. Visit http://localhost:3001 - should see landing page
2. Click "Sign In" - should go to /login
3. Click "Sign up" link - should go to /signup
4. Try to access /dashboard directly - should redirect to /login
5. Create account with email/password - should go to /verify
6. Check email for verification link
7. Click verification link - should redirect to /login with success message
8. Log in with credentials - should go to /dashboard
9. Click "Sign out" - should return to /login

- [ ] **Step 4: Test Google OAuth (if configured)**

1. Click "Continue with Google" on login page
2. Complete Google OAuth flow
3. Should redirect to /dashboard

- [ ] **Step 5: Final commit**

```bash
git add frontend-next/
git commit -m "feat: complete Phase 1 - Next.js auth foundation"
```

---

## Validation Checkpoint

After completing all tasks, verify:

- [ ] Can sign up with Google OAuth
- [ ] Can sign up with email/password
- [ ] Email verification sent and works
- [ ] Login/logout works correctly
- [ ] Session persists across page refresh
- [ ] Protected routes redirect to login
- [ ] Middleware properly redirects authenticated users away from auth pages

## Environment Setup Required

Before testing, ensure these are configured:

1. **PostgreSQL running** (locally or via Docker)
2. **Google OAuth credentials** (create at console.cloud.google.com)
3. **Resend API key** (create at resend.com)
4. **NEXTAUTH_SECRET** (generate with `openssl rand -base64 32`)

## Next Phase

After validation passes, proceed to **Phase 2: Add Apple + Twitter/X OAuth**
