---
name: Resend sender domain
description: The attached Resend connector verifies the LiveSwell sender domain for branded transactional email.
---

The attached Resend account recognizes `liveswell.io` as a verified sending domain. Its required DKIM record and the SPF TXT and MX records on `send.liveswell.io` are verified.

**Why:** The domain must remain verifiable for Resend to accept branded transactional email. A connector health check alone only proves the API is reachable; it does not prove the configured sender is accepted.

**How to apply:** Keep the corresponding DNS records intact and configure `RESEND_FROM_EMAIL` with a LiveSwell sender. Treat a domain-verification failure as a delivery error rather than sending via a third-party fallback address.