import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

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
