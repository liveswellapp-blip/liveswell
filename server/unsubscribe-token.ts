import { createHmac, timingSafeEqual } from 'crypto';

const SECRET = process.env.SESSION_SECRET || 'liveswell-unsubscribe-fallback-secret';

/**
 * Creates a signed, tamper-proof unsubscribe token for the given alert + email pair.
 *
 * Format: base64url(alertId:email).<HMAC-SHA256 signature>
 *
 * The token is tied to both alertId and email so it can't be reused across
 * different alerts or email addresses.
 */
export function createUnsubscribeToken(alertId: number, email: string): string {
  const payload = `${alertId}:${email}`;
  const encoded = Buffer.from(payload).toString('base64url');
  const sig = createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${encoded}.${sig}`;
}

/**
 * Verifies a token produced by createUnsubscribeToken.
 * Returns { alertId, email } when valid, or null when the token is missing,
 * malformed, or has been tampered with.
 */
export function verifyUnsubscribeToken(token: string): { alertId: number; email: string } | null {
  if (!token) return null;

  const dotIdx = token.indexOf('.');
  if (dotIdx === -1) return null;

  const encoded = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);

  let payload: string;
  try {
    payload = Buffer.from(encoded, 'base64url').toString();
  } catch {
    return null;
  }

  const expectedSig = createHmac('sha256', SECRET).update(payload).digest('base64url');

  // Constant-time comparison to prevent timing attacks
  try {
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expectedBuf)) return null;
  } catch {
    return null;
  }

  const colonIdx = payload.indexOf(':');
  if (colonIdx === -1) return null;

  const alertId = parseInt(payload.slice(0, colonIdx), 10);
  const email = payload.slice(colonIdx + 1);

  if (isNaN(alertId) || alertId <= 0 || !email) return null;
  return { alertId, email };
}
