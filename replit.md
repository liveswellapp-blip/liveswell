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