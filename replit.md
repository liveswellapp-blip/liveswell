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