import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail, generateToken, PASSWORD_RESET_TOKEN_PREFIX } from '@/lib/email';
import { checkRateLimit, cleanupRateLimitStore } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Cleanup old rate limit entries
  cleanupRateLimitStore();

  // Check rate limit - still return success message to prevent enumeration
  const rateLimit = await checkRateLimit('password-reset');
  if (!rateLimit.allowed) {
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a reset link has been sent.'
    });
  }

  try {
    const { email } = await request.json();

    // Always return success to prevent account enumeration
    const successResponse = NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a reset link has been sent.'
    });

    if (!email) {
      return successResponse;
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Don't reveal if user exists - return same response
    if (!user || !user.passwordHash) {
      return successResponse;
    }

    // Delete any existing reset tokens for this user
    await prisma.verificationToken.deleteMany({
      where: { identifier: `${PASSWORD_RESET_TOKEN_PREFIX}${normalizedEmail}` },
    });

    const token = generateToken();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.verificationToken.create({
      data: {
        identifier: `${PASSWORD_RESET_TOKEN_PREFIX}${normalizedEmail}`,
        token,
        expires,
      },
    });

    await sendPasswordResetEmail(normalizedEmail, token);

    return successResponse;
  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a reset link has been sent.'
    });
  }
}
