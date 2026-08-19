---
name: Admin-created Clerk accounts
description: The live Clerk tenant requires an E.164 phone number when an administrator provisions an account.
---

Admin-created accounts must collect and send a valid E.164 phone number with the email and password.

**Why:** The live Clerk tenant rejects creation requests that omit `phone_number`, before the welcome-email workflow can run.

**How to apply:** Keep the admin account-creation UI and API validation aligned with this tenant requirement; do not fabricate a phone number for a real user.