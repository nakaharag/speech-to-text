import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendVerificationEmail, generateToken } from '@/lib/email';
import { checkRateLimit, cleanupRateLimitStore } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Cleanup old rate limit entries
  cleanupRateLimitStore();

  // Check rate limit (reuse signup rate limit)
  const rateLimit = await checkRateLimit('signup');
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: 'Too many requests. Please try again later.',
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
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists and is not verified
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    console.log('[Resend Verification] Email:', normalizedEmail);
    console.log('[Resend Verification] User found:', !!user);
    console.log('[Resend Verification] Email verified:', user?.emailVerified);

    // Always return success to prevent email enumeration
    // Only actually send if user exists and is not verified
    if (user && !user.emailVerified) {
      // Delete old tokens
      await prisma.verificationToken.deleteMany({
        where: { identifier: normalizedEmail },
      });

      const token = generateToken();
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await prisma.verificationToken.create({
        data: { identifier: normalizedEmail, token, expires },
      });

      console.log('[Resend Verification] Sending verification email...');
      await sendVerificationEmail(normalizedEmail, token);
      console.log('[Resend Verification] Email sent successfully');
    } else {
      console.log('[Resend Verification] Skipping - user not found or already verified');
    }

    // Return success regardless of whether email was sent
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
