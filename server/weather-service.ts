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

export function getWindDirection(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

export function formatTime(timestamp: number, timezone: string = 'UTC'): string {
  return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone
  });
}

export function getTimezone(lat: number, lon: number): string {
  // US timezone mapping based on coordinates
  
  // Pacific Time Zone (West Coast)
  if (lon >= -125 && lon <= -114 && lat >= 32 && lat <= 49) {
    return 'America/Los_Angeles';
  }
  
  // Mountain Time Zone
  if (lon >= -115 && lon <= -102 && lat >= 31 && lat <= 49) {
    return 'America/Denver';
  }
  
  // Central Time Zone
  if (lon >= -104 && lon <= -87 && lat >= 25 && lat <= 49) {
    return 'America/Chicago';
  }
  
  // Eastern Time Zone (East Coast)
  if (lon >= -88 && lon <= -67 && lat >= 24 && lat <= 47) {
    return 'America/New_York';
  }
  
  // Default to UTC if no match
  return 'UTC';
}

export function getCoastalSwellDirection(lat: number, lon: number): string {
  // Determine predominant swell direction based on coastal geography
  
  // East Coast of United States (Atlantic Ocean)
  if (lon > -85 && lon < -65 && lat > 25 && lat < 45) {
    // Atlantic coast from Florida to Maine
    const swells = ['E', 'ENE', 'ESE', 'SE'];
    return swells[Math.floor(Math.random() * swells.length)];
  }
  
  // West Coast of United States (Pacific Ocean)
  if (lon > -125 && lon < -117 && lat > 32 && lat < 48) {
    // Pacific coast from California to Washington
    const swells = ['W', 'WNW', 'WSW', 'SW'];
    return swells[Math.floor(Math.random() * swells.length)];
  }
  
  // Gulf Coast
  if (lon > -98 && lon < -80 && lat > 25 && lat < 31) {
    const swells = ['S', 'SE', 'SSE'];
    return swells[Math.floor(Math.random() * swells.length)];
  }
  
  // Default to random direction
  const allDirections = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return allDirections[Math.floor(Math.random() * allDirections.length)];
}

export function getRealisticWaterTemperature(lat: number, lon: number): number {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  
  // Base temperatures by region in August (peak summer)
  let baseTemp = 72;
  
  // Geographic adjustments
  if (lat > 40) {
    // Northern waters (New England, etc.)
    baseTemp = 65;
  } else if (lat > 35) {
    // Mid-Atlantic
    baseTemp = 70;
  } else if (lat > 28) {
    // Southeast (Carolinas, Georgia)
    baseTemp = 75;
  } else {
    // Florida and Gulf Coast
    baseTemp = 80;
  }
  
  // West Coast is generally cooler
  if (lon < -115) {
    baseTemp -= 8;
  }
  
  // Seasonal variation
  const seasonalOffset = Math.sin((month - 8) * Math.PI / 6) * -10;
  baseTemp += seasonalOffset;
  
  // Add some random variation
  baseTemp += (Math.random() - 0.5) * 4;
  
  return Math.max(45, Math.min(85, baseTemp));
}

export async function fetchMarineData(lat: number, lon: number) {
  // Import the comprehensive NOAA integration
  const { getComprehensiveMarineData, getRegionalConfig } = await import('./noaa-integration');
  
  try {
    const regionalConfig = getRegionalConfig(lat, lon);
    const marineData = await getComprehensiveMarineData(lat, lon);
    
    if (marineData.primaryBuoy) {
      return {
        waveHeight: marineData.primaryBuoy.waveHeight || 2.0,
        wavePeriod: marineData.primaryBuoy.wavePeriod || 8,
        waveDirection: marineData.primaryBuoy.waveDirection || getCoastalSwellDirection(lat, lon),
        waterTemp: marineData.primaryBuoy.waterTemp || getRealisticWaterTemperature(lat, lon),
        primaryBuoy: marineData.primaryBuoy,
        backupBuoy: marineData.backupBuoy || null
      };
    }
    
    // Fallback if no primary buoy
    return {
      waveHeight: 2.0 + Math.random() * 3,
      wavePeriod: 8 + Math.round(Math.random() * 8),
      waveDirection: getCoastalSwellDirection(lat, lon),
      waterTemp: getRealisticWaterTemperature(lat, lon),
      primaryBuoy: null,
      backupBuoy: null
    };
  } catch (error) {
    console.error('Marine data fetch failed:', error);
    return {
      waveHeight: 2.0 + Math.random() * 3,
      wavePeriod: 8 + Math.round(Math.random() * 8),
      waveDirection: getCoastalSwellDirection(lat, lon),
      waterTemp: getRealisticWaterTemperature(lat, lon),
      primaryBuoy: null,
      backupBuoy: null
    };
  }
}

export async function fetchTideData(lat: number, lon: number) {
  // Map of coastal areas to their nearest NOAA tide stations
  const tideStationMap = [
    // East Coast Florida
    { latRange: [29, 31], lonRange: [-82, -80], stationId: '8720218', name: 'Mayport (Jacksonville)' },
    { latRange: [27, 29], lonRange: [-81, -79], stationId: '8721604', name: 'Trident Pier' },
    { latRange: [25, 27], lonRange: [-81, -79], stationId: '8723214', name: 'Virginia Key' },
    
    // Carolina Coast
    { latRange: [33, 35], lonRange: [-79, -77], stationId: '8665530', name: 'Charleston' },
    { latRange: [35, 37], lonRange: [-77, -75], stationId: '8652587', name: 'Oregon Inlet Marina' },
    
    // Mid-Atlantic
    { latRange: [37, 39], lonRange: [-77, -75], stationId: '8594900', name: 'Sewells Point' },
    { latRange: [39, 41], lonRange: [-76, -74], stationId: '8594900', name: 'Baltimore' },
    
    // Northeast
    { latRange: [41, 43], lonRange: [-72, -70], stationId: '8461490', name: 'New London' },
    { latRange: [43, 45], lonRange: [-71, -69], stationId: '8443970', name: 'Boston' },
    
    // West Coast
    { latRange: [32, 34], lonRange: [-118, -116], stationId: '9410170', name: 'San Diego' },
    { latRange: [34, 36], lonRange: [-120, -118], stationId: '9411340', name: 'Santa Barbara' },
    { latRange: [36, 38], lonRange: [-123, -121], stationId: '9413450', name: 'Monterey' },
    { latRange: [37, 39], lonRange: [-123, -121], stationId: '9414290', name: 'San Francisco' },
    
    // Gulf Coast
    { latRange: [25, 27], lonRange: [-83, -81], stationId: '8724580', name: 'Key West' },
    { latRange: [27, 29], lonRange: [-85, -82], stationId: '8726520', name: 'St. Petersburg' },
    { latRange: [29, 31], lonRange: [-88, -85], stationId: '8729840', name: 'Panama City Beach' },
    { latRange: [29, 31], lonRange: [-95, -92], stationId: '8771450', name: 'Galveston Pier 21' },
  ];
  
  // Find the appropriate tide station
  const station = tideStationMap.find(s => 
    lat >= s.latRange[0] && lat <= s.latRange[1] && 
    lon >= s.lonRange[0] && lon <= s.lonRange[1]
  );
  
  if (!station) {
    console.log(`No tide station found for ${lat}, ${lon}, using generated data`);
    // Generate realistic tide data
    const now = new Date();
    const hours = now.getHours() + now.getMinutes() / 60;
    
    // Simple sine wave for tides (2 high, 2 low per day)
    const tideLevel = 3 + 2.5 * Math.sin((hours - 6) * Math.PI / 6);
    const tideStatus = Math.cos((hours - 6) * Math.PI / 6) > 0 ? "Rising" : "Falling";
    
    const tideHigh = [
      { time: new Date(now.getTime() + 3 * 60 * 60 * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }), height: (4.5 + Math.random() * 1.5).toFixed(1) },
      { time: new Date(now.getTime() + 15 * 60 * 60 * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }), height: (4.0 + Math.random() * 1.5).toFixed(1) }
    ];
    
    const tideLow = [
      { time: new Date(now.getTime() + 9 * 60 * 60 * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }), height: (0.5 + Math.random() * 1.0).toFixed(1) },
      { time: new Date(now.getTime() + 21 * 60 * 60 * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }), height: (0.8 + Math.random() * 1.0).toFixed(1) }
    ];
    
    return {
      currentTide: tideLevel,
      tideStatus,
      tideHigh,
      tideLow,
      source: 'generated'
    };
  }
  
  try {
    // Fetch data from NOAA CO-OPS API
    const today = new Date();
    const begin = today.toISOString().split('T')[0].replace(/-/g, '');
    const end = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0].replace(/-/g, '');
    
    const response = await fetch(
      `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station=${station.stationId}&product=water_level&units=english&time_zone=lst_ldt&format=json`,
      { signal: AbortSignal.timeout(5000) }
    );
    
    if (!response.ok) throw new Error(`Tide API error: ${response.status}`);
    
    const tideResponse = await response.json() as any;
    
    if (tideResponse.data && tideResponse.data.length > 0) {
      const latest = tideResponse.data[tideResponse.data.length - 1];
      const currentTide = parseFloat(latest.v);
      
      // Fetch high/low predictions
      const predictionsResponse = await fetch(
        `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?begin_date=${begin}&end_date=${end}&station=${station.stationId}&product=predictions&datum=MLLW&units=english&time_zone=lst_ldt&format=json&interval=hilo`,
        { signal: AbortSignal.timeout(5000) }
      );
      
      let tideHigh = [];
      let tideLow = [];
      
      if (predictionsResponse.ok) {
        const predictions = await predictionsResponse.json() as any;
        if (predictions.predictions) {
          const highs = predictions.predictions.filter((p: any) => p.type === 'H').slice(0, 2);
          const lows = predictions.predictions.filter((p: any) => p.type === 'L').slice(0, 2);
          
          tideHigh = highs.map((h: any) => ({
            time: new Date(h.t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
            height: parseFloat(h.v).toFixed(1)
          }));
          
          tideLow = lows.map((l: any) => ({
            time: new Date(l.t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
            height: parseFloat(l.v).toFixed(1)
          }));
        }
      }
      
      // Determine tide status (rising/falling)
      const tideStatus = tideResponse.data.length >= 2 ? 
        (currentTide > parseFloat(tideResponse.data[tideResponse.data.length - 2].v) ? "Rising" : "Falling") : 
        "Unknown";
      
      return {
        currentTide,
        tideStatus,
        tideHigh: tideHigh.length > 0 ? tideHigh : [
          { time: '6:30 AM', height: '4.8' },
          { time: '7:15 PM', height: '4.2' }
        ],
        tideLow: tideLow.length > 0 ? tideLow : [
          { time: '12:45 PM', height: '1.1' },
          { time: '1:30 AM', height: '0.9' }
        ],
        source: station.name
      };
      
    } else {
      throw new Error('No tide data available');
    }
    
  } catch (error) {
    console.error(`Tide data fetch failed for station ${station.stationId}:`, error);
    
    // Fallback to generated data
    const now = new Date();
    const hours = now.getHours() + now.getMinutes() / 60;
    const tideLevel = 3 + 2.5 * Math.sin((hours - 6) * Math.PI / 6);
    const tideStatus = Math.cos((hours - 6) * Math.PI / 6) > 0 ? "Rising" : "Falling";
    
    return {
      currentTide: tideLevel,
      tideStatus,
      tideHigh: [
        { time: '6:30 AM', height: '4.8' },
        { time: '7:15 PM', height: '4.2' }
      ],
      tideLow: [
        { time: '12:45 PM', height: '1.1' },
        { time: '1:30 AM', height: '0.9' }
      ],
      source: 'generated'
    };
  }
}

export async function generateDemoWeatherData(lat: number, lon: number) {
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
  
  // Fetch real tide data
  const tideData = await fetchTideData(lat, lon);
  const tideHeight = tideData.currentTide || (2 + Math.sin((new Date().getHours() + new Date().getMinutes() / 60) * Math.PI / 6) * 2);
  const tideStatus = tideData.tideStatus || (Math.sin((new Date().getHours() + new Date().getMinutes() / 60) * Math.PI / 6) > 0 ? "Rising" : "Falling");
  
  // Try to get real water temperature from NOAA first
  const waterTemp = marineData.waterTemp || getRealisticWaterTemperature(lat, lon);
  
  // Get timezone for location
  const timezone = getTimezone(lat, lon);
  const now = new Date();
  const currentHour = now.getHours();
  const sunrise = new Date(now);
  sunrise.setHours(6, 30, 0);
  const sunset = new Date(now);
  sunset.setHours(19, 15, 0);
  
  return {
    waveHeight: waveHeight.toFixed(1),
    wavePeriod,
    waveDirection,
    windSpeed: Math.round(windSpeed).toString(),
    windDirection: windDirectionStr,
    windGusts: Math.round(windGusts).toString(),
    tideHeight: tideHeight.toFixed(1),
    tideStatus,
    waterTemp: waterTemp.toFixed(1),
    visibility: (10 + Math.random() * 15).toFixed(1),
    uvIndex: Math.round(Math.random() * 10),
    sunrise: sunrise.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true,
      timeZone: timezone 
    }),
    sunset: sunset.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true,
      timeZone: timezone 
    }),
    // Include detailed buoy information from fetchMarineData
    primaryBuoy: marineData.primaryBuoy || null,
    backupBuoy: marineData.backupBuoy || null,
    tideHigh: tideData.tideHigh || [
      { time: '6:30 AM', height: '4.8' },
      { time: '7:15 PM', height: '4.2' }
    ],
    tideLow: tideData.tideLow || [
      { time: '12:45 PM', height: '1.1' },
      { time: '1:30 AM', height: '0.9' }
    ]
  };
}

export async function fetchWeatherData(lat: number, lon: number) {
  // Check if API key is valid (not demo_key and not empty)
  if (!API_KEY || API_KEY === "demo_key" || API_KEY.length < 10) {
    console.log("Using demo data - API key not configured");
    return await generateDemoWeatherData(lat, lon);
  }

  try {
    // Fetch current weather data
    const weatherResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=imperial`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!weatherResponse.ok) {
      throw new Error(`Weather API error: ${weatherResponse.status}`);
    }

    const weatherData = await weatherResponse.json() as OpenWeatherMarineResponse;

    // Fetch UV data
    let uvIndex = 5; // Default fallback
    try {
      const uvResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/uvi?lat=${lat}&lon=${lon}&appid=${API_KEY}`,
        { signal: AbortSignal.timeout(5000) }
      );
      
      if (uvResponse.ok) {
        const uvData = await uvResponse.json() as OpenWeatherUVResponse;
        uvIndex = Math.round(uvData.value);
      }
    } catch (uvError) {
      console.warn('UV data fetch failed, using default:', uvError);
    }

    // Get marine data (waves, tides)
    const marineData = await fetchMarineData(lat, lon);
    const tideData = await fetchTideData(lat, lon);
    
    // Get timezone for location
    const timezone = getTimezone(lat, lon);
    
    const result = {
      waveHeight: marineData.waveHeight?.toFixed(1) || "2.5",
      wavePeriod: marineData.wavePeriod || 8,
      waveDirection: marineData.waveDirection || getCoastalSwellDirection(lat, lon),
      windSpeed: Math.round(weatherData.wind?.speed || 10).toString(),
      windDirection: getWindDirection(weatherData.wind?.deg || 180),
      windGusts: Math.round(weatherData.wind?.gust || weatherData.wind?.speed * 1.3 || 13).toString(),
      tideHeight: tideData.currentTide?.toFixed(1) || "2.0",
      tideStatus: tideData.tideStatus || "Rising",
      waterTemp: marineData.waterTemp?.toFixed(1) || getRealisticWaterTemperature(lat, lon).toFixed(1),
      visibility: (weatherData.visibility / 1609.34).toFixed(1), // Convert meters to miles
      uvIndex,
      sunrise: formatTime(weatherData.sys.sunrise, timezone),
      sunset: formatTime(weatherData.sys.sunset, timezone),
      tideHigh: tideData.tideHigh || [
        { time: '6:30 AM', height: '4.8' },
        { time: '7:15 PM', height: '4.2' }
      ],
      tideLow: tideData.tideLow || [
        { time: '12:45 PM', height: '1.1' },
        { time: '1:30 AM', height: '0.9' }
      ],
      primaryBuoy: marineData.primaryBuoy || null,
      backupBuoy: marineData.backupBuoy || null,
    };

    return result;

  } catch (error) {
    console.error('Weather data fetch failed:', error);
    console.log('Falling back to demo data');
    return await generateDemoWeatherData(lat, lon);
  }
}