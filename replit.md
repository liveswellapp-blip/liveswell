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