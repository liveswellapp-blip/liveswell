# Building LiveSwell for Google Play (Android Studio Guide)

## Prerequisites

- **macOS, Windows, or Linux** with [Android Studio](https://developer.android.com/studio) (Hedgehog 2023.1.1+) installed
- **Java 17** (bundled with Android Studio — no separate install needed)
- **Google Play Developer account** ($25 one-time registration fee) — [play.google.com/console](https://play.google.com/console)
- **Node.js 20+** and this repo cloned locally
- The application ID **`com.liveswell.app`** — already set in `capacitor.config.ts`

---

## Step 1 — Build the web app

```bash
npm install
npm run build
```

This produces `dist/public/` — the web bundle Capacitor embeds in the native shell.

---

## Step 2 — Sync to the Android project

```bash
npx cap sync android
```

This copies the web build into `android/app/src/main/assets/public/`, updates native
plugins, and regenerates `android/app/src/main/assets/capacitor.config.json`.
Run this every time you change `capacitor.config.ts` or update a Capacitor plugin.

---

## Step 3 — Open in Android Studio

```bash
npx cap open android
```

Or open the `android/` folder directly from **File → Open** in Android Studio.

---

## Step 4 — Set the version name and code

In Android Studio, open **`android/app/build.gradle`** and update:

```groovy
android {
    defaultConfig {
        versionCode 1          // increment by 1 for every Play Store upload
        versionName "1.0.0"    // human-readable version shown in the store
    }
}
```

> **Rule:** `versionCode` must always increase. Play Console rejects a build if its
> `versionCode` is the same as or lower than a previously uploaded build.

---

## Step 5 — Connect a device or start an emulator

- **Physical device**: enable *Developer Options → USB Debugging* and plug in via USB
- **Emulator**: in Android Studio, open **Device Manager** → **Create Device** →
  choose a Pixel profile with API 34 (Android 14)

Press **▶** (Run) to build and launch the app. It loads `https://liveswell.io` via
WebView — ensure you have an internet connection.

---

## Step 6 — Create a signing keystore (first release only)

Google Play requires every APK / AAB to be signed with a consistent key.

```bash
keytool -genkey -v \
  -keystore liveswell-release.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias liveswell
```

Store the generated `.jks` file and its passwords somewhere safe (password manager).
**Never commit the keystore or its passwords to the repository.**

Configure signing in `android/app/build.gradle`:

```groovy
android {
    signingConfigs {
        release {
            storeFile file("../../liveswell-release.jks")  // path relative to app/
            storePassword "YOUR_STORE_PASSWORD"
            keyAlias "liveswell"
            keyPassword "YOUR_KEY_PASSWORD"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
        }
    }
}
```

---

## Step 7 — Build a release AAB (Android App Bundle)

In Android Studio:

1. **Build → Generate Signed Bundle / APK**
2. Choose **Android App Bundle** → **Next**
3. Select the keystore you created in Step 6
4. Choose **release** build variant → **Finish**

The output is at:
```
android/app/release/app-release.aab
```

Or from the command line:

```bash
cd android
./gradlew bundleRelease
```

---

## Step 8 — Set up Firebase Cloud Messaging (push notifications)

Push notifications on Android require FCM. Without this, alerts will not reach Android users.

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project**
2. Add an Android app with package name `com.liveswell.app`
3. Download **`google-services.json`** and place it at `android/app/google-services.json`
4. Make sure `android/build.gradle` includes:
   ```groovy
   classpath 'com.google.gms:google-services:4.4.0'
   ```
5. Make sure `android/app/build.gradle` includes:
   ```groovy
   apply plugin: 'com.google.gms.google-services'
   ```
6. Run `npx cap sync android` again after adding the file

See **Task #116** — "Wire up Android FCM so push alerts reach Android users natively"
for the full server-side integration.

---

## Step 9 — Upload to Google Play Console

1. Go to [play.google.com/console](https://play.google.com/console)
2. **Create app** → set name "LiveSwell", default language, app/game, free/paid
3. Navigate to **Release → Production → Create new release**
4. Under **App bundles**, upload `app-release.aab`
5. Add release notes (what's new in this version)
6. Click **Save** then **Review release**

---

## Step 10 — Complete the store listing

Under **Store presence → Main store listing**:

| Field | Value |
|-------|-------|
| App name | LiveSwell |
| Short description | Real-time surf alerts for your favourite breaks |
| Full description | (up to 4000 chars — describe conditions monitoring, alerts, AI summaries) |
| App icon | 512 × 512 px PNG (no alpha) |
| Feature graphic | 1024 × 500 px JPG or PNG |
| Phone screenshots | At least 2, up to 8 (min 320 px on shortest side) |
| Category | Sports |
| Privacy policy URL | https://liveswell.io/privacy |
| Support email | (your support address) |

---

## Step 11 — Submit for review

1. In Play Console, go to **Publishing overview**
2. Confirm all required fields show green ticks
3. Click **Send changes to review**

Google Play review typically takes 1–3 days for new apps.

---

## Required app icon sizes (already generated)

| Density | Launcher icon | Round icon | Adaptive foreground |
|---------|--------------|-----------|---------------------|
| mdpi    | 48 × 48 px   | 48 × 48   | 108 × 108 px        |
| hdpi    | 72 × 72 px   | 72 × 72   | 162 × 162 px        |
| xhdpi   | 96 × 96 px   | 96 × 96   | 216 × 216 px        |
| xxhdpi  | 144 × 144 px | 144 × 144 | 324 × 324 px        |
| xxxhdpi | 192 × 192 px | 192 × 192 | 432 × 432 px        |

All icons are in `android/app/src/main/res/mipmap-*/`.
The adaptive icon (Android 8.0+) uses a navy `#0D1F3C` background with a wave-mark foreground.

The Play Store also requires a **512 × 512 px** high-res icon (PNG, no alpha).
Generate one with:

```bash
python3 - << 'EOF'
from PIL import Image, ImageDraw
BG, WAVE = (13, 31, 60), (16, 185, 129)
size = 512
img = Image.new("RGB", (size, size), BG)
d = ImageDraw.Draw(img)
cx, cy = size/2, size*0.52
stroke = max(2, int(size*0.055))
arcs = [
    ([cx-size*.38, cy-size*.22, cx+size*.38, cy+size*.22], 120, stroke-1),
    ([cx-size*.28, cy-size*.165, cx+size*.28, cy+size*.165], 180, stroke),
    ([cx-size*.18, cy-size*.11, cx+size*.18, cy+size*.11], 255, stroke),
]
for (xy, alpha, w) in arcs:
    d.arc(xy, start=200, end=340, fill=(*WAVE, alpha), width=w)
dot_r = int(size*0.07)
d.ellipse([cx-dot_r, cy-size*.35-dot_r, cx+dot_r, cy-size*.35+dot_r], fill=WAVE)
img.save("liveswell-play-icon-512.png")
print("Saved liveswell-play-icon-512.png")
EOF
```

---

## AndroidManifest permissions

The following permissions are declared in `android/app/src/main/AndroidManifest.xml`:

| Permission | Why |
|-----------|-----|
| `INTERNET` | All content loads from `liveswell.io` |
| `POST_NOTIFICATIONS` | Required on Android 13+ to show push alerts |
| `ACCESS_COARSE_LOCATION` | Nearest surf-spot lookup |
| `ACCESS_FINE_LOCATION` | Improved location accuracy |
| `WAKE_LOCK` | Keeps CPU awake during background syncs |
| `SCHEDULE_EXACT_ALARM` | Capacitor local notifications |
| `VIBRATE` | Alert vibration feedback |

---

## Common issues

| Symptom | Fix |
|---------|-----|
| Blank white screen | Run `npx cap sync android` after `npm run build` |
| "INSTALL_FAILED_UPDATE_INCOMPATIBLE" | Uninstall the app from the device before reinstalling |
| Build fails: "Duplicate class kotlin.collections…" | Add `implementation(platform("org.jetbrains.kotlin:kotlin-bom:1.8.0"))` to `app/build.gradle` |
| Push notifications not delivered | Add `google-services.json` and ensure FCM is wired up (Task #116) |
| "App not optimized" warning in Play Console | AAB format is required — do not upload a plain APK |
| Version code rejected | `versionCode` must be strictly higher than the last uploaded build |

---

## Re-deploying updates

**Server-side changes** (new features live at `liveswell.io`) — no new app release needed.
The WebView always loads the live URL.

**Native changes** (permissions, plugins, icons, FCM config) — repeat Steps 1–9 with an
incremented `versionCode`.
