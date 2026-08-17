'use server'

import { prisma } from '@/utils/Prisma/Client'
import { createPasswordResetToken } from '@/server/auth/tokens'
import { sendPasswordResetEmail } from '@/server/services/email'

interface ForgotPasswordResult {
  error?: string;
  success?: boolean;
}

export async function requestPasswordReset(formData: FormData): Promise<ForgotPasswordResult> {
  const email = formData.get('email') as string;

  if (!email) {
    return { error: "Email is required" };
  }

  const user = await prisma.users.findUnique({ where: { email } });

  // Always return the same success message whether or not the email
  // exists — otherwise this endpoint becomes a way to enumerate
  // registered emails.
  if (user) {
    const { token, expiresAt } = createPasswordResetToken();

    await prisma.users.update({
      where: { id: user.id },
      data: {
        reset_token: token,
        reset_token_expires_at: expiresAt,
      },
    });

    await sendPasswordResetEmail(email, token);
  }

  return { success: true };
}