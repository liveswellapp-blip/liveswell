---
name: Legacy user ID migration
description: Safe constraints for moving a legacy account row to a Clerk user ID.
---

## Rule

When reconciling a legacy account with a Clerk ID, update only tables that have
a direct `user_id` relationship. Do not update `alert_trigger_log` as though it
has a user ID; it belongs to its alert through `alert_id`.

**Why:** Attempting an update against a non-existent Drizzle column compiles to
malformed SQL and aborts the entire transaction. That can prevent the local
account row from being created, which in turn blocks authenticated checkout.

**How to apply:** Migrate `user_alerts.user_id`; the linked alert-trigger
history follows that alert automatically. Before adding a child table to the
reconciliation transaction, verify that the table schema has a direct user ID
rather than an indirect relationship.