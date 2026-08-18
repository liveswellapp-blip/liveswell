import { createHmac, timingSafeEqual } from 'crypto';

const SECRET = process.env.SESSION_SECRET || 'liveswell-unsubscribe-fallback-secret';

// ── Undo-token helpers ──────────────────────────────────────────────────────
// These are separate from the plain unsubscribe token so they can carry an
// expiry timestamp and be marked single-use via a DB-persisted token hash.

export const UNDO_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Creates a signed, time-limited undo token for re-enabling email on an alert.
 * Embeds `wasActive` (the alert's active state before unsubscribing) so the
 * undo handler can restore it exactly without inferring from current DB state.
 *
 * Format: base64url(alertId:email:expiresAt:w).<HMAC-SHA256>
 *   where w = '1' (was active) or '0' (was inactive)
 */
export function createUndoToken(alertId: number, email: string, wasActive: boolean): string {
  const expiresAt = Date.now() + UNDO_TTL_MS;
  const w = wasActive ? '1' : '0';
  const payload = `${alertId}:${email}:${expiresAt}:${w}`;
  const encoded = Buffer.from(payload).toString('base64url');
  const sig = createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${encoded}.${sig}`;
}

/**
 * Verifies the HMAC signature and expiry of an undo token.
 * Returns { alertId, email, wasActive } when valid, or null when the token is
 * missing/malformed/tampered/expired.
 *
 * NOTE: does NOT check whether the token has been consumed.  The caller must
 * call storage.consumeAndReenableEmail() which does the atomic consume+restore
 * in a single DB transaction.
 */
export function verifyUndoToken(token: string): { alertId: number; email: string; wasActive: boolean } | null {
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

  try {
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expectedBuf)) return null;
  } catch {
    return null;
  }

  // payload = "alertId:email:expiresAt:w"
  // Split on ':' — email may contain ':', so take first, last-two, and middle
  const colonIdx = payload.indexOf(':');
  if (colonIdx === -1) return null;
  const alertId = parseInt(payload.slice(0, colonIdx), 10);
  if (isNaN(alertId) || alertId <= 0) return null;

  const rest = payload.slice(colonIdx + 1); // "email:expiresAt:w"
  const lastColon2 = rest.lastIndexOf(':');
  if (lastColon2 === -1) return null;
  const w = rest.slice(lastColon2 + 1); // '1' or '0'

  const beforeW = rest.slice(0, lastColon2); // "email:expiresAt"
  const lastColon1 = beforeW.lastIndexOf(':');
  if (lastColon1 === -1) return null;
  const expiresAt = parseInt(beforeW.slice(lastColon1 + 1), 10);
  if (isNaN(expiresAt) || Date.now() > expiresAt) return null; // expired

  const email = beforeW.slice(0, lastColon1);
  if (!email) return null;

  const wasActive = w === '1';
  return { alertId, email, wasActive };
}

/**
 * Returns a stable, opaque key for an undo token suitable for use as a
 * database lookup key (SHA-256 hex of the full raw token string).
 * Using a hash avoids storing the signed token itself in the DB.
 */
export function hashUndoToken(token: string): string {
  return createHmac('sha256', SECRET).update(token).digest('hex');
}

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
