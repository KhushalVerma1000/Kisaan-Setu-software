'use server'

import bcrypt from 'bcryptjs'
import { prisma } from '@/utils/Prisma/Client'

interface ResetPasswordResult {
  error?: string;
  success?: boolean;
}

const BCRYPT_ROUNDS = 12;

export async function resetPassword(formData: FormData): Promise<ResetPasswordResult> {
  const token = formData.get('token') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!token) {
    return { error: "Missing or invalid reset link" };
  }

  if (!password || !confirmPassword) {
    return { error: "Both password fields are required" };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  // Opaque, DB-backed token (unlike the signed email-verification token) —
  // it has to be looked up, so we can check it's unused (still present)
  // and not expired, and clear it in the same update so it can't be
  // replayed.
  const user = await prisma.users.findFirst({
    where: {
      reset_token: token,
      reset_token_expires_at: { gt: new Date() },
    },
  });

  if (!user) {
    return { error: "This reset link is invalid or has expired. Please request a new one." };
  }

  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await prisma.users.update({
    where: { id: user.id },
    data: {
      password_hash,
      reset_token: null,
      reset_token_expires_at: null,
    },
  });

  return { success: true };
}