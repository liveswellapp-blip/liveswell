/**
 * Ensures a redirect URL is safe to use after sign-in.
 *
 * Only relative paths (starting with "/") are accepted.
 * Any value that could point to an external origin — http://, https://, //,
 * or anything that doesn't start with a forward slash — is replaced with "/".
 *
 * This prevents open-redirect attacks where a crafted link such as
 *   /sign-in?redirect_url=https%3A%2F%2Fevil.com
 * would silently send the user to an external site after OAuth.
 */
export function sanitizeRedirectUrl(value: string): string {
  // Only accept values that start with a single "/" but NOT "//"
  // (double-slash is a protocol-relative URL and equally dangerous).
  if (/^\/(?!\/)/.test(value)) {
    return value;
  }
  return "/";
}
