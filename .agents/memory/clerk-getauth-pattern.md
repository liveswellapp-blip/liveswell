---
name: Clerk getAuth pattern
description: In @clerk/express v2+, req.auth is a callable function — use getAuth(req).userId, never req.auth.userId.
---

## Rule
In `@clerk/express` v2.x (and Clerk v5 generally), `clerkMiddleware` sets `req.auth` as a **callable function**, not a plain object. Accessing `req.auth.userId` returns `undefined` because you are reading a property on a function, not calling it.

**Always use:**
```typescript
import { getAuth } from "@clerk/express";
const { userId } = getAuth(req);
```

**Never use:**
```typescript
req.auth.userId        // ← undefined (property on function object)
req.auth().userId      // ← works but fragile
```

**Why:** `requireAuth()` internally calls `request.auth()?.userId` (function call), so protected routes appear to pass auth while the handler reads `undefined`. This caused every user-specific query (favorites, alerts, profile, etc.) to silently return empty/false results and every write endpoint to throw FK constraint violations because the user row was never created.

**How to apply:**
- Import `getAuth` alongside `clerkClient` in any server file that reads auth state.
- Replace all `req.auth.userId` with `getAuth(req).userId` using: `sed -i 's/req\.auth\.userId/getAuth(req).userId/g' server/routes.ts`
- This applies to `server/routes.ts` and any other Express route file.
