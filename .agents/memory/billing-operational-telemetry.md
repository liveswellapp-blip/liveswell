---
name: Billing operational telemetry
description: Safety and bounded-growth rules for billing health, webhook, and rollout telemetry.
---

Persist verified, actionable billing failures until an operator explicitly
resolves them. Do not persist unauthenticated webhook signature failures or
irrelevant provider events. Use bounded time-bucket aggregates for rate gates
instead of one durable row per public or repeatable request.

**Why:** Durable unresolved failures survive restarts and support incident
response, but per-request writes on public endpoints create a database
exhaustion path. A rollout failure percentage also needs an honest denominator
that expected user rejections cannot inflate.

**How to apply:** Keep unresolved failures until resolution; expire old
success/resolved history; count successful provider handoffs and technical
failures in bounded provider/time buckets; exclude expected client errors from
technical-rate denominators.