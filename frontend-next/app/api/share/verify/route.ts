import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shortId, password } = body;

    if (!shortId || !password) {
      return NextResponse.json(
        { error: 'shortId and password are required' },
        { status: 400 }
      );
    }

    // Verify password with backend
    const response = await fetch(`${BACKEND_URL}/share/${shortId}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.message || 'Invalid password' },
        { status: response.status }
      );
    }

    // Set auth cookie that expires in 1 hour
    const cookieStore = await cookies();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    cookieStore.set(`share_${shortId}_auth`, 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: `/s/${shortId}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Share verify error:', error);
    return NextResponse.json(
      { error: 'Failed to verify password' },
      { status: 500 }
    );
  }
}
