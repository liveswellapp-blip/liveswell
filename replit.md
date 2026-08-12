# LiveSwell - Real-time Surf Conditions App

## Overview
LiveSwell is a web application providing real-time surf conditions and weather forecasts for coastal locations globally. It integrates current weather, marine conditions, and surf forecasting to help surfers and marine enthusiasts make informed decisions. The project aims to be a comprehensive resource for surf data, offering an intuitive user experience and broad geographic coverage.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **UI**: Shadcn/ui components (Radix UI primitives) and Tailwind CSS (custom design tokens)
- **State Management**: React Query (TanStack Query)
- **Routing**: Wouter
- **UI/UX Decisions**: Ocean-themed color scheme (emerald, coral, gold accents), responsive grid layouts, card-based designs, dark mode support, custom scrollbars, consistent section spacing, enhanced UV index and card layouts, mobile-optimized search experience.

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **API Pattern**: RESTful API (`/api` namespace)
- **Data Layer**: PostgreSQL database (Neon serverless driver) with Drizzle ORM and Drizzle Kit for schema management.
- **Key Features**: Comprehensive NOAA integration (1,355+ stations), personalized favorites, global surf spot database (229+ locations), sunrise/sunset data, historical conditions, health and monitoring system with admin authentication, dynamic station selection, accurate timezone handling and tide calculations, **real marine wave forecast data integration**.
- **Architecture Patterns**: Two-page architecture (`/` for surf spots discovery, `/conditions` for detailed view), stateless server design, client-side caching.
- **Authentication**: Secure Replit Auth integration using OpenID Connect, with PostgreSQL session storage.
- **Wave Forecasting**: Open-Meteo Marine API integration for authentic wave height predictions (replacing wind-based calculations), with fallback to enhanced groundswell simulation for Atlantic Coast locations.

### Core Features
- **Data Flow**: Location selection, external weather API integration (OpenWeatherMap), server-side data processing, real-time updates (client polling), client-side caching.
- **API Endpoints**: Location search, current conditions, nearby locations, forecast data, nearby spots.
- **Integration**: Real-time NOAA marine data and comprehensive surf forecasting with multiple data overlays.
- **AI Surf Summary**: Intelligent wind classification system that accurately determines onshore/offshore/sideshore conditions based on coastline orientation (East Coast, West Coast, Gulf Coast) and real-time wind direction.

## Push Notification Setup (iOS APNs & Android FCM)

Native push notifications for iOS and Android require credentials from Apple and Firebase. The server code is fully wired up — it will log a warning at startup and gracefully disable native push until the secrets are set.

### iOS — Apple Push Notification service (APNs)

**One-time setup:**
1. Sign in to [developer.apple.com](https://developer.apple.com) → Certificates, Identifiers & Profiles → **Keys**.
2. Click **+** to create a new key. Enable **Apple Push Notifications service (APNs)**. Download the `.p8` file — **it can only be downloaded once**.
3. Note the **Key ID** (10-character string shown on the key detail page).
4. Note your **Team ID** — it appears in the top-right corner of the developer portal under your account name.
5. Set these Replit Secrets:
   - `APNS_KEY` — full contents of the `.p8` file (paste the entire text including `-----BEGIN PRIVATE KEY-----` / `-----END PRIVATE KEY-----`).
   - `APNS_KEY_ID` — the 10-character Key ID.
   - `APNS_TEAM_ID` — the 10-character Team ID.
   - `APNS_BUNDLE_ID` — your app's bundle identifier (default: `com.liveswell.app`).
   - `APNS_SANDBOX` — set to `true` for TestFlight/simulator builds, omit or set to `false` for production.

**Key rotation (APNs auth keys do not expire, but if one is revoked):**
1. Create a new key in the Apple Developer portal (same steps above).
2. Update `APNS_KEY`, `APNS_KEY_ID` in Replit Secrets with the new values.
3. Restart the server — the log will confirm `[APNs] Service initialised`.
4. Revoke the old key in the Apple Developer portal once the new one is confirmed working.

**Relevant files:** `server/apns-service.ts`

---

### Android — Firebase Cloud Messaging (FCM)

**One-time setup:**
1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create (or select) a Firebase project.
2. In the project, go to **Project Settings → Service accounts**.
3. Click **Generate new private key** — this downloads a JSON file.
4. Open the JSON file and set these Replit Secrets:
   - `FIREBASE_PROJECT_ID` — the `project_id` field from the JSON.
   - `FIREBASE_CLIENT_EMAIL` — the `client_email` field from the JSON.
   - `FIREBASE_PRIVATE_KEY` — the `private_key` field from the JSON (paste the full PEM including newlines).
5. In the Firebase console, go to **Build → Cloud Messaging** and confirm FCM is enabled for the project.

**Key rotation:**
1. In Firebase console → Project Settings → Service accounts, click **Generate new private key**.
2. Update `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` in Replit Secrets.
3. Restart the server — the log will confirm `[FCM] Service initialised`.
4. Delete the old service account key from Firebase console.

**Relevant files:** `server/fcm-service.ts`

---

### Verifying push health after setup
- **Server logs at startup** will show `[APNs] Service initialised` and `[FCM] Service initialised` when credentials are correct.
- **Admin push-test endpoints:**
  - `POST /api/admin/apns-test` with `{ "userId": "<clerk-user-id>" }` — sends a real notification to all registered iOS devices for that user.
  - `POST /api/admin/fcm-test` with `{ "userId": "<clerk-user-id>" }` — sends a real notification to all registered Android devices.
- The **admin health dashboard** shows APNs and FCM status under the push-notification health panel.

---

## Email Deliverability Setup

### Verified Sending Domain (Resend)
Outbound emails (daily surf reports, condition alerts, SMS-disabled notices) are sent via the **Resend** integration.

**Production sender address** is controlled by the `RESEND_FROM_EMAIL` Replit Secret.  
Current value: `LiveSwell <alerts@liveswell.io>` (set in Replit Secrets panel).

**To change or re-verify the domain:**
1. Go to [resend.com/domains](https://resend.com/domains) and add / verify your domain.
2. Add the DNS records Resend provides (MX, TXT/DKIM, TXT/SPF, CNAME) at your DNS provider.
3. Wait for Resend to show the domain as **Verified** (usually < 10 min).
4. Update the `RESEND_FROM_EMAIL` secret in Replit to `Display Name <you@yourdomain.com>`.
5. Restart the server — the startup log will confirm the address with `📧 Email from-address: ...`.

**Fallback behaviour:** If `RESEND_FROM_EMAIL` is not set, the server falls back to `onboarding@resend.dev` (Resend's shared test address). The startup log will print a warning in this case. This fallback must not be used in production.

**Relevant files:**
- `server/email-service.ts` — reads `RESEND_FROM_EMAIL`, all `sendEmail()` calls use `FROM_EMAIL`
- Replit Secrets panel — where `RESEND_FROM_EMAIL` is stored

## SMS A2P 10DLC Registration (Twilio)

US carriers require Application-to-Person (A2P) 10DLC registration for SMS sent at scale. Without it, messages are increasingly filtered or blocked as volume grows, and Twilio may suspend the number.

**Twilio phone number:** +1 904-944-9195

### Registration status
- **Brand registration:** ⏳ Pending — owner must complete in Twilio console
- **Campaign registration:** ⏳ Pending — requires brand approval (~1 business day)
- **Phone number linked to campaign:** ⏳ Pending

### Steps to complete (Twilio console)

1. **Register the brand**
   - Go to **Messaging → Regulatory Compliance → Brands → Register** in the [Twilio console](https://console.twilio.com).
   - Company name: **LiveSwell**
   - Website: **liveswell.io**
   - EIN/tax ID: *(owner must supply)*
   - Legal business name, address, and contact info.

2. **Register the campaign** (after brand approval, ~1 business day)
   - Go to **Messaging → Regulatory Compliance → Campaigns → Register**.
   - Use case: **Mixed** or **Low Volume Mixed**.
   - Campaign description: *Surf condition alerts, daily SMS surf reports, and OTP verification codes sent to opted-in users of the LiveSwell app.*
   - Sample messages:
     - Verification: `Your LiveSwell verification code is: 847291. It expires in 10 minutes.`
     - Daily report: `Cocoa Beach Surf Report\n\nLive Conditions (8/12/26 | 7:00 AM EDT)\n\nSwell\n3.2ft @ 12s ENE\n\nWind\n8mph NE\n...Reply STOP to opt out.`
     - Alert: `🚨 LiveSwell Alert\n\nWave height ≥ 4ft at Cocoa Beach\nTriggered: 6:45 AM\n\nOpen the app for full forecast.\nReply STOP to opt out. liveswell.io`
   - Opt-in flow: User enters and verifies phone number in-app; explicit consent is captured at verification time.
   - Opt-out: Standard STOP/UNSTOP handling (Twilio managed) plus in-app SMS disable toggle.

3. **Link the phone number**
   - Under **Messaging Services**, create a service (or use an existing one) and attach +1 904-944-9195.
   - Associate the messaging service with the approved campaign.

4. **Update sender in code** *(if moving to a Messaging Service SID)*
   - If Twilio recommends sending via a Messaging Service SID instead of the raw phone number, update `TWILIO_PHONE_NUMBER` in Replit Secrets to the `MGXXXXXXXX` SID, or add a separate `TWILIO_MESSAGING_SERVICE_SID` secret and update `server/sms-service.ts` to use `messagingServiceSid` instead of `from`.

5. **Record the campaign SID here once approved**
   - Campaign SID: *(fill in after approval, e.g. `CMXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`)*
   - Approved date: *(fill in)*
   - Ongoing cost: ~$10/month brand + ~$10/month campaign (carrier fees)

### After approval — verify delivery
Send a test SMS from the admin panel or via the Twilio console and confirm it arrives on a real US number without filtering.

---

## Billing Alerts & Spend Caps

Misconfigured alerts or traffic spikes can generate unexpected charges on paid APIs. The following spend caps and alerts should be kept active at all times.

### Twilio (SMS)

- **Dashboard:** [console.twilio.com](https://console.twilio.com) → Account → Billing → Manage → Billing Alerts
- **Recommended threshold:** $25/month — email the account owner when monthly spend reaches this amount
- **How to configure:**
  1. In the Twilio console, go to **Account → Billing → Billing Alerts**.
  2. Click **Create Alert**, set the dollar threshold (e.g. $25), and enable **email notification**.
  3. Confirm the alert appears in the list with status **Active**.
- **Current threshold:** $25/month
- **Alert email:** *(set in Twilio console — use the owner's email)*

### OpenAI (AI summaries)

- **Dashboard:** [platform.openai.com](https://platform.openai.com) → Settings → Limits
- **Recommended:** Set a **monthly spend soft limit** of $20 (notifies by email) and a **hard limit** of $40 (cuts off API access).
- **How to configure:**
  1. Go to **Settings → Limits** in the OpenAI platform dashboard.
  2. Under **Usage limits**, set the soft limit (email notification) and hard limit (API suspended).
  3. Confirm the email recipient for notifications under **Settings → Organization → Profile**.
- **Current soft limit:** $20/month | **Hard limit:** $40/month
- **Note:** LiveSwell uses OpenAI via Replit AI Integrations (`AI_INTEGRATIONS_OPENAI_API_KEY` / `AI_INTEGRATIONS_OPENAI_BASE_URL`). Spend is tracked in the OpenAI dashboard under the API key associated with the integration.

### OpenWeather (weather data)

- **Dashboard:** [home.openweathermap.org](https://home.openweathermap.org/subscriptions)
- **Free tier limit:** 1,000 API calls/day. Each unique monitored surf location costs ~216 calls/day (3 OWM endpoints × 72 condition-check cycles). The free tier supports **up to 4 unique monitored locations**.
- **Server-side guard:** The condition monitor logs an **80% utilization warning** at startup when estimated daily usage reaches or exceeds 800 calls/day. The warning appears in server logs and is surfaced in the admin monitoring endpoint (`GET /api/admin/usage-forecast`).
- **Environment variable:** Set `OPENWEATHER_QUOTA_WARN_THRESHOLD` (default: `100`) to control the per-cycle remaining-calls warning in the condition monitor.
- **How to configure alerts (if on a paid plan):**
  1. Log in at [home.openweathermap.org](https://home.openweathermap.org).
  2. Go to **My Services → Subscriptions** to view current plan and call counts.
  3. If a paid plan is active, enable usage notifications in **Account → Notifications**.
- **Upgrade link:** [openweathermap.org/api](https://openweathermap.org/api) — upgrade before adding a 5th unique monitored location.

### Quick reference

| Service | Monthly threshold | Dashboard |
|---|---|---|
| Twilio | $25 alert | console.twilio.com → Billing → Billing Alerts |
| OpenAI | $20 soft / $40 hard | platform.openai.com → Settings → Limits |
| OpenWeather | 1,000 calls/day (free tier) | home.openweathermap.org/subscriptions |

---

## Error Monitoring (Sentry)

Unhandled server errors, React crashes, and unhandled promise rejections are captured and sent to Sentry.

**To activate monitoring:**
1. Sign up at [sentry.io](https://sentry.io) (free tier is sufficient).
2. Create two projects — one for **Node.js** (backend) and one for **React** (frontend).
3. Copy the DSN from each project's Settings → SDK Setup page.
4. Add these Replit Secrets:
   - `SENTRY_DSN` — Node.js project DSN (used by the server)
   - `VITE_SENTRY_DSN` — React project DSN (used by the browser client)
5. Restart the server — the startup log will confirm `[Sentry] Server monitoring initialised`.

**Optional — readable stack traces in production:**
Source maps are uploaded to Sentry automatically during production builds when these secrets are set:
- `SENTRY_AUTH_TOKEN` — from sentry.io → Settings → Auth Tokens
- `SENTRY_ORG` — your Sentry organisation slug (e.g. `liveswell`)
- `SENTRY_PROJECT` — your Sentry project slug (e.g. `liveswell-react`)

**Relevant files:**
- `server/sentry.ts` — server Sentry init
- `client/src/sentry.ts` — client Sentry init
- `server/index.ts` — Sentry Express error handler
- `server/condition-monitor.ts` — Sentry capture in background job error paths
- `vite.config.ts` — source map upload plugin (production only)

---

## External Dependencies

### Core Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting.
- **OpenWeatherMap API**: Weather and marine data source.
- **Replit**: Development and deployment platform.
- **NOAA National Data Buoy Center (NDBC) API**: Real-time wave and marine data.
- **Tides and Currents API**: Authentic tide information.
- **Capacitor**: Hybrid mobile app development for iOS and Android.

### Frontend Libraries
- **React Query**: Server state management and caching.
- **Radix UI**: Accessible component primitives.
- **Lucide React**: Icon library.
- **Date-fns**: Date manipulation utilities.
- **Wouter**: Lightweight routing.

### Development Tools
- **ESBuild**: Server-side bundling.
- **TSX**: TypeScript execution.
- **Drizzle Kit**: Database migration management.