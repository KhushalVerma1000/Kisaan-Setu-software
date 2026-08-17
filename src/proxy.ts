import { NextResponse } from "next/server";
import { auth } from "@/auth";

// `auth(callback)` wraps our handler and gives us `req.auth` (the decoded
// JWT session) without us touching cookies directly. This still pulls in
// @/auth's module graph (Prisma + bcryptjs) — that's fine here because
// proxy.ts always runs on the Node.js runtime in Next 16 (unlike the old
// middleware.ts convention, which defaulted to Edge and needed an explicit
// runtime override). No config needed for that; it's just how proxy works.
export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;

  const publicPaths = [
    "/Login",
    "/Signup",
    "/ForgotPassword",
    "/ResetPassword",
    "/ContactAdmin",
  ];
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));
  const isPublicApiRoute = pathname.startsWith("/api/auth");
  const isRoot = pathname === "/";

  if (!req.auth && !isPublicPath && !isPublicApiRoute && !isRoot) {
    const loginUrl = new URL("/Login", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};