import { randomBytes, createHmac, timingSafeEqual } from "crypto";

// Email verification uses a stateless, signed token (no DB column needed) —
// it just encodes the user id + an expiry, signed with AUTH_SECRET so it
// can't be forged. Password reset uses a random opaque token instead,
// stored in users.reset_token / reset_token_expires_at, since that one
// needs to be revocable (used-once, or invalidated by a newer request).

const SECRET = process.env.AUTH_SECRET;
if (!SECRET) {
  throw new Error("AUTH_SECRET is not set — required for signing verification tokens.");
}

export function createEmailVerificationToken(userId: string): string {
  const expires = Date.now() + 1000 * 60 * 60 * 24; // 24h
  const payload = `${userId}.${expires}`;
  const signature = createHmac("sha256", SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

export function verifyEmailVerificationToken(token: string): { userId: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [userId, expiresStr, signature] = decoded.split(".");
    if (!userId || !expiresStr || !signature) return null;

    const expected = createHmac("sha256", SECRET!).update(`${userId}.${expiresStr}`).digest("hex");
    const expectedBuf = Buffer.from(expected);
    const actualBuf = Buffer.from(signature);
    if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
      return null;
    }

    if (Date.now() > Number(expiresStr)) return null;

    return { userId };
  } catch {
    return null;
  }
}

export function createPasswordResetToken(): { token: string; expiresAt: Date } {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1h
  return { token, expiresAt };
}

