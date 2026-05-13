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
