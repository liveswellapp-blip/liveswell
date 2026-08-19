---
name: Clerk auth subpath routing
description: Embedded Clerk flows use nested sign-in and sign-up paths that Wouter must route to the same auth component.
---

## Rule
When using Clerk's embedded `<SignIn routing="path" path="/sign-in">` or `<SignUp routing="path" path="/sign-up">`, Clerk transitions through nested paths. These include:
- `/sign-in/factor-one` and `/sign-in/factor-two` for credentials and MFA
- `/sign-in/sso-callback` and `/sign-up/sso-callback` for OAuth

The Wouter routes must use the exact optional wildcard syntax so all Clerk-controlled subpaths render the corresponding embedded auth component.

**Why:** A bare `/sign-in` route does not match `/sign-in/factor-one`. It falls through to the unauthenticated landing-page route midway through sign-in, making the flow appear to bounce users back to marketing. The same risk exists for SSO callback paths.

**How to apply:**
```tsx
<Route path="/sign-in/*?" component={ClerkSignIn} />
<Route path="/sign-up/*?" component={ClerkSignUp} />
```
Do not substitute `/sign-in`, `/sign-in/*`, or a named-param pattern; `/*?` is the Wouter pattern that matches both the bare auth route and its nested Clerk paths.
