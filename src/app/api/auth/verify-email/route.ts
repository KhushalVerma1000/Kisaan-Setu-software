import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/utils/Prisma/Client";
import { verifyEmailVerificationToken } from "@/server/auth/tokens";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/error", request.url));
  }

  const result = verifyEmailVerificationToken(token);
  if (!result) {
    // Covers both a bad signature and an expired token — no need to
    // distinguish for the user, an expired link just needs a fresh signup
    // or a "resend verification" flow (not built yet, see note below).
    return NextResponse.redirect(new URL("/error", request.url));
  }

  await prisma.users.update({
    where: { id: result.userId },
    data: { email_verified_at: new Date() },
  });

  return NextResponse.redirect(new URL("/Login?verified=1", request.url));
}