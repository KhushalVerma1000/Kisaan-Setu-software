'use server'

import { signIn } from '@/auth'
import { AuthError } from 'next-auth'

interface LoginResult {
  error?: string
}

export async function login(formData: FormData): Promise<LoginResult | void> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  try {
    // Letting signIn() own the redirect (via redirectTo) rather than
    // calling redirect('/Dashboard') ourselves after redirect:false —
    // the two-step version is a known source of a "login succeeds but
    // bounces back to /Login" bug: the session cookie and the redirect
    // can land in the wrong order, so the very next request (to
    // /Dashboard) hits proxy.ts before the cookie is actually visible,
    // and proxy sends it straight back to /Login. Doing it in one call
    // keeps the cookie write and the redirect in the same response.
    await signIn('credentials', {
      email,
      password,
      redirectTo: '/Dashboard',
    });
  } catch (err) {
    if (err instanceof AuthError) {
      // Our own authorize() throws Error("EMAIL_NOT_VERIFIED") for
      // unverified accounts — next-auth wraps that as a CredentialsSignin
      // AuthError, and the original message ends up on err.cause?.err.message.
      const cause = (err as AuthError & { cause?: { err?: Error } }).cause?.err;
      if (cause?.message === 'EMAIL_NOT_VERIFIED') {
        return { error: "Please verify your email before logging in. Check your inbox for the verification link." };
      }
      return { error: "Invalid email or password" };
    }
    // IMPORTANT: on success, signIn() throws Next.js's internal
    // NEXT_REDIRECT signal to perform the redirect — it is NOT an
    // AuthError. It must be rethrown here, or the redirect never happens
    // and this looks exactly like a silent login failure.
    throw err;
  }
}