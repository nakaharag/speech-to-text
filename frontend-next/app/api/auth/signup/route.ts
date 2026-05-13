import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, validatePassword } from '@/lib/password';
import { sendVerificationEmail, generateToken } from '@/lib/email';
import { checkRateLimit, cleanupRateLimitStore } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Cleanup old rate limit entries
  cleanupRateLimitStore();

  // Check rate limit
  const rateLimit = await checkRateLimit('signup');
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: 'Too many signup attempts. Please try again later.',
        retryAfter: rateLimit.resetAt.toISOString(),
      },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  try {
    const { name, email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      );
    }

    // Normalize email to prevent enumeration via case/whitespace variations
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      // If user exists but email not verified, resend verification
      if (!existingUser.emailVerified) {
        // Delete old tokens
        await prisma.verificationToken.deleteMany({
          where: { identifier: normalizedEmail },
        });

        const token = generateToken();
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await prisma.verificationToken.create({
          data: { identifier: normalizedEmail, token, expires },
        });

        await sendVerificationEmail(normalizedEmail, token);
      }

      // Return same response as success to prevent enumeration
      // User gets email if unverified, nothing if already verified
      return NextResponse.json({ success: true });
    }

    const passwordHash = await hashPassword(password);

    await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
      },
    });

    const token = generateToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.verificationToken.create({
      data: {
        identifier: normalizedEmail,
        token,
        expires,
      },
    });

    await sendVerificationEmail(normalizedEmail, token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
