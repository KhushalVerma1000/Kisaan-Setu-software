'use client'

import React, { useState } from 'react'
import { requestPasswordReset } from './actions'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(undefined);
    const result = await requestPasswordReset(formData);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>
            Enter the email on your account and we&apos;ll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        {submitted ? (
          <CardContent>
            <p className="text-sm text-gray-600">
              If that email is registered, a reset link is on its way. Check your inbox.
            </p>
          </CardContent>
        ) : (
          <form action={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required placeholder="you@example.com" />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Sending..." : "Send reset link"}
              </Button>
              <Link href="/Login" className="text-sm text-gray-500 hover:underline">
                Back to login
              </Link>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  )
}