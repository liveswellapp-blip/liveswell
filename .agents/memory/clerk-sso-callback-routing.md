---
name: Clerk auth subpath routing
description: Embedded Clerk uses wildcard auth subpaths for credential steps, but OAuth callback subpaths need a dedicated callback handler first.
---

## Rule
When using Clerk's embedded `<SignIn routing="path" path="/sign-in">` or `<SignUp routing="path" path="/sign-up">`, Clerk transitions through nested paths. These include:
- `/sign-in/factor-one` and `/sign-in/factor-two` for credentials and MFA
- `/sign-in/sso-callback` and `/sign-up/sso-callback` for OAuth

The Wouter routes must use the exact optional wildcard syntax for the credential and MFA paths. OAuth callback paths must instead be registered explicitly, before the wildcards, to mount `AuthenticateWithRedirectCallback`.

**Why:** A bare `/sign-in` route does not match `/sign-in/factor-one`, so it falls through to the unauthenticated landing page midway through sign-in. But sending an OAuth callback to the embedded `<SignIn>` or `<SignUp>` component leaves the redirect handshake unfinished and can leave the provider button in a loading state.

**How to apply:**
```tsx
<Route path="/sign-in/sso-callback" component={SsoCallback} />
<Route path="/sign-up/sso-callback" component={SsoCallback} />
<Route path="/sign-in/*?" component={ClerkSignIn} />
<Route path="/sign-up/*?" component={ClerkSignUp} />
```
Do not substitute `/sign-in`, `/sign-in/*`, or a named-param pattern; `/*?` is the Wouter pattern that matches both the bare auth route and its nested credential paths. Keep callback routes before the wildcard routes.
