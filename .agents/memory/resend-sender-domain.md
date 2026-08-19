---
name: Resend sender domain
description: The attached Resend connector does not currently recognize the LiveSwell sender domain.
---

The Resend connector rejects the configured LiveSwell sender and email delivery falls back to Resend's shared onboarding sender.

**Why:** A live welcome-email delivery test succeeded only after the fallback path ran; the connector account has not verified the domain used by `RESEND_FROM_EMAIL`.

**How to apply:** Verify the LiveSwell sender domain in the attached Resend account before relying on branded transactional mail. Keep the fallback as an outage-safe delivery path.