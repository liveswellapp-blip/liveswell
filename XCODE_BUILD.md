# Building LiveSwell for the App Store (Xcode Guide)

## Prerequisites

- **macOS** with Xcode 15+ installed (free from the Mac App Store)
- **Apple Developer Program** membership ($99/yr) — [developer.apple.com](https://developer.apple.com)
- **Node.js 20+** and this repo cloned locally
- The bundle ID **`com.liveswell.app`** registered in your Apple Developer account

---

## Step 1 — Build the web app

```bash
npm install
npm run build
```

This produces `dist/public/` — the web bundle Capacitor embeds in the native shell.

---

## Step 2 — Sync to the iOS project

```bash
npx cap sync ios
```

This copies the web build into `ios/App/App/public/`, updates native plugins, and regenerates
`ios/App/App/capacitor.config.json`. Run this every time you change `capacitor.config.ts` or
update a Capacitor plugin.

---

## Step 3 — Open in Xcode

```bash
npx cap open ios
```

Or open `ios/App/App.xcworkspace` directly from Finder.
> ⚠️ Always open the **`.xcworkspace`** file, not `.xcodeproj`.

---

## Step 4 — Set your Team & Bundle ID

1. In the project navigator, click **App** (the top-level target)
2. Go to **Signing & Capabilities** tab
3. Under **Signing**, select your Apple Developer **Team**
4. Verify **Bundle Identifier** is `com.liveswell.app`
5. Xcode will automatically create/fetch provisioning profiles

---

## Step 5 — Enable Push Notifications entitlement

1. Still in **Signing & Capabilities**, click **+ Capability**
2. Add **Push Notifications**
3. Add **Background Modes** → check **Remote notifications**

> Push notifications in the iOS app use APNs. You will need to upload an APNs key
> in App Store Connect → Certificates, Identifiers & Profiles → Keys.

---

## Step 6 — Set the marketing version

In **General** → **Identity**:
- **Version**: `1.0.0` (displayed in the App Store)
- **Build**: `1` (increment for each TestFlight / store upload)

---

## Step 7 — Test on a device or simulator

Select a simulator (or plug in your iPhone) and press ▶ to build and run.

The app loads `https://liveswell.io` via WKWebView. Make sure you have internet access.

---

## Step 8 — Archive for distribution

1. Select **Any iOS Device (arm64)** as the destination (not a simulator)
2. Menu → **Product → Archive**
3. Xcode Organizer opens automatically when archiving finishes

---

## Step 9 — Distribute to App Store Connect

1. In Xcode Organizer, select the archive → **Distribute App**
2. Choose **App Store Connect** → **Upload**
3. Leave defaults (strip Swift symbols, upload symbols) → **Next** through signing
4. Click **Upload**

---

## Step 10 — Complete the App Store listing

In [App Store Connect](https://appstoreconnect.apple.com):

1. Go to **My Apps → LiveSwell → iOS App**
2. Fill in:
   - **Description** (up to 4000 chars)
   - **Keywords** (100 chars max, comma-separated)
   - **Support URL**: `https://liveswell.io`
   - **Privacy Policy URL**: `https://liveswell.io/privacy`
3. Upload **screenshots** for iPhone 6.9" and 6.5" (required), plus iPad if targeting iPad
4. Set **Age Rating** (likely 4+)
5. Under **App Review Information**, add a test account if login is required
6. Select the uploaded build under **Build**
7. Click **Submit for Review**

---

## Screenshot sizes required by Apple

| Device | Size |
|--------|------|
| iPhone 6.9" (16 Pro Max) | 1320 × 2868 px |
| iPhone 6.5" (14 Plus) | 1242 × 2688 px |
| iPad Pro 13" (optional) | 2064 × 2752 px |

Use the iOS Simulator at the correct device size and take screenshots with `⌘ + S` or the
Simulator menu → **File → Save Screen**.

---

## Common issues

| Symptom | Fix |
|---------|-----|
| "No profiles for 'com.liveswell.app'" | Register the bundle ID at developer.apple.com → Identifiers |
| App shows blank white screen | Check that `npx cap sync ios` ran after the last `npm run build` |
| Push notifications not working | Add APNs key in App Store Connect and upload it to your server env |
| "Missing compliance" on export | Set `App Uses Non-Exempt Encryption: No` in Info.plist if you don't use custom crypto |

---

## Re-deploying updates

For server-side changes (new features live at `liveswell.io`) — no new app release needed.
The WKWebView always loads the live URL.

For native changes (permissions, plugins, icons) — repeat steps 1–9 with an incremented
**Build** number.
