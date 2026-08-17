export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

/**
 * Returns true when the server responded 403 with a suspension message.
 * isAuthenticated in server/auth.ts returns: { message: "Your account has been suspended" }
 */
export function isSuspendedError(error: Error): boolean {
  return (
    error.message.startsWith("403") &&
    error.message.toLowerCase().includes("suspended")
  );
}