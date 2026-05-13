import { Resend } from 'resend';

export const PASSWORD_RESET_TOKEN_PREFIX = 'reset:';

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

export async function sendVerificationEmail(email: string, token: string) {
  // Point to the API route that processes the token, not the page
  const verifyUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify?token=${token}`;
  const resend = getResendClient();

  // Mask email for display: john@example.com -> j***@example.com
  const [localPart, domain] = email.split('@');
  const maskedEmail = `${localPart[0]}${'*'.repeat(Math.min(localPart.length - 1, 4))}@${domain}`;

  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'noreply@speech-to-text.me',
    to: email,
    subject: 'Verify your email - speech-to-text.me',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f9fafb;">
        <div style="background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 32px;">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin: 0 auto;">
              <path d="M8 24h4M16 16v16M24 8v32M32 16v16M40 24h4" stroke="#3B82F6" stroke-width="3" stroke-linecap="round"/>
            </svg>
            <h1 style="color: #111827; font-size: 24px; font-weight: 600; margin: 16px 0 0;">Welcome to speech-to-text.me</h1>
          </div>

          <p style="color: #4b5563; font-size: 16px; line-height: 24px; margin-bottom: 24px;">
            Thanks for signing up! Please verify your email address to get started.
          </p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${verifyUrl}" style="display: inline-block; background-color: #3B82F6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 16px;">
              Verify Email Address
            </a>
          </div>

          <p style="color: #6b7280; font-size: 14px; line-height: 20px; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
            If you didn't create an account, you can safely ignore this email.
          </p>

          <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
            This link expires in 24 hours. If the button doesn't work, copy and paste this URL:<br>
            <a href="${verifyUrl}" style="color: #3B82F6; word-break: break-all;">${verifyUrl}</a>
          </p>
        </div>

        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
          © ${new Date().getFullYear()} speech-to-text.me
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;
  const resend = getResendClient();

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
