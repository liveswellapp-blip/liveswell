# LiveSwell Stripe Launch Runbook

This runbook is the release gate for web subscriptions. It does not cover App
Store or Play Store billing, and it does not remove legacy Whop support.

## Production identity

- Published origin: `https://liveswell.io`
- Stripe webhook: `https://liveswell.io/api/stripe/webhook`
- Checkout return: `https://liveswell.io/pricing?stripe_session_id=...`
- Billing-management return: `https://liveswell.io/account`
- Catalog lookup keys:
  - `liveswell_pro_monthly_v1` — USD $4.99 monthly
  - `liveswell_pro_annual_v1` — USD $29.99 yearly

The Stripe connection supplies all credentials. Never copy a secret key,
webhook signing secret, client secret, card number, or Billing Portal URL into
logs, tickets, chat, or this file.

## Read-only preflight

Run the verifier before changing the acquisition cohort. It does not create or
modify Stripe objects.

```bash
# Development/test connection
npm run stripe:verify -- --expect-mode=test --origin=https://<development-domain>

# Published production connection
npm run stripe:verify -- --expect-mode=live --origin=https://liveswell.io
```

The check fails unless the mode is explicit, both allowlisted prices match the
catalog, the expected enabled webhook exists with required events, and the live
account can accept charges. Run `npm run stripe:seed` only when intentionally
creating a missing catalog; it is not a verification command.

Production must also show a successful Stripe startup/backfill in deployment
logs. If Stripe checkout is enabled, a Stripe startup failure is fatal. To keep
the app available during an incident, use the dashboard rollback while it is
reachable. If a failed start makes the dashboard unreachable:

1. set the production environment variable
   `BILLING_EMERGENCY_CHECKOUT_PROVIDER=whop`;
2. restart or republish; Stripe initialization is now non-fatal and all new
   checkout routes to Whop before database settings are read;
3. in Billing Cutover, apply Whop at 0% to persist the rollback;
4. remove the environment override and restart again.

The override can only force Whop. While it is active, the server rejects any
attempt to enable Stripe.

## Test-mode acceptance matrix

Use a dedicated Clerk test user and Stripe test mode. Never grant Pro manually
while testing the lifecycle.

1. **New signup:** start monthly and annual checkout. Confirm the server creates
   the customer/session and the browser alone does not unlock Pro.
2. **Payment confirmation:** complete Checkout with Stripe test card
   `4242 4242 4242 4242`; Pro appears only after a verified Stripe event and
   provider-neutral status refresh.
3. **Renewal:** advance a Stripe test clock or pay the renewal invoice. Confirm
   `invoice.paid`, the new period end, invoice link, and uninterrupted Pro.
4. **Cancellation:** cancel at period end in LiveSwell. Confirm the account
   remains Pro until the period end and displays the cancellation date.
5. **Resumption:** resume before period end. Confirm cancellation clears without
   creating another subscription.
6. **Failed payment:** use Stripe's decline/test-clock flow. Confirm `past_due`
   keeps Pro during retry grace and `unpaid` removes only Stripe-paid access.
7. **Duplicate webhook:** resend the same verified event from Stripe. Confirm no
   duplicate entitlement transition or second subscription.
8. **Delayed webhook:** deliver an older active event after canonical
   cancellation. Confirm canonical Stripe state wins.
9. **Provider isolation:** repeat cancellation/failure against a Whop-paid,
   complimentary, and test account. Confirm Stripe cannot revoke those sources.
10. **Management:** confirm plan change, card update, invoice document,
    cancellation, and resumption reject objects owned by another user.

Record only user ID, event ID, customer ID, subscription ID, expected state, and
result. Do not record payment or session secrets.

## Staged production rollout

The on-call admin owns each gate in the Billing Cutover card.

1. Start at Stripe provider with a **0%** cohort and run the live preflight plus
   one controlled real purchase/refund.
2. Move to **5%** for at least 24 hours and at least 10 checkout attempts.
3. Move to **25%** for at least 24 hours.
4. Move to **50%** for at least 24 hours.
5. Move to **100%** only after all gates pass.

At every stage require:

- zero unresolved verified-webhook or reconciliation failures;
- zero provider-ownership or Pro-access mismatches;
- zero duplicate active subscriptions created by LiveSwell;
- checkout technical-failure rate below 1%;
- no unexplained rise in payment failures or billing support contacts;
- the admin per-user Billing Diagnostics view agrees with Stripe.

The Billing Cutover card computes the Stripe technical-failure rate from bounded
hourly aggregates over the last 24 hours. A completed technical attempt is
either a successful provider checkout handoff or a 5xx provider/application
failure. Expected 4xx rejections (already subscribed, confirmation required,
invalid input) are excluded so they cannot inflate the denominator. The card
must show at least 10 Stripe attempts and a rate below 1% before expansion.

Billing failures are persisted across restarts. A degraded Billing Operations
status remains degraded until each actionable failure is investigated and the
admin explicitly marks it resolved. Marking resolved preserves the history; it
does not replay a webhook or change entitlement.

Unauthenticated invalid-signature requests and verified non-billing Stripe
events are not persisted. Successful, ignored authenticated operations and
resolved failures expire after 90 days; unresolved failures are retained until
an admin resolves them.

Pause expansion when volume is too low to evaluate. The designated on-call
admin must record approval before each increase.

## Rollback

Select **Whop rollback** in Billing Cutover and confirm. This immediately sends
new checkout to Whop but never cancels, deletes, or rewrites Stripe customers,
subscriptions, invoices, webhooks, or access.

If the app cannot start, use the environment override procedure above. This is
the rollback drill that must be rehearsed at 0% before live rollout.

After rollback:

1. confirm `/pricing` opens Whop checkout for a new test user;
2. confirm existing Stripe users can still manage billing;
3. inspect persisted unresolved billing failures in the admin dashboard and Sentry;
4. resolve or replay failed verified webhooks, confirm canonical access, then
   mark the corresponding operational failure resolved;
5. restore Stripe at 5%, not the previous percentage, after the fix.

## Support responses

- **Past due:** explain that Stripe is retrying the renewal and Pro remains
  available during grace; ask the member to update the card in Account.
- **Access mismatch:** collect the account email plus Stripe subscription or
  Whop membership ID, then compare Billing Diagnostics with canonical provider
  state. Never request card details.
- **Duplicate charge:** identify invoice and subscription IDs in Stripe. Refund
  only the duplicate charge; do not delete the surviving subscription.
- **Invoice/receipt:** direct Stripe users to Account invoices and Whop users to
  Whop Hub.
- **Migration:** remind the member that starting Stripe and canceling Whop are
  separate. LiveSwell must not cancel Whop without the member's action.
- **Refund:** follow the published refund policy and record the Stripe charge,
  refund, invoice, and subscription IDs.

## Disputes and manual reconciliation

Do not grant or revoke Pro from a dispute event alone. A dispute is a financial
case; subscription status remains the entitlement source.

1. Open the dispute in Stripe and record its dispute, charge, invoice, customer,
   and subscription IDs.
2. Find the user by the safe customer/subscription ID in Billing Diagnostics.
3. Compare Stripe's current subscription status with LiveSwell access. Trigger a
   normal subscription reconciliation or replay the latest verified
   subscription event if they differ.
4. Submit evidence or accept the dispute according to the support/refund policy.
5. Cancel the subscription separately only when fraud or the support decision
   requires it; confirm the resulting verified lifecycle event updates access.
6. Record the resolution without card data or client secrets.

## Whop sunset gate

Keep Whop checkout rollback, management links, and webhooks until all conditions
hold:

- zero Whop-paid accounts for 30 consecutive days;
- zero pending or awaiting-cancellation migrations;
- zero migration anomalies and zero Whop billing support cases for 14 days;
- a final provider/account export is retained per policy;
- support and engineering approve removal and a rollback checkpoint exists.