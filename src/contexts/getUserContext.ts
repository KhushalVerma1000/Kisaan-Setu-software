import { auth } from '@/auth';
import { prisma } from '@/utils/Prisma/Client';

export interface UserContext {
  fpoId: string;
  email: string | undefined;
  fpoName: string | null;
}

export async function getUserContext(): Promise<UserContext | null> {
  // Read from NextAuth's JWT session — this is the session cookie set by
  // signIn() in actions.ts. Supabase auth is NOT used here; the two systems
  // use separate cookies and don't know about each other.
  const session = await auth();

  if (!session?.user?.id) return null;

  const userId = session.user.id;

  // Fetch the FPO profile from Postgres via Prisma. fpo_profiles.id is the
  // same UUID as users.id (set as the primary key in schema.prisma).
  const profile = await prisma.fpo_profiles.findUnique({
    where: { id: userId },
    select: { company_name: true },
  });

  return {
    fpoId: userId,
    email: session.user.email ?? undefined,
    fpoName: profile?.company_name ?? session.user.name ?? null,
  };
}