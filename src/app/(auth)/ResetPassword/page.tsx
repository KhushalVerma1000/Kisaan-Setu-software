'use client'

import React, { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { resetPassword } from './actions'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? '';

  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(undefined);
    const result = await resetPassword(formData);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push('/Login?reset=1');
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Invalid link</CardTitle>
            <CardDescription>
              This password reset link is missing its token. Request a new one from the forgot password page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Set a new password</CardTitle>
          <CardDescription>Choose a new password for your account.</CardDescription>
        </CardHeader>
        <form action={handleSubmit}>
          <input type="hidden" name="token" value={token} />
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input id="password" name="password" type="password" required minLength={8} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Saving..." : "Reset password"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}