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

## Recent Changes

### 2025-07-30: Mobile Search Experience Enhancement
- ✅ **Mobile Search Modal**: Created dedicated popup search interface for mobile devices (≤768px screens)
- ✅ **Keyboard Visibility Fix**: Search results now visible without keyboard obstruction on mobile
- ✅ **Responsive Detection**: Automatic mobile/desktop detection with appropriate UI behavior
- ✅ **Real-time Search**: Live search results as you type in the mobile popup
- ✅ **Improved UX**: Clean, focused search interface with easy navigation to surf spots
- ✅ **Clickable Nearby Spots**: Made nearby surf spots clickable for direct navigation to conditions pages

### 2025-07-30: Authentic Wind Forecast Data Integration Fixed
- ✅ **Future Wind Data Accuracy**: Fixed future-conditions endpoint to use authentic OpenWeather API forecast data instead of simulated patterns
- ✅ **OpenWeather 5-Day Forecast Integration**: Implemented proper interpolation from 3-hour OpenWeather forecast intervals to hourly data points
- ✅ **Realistic Wind Speeds**: Future wind forecasts now show authentic 4-5 mph conditions matching real OpenWeather data (previously showed fabricated 16-18 mph)
- ✅ **Direction Accuracy**: Wind directions now derived from actual OpenWeather forecast data with proper degree-to-compass conversion
- ✅ **TypeScript Error Resolution**: Fixed NOAA integration async/await issues preventing proper data fetching
- ✅ **48-Hour Coverage**: Complete hourly wind forecast coverage using authentic OpenWeather 5-day/3-hour forecast API
- ✅ **Historical Data Maintained**: Historical conditions continue using authentic NOAA buoy 41117 baseline for Jacksonville Beach (1.2-1.4ft, 8s periods)
- ✅ **All 239+ Surf Spots**: Future wind forecast accuracy now available for all global surf locations using authentic OpenWeather data