import { Resend } from "resend";

// Single Resend client. RESEND_API_KEY and RESEND_FROM_EMAIL need to be set
// in .env (and in the Docker sandbox's env) — see .env.example note below.
//   RESEND_API_KEY=re_xxx
//   RESEND_FROM_EMAIL="Kisaan Setu <noreply@yourdomain.com>"
//   NEXT_PUBLIC_SITE_URL=http://localhost:3000

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM_EMAIL ?? "Kisaan Setu <onboarding@resend.dev>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${SITE_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Verify your Kisaan Setu account",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Confirm your email</h2>
        <p>Click the button below to verify your email and activate your account. This link expires in 24 hours.</p>
        <p>
          <a href="${verifyUrl}"
             style="display:inline-block;padding:10px 20px;background:#16a34a;color:#fff;
                    border-radius:6px;text-decoration:none;">
            Verify Email
          </a>
        </p>
        <p style="color:#666;font-size:12px;">If the button doesn't work, copy this link into your browser:<br/>${verifyUrl}</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${SITE_URL}/ResetPassword?token=${encodeURIComponent(token)}`;

  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Reset your Kisaan Setu password",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Reset your password</h2>
        <p>Click the button below to set a new password. This link expires in 1 hour and can only be used once.</p>
        <p>
          <a href="${resetUrl}"
             style="display:inline-block;padding:10px 20px;background:#16a34a;color:#fff;
                    border-radius:6px;text-decoration:none;">
            Reset Password
          </a>
        </p>
        <p style="color:#666;font-size:12px;">If you didn't request this, you can safely ignore this email.<br/>${resetUrl}</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
}