# SurfCast - Real-time Surf Conditions App

## Overview
SurfCast is a modern web application providing real-time surf conditions and weather forecasts for coastal locations globally. It integrates current weather, marine conditions, and surf forecasting to help surfers and marine enthusiasts make informed decisions. The project aims to be a comprehensive resource for surf data, offering an intuitive user experience and broad geographic coverage.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Framework**: Shadcn/ui components (Radix UI primitives)
- **Styling**: Tailwind CSS (custom design tokens)
- **State Management**: React Query (TanStack Query)
- **Routing**: Wouter

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **API Pattern**: RESTful API (`/api` namespace)

### Data Layer
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL (Neon serverless driver)
- **Schema Management**: Drizzle Kit

### Key Components & Features
- **Core Entities**: Users, Locations, Surf Conditions (weather, wave, wind, marine data).
- **API Endpoints**: Location search, current conditions, nearby locations, forecast data, nearby spots.
- **UI Components**: Header (search), CurrentConditions (real-time display), ForecastSection (5-day forecast), DetailedData (tide charts, marine weather), NearbySpots.
- **Data Flow**: Location selection, external weather API integration (OpenWeatherMap), server-side data processing, real-time updates (client polling), client-side caching.
- **UI/UX Decisions**: Ocean-themed color scheme (emerald, coral, gold accents), responsive grid layouts, card-based designs, dark mode support, custom scrollbars.
- **Key Features**: Comprehensive NOAA integration (1,355+ stations for real marine data), personalized favorites, global surf spot database (229+ locations), sunrise/sunset data, historical conditions, comprehensive health and monitoring system with admin authentication, dynamic station selection based on geographic distance and data quality, accurate timezone handling and tide calculations.
- **Architecture Patterns**: Two-page architecture (`/` for surf spots discovery, `/conditions` for detailed view), stateless server design, client-side caching.

## External Dependencies

### Core Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting.
- **OpenWeatherMap API**: Weather and marine data source.
- **Replit**: Development and deployment platform.
- **NOAA National Data Buoy Center (NDBC) API**: Real-time wave and marine data.
- **Tides and Currents API**: Authentic tide information.

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