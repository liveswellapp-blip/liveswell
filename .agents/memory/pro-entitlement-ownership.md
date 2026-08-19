---
name: Pro entitlement ownership
description: Durable rules for overlapping paid, complimentary, and test access.
---

Track paid, complimentary, and test Pro entitlements independently, and derive
the user-facing Pro state as their union. A billing lifecycle event may change
only the paid entitlement owned by that same provider.

**Why:** A single Pro boolean cannot safely represent overlapping grants.
Delayed cancellation or payment-failure events otherwise revoke complimentary
or test access, and legacy-provider events can overwrite a newer provider.

**How to apply:** Any new access source needs its own durable entitlement.
Reconcile provider state under a user-row lock, guard provider-specific
identifiers, and preserve every unrelated source when granting or revoking.
Treat a provider marker as historical when its paid entitlement is false so a
new provider can take ownership after the prior subscription has terminated.