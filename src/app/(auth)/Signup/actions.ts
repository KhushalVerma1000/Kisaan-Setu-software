'use server'

import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { prisma } from '@/utils/Prisma/Client'
import { createEmailVerificationToken } from '@/server/auth/tokens'
import { sendVerificationEmail } from '@/server/services/email'

interface SignupResult {
  error?: string;
  success?: boolean;
}

const BCRYPT_ROUNDS = 12;

export async function signup(formData: FormData): Promise<SignupResult> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;
  const FPOname = formData.get('FPOname') as string;

  if (!email || !password || !confirmPassword) {
    return { error: "All fields are required" };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  try {
    const existing = await prisma.users.findUnique({ where: { email } });
    if (existing) {
      return { error: "Email already registered" };
    }

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await prisma.users.create({
      data: {
        email,
        password_hash,
        fpo_name: FPOname,
      },
    });

    const token = createEmailVerificationToken(user.id);
    await sendVerificationEmail(email, token);
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An unknown error occurred' };
  }

  redirect('/auth/confirmemail');
}