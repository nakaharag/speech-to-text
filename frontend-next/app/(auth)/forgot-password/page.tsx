import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>
          Enter your email and we'll send you a reset link
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ForgotPasswordForm />

        <p className="text-center text-sm text-slate-600">
          Remember your password?{' '}
          <Link href="/login" className="font-medium text-[#3B82F6] hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
