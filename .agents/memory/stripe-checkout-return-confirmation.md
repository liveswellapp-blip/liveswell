---
name: Stripe checkout return confirmation
description: How embedded Stripe Checkout activates access safely when lifecycle webhooks are delayed.
---

## Rule

Treat Stripe webhooks as the authority for ongoing subscription changes, but
confirm a completed embedded Checkout return directly with Stripe as a recovery
path. The return confirmation must require a signed-in Clerk user and verify
that both the Checkout session and resulting subscription carry that same user
ID in metadata, with matching Stripe customer IDs.

**Why:** A customer can complete payment while webhook delivery is delayed.
Polling only the local billing row strands the customer on a pending screen
despite Stripe already reporting an active, paid subscription.

**How to apply:** Use the authenticated return-session confirmation only to
reconcile the specific completed subscription through the normal Stripe
transition guard. Keep webhooks enabled for renewals, payment failures, and
cancellations; never grant access solely from a browser query parameter.