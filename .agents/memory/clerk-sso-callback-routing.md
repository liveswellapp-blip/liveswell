---
name: Clerk SSO callback routing
description: Clerk auto-generates /sign-in/sso-callback and /sign-up/sso-callback sub-paths — they must be explicitly registered in the router.
---

## Rule
When using Clerk's embedded `<SignIn routing="path" path="/sign-in">` or `<SignUp routing="path" path="/sign-up">`, Clerk appends `/sso-callback` to the component's `path` prop for all OAuth flows (Google, Apple, email magic link). This means the browser lands at:
- `/sign-in/sso-callback` (from SignIn flows)
- `/sign-up/sso-callback` (from SignUp flows)

These sub-paths must be explicitly registered in the router, pointing to a component that renders `<AuthenticateWithRedirectCallback>`.

**Why:** Without these routes, the router falls through to the catch-all (landing page / unauthenticated fallback). Clerk has no mounted component to complete the session handshake → `clerkUser` stays null → landing page loop. This was the root cause of the mobile Chrome Google sign-in redirect loop on liveswell.io.

**How to apply:**
```tsx
<Route path="/sso-callback" component={SsoCallback} />
<Route path="/sign-in/sso-callback" component={SsoCallback} />
<Route path="/sign-up/sso-callback" component={SsoCallback} />
```
All three point to the same `SsoCallback` component (`<AuthenticateWithRedirectCallback afterSignInUrl="/" afterSignUpUrl="/" />`).

The callback URL the user actually landed on was:
`https://liveswell.io/sign-up/sso-callback?sign_up_fallback_redirect_url=https%3A%2F%2Fliveswell.io%2F&sign_in_fallback_redirect_url=https%3A%2F%2Fliveswell.io%2F`

This is confirmed behavior in @clerk/clerk-react ^5.x.
