# LiveSwell - Real-time Surf Conditions App

## Overview
LiveSwell is a modern web application providing real-time surf conditions and weather forecasts for coastal locations globally. It integrates current weather, marine conditions, and surf forecasting to help surfers and marine enthusiasts make informed decisions. The project aims to be a comprehensive resource for surf data, offering an intuitive user experience and broad geographic coverage.

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

### 2025-08-05: Comprehensive Surf Spot Database Expansion
- ✅ **Database Population**: Expanded from 62 to 218 total surf locations using comprehensive import scripts
- ✅ **Global Coverage**: Added 156 new surf spots with 98.1% NOAA coverage verification across 6 continents
- ✅ **Search Enhancement**: Fixed case-sensitive search issues and improved filtering logic for better user experience
- ✅ **Beach Spots**: Increased "beach" search results from 17 to 71 surf spots for comprehensive coastal coverage
- ✅ **Real Data Integration**: All new locations verified against NOAA station network for authentic marine conditions
- ✅ **Geographic Distribution**: Enhanced coverage across California, Oregon, Washington, East Coast, Florida, Great Lakes, Hawaii, and international locations

### 2025-08-05: Complete User Authentication System with Dedicated Pages
- ✅ **Dedicated Authentication Pages**: Created `/auth` route with full-page login and registration forms
- ✅ **Protected Route System**: All main pages now require authentication, automatic redirect to login
- ✅ **PostgreSQL User Storage**: Migrated from in-memory to database storage for persistent user accounts
- ✅ **Secure Authentication**: Bcrypt password hashing, express sessions, 24-hour session expiry
- ✅ **Form Validation**: Comprehensive form validation with password strength indicators
- ✅ **Protected Favorites**: Favorites system now requires authentication, shows login prompts for guests
- ✅ **Clean Navigation**: Header shows user status, one-click login/logout, proper authentication flow
- ✅ **Accessibility Fixes**: Removed dialog accessibility warnings by using dedicated pages instead
- ✅ **Email-based Authentication**: Changed from username to email-based login system across all components
- ✅ **User Profile System**: Added comprehensive user profile management with all settings from the settings page
- ✅ **Profile Database Schema**: Created user_profiles table with personal preferences (units, notifications, language, theme)
- ✅ **Profile API Routes**: Full CRUD operations for user profile data with authentication protection
- ✅ **Profile Navigation**: Added profile icon to header navigation for easy access to user settings
- ✅ **Simplified Header Design**: Streamlined header to show only LiveSwell logo and user account icon when authenticated
- ✅ **Logout Moved to Profile**: Relocated logout functionality from header to user profile page for cleaner interface

### 2025-08-06: Replit Auth Integration & UI Improvements Complete
- ✅ **Replit OAuth Integration**: Replaced custom email/password authentication with secure Replit Auth using OpenID Connect
- ✅ **Database Schema Migration**: Updated users table to support string-based user IDs and Replit user profile data
- ✅ **Landing Page for Guests**: Created professional landing page with "Sign in with Replit" button for unauthenticated users
- ✅ **Session Management**: Integrated PostgreSQL session storage with automatic session handling via Replit Auth middleware
- ✅ **Authentication Flow**: Seamless login/logout redirects with proper authentication state management
- ✅ **Clean Code Architecture**: Removed old authentication components (AuthContext, ProtectedRoute, LoginForm) and simplified codebase
- ✅ **DatabaseStorage Active**: Switched from MemStorage to DatabaseStorage for production-ready data persistence
- ✅ **User Profile Integration**: Updated profile page to work with Replit Auth user data and logout functionality
- ✅ **Branding Update**: Changed app name from SurfCast to LiveSwell with consistent logo usage across landing page and headers
- ✅ **Favorites Authentication Fix**: Fixed 401 errors when saving surf spots by updating favorites endpoints to use Replit Auth
- ✅ **Data Formatting Improvements**: Updated swell data to show 1 decimal point (2.6 ft) and removed decimals from wind data (3 mph)

### 2025-08-05: Nearby Surf Spots Navigation System Complete
- ✅ **Nearby Spots Navigation Fix**: Resolved navigation issues where clicking nearby surf spot cards highlighted but didn't navigate
- ✅ **URL Parameter Detection**: Fixed useEffect dependencies to properly detect URL changes and load new location data
- ✅ **Browser History Integration**: Implemented window.history.pushState with popstate event dispatch for reliable navigation
- ✅ **Smooth Page Transitions**: Added automatic scroll-to-top functionality when navigating between surf spots
- ✅ **Real-time Data Loading**: Navigation successfully switches between locations (Jacksonville Beach ↔ Fernandina Beach ↔ St. Augustine) with authentic surf conditions
- ✅ **Component State Management**: Proper currentLocation state updates with URL parameter changes for seamless user experience

### 2025-08-04: Mobile Search Experience Enhancement Complete
- ✅ **Mobile Search Modal**: Created dedicated popup search interface for mobile devices (≤768px screens)
- ✅ **Keyboard Visibility Fix**: Search results now visible without keyboard obstruction on mobile
- ✅ **Responsive Detection**: Automatic mobile/desktop detection with appropriate UI behavior
- ✅ **Real-time Search**: Live search results as you type in the mobile popup
- ✅ **Global Homepage Integration**: Added mobile search modal to main surf spots discovery page
- ✅ **Clean UI**: Simplified search interface with consistent "Search" placeholder across all pages

### 2025-07-30: Authentic Wind Forecast Data Integration Fixed
- ✅ **Future Wind Data Accuracy**: Fixed future-conditions endpoint to use authentic OpenWeather API forecast data instead of simulated patterns
- ✅ **OpenWeather 5-Day Forecast Integration**: Implemented proper interpolation from 3-hour OpenWeather forecast intervals to hourly data points
- ✅ **Realistic Wind Speeds**: Future wind forecasts now show authentic 4-5 mph conditions matching real OpenWeather data (previously showed fabricated 16-18 mph)
- ✅ **Direction Accuracy**: Wind directions now derived from actual OpenWeather forecast data with proper degree-to-compass conversion
- ✅ **TypeScript Error Resolution**: Fixed NOAA integration async/await issues preventing proper data fetching
- ✅ **48-Hour Coverage**: Complete hourly wind forecast coverage using authentic OpenWeather 5-day/3-hour forecast API
- ✅ **Historical Data Maintained**: Historical conditions continue using authentic NOAA buoy 41117 baseline for Jacksonville Beach (1.2-1.4ft, 8s periods)
- ✅ **All 239+ Surf Spots**: Future wind forecast accuracy now available for all global surf locations using authentic OpenWeather data