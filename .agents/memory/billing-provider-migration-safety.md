---
name: Billing provider migration safety
description: Durable consent and event-ordering rules for moving a paid entitlement between providers.
---

A paid-provider transfer requires a short-lived, server-generated intent that is
persisted at consent time and copied into the destination checkout and
subscription metadata. Transfer ownership only when the verified subscription
matches that intent and was created inside its consent window.

Recheck each provider's canonical lifecycle state after locking the user row.
Never restore, grant, or revoke paid ownership from webhook delivery order or a
stored provider identifier alone.

**Why:** Checkout can be abandoned and webhooks can be delayed, duplicated, or
delivered out of order. Durable unscoped consent or event-payload trust lets an
unrelated later subscription take ownership, or lets an inactive legacy
membership regain influence.

**How to apply:** Use this rule for every cross-provider billing migration.
Fail closed when canonical provider state or plan ownership cannot be verified;
preserve independent complimentary and test grants throughout the transfer.