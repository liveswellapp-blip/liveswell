# SurfCast - Real-time Surf Conditions App

## Overview

SurfCast is a modern web application that provides real-time surf conditions and weather forecasts for coastal locations worldwide. The application combines current weather data, marine conditions, and surf forecasting to help surfers and marine enthusiasts make informed decisions about when and where to surf.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Framework**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and color variables
- **State Management**: React Query (TanStack Query) for server state management
- **Routing**: Wouter for lightweight client-side routing

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript throughout the stack
- **API Pattern**: RESTful API endpoints under `/api` namespace
- **Development Server**: Custom Vite integration for hot module replacement

### Data Layer
- **ORM**: Drizzle ORM for type-safe database interactions
- **Database**: PostgreSQL with Neon serverless driver
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Storage Interface**: Abstracted storage layer with both database and in-memory implementations

## Key Components

### Core Entities
1. **Users**: Basic user management with username/password authentication
2. **Locations**: Coastal locations with geographic coordinates and metadata
3. **Surf Conditions**: Real-time weather, wave, wind, and marine data for each location

### API Endpoints
- **Location Search**: `/api/locations/search` - Search for coastal locations
- **Current Conditions**: `/api/locations/:id/conditions` - Get real-time surf conditions
- **Nearby Locations**: `/api/locations/nearby` - Find locations by coordinates
- **Forecast Data**: `/api/locations/:id/forecast` - 5-day surf forecast
- **Nearby Spots**: `/api/locations/:id/nearby` - Related surf spots

### UI Components
- **Header**: Search functionality and location selection
- **CurrentConditions**: Real-time conditions display with automatic refresh
- **ForecastSection**: 5-day forecast cards with weather and surf data
- **DetailedData**: Tide charts and marine weather details
- **NearbySpots**: Related surf locations with conditions summary

## Data Flow

1. **Location Selection**: Users search for or select locations via geolocation
2. **Weather Integration**: External weather APIs (OpenWeatherMap) provide current conditions
3. **Data Processing**: Server processes raw weather data into surf-specific metrics
4. **Real-time Updates**: Client polls for updated conditions every 5 minutes
5. **Caching Strategy**: React Query handles client-side caching with configurable stale times

### External Weather Data Processing
- Wind speed/direction converted to surf-friendly formats
- UV index and visibility for safety conditions
- Sunrise/sunset times for optimal surf timing
- Temperature data for water and air conditions

## External Dependencies

### Core Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting
- **OpenWeatherMap API**: Weather and marine data source
- **Replit**: Development and deployment platform

### Frontend Libraries
- **React Query**: Server state management and caching
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library
- **Date-fns**: Date manipulation utilities
- **Wouter**: Lightweight routing

### Development Tools
- **ESBuild**: Server-side bundling for production
- **TSX**: TypeScript execution for development
- **Drizzle Kit**: Database migration management

## Recent Changes

### 2025-07-18: Real-Time NOAA Wave Monitoring Integration
- ✅ Successfully integrated NOAA National Data Buoy Center (NDBC) API for authentic real-time wave data
- ✅ Added 51 NOAA buoy stations across US coastal waters providing live wave conditions
- ✅ Created comprehensive NOAA integration system (server/noaa-integration.ts) with automatic data parsing
- ✅ Built NOAABuoyData component displaying real-time wave height, wind, temperature, and pressure
- ✅ Mapped famous surf spots to nearest NOAA monitoring stations for authentic local conditions
- ✅ Added API endpoints for buoy data access (/api/buoy/:stationId, /api/buoys/nearby, /api/spots/import-noaa)
- ✅ Enhanced statistics dashboard with NOAA import capabilities and real-time data indicators
- ✅ Automatic NOAA station import during server startup for comprehensive coverage
- ✅ Total monitoring network now includes 103 surf spots + 51 real-time NOAA buoy stations = 154 total locations
- ✅ Live data available for major surf destinations: Malibu (Santa Monica Bay), Pipeline (Northwest Hawaii), Half Moon Bay (Mavericks)

### 2025-07-18: Global Surf Spot Database Expansion
- ✅ Expanded surf spot database from 15 to 52+ locations across 12 countries worldwide
- ✅ Added comprehensive global surf spot data including Pipeline, Nazaré, Mundaka, Mavericks, Bondi Beach
- ✅ Implemented surf spot metadata: break types, difficulty levels, optimal conditions, NOAA station IDs
- ✅ Created spot-imports.ts system for managing global surf spot database with 60+ premium locations
- ✅ Added API endpoints for surf spot statistics (/api/spots/stats) and manual imports (/api/spots/import)
- ✅ Built SurfSpotStats component displaying total spots, country breakdowns, and regional statistics
- ✅ Integrated statistics dashboard into home page for users without selected location
- ✅ Added automatic import system that loads global database on server startup
- ✅ Coverage includes USA (29 spots), Australia (4), Portugal (3), France (2), Spain (2), Indonesia (2), plus Costa Rica, South Africa, Chile, Brazil, Mexico, Fiji
- ✅ Prepared infrastructure for future API integrations (Stormglass.io, NOAA, Surfline) to expand to thousands more spots

### 2025-07-18: User Settings Page Implementation
- ✅ Created comprehensive settings page with modern card-based layout
- ✅ Added settings navigation via cog icon in header with wouter routing
- ✅ Implemented settings categories: Theme & Appearance, Location & Units, Notifications, Data & Refresh, Privacy & Security
- ✅ Added theme toggle functionality integrated with existing ThemeProvider
- ✅ Created settings for measurement units (metric/imperial), language preferences, and default location
- ✅ Added notification controls for push notifications and email alerts
- ✅ Implemented data management options with auto-refresh toggle and cache controls
- ✅ Added export/import functionality for user favorites and privacy controls
- ✅ Enhanced header with clickable settings button linking to /settings route
- ✅ Applied consistent ocean-themed styling with blue/emerald color scheme matching app design

### 2025-07-18: Timezone and Next Tide Calculation Fixes
- ✅ Fixed timezone detection for accurate local time display across all US time zones
- ✅ Corrected sunrise/sunset times to display in location's timezone (Pacific Time for Malibu)
- ✅ Fixed tide chart time indicator line to use location's timezone instead of browser timezone
- ✅ Enhanced next tide calculation logic with proper timezone-aware date comparison
- ✅ Updated tide time display throughout forecast components to use correct local time
- ✅ Added comprehensive timezone mapping function for US coastal locations
- ✅ Verified next tide display shows correct upcoming tide (1:30 PM high tide for Malibu)
- ✅ Rearranged tide cards under curve chart to display tides in chronological order starting from first tide of the day

### 2025-07-17: Real Marine Weather Data Integration
- ✅ Integrated authentic NOAA buoy data for accurate wave conditions (replaced simulated data)
- ✅ Connected to NOAA National Data Buoy Center (NDBC) for real-time wave heights and periods
- ✅ Implemented NOAA tide station data using Tides and Currents API for authentic tide information
- ✅ Fixed wave direction calculations using geographical coastal orientation instead of wind-based estimates
- ✅ Added comprehensive buoy mapping for East Coast Florida (Jacksonville Beach uses buoy 41112)
- ✅ Implemented tide station mapping for accurate local tide data (Jacksonville Beach uses Mayport station 8720218)
- ✅ Enhanced timezone handling for proper local time display in Eastern Time zone
- ✅ Added automatic fallback to simulated data for locations without nearby monitoring stations
- ✅ Jacksonville Beach now displays: 2.3 ft waves (6-sec period), ESE direction, accurate tide data from official NOAA sources

### 2025-07-17: Personalized Favorites Feature Implementation
- ✅ Added personalized surf spot favorites list functionality with full CRUD operations
- ✅ Created favorites database table with user-location relationships and timestamps
- ✅ Implemented storage interface methods for favorites management (add, remove, list, check)
- ✅ Added comprehensive API endpoints for favorites operations with proper validation
- ✅ Created FavoriteButton component with heart icon for adding/removing favorites
- ✅ Built FavoritesList component with card-based layout showing user's saved spots
- ✅ Added navigation system with Home and Favorites pages using wouter routing
- ✅ Integrated favorites button into CurrentConditions header for easy access
- ✅ Added favorites page at /favorites route with clean list interface
- ✅ Implemented real-time updates using React Query for favorites status

### 2025-07-18: Complementary Color Enhancement for Dark Mode Theme
- ✅ Enhanced dark mode with complementary color palette to improve visual hierarchy
- ✅ Added coral/salmon accent colors for wave heights and favorites heart icons
- ✅ Applied warm gold accents to tide heights, day names, and UV index data
- ✅ Introduced soft purple highlights for wind speeds and visibility information
- ✅ Maintained emerald green as the primary base color for consistency
- ✅ Created vibrant, balanced color scheme that enhances readability and engagement
- ✅ Applied strategic color mapping across all components: CurrentConditions, ForecastSection, TideChart, DetailedData
- ✅ Enhanced Favorites button with salmon-pink heart icon for better visual feedback
- ✅ Improved tide chart with warm gold tide types, coral times, and soft purple heights

### 2025-07-17: Complete Dark Mode Implementation with Ocean-Themed Color Scheme
- ✅ Implemented comprehensive dark mode support using Tailwind CSS dark: variants
- ✅ Created ThemeProvider component with React context for theme state management
- ✅ Added theme toggle button in header with moon/sun icons for intuitive switching
- ✅ Updated all components to use semantic color tokens (bg-background, text-foreground, etc.)
- ✅ Replaced custom color classes with Tailwind CSS design system colors
- ✅ Added proper light/dark mode persistence using localStorage
- ✅ Configured automatic theme detection based on system preferences
- ✅ Enhanced user experience with smooth theme transitions across entire application
- ✅ Applied ocean-themed color scheme: dark blue (text-blue-900) for light mode, emerald green (text-emerald-400) for dark mode
- ✅ Updated all text, icons, and UI elements across Header, CurrentConditions, ForecastSection, DetailedData, NearbySpots, FavoritesList
- ✅ Added branded logo images: blue LiveSwell logo for light mode, emerald green LiveSwell logo for dark mode
- ✅ Consistent color application throughout entire application for enhanced visual coherence and ocean aesthetic

### 2025-07-17: Tide Chart Time Indicator Enhancement
- ✅ Added current time indicator line to tide charts showing live position in 24-hour cycle
- ✅ Implemented blue straight line with marker dot matching tide curve color scheme
- ✅ Added conditional logic to show time indicator only on today's charts (current conditions and today's forecast)
- ✅ Hidden time indicator from future forecast charts for cleaner appearance
- ✅ Enhanced tide chart functionality with real-time position awareness

### 2025-07-16: Live Conditions UI Improvements
- ✅ Removed interactive wave energy visualization canvas component for cleaner interface
- ✅ Removed interactive wind direction compass gauge for simpler data display
- ✅ Added "Direction: " labels for wind direction consistency with other data fields
- ✅ Reorganized wave and wind data into vertical layouts for better readability
- ✅ Added "Live Conditions" title to main conditions card for clear identification
- ✅ Reordered condition cards: Wave Height → Wind → Tide for logical flow

### 2025-07-16: Production Deployment Fixes Applied
- ✅ Added production environment validation for required secrets (OPENWEATHER_API_KEY, SESSION_SECRET)
- ✅ Implemented comprehensive error handling and logging for server startup failures
- ✅ Fixed static file serving path issues for production builds with post-build script
- ✅ Added session middleware with secure cookie configuration for production
- ✅ Created deployment scripts to handle correct file structure (scripts/post-build.js)
- ✅ Added API key status logging and graceful fallback to demo data when keys missing
- ✅ Enhanced startup logging to show environment mode and configuration status

### 2025-07-16: Initial Project Setup
- ✅ Core project structure with React frontend and Express backend
- ✅ Real-time surf conditions with OpenWeather API integration
- ✅ 5-day forecast with realistic tide data simulation
- ✅ Responsive UI with modern design components
- ✅ In-memory storage for development and testing

## Deployment Strategy

### Development Environment
- **Hot Reloading**: Vite dev server with Express middleware integration
- **Error Handling**: Runtime error overlay for development debugging
- **File Watching**: Automatic server restart on backend changes

### Production Build
- **Client Build**: Vite optimized bundle with code splitting
- **Server Build**: ESBuild bundle for Node.js execution
- **Static Assets**: Served from `/dist/public` directory

### Environment Configuration
- **Database URL**: PostgreSQL connection string required
- **Weather API**: OpenWeatherMap API key for external data
- **Session Management**: PostgreSQL-backed session store

### Scalability Considerations
- **Serverless-Ready**: Neon database supports serverless deployments
- **Stateless Design**: Server maintains no user state between requests
- **Caching Strategy**: Client-side caching reduces API load
- **Error Boundaries**: Graceful degradation when external services fail

The application follows modern web development best practices with TypeScript throughout, comprehensive error handling, and a responsive design that works across desktop and mobile devices.