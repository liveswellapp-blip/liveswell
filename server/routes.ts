import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLocationSchema, insertSurfConditionsSchema, insertFavoriteSchema } from "@shared/schema";
import { z } from "zod";

const API_KEY = process.env.OPENWEATHER_API_KEY || process.env.WEATHER_API_KEY || "demo_key";

// Log API key status on startup
if (API_KEY === "demo_key" || !API_KEY || API_KEY.length < 10) {
  console.warn("⚠️  No valid OpenWeather API key configured - using demo data");
  console.warn("   To use real weather data, set OPENWEATHER_API_KEY environment variable");
} else {
  console.log("✅ OpenWeather API key configured - real weather data available");
}

interface OpenWeatherMarineResponse {
  coord: { lat: number; lon: number };
  weather: Array<{ main: string; description: string }>;
  main: { temp: number; feels_like: number; humidity: number };
  visibility: number;
  wind: { speed: number; deg: number; gust?: number };
  sys: { sunrise: number; sunset: number };
  dt: number;
}

interface OpenWeatherUVResponse {
  lat: number;
  lon: number;
  date_iso: string;
  date: number;
  value: number;
}

function getWindDirection(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

function formatTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function getCoastalSwellDirection(lat: number, lon: number): string {
  // Determine predominant swell direction based on coastal geography
  
  // East Coast of United States (Atlantic Ocean)
  if (lon > -85 && lon < -65 && lat > 25 && lat < 45) {
    // Atlantic coast from Florida to Maine
    // Primary swells come from ESE to SE (hurricanes and low pressure systems)
    const directions = ['ESE', 'SE', 'ESE', 'E'];
    return directions[Math.floor(Math.random() * directions.length)];
  }
  
  // West Coast of United States (Pacific Ocean)
  if (lon > -125 && lon < -115 && lat > 32 && lat < 48) {
    // Pacific coast from Southern California to Washington
    // Primary swells come from W to NW (Pacific storms and swells)
    const directions = ['W', 'WNW', 'NW', 'WSW'];
    return directions[Math.floor(Math.random() * directions.length)];
  }
  
  // Gulf of Mexico
  if (lon > -98 && lon < -80 && lat > 25 && lat < 31) {
    // Gulf coast
    // Swells typically from S to SE
    const directions = ['S', 'SE', 'SSE', 'SSW'];
    return directions[Math.floor(Math.random() * directions.length)];
  }
  
  // Hawaii (Pacific Ocean)
  if (lon > -162 && lon < -154 && lat > 18 && lat < 23) {
    // Hawaiian Islands
    // North Pacific swells predominant
    const directions = ['N', 'NW', 'NNW', 'W'];
    return directions[Math.floor(Math.random() * directions.length)];
  }
  
  // Default for other locations - use wind-based calculation as fallback
  return 'ESE';
}

async function fetchMarineData(lat: number, lon: number) {
  // Map of coastal areas to their nearest NOAA buoys
  const buoyMap = [
    // East Coast Florida
    { latRange: [29, 31], lonRange: [-82, -80], buoyId: '41112', name: 'Jacksonville' },
    { latRange: [27, 29], lonRange: [-81, -79], buoyId: '41009', name: 'Canaveral' },
    { latRange: [25, 27], lonRange: [-81, -79], buoyId: '41010', name: 'Canaveral East' },
    // West Coast California  
    { latRange: [33, 35], lonRange: [-119, -117], buoyId: '46025', name: 'Santa Monica Bay' },
    { latRange: [32, 34], lonRange: [-119, -116], buoyId: '46086', name: 'San Clemente' },
    // Add more buoys as needed
  ];

  // Find the closest buoy
  let selectedBuoy = null;
  for (const buoy of buoyMap) {
    if (lat >= buoy.latRange[0] && lat <= buoy.latRange[1] &&
        lon >= buoy.lonRange[0] && lon <= buoy.lonRange[1]) {
      selectedBuoy = buoy;
      break;
    }
  }

  if (!selectedBuoy) {
    return { waveHeight: null, wavePeriod: null, waveDirection: null };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`https://www.ndbc.noaa.gov/data/realtime2/${selectedBuoy.buoyId}.txt`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Buoy ${selectedBuoy.buoyId} data unavailable`);
      return { waveHeight: null, wavePeriod: null, waveDirection: null };
    }

    const data = await response.text();
    const lines = data.trim().split('\n');
    
    if (lines.length < 3) {
      return { waveHeight: null, wavePeriod: null, waveDirection: null };
    }

    // Parse the most recent data line (line 2, since line 0 is header, line 1 is units)
    const dataLine = lines[2].split(/\s+/);
    
    // NOAA buoy format: YY MM DD hh mm WDIR WSPD GST WVHT DPD APD MWD...
    const waveHeightMeters = parseFloat(dataLine[8]); // WVHT (significant wave height in meters)
    const dominantPeriod = parseInt(dataLine[9]); // DPD (dominant wave period in seconds)
    const meanWaveDirection = parseInt(dataLine[11]); // MWD (mean wave direction in degrees)

    // Convert meters to feet
    const waveHeightFeet = waveHeightMeters * 3.28084;
    
    // Convert direction degrees to compass direction
    const waveDirectionStr = !isNaN(meanWaveDirection) ? getWindDirection(meanWaveDirection) : null;

    return {
      waveHeight: !isNaN(waveHeightFeet) ? waveHeightFeet : null,
      wavePeriod: !isNaN(dominantPeriod) ? dominantPeriod : null,
      waveDirection: waveDirectionStr
    };

  } catch (error) {
    console.warn(`Error fetching buoy data for ${selectedBuoy.buoyId}:`, error);
    return { waveHeight: null, wavePeriod: null, waveDirection: null };
  }
}

function generateRealisticTides(dayOffset: number) {
  const tides = [];
  const baseTime = new Date();
  baseTime.setDate(baseTime.getDate() + dayOffset);
  baseTime.setHours(0, 0, 0, 0);
  
  // Tides shift ~50 minutes later each day (lunar day = 24h 50m)
  const tideShift = dayOffset * 50; // minutes per day
  
  // Base tide times (in hours) for day 0, then shift for subsequent days
  const baseTidePattern = [
    { offset: 1.5, type: 'low', heightRange: [0.5, 1.3] },
    { offset: 7.8, type: 'high', heightRange: [3.5, 5.0] },
    { offset: 14.2, type: 'low', heightRange: [0.3, 1.2] },
    { offset: 20.5, type: 'high', heightRange: [3.2, 5.0] }
  ];
  
  baseTidePattern.forEach(tide => {
    const shiftedHours = tide.offset + (tideShift / 60);
    let adjustedHours = shiftedHours;
    
    // Wrap around for times past 24 hours
    if (adjustedHours >= 24) {
      adjustedHours = adjustedHours - 24;
    } else if (adjustedHours < 0) {
      adjustedHours = adjustedHours + 24;
    }
    
    const tideTime = new Date(baseTime.getTime() + adjustedHours * 60 * 60 * 1000);
    const height = tide.heightRange[0] + Math.random() * (tide.heightRange[1] - tide.heightRange[0]);
    
    tides.push({
      time: tideTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      height: parseFloat(height.toFixed(1)),
      type: tide.type
    });
  });
  
  return tides;
}

async function generateDemoWeatherData(lat: number, lon: number) {
  // Generate realistic demo data based on location
  const windSpeed = 8 + Math.random() * 10; // 8-18 mph
  const windDirection = Math.random() * 360;
  const windDirectionStr = getWindDirection(windDirection);
  const windGusts = windSpeed * (1.2 + Math.random() * 0.3);
  
  // Try to fetch real marine data even in demo mode
  const marineData = await fetchMarineData(lat, lon);
  const waveHeight = marineData.waveHeight || Math.max(1, windSpeed * 0.3 + Math.random() * 2);
  const wavePeriod = marineData.wavePeriod || Math.round(8 + Math.random() * 8);
  const waveDirection = marineData.waveDirection || getCoastalSwellDirection(lat, lon);
  
  // Tide simulation
  const now = new Date();
  const tideHeight = 2 + Math.sin((now.getHours() + now.getMinutes() / 60) * Math.PI / 6) * 2;
  const tideStatus = Math.sin((now.getHours() + now.getMinutes() / 60) * Math.PI / 6) > 0 ? "Rising" : "Falling";
  
  // Temperature based on latitude (rough approximation)
  const baseTemp = 70 - Math.abs(lat - 25) * 0.8;
  const waterTemp = baseTemp * 0.85;
  
  const currentHour = now.getHours();
  const sunrise = new Date(now);
  sunrise.setHours(6, 30, 0);
  const sunset = new Date(now);
  sunset.setHours(19, 15, 0);
  
  return {
    waveHeight: waveHeight.toFixed(1),
    wavePeriod,
    waveDirection,
    windSpeed: windSpeed.toFixed(1),
    windDirection: windDirectionStr,
    windGusts: windGusts.toFixed(1),
    tideHeight: tideHeight.toFixed(1),
    tideStatus,
    waterTemp: waterTemp.toFixed(1),
    visibility: (10 + Math.random() * 15).toFixed(1),
    uvIndex: Math.round(Math.random() * 10),
    sunrise: sunrise.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    sunset: sunset.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
  };
}

async function fetchWeatherData(lat: number, lon: number) {
  // Check if API key is valid (not demo_key and not empty)
  if (!API_KEY || API_KEY === "demo_key" || API_KEY.length < 10) {
    console.log("Using demo data - API key not configured");
    return await generateDemoWeatherData(lat, lon);
  }

  try {
    // Fetch current weather data
    const weatherResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=imperial`
    );
    
    if (!weatherResponse.ok) {
      console.log(`Weather API error: ${weatherResponse.status}, falling back to demo data`);
      return await generateDemoWeatherData(lat, lon);
    }
    
    const weatherData: OpenWeatherMarineResponse = await weatherResponse.json();
    
    // Fetch UV data
    let uvData: OpenWeatherUVResponse | null = null;
    try {
      const uvResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/uvi?lat=${lat}&lon=${lon}&appid=${API_KEY}`
      );
      if (uvResponse.ok) {
        uvData = await uvResponse.json();
      }
    } catch (error) {
      console.warn('UV data unavailable:', error);
    }

    // Convert weather data to surf conditions format
    const windSpeed = weatherData.wind.speed;
    const windDirection = getWindDirection(weatherData.wind.deg);
    const windGusts = weatherData.wind.gust || windSpeed * 1.2;
    
    // Fetch real wave data from NOAA buoys
    const marineData = await fetchMarineData(lat, lon);
    const waveHeight = marineData.waveHeight || Math.max(1, windSpeed * 0.3 + Math.random() * 2);
    const wavePeriod = marineData.wavePeriod || Math.round(8 + Math.random() * 8);
    const waveDirection = marineData.waveDirection || getCoastalSwellDirection(lat, lon);
    
    // Simulate tide data (real apps would use tide APIs)
    const now = new Date();
    const tideHeight = 2 + Math.sin((now.getHours() + now.getMinutes() / 60) * Math.PI / 6) * 2;
    const tideStatus = Math.sin((now.getHours() + now.getMinutes() / 60) * Math.PI / 6) > 0 ? "Rising" : "Falling";
    
    // Water temperature approximation based on air temp
    const waterTemp = weatherData.main.temp * 0.8;
    
    return {
      waveHeight: waveHeight.toFixed(1),
      wavePeriod,
      waveDirection,
      windSpeed: windSpeed.toFixed(1),
      windDirection,
      windGusts: windGusts.toFixed(1),
      tideHeight: tideHeight.toFixed(1),
      tideStatus,
      waterTemp: waterTemp.toFixed(1),
      visibility: (weatherData.visibility / 1609.34).toFixed(1), // Convert meters to miles
      uvIndex: uvData?.value ? Math.round(uvData.value) : Math.round(Math.random() * 10),
      sunrise: formatTime(weatherData.sys.sunrise),
      sunset: formatTime(weatherData.sys.sunset),
    };
  } catch (error) {
    console.error('Error fetching weather data:', error);
    throw error;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Search locations
  app.get("/api/locations/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }
      
      const locations = await storage.searchLocations(q);
      res.json(locations);
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ message: "Failed to search locations" });
    }
  });

  // Get location by coordinates (for geolocation)
  app.get("/api/locations/nearby", async (req, res) => {
    try {
      const { lat, lng } = req.query;
      if (!lat || !lng) {
        return res.status(400).json({ message: "Latitude and longitude are required" });
      }
      
      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);
      
      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ message: "Invalid coordinates" });
      }
      
      let location = await storage.getLocationByCoords(latitude, longitude);
      
      // If no location found, create a new one with a generic name
      if (!location) {
        const newLocation = await storage.createLocation({
          name: "Current Location",
          city: "Unknown",
          country: "Unknown",
          latitude: latitude.toString(),
          longitude: longitude.toString(),
          isCoastal: true,
        });
        location = newLocation;
      }
      
      res.json(location);
    } catch (error) {
      console.error('Nearby location error:', error);
      res.status(500).json({ message: "Failed to find nearby location" });
    }
  });

  // Get location by ID
  app.get("/api/locations/:id", async (req, res) => {
    try {
      const locationId = parseInt(req.params.id);
      if (isNaN(locationId)) {
        return res.status(400).json({ message: "Invalid location ID" });
      }
      
      const location = await storage.getLocation(locationId);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      res.json(location);
    } catch (error) {
      console.error('Get location error:', error);
      res.status(500).json({ message: "Failed to get location" });
    }
  });

  // Get surf conditions for a location
  app.get("/api/locations/:id/conditions", async (req, res) => {
    try {
      const locationId = parseInt(req.params.id);
      if (isNaN(locationId)) {
        return res.status(400).json({ message: "Invalid location ID" });
      }
      
      const location = await storage.getLocation(locationId);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      // Check if we have recent conditions (within 10 minutes)
      let conditions = await storage.getSurfConditions(locationId);
      const now = new Date();
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
      
      if (!conditions || (conditions.lastUpdated && conditions.lastUpdated < tenMinutesAgo)) {
        // Fetch fresh data from weather API
        try {
          const weatherData = await fetchWeatherData(
            parseFloat(location.latitude),
            parseFloat(location.longitude)
          );
          
          if (conditions) {
            // Update existing conditions
            conditions = await storage.updateSurfConditions(locationId, weatherData);
          } else {
            // Create new conditions
            conditions = await storage.createSurfConditions({
              locationId,
              ...weatherData,
            });
          }
        } catch (weatherError) {
          console.error('Weather API error:', weatherError);
          // If we have old conditions, return them with a warning
          if (conditions) {
            res.json({
              ...conditions,
              warning: "Data may be outdated due to API unavailability"
            });
            return;
          }
          // Otherwise return error
          res.status(503).json({ message: "Weather data temporarily unavailable" });
          return;
        }
      }
      
      res.json(conditions);
    } catch (error) {
      console.error('Conditions error:', error);
      res.status(500).json({ message: "Failed to get surf conditions" });
    }
  });

  // Get 5-day forecast for a location
  app.get("/api/locations/:id/forecast", async (req, res) => {
    try {
      const locationId = parseInt(req.params.id);
      if (isNaN(locationId)) {
        return res.status(400).json({ message: "Invalid location ID" });
      }
      
      const location = await storage.getLocation(locationId);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      try {
        // Check if API key is valid, use demo data if not
        if (!API_KEY || API_KEY === "demo_key" || API_KEY.length < 10) {
          console.log("Using demo forecast data - API key not configured");
          
          // Generate demo forecast data
          const dailyForecasts = [];
          const days = ['Today', 'Tomorrow', 'Friday', 'Saturday', 'Sunday'];
          
          for (let i = 0; i < 5; i++) {
            const windSpeed = 8 + Math.random() * 12;
            const waveHeight = Math.max(1, windSpeed * 0.3 + Math.random() * 2);
            const conditions = windSpeed < 10 ? "Clean" : windSpeed < 15 ? "Fair" : windSpeed < 20 ? "Poor" : "Very Poor";
            
            // Generate realistic tide data for each day
            const tides = generateRealisticTides(i);
            
            dailyForecasts.push({
              date: i === 0 ? "Today" : i === 1 ? "Tomorrow" : days[i] || `Day ${i + 1}`,
              waveHeight: `${Math.floor(waveHeight)}-${Math.ceil(waveHeight + 1)} ft`,
              conditions,
              wind: `${Math.round(windSpeed)} mph ${getWindDirection(Math.random() * 360)}`,
              icon: "🌊",
              tides
            });
          }
          
          res.json(dailyForecasts);
          return;
        }
        
        const forecastResponse = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${location.latitude}&lon=${location.longitude}&appid=${API_KEY}&units=imperial`
        );
        
        if (!forecastResponse.ok) {
          console.log(`Forecast API error: ${forecastResponse.status}, using demo data`);
          
          // Generate demo forecast data as fallback
          const dailyForecasts = [];
          const days = ['Today', 'Tomorrow', 'Friday', 'Saturday', 'Sunday'];
          
          for (let i = 0; i < 5; i++) {
            const windSpeed = 8 + Math.random() * 12;
            const waveHeight = Math.max(1, windSpeed * 0.3 + Math.random() * 2);
            const conditions = windSpeed < 10 ? "Clean" : windSpeed < 15 ? "Fair" : windSpeed < 20 ? "Poor" : "Very Poor";
            
            // Generate realistic tide data for each day
            const tides = generateRealisticTides(i);
            
            dailyForecasts.push({
              date: i === 0 ? "Today" : i === 1 ? "Tomorrow" : days[i] || `Day ${i + 1}`,
              waveHeight: `${Math.floor(waveHeight)}-${Math.ceil(waveHeight + 1)} ft`,
              conditions,
              wind: `${Math.round(windSpeed)} mph ${getWindDirection(Math.random() * 360)}`,
              icon: "🌊",
              tides
            });
          }
          
          res.json(dailyForecasts);
          return;
        }
        
        const forecastData = await forecastResponse.json();
        
        // Process forecast data into daily summaries
        const dailyForecasts = [];
        const processedDays = new Set();
        
        for (const item of forecastData.list) {
          const date = new Date(item.dt * 1000);
          const dayKey = date.toDateString();
          
          if (processedDays.has(dayKey) || dailyForecasts.length >= 5) {
            continue;
          }
          
          processedDays.add(dayKey);
          
          const windSpeed = item.wind.speed;
          const waveHeight = Math.max(1, windSpeed * 0.3 + Math.random() * 2);
          const conditions = windSpeed < 10 ? "Clean" : windSpeed < 15 ? "Fair" : windSpeed < 20 ? "Poor" : "Very Poor";
          
          // Generate realistic tide data for each day
          const tides = generateRealisticTides(dailyForecasts.length);

          if (waveHeight > 5) {
            const qualityBonus = windSpeed < 8 ? "Excellent" : windSpeed < 12 ? "Good" : "Fair";
            dailyForecasts.push({
              date: date.toLocaleDateString('en-US', { weekday: 'long' }),
              waveHeight: `${Math.floor(waveHeight)}-${Math.ceil(waveHeight + 1)} ft`,
              conditions: qualityBonus,
              wind: `${Math.round(windSpeed)} mph ${getWindDirection(item.wind.deg)}`,
              icon: "🌊",
              tides
            });
          } else {
            dailyForecasts.push({
              date: date.toLocaleDateString('en-US', { weekday: 'long' }),
              waveHeight: `${Math.floor(waveHeight)}-${Math.ceil(waveHeight + 1)} ft`,
              conditions,
              wind: `${Math.round(windSpeed)} mph ${getWindDirection(item.wind.deg)}`,
              icon: "🌊",
              tides
            });
          }
        }
        
        res.json(dailyForecasts);
      } catch (error) {
        console.error('Forecast API error:', error);
        res.status(503).json({ message: "Forecast data temporarily unavailable" });
      }
    } catch (error) {
      console.error('Forecast error:', error);
      res.status(500).json({ message: "Failed to get forecast" });
    }
  });

  // Get nearby surf spots
  app.get("/api/locations/:id/nearby", async (req, res) => {
    try {
      const locationId = parseInt(req.params.id);
      if (isNaN(locationId)) {
        return res.status(400).json({ message: "Invalid location ID" });
      }
      
      const location = await storage.getLocation(locationId);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      
      // Find nearby locations (simple distance calculation)
      const allLocations = await storage.searchLocations("");
      const currentLat = parseFloat(location.latitude);
      const currentLng = parseFloat(location.longitude);
      
      const nearbySpots = allLocations
        .filter(loc => loc.id !== locationId)
        .map(loc => {
          const lat = parseFloat(loc.latitude);
          const lng = parseFloat(loc.longitude);
          const distance = Math.sqrt(
            Math.pow(lat - currentLat, 2) + Math.pow(lng - currentLng, 2)
          ) * 69; // Rough miles conversion
          
          return {
            ...loc,
            distance: distance.toFixed(1),
          };
        })
        .filter(spot => parseFloat(spot.distance) < 20) // Within 20 miles
        .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance))
        .slice(0, 6); // Limit to 6 spots
      
      // Add simulated current conditions for each spot
      const spotsWithConditions = await Promise.all(
        nearbySpots.map(async (spot) => {
          try {
            const conditions = await storage.getSurfConditions(spot.id);
            return {
              ...spot,
              waveHeight: conditions?.waveHeight || `${Math.floor(Math.random() * 3 + 2)}-${Math.floor(Math.random() * 2 + 4)} ft`,
              wind: conditions?.windSpeed ? `${conditions.windSpeed} mph` : `${Math.floor(Math.random() * 10 + 5)} mph`,
            };
          } catch {
            return {
              ...spot,
              waveHeight: `${Math.floor(Math.random() * 3 + 2)}-${Math.floor(Math.random() * 2 + 4)} ft`,
              wind: `${Math.floor(Math.random() * 10 + 5)} mph`,
            };
          }
        })
      );
      
      res.json(spotsWithConditions);
    } catch (error) {
      console.error('Nearby spots error:', error);
      res.status(500).json({ message: "Failed to get nearby spots" });
    }
  });

  // Get user's favorite locations
  app.get("/api/favorites", async (req, res) => {
    try {
      // For now, use a default user ID (we'll add proper auth later)
      const userId = 1;
      const favorites = await storage.getUserFavorites(userId);
      res.json(favorites);
    } catch (error) {
      console.error('Get favorites error:', error);
      res.status(500).json({ message: "Failed to get favorites" });
    }
  });

  // Add a location to favorites
  app.post("/api/favorites", async (req, res) => {
    try {
      const userId = 1; // Default user ID
      const { locationId } = req.body;
      
      if (!locationId) {
        return res.status(400).json({ message: "Location ID is required" });
      }

      // Check if location exists
      const location = await storage.getLocation(locationId);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }

      // Check if already favorited
      const isFav = await storage.isFavorite(userId, locationId);
      if (isFav) {
        return res.status(409).json({ message: "Location already in favorites" });
      }

      const favorite = await storage.addFavorite({ userId, locationId });
      res.status(201).json(favorite);
    } catch (error) {
      console.error('Add favorite error:', error);
      res.status(500).json({ message: "Failed to add favorite" });
    }
  });

  // Remove a location from favorites
  app.delete("/api/favorites/:locationId", async (req, res) => {
    try {
      const userId = 1; // Default user ID
      const locationId = parseInt(req.params.locationId);
      
      if (isNaN(locationId)) {
        return res.status(400).json({ message: "Invalid location ID" });
      }

      const success = await storage.removeFavorite(userId, locationId);
      if (!success) {
        return res.status(404).json({ message: "Favorite not found" });
      }

      res.json({ message: "Favorite removed successfully" });
    } catch (error) {
      console.error('Remove favorite error:', error);
      res.status(500).json({ message: "Failed to remove favorite" });
    }
  });

  // Check if a location is favorited
  app.get("/api/favorites/:locationId", async (req, res) => {
    try {
      const userId = 1; // Default user ID
      const locationId = parseInt(req.params.locationId);
      
      if (isNaN(locationId)) {
        return res.status(400).json({ message: "Invalid location ID" });
      }

      const isFav = await storage.isFavorite(userId, locationId);
      res.json({ isFavorite: isFav });
    } catch (error) {
      console.error('Check favorite error:', error);
      res.status(500).json({ message: "Failed to check favorite status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
