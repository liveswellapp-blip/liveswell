---
name: Codemagic iOS TestFlight publishing quirks
description: Non-obvious fixes for getting a Capacitor/iOS app through Codemagic CI to TestFlight — pnpm/corepack setup, altool "Cannot determine Apple ID" bug, and bundle ID mismatches.
---

# Codemagic iOS TestFlight publishing quirks

Debugging an iOS Codemagic pipeline (Capacitor app) surfaced several non-obvious failure modes, each masking the next. Order matters — fix in this sequence if the same symptoms recur:

## 1. npm/CocoaPods/corepack on Codemagic's Mac build machines
- Plain `npm install` can crash reproducibly on Codemagic's Mac machines ("Exit handler never called!"). Switch to pnpm.
- pnpm's default symlinked `.pnpm` store breaks CocoaPods' Ruby `require_relative` into `node_modules/@capacitor/ios` (needs a real directory). Fix: `pnpm install --shamefully-hoist --config.node-linker=hoisted`.
- Codemagic's Mac build machine has its own home-directory `package.json` pinning `yarn`. Corepack walks up from cwd past the repo and silently locks onto that pin, no-oping any other package manager. Fix: pin `"packageManager": "pnpm@<version>"` in the repo's own `package.json` so corepack resolves it locally first.

## 2. `app-store-connect fetch-signing-files --create` needs a private key
Fails with "Cannot save Signing Certificates without certificate private key" unless a `CERTIFICATE_PRIVATE_KEY` (a freshly generated RSA key is fine — it's new signing material, not an existing secret) is available via an environment group referenced in `codemagic.yaml`.

## 3. altool "Cannot determine the Apple ID from Bundle ID X and platform IOS" (ExitFailure 31)
This error is misleading — it comes from an internal `altool --list-providers` call that gets silently blocked and its real error swallowed. Known triggers, roughly in order of likelihood:
- Any pending Apple Developer Program agreement (license renewal, and notably the **Paid Apps Agreement** — even for a free app with no IAP, Apple's backend evidently blocks the provider lookup until Business > Agreements shows the Paid Apps Agreement, bank account, and tax form all **Active**, not "Processing"/"Pending User Info").
- Even after all agreements are fully Active, the bug can still persist (confirmed in one session) — the actual, permanent fix is to bypass the broken lookup entirely by passing the app's numeric **Apple ID** (App Store Connect > App Information > Apple ID, distinct from the account holder's login) directly: set `APP_STORE_CONNECT_ALTOOL_ADDITIONAL_ARGUMENTS: "--apple-id <numeric_apple_id>"` as an env var in `codemagic.yaml` (read by the `app-store-connect publish` / `codemagic-cli-tools` command). This short-circuits the provider auto-detection that's failing.
- Reference: fastlane issue #30114 (maintainer iBotPeaches's diagnosis) and PR #29898.

## 4. Bundle ID mismatch between the App Store Connect app record and the actual build (error 90055)
Once altool actually reaches Apple's servers, a genuinely different failure can appear: "This bundle is invalid. The bundle identifier cannot be changed from the current value, '<old-bundle-id>'." This means the App Store Connect app entry was originally registered with a different bundle ID than what the Xcode project/provisioning profile actually use.
- **Apple only locks an app's Bundle ID field after a binary has actually been received by their servers.** If every previous upload attempt failed before reaching Apple (e.g. due to the altool bug above), the Bundle ID field in App Store Connect > App Information remains an editable dropdown — just reselect the correct bundle ID there and save; no need to create a second app record.
- If a real build was ever received under the wrong bundle ID, the field is permanently locked and a new App Store Connect app entry (matching Apple ID differs) is required instead.

## Debugging approach that worked
Always pull the actual Codemagic build's `buildActions` and per-step raw logs via the Codemagic REST API (`GET /builds/:id`, then each action's `logUrl`) rather than relying on the user's description — the real error in the Publishing step log was consistently more specific and different from what surfaced in the UI/user's paraphrase.
