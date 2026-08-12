const API_KEY = process.env.OPENWEATHER_API_KEY || process.env.WEATHER_API_KEY || "demo_key";

// Log API key status on startup
if (API_KEY === "demo_key" || !API_KEY || API_KEY.length < 10) {
  console.warn("⚠️  No valid OpenWeather API key configured - using demo data");
  console.warn("   To use real weather data, set OPENWEATHER_API_KEY environment variable");
} else {
  console.log("✅ OpenWeather API key configured - real weather data available");
}

// ─── In-memory + persistent weather cache ────────────────────────────────────
// Caches fetchWeatherData results per location for WEATHER_CACHE_TTL_MS so that
// multiple alerts at the same location share a single API call per check cycle.
// The cache is also persisted to the DB so it survives server restarts.
interface WeatherCacheEntry {
  data: any;
  fetchedAt: number;
}
const weatherCache = new Map<string, WeatherCacheEntry>();
const WEATHER_CACHE_TTL_MS = 18 * 60 * 1000; // 18 minutes

/** Returns cached weather data for the given coordinates, or null if stale/absent. */
function getCachedWeather(lat: number, lon: number): any | null {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  const entry = weatherCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > WEATHER_CACHE_TTL_MS) {
    weatherCache.delete(key);
    return null;
  }
  return entry.data;
}

/** Stores weather data in the in-memory cache and persists it to the DB. */
function setCachedWeather(lat: number, lon: number, data: any): void {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  const fetchedAt = Date.now();
  weatherCache.set(key, { data, fetchedAt });
  // Persist to DB asynchronously — don't block the caller
  persistCacheEntryToDb(key, data, new Date(fetchedAt)).catch((err) =>
    console.warn(`⚠️  Weather cache DB write failed for ${key}:`, err)
  );
}

/** Returns the number of distinct locations currently held in the weather cache. */
export function getWeatherCacheSize(): number {
  return weatherCache.size;
}

// ─── DB persistence helpers ──────────────────────────────────────────────────

async function persistCacheEntryToDb(
  cacheKey: string,
  data: any,
  fetchedAt: Date
): Promise<void> {
  const { db } = await import('./db');
  const { weatherCacheEntries } = await import('../shared/schema');
  await db
    .insert(weatherCacheEntries)
    .values({ cacheKey, data, fetchedAt })
    .onConflictDoUpdate({
      target: weatherCacheEntries.cacheKey,
      set: { data, fetchedAt },
    });
}

/**
 * Delete DB rows that are older than WEATHER_CACHE_TTL_MS (18 minutes).
 * Intended to be called periodically (e.g. after each scheduler cycle) so
 * the table stays lean even when the server runs for a long time without
 * restarting.  Fire-and-forget — callers should not await the result.
 */
export async function purgeStaleWeatherCache(): Promise<void> {
  try {
    const { db } = await import('./db');
    const { weatherCacheEntries } = await import('../shared/schema');
    const { lt, sql } = await import('drizzle-orm');
    const cutoff = new Date(Date.now() - WEATHER_CACHE_TTL_MS);
    const result = await db
      .delete(weatherCacheEntries)
      .where(lt(weatherCacheEntries.fetchedAt, cutoff));
    // Only log when something was actually deleted to keep logs quiet
    const deleted = (result as any).rowCount ?? (result as any).changes ?? 0;
    if (deleted > 0) {
      console.log(`🧹 Weather cache: purged ${deleted} stale DB row(s)`);
    }
  } catch (err) {
    console.warn('⚠️  Weather cache periodic purge failed (non-fatal):', err);
  }
}

/**
 * Hydrate the in-memory weather cache from the database on startup.
 * Entries older than WEATHER_CACHE_TTL_MS are discarded.
 * Logs how many locations were loaded from the persistent cache.
 */
export async function initWeatherCache(): Promise<void> {
  try {
    const { db } = await import('./db');
    const { weatherCacheEntries } = await import('../shared/schema');
    const rows = await db.select().from(weatherCacheEntries);

    const now = Date.now();
    let loaded = 0;
    let stale = 0;
    const staleKeys: string[] = [];

    for (const row of rows) {
      const fetchedAtMs = new Date(row.fetchedAt).getTime();
      if (now - fetchedAtMs > WEATHER_CACHE_TTL_MS) {
        stale++;
        staleKeys.push(row.cacheKey);
        continue; // skip stale entries — purged below
      }
      weatherCache.set(row.cacheKey, { data: row.data, fetchedAt: fetchedAtMs });
      loaded++;
    }

    // Delete stale rows from DB so the table doesn't grow unbounded
    if (staleKeys.length > 0) {
      const { inArray } = await import('drizzle-orm');
      await db
        .delete(weatherCacheEntries)
        .where(inArray(weatherCacheEntries.cacheKey, staleKeys));
    }

    console.log(
      `🌊 Weather cache hydrated: ${loaded} location(s) loaded from DB` +
        (stale > 0 ? `, ${stale} stale entr${stale === 1 ? 'y' : 'ies'} purged` : '')
    );
  } catch (err) {
    console.warn('⚠️  Weather cache hydration failed (non-fatal):', err);
  }
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

/**
 * Advance a YYYY-MM-DD calendar date by `days` days using pure UTC arithmetic.
 * This avoids DST pitfalls: a calendar day can be 23 h or 25 h in a DST-observing
 * timezone, so adding fixed 86 400 000 ms offsets to a local instant can land on
 * the same local date twice (fall-back) or skip one (spring-forward).
 * Using Date.UTC keeps the arithmetic in UTC which has no DST transitions.
 *
 * Exported so it can be unit-tested independently.
 */
export function addCalendarDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10); // "YYYY-MM-DD"
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

  // Hawaii Time Zone (UTC-10, no DST).
  // Must be checked before the UTC fallback so Hawaiian NOAA-station coordinates
  // (lat 19–23, lon -160 to -154) get the same timezone used by fetchTideData
  // when building tidesDay1–tidesDay5. Without this, the forecast route uses UTC
  // for grouping and the dayOffsetMap drifts ~10 h behind the station-local dates.
  if (lon >= -161 && lon <= -154 && lat >= 18 && lat <= 23) {
    return 'Pacific/Honolulu';
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
    
    if (marineData.primary) {
      return {
        waveHeight: marineData.primary.waveHeight || 2.0,
        wavePeriod: marineData.primary.wavePeriod || 8,
        waveDirection: marineData.primary.waveDirection || getCoastalSwellDirection(lat, lon),
        waterTemp: marineData.primary.waterTemp || getRealisticWaterTemperature(lat, lon),
        primaryBuoy: marineData.primary,
        backupBuoy: marineData.backup && marineData.backup.length > 0 ? marineData.backup[0] : null
      };
    }
    
    // Fallback if no primary buoy — try Open-Meteo Marine (global coverage, free, no key needed)
    return await fetchOpenMeteoMarineFallback(lat, lon);
  } catch (error) {
    console.error('Marine data fetch failed:', error);
    return await fetchOpenMeteoMarineFallback(lat, lon);
  }
}

/**
 * Fetch current wave conditions from Open-Meteo Marine API.
 * Used as a global fallback when no NOAA NDBC buoy is within range.
 */
async function fetchOpenMeteoMarineFallback(lat: number, lon: number) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(
      `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=wave_height,wave_direction,wave_period&timezone=UTC&forecast_days=1`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      const times: string[]   = json.hourly?.time       || [];
      const heights: number[] = json.hourly?.wave_height || [];
      const periods: number[] = json.hourly?.wave_period || [];
      const dirs: number[]    = json.hourly?.wave_direction || [];

      // Match current UTC hour
      const now = new Date();
      const currentUTC = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}T${String(now.getUTCHours()).padStart(2, '0')}:00`;
      let idx = times.findIndex(t => t === currentUTC);
      if (idx === -1) idx = 0;

      const waveHeightM = heights[idx];
      const wavePeriod  = periods[idx];
      const waveDir     = dirs[idx];

      if (waveHeightM != null && !isNaN(waveHeightM)) {
        const waveHeightFt   = waveHeightM * 3.28084;
        const waveDirectionStr = (waveDir != null && !isNaN(waveDir)) ? getWindDirection(waveDir) : null;

        console.log(`🌊 Open-Meteo Marine fallback for ${lat.toFixed(2)}, ${lon.toFixed(2)}: ${waveHeightFt.toFixed(1)}ft @ ${wavePeriod}s ${waveDirectionStr || ''}`);

        const buoy = {
          waveHeight: waveHeightFt,
          wavePeriod: wavePeriod ?? null,
          waveDirection: waveDirectionStr,
          windSpeed: null,
          windDirection: null,
          waterTemp: null,
          stationId: 'open-meteo',
          stationName: 'Open-Meteo Marine',
          lastUpdate: new Date()
        };

        return {
          waveHeight: waveHeightFt,
          wavePeriod: wavePeriod != null ? Math.round(wavePeriod) : null,
          waveDirection: waveDirectionStr,
          waterTemp: getRealisticWaterTemperature(lat, lon),
          primaryBuoy: buoy,
          backupBuoy: null
        };
      }
    }
  } catch (openMeteoErr) {
    console.warn('Open-Meteo Marine fallback failed:', openMeteoErr);
  }

  // Last-resort estimated values
  return {
    waveHeight: 2.0 + Math.random() * 3,
    wavePeriod: 8 + Math.round(Math.random() * 8),
    waveDirection: getCoastalSwellDirection(lat, lon),
    waterTemp: getRealisticWaterTemperature(lat, lon),
    primaryBuoy: null,
    backupBuoy: null
  };
}

export async function fetchTideData(lat: number, lon: number) {
  // Map of coastal areas to their nearest NOAA tide stations
  const tideStationMap = [
    // East Coast Florida
    { latRange: [29, 31], lonRange: [-82, -80], stationId: '8720218', name: 'Mayport (Jacksonville)', timezone: 'America/New_York' },
    { latRange: [27, 29], lonRange: [-81, -79], stationId: '8721604', name: 'Trident Pier', timezone: 'America/New_York' },
    { latRange: [25, 27], lonRange: [-81, -79], stationId: '8723214', name: 'Virginia Key', timezone: 'America/New_York' },
    
    // Carolina Coast
    { latRange: [33, 35], lonRange: [-79, -77], stationId: '8665530', name: 'Charleston', timezone: 'America/New_York' },
    { latRange: [35, 37], lonRange: [-77, -75], stationId: '8652587', name: 'Oregon Inlet Marina', timezone: 'America/New_York' },
    
    // Mid-Atlantic
    { latRange: [37, 39], lonRange: [-77, -75], stationId: '8594900', name: 'Sewells Point', timezone: 'America/New_York' },
    { latRange: [39, 41], lonRange: [-76, -74], stationId: '8594900', name: 'Baltimore', timezone: 'America/New_York' },
    
    // Northeast
    { latRange: [41, 43], lonRange: [-72, -70], stationId: '8461490', name: 'New London', timezone: 'America/New_York' },
    { latRange: [43, 45], lonRange: [-71, -69], stationId: '8443970', name: 'Boston', timezone: 'America/New_York' },
    
    // West Coast
    { latRange: [32, 34], lonRange: [-118, -116], stationId: '9410170', name: 'San Diego', timezone: 'America/Los_Angeles' },
    { latRange: [34, 36], lonRange: [-120, -118], stationId: '9411340', name: 'Santa Barbara', timezone: 'America/Los_Angeles' },
    { latRange: [36, 38], lonRange: [-123, -121], stationId: '9413450', name: 'Monterey', timezone: 'America/Los_Angeles' },
    { latRange: [37, 39], lonRange: [-123, -121], stationId: '9414290', name: 'San Francisco', timezone: 'America/Los_Angeles' },
    
    // Gulf Coast
    { latRange: [25, 27], lonRange: [-83, -81], stationId: '8724580', name: 'Key West', timezone: 'America/New_York' },
    { latRange: [27, 29], lonRange: [-85, -82], stationId: '8726520', name: 'St. Petersburg', timezone: 'America/New_York' },
    { latRange: [29, 31], lonRange: [-88, -85], stationId: '8729840', name: 'Panama City Beach', timezone: 'America/Chicago' },
    { latRange: [29, 31], lonRange: [-95, -92], stationId: '8771450', name: 'Galveston Pier 21', timezone: 'America/Chicago' },

    // Hawaii — NOAA CO-OPS stations (all four main islands covered)
    // Oahu (includes Pipeline / North Shore ~21.6°N, -158.1°W)
    { latRange: [21.2, 21.8], lonRange: [-158.3, -157.6], stationId: '1612340', name: 'Honolulu', timezone: 'Pacific/Honolulu' },
    // Maui / Kahului (covers Hookipa, Pe'ahi ~20.9°N, -156.3°W)
    { latRange: [20.6, 21.1], lonRange: [-156.7, -155.9], stationId: '1615680', name: 'Kahului, Maui', timezone: 'Pacific/Honolulu' },
    // Big Island / Hilo (covers Honolii, Pohoiki ~19.7°N, -155.0°W)
    { latRange: [19.4, 20.3], lonRange: [-156.1, -154.8], stationId: '1617760', name: 'Hilo, Hawaii', timezone: 'Pacific/Honolulu' },
    // Kauai / Nawiliwili (covers Hanalei, Tunnels ~22.1°N, -159.5°W)
    { latRange: [21.8, 22.3], lonRange: [-159.8, -159.2], stationId: '1619910', name: 'Nawiliwili, Kauai', timezone: 'Pacific/Honolulu' },

    // Pacific Northwest — Oregon coast
    // South Beach / Newport (~44.6°N) covers central OR surf spots (Seaside OR is further north)
    { latRange: [42.0, 45.5], lonRange: [-124.8, -123.5], stationId: '9435380', name: 'South Beach, OR', timezone: 'America/Los_Angeles' },
    // Astoria (~46.2°N) covers northern OR coast and Columbia River mouth area
    { latRange: [45.5, 46.3], lonRange: [-124.5, -123.4], stationId: '9439040', name: 'Astoria, OR', timezone: 'America/Los_Angeles' },

    // Pacific Northwest — Washington coast
    // Toke Point / Willapa Bay (~46.7°N) covers southern WA coast including Cannon Beach-area
    { latRange: [46.3, 47.2], lonRange: [-124.5, -123.5], stationId: '9440910', name: 'Toke Point, WA', timezone: 'America/Los_Angeles' },
    // Westport (~46.9°N) covers central/northern WA coast including Grays Harbor
    { latRange: [47.2, 48.5], lonRange: [-124.8, -123.5], stationId: '9441102', name: 'Westport, WA', timezone: 'America/Los_Angeles' },
    // Port Angeles (~48.1°N) covers the Strait of Juan de Fuca and northern WA spots above 48.5°N
    // (e.g. Freshwater Bay, Dungeness Spit, and any Pacific-side spots near Cape Flattery)
    { latRange: [48.5, 48.8], lonRange: [-124.8, -122.5], stationId: '9444900', name: 'Port Angeles, WA', timezone: 'America/Los_Angeles' },
  ];
  
  // Find the appropriate tide station
  const station = tideStationMap.find(s => 
    lat >= s.latRange[0] && lat <= s.latRange[1] && 
    lon >= s.lonRange[0] && lon <= s.lonRange[1]
  );
  
  if (!station) {
    // No NOAA station mapped for this coordinate (e.g. international spots like
    // Teahupo'o, J-Bay, Bali). There is no freely-available no-key global tide
    // prediction API, so we fall back to a sine-wave estimate and warn loudly so
    // the gap is visible in logs. To add real data for a spot, add a NOAA station
    // entry above (if covered by NOAA CO-OPS) or integrate a paid/keyed tide API.
    console.warn(`⚠️  No NOAA tide station mapped for ${lat.toFixed(3)}, ${lon.toFixed(3)} — serving estimated sine-wave tides. Add a station entry to tideStationMap to fix this.`);
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
      source: 'estimated'
    };
  }
  
  // Parse "YYYY-MM-DD HH:MM" (NOAA local-time string) directly into a display time.
  // Avoids new Date() which treats the space-separated format as UTC on some Node versions.
  function formatNoaaTime(noaaStr: string): string {
    const timePart = noaaStr.split(' ')[1] ?? '00:00';
    const [hh, mm] = timePart.split(':').map(Number);
    const period = hh >= 12 ? 'PM' : 'AM';
    const h12 = hh % 12 || 12;
    return `${h12}:${String(mm).padStart(2, '0')} ${period}`;
  }

  try {
    // Fetch data from NOAA CO-OPS API.
    // Use yesterday→7 days ahead UTC so we always cover the full local calendar day at
    // the station and also return tides for all 5 forecast days.
    const now = new Date();
    const yesterday      = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const begin = yesterday.toISOString().split('T')[0].replace(/-/g, '');
    const end   = sevenDaysFromNow.toISOString().split('T')[0].replace(/-/g, '');

    // Determine calendar dates in the station's local timezone so we can
    // filter predictions per-day.
    // IMPORTANT: Do NOT use `now + N * 86400000` millisecond arithmetic here.
    // Around DST transitions a calendar day can be 23 h or 25 h, so adding fixed
    // 24-hour intervals can produce duplicate or missing local dates.  Instead we
    // derive each target date by pure calendar-date addition via UTC (no DST).
    const stationTz = (station as any).timezone ?? 'UTC';
    const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: stationTz });
    const todayLocalDate            = fmt.format(now);
    const tomorrowLocalDate         = addCalendarDays(todayLocalDate, 1);
    const dayAfterTomorrowLocalDate = addCalendarDays(todayLocalDate, 2);
    const day3LocalDate             = addCalendarDays(todayLocalDate, 3);
    const day4LocalDate             = addCalendarDays(todayLocalDate, 4);
    const day5LocalDate             = addCalendarDays(todayLocalDate, 5);
    // en-CA gives "YYYY-MM-DD" which matches the date prefix of NOAA's "YYYY-MM-DD HH:MM"
    
    const response = await fetch(
      `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station=${station.stationId}&product=water_level&datum=MLLW&units=english&time_zone=lst_ldt&format=json`,
      { signal: AbortSignal.timeout(5000) }
    );
    
    if (!response.ok) throw new Error(`Tide API error: ${response.status}`);
    
    const tideResponse = await response.json() as any;
    
    if (tideResponse.data && tideResponse.data.length > 0) {
      const latest = tideResponse.data[tideResponse.data.length - 1];
      const currentTide = parseFloat(latest.v);
      
      // Fetch high/low predictions over the extended window (yesterday → 3 days out)
      const predictionsResponse = await fetch(
        `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?begin_date=${begin}&end_date=${end}&station=${station.stationId}&product=predictions&datum=MLLW&units=english&time_zone=lst_ldt&format=json&interval=hilo`,
        { signal: AbortSignal.timeout(5000) }
      );
      
      let tideHigh:   any[] = [];
      let tideLow:    any[] = [];
      let tides:      any[] = [];  // full TidePoint[] for today — used by the chart
      let tidesDay1:  any[] = [];  // tomorrow's tides — used by the 5-day forecast
      let tidesDay2:  any[] = [];  // day-after-tomorrow's tides — used by the 5-day forecast
      let tidesDay3:  any[] = [];  // day 3 tides — used by the 5-day forecast
      let tidesDay4:  any[] = [];  // day 4 tides — used by the 5-day forecast
      let tidesDay5:  any[] = [];  // day 5 tides — used by the 5-day forecast

      // Helper to convert a predictions array into TidePoint[]
      const toTidePoints = (preds: any[]) =>
        preds.map((p: any) => ({
          time:   formatNoaaTime(p.t),
          height: parseFloat(parseFloat(p.v).toFixed(1)),
          type:   p.type === 'H' ? 'high' : 'low',
        }));
      
      if (predictionsResponse.ok) {
        const predictions = await predictionsResponse.json() as any;
        if (predictions.predictions) {
          // Filter per-day in station-local time
          const todayPredictions            = predictions.predictions.filter(
            (p: any) => typeof p.t === 'string' && p.t.startsWith(todayLocalDate)
          );
          const tomorrowPredictions         = predictions.predictions.filter(
            (p: any) => typeof p.t === 'string' && p.t.startsWith(tomorrowLocalDate)
          );
          const dayAfterTomorrowPredictions = predictions.predictions.filter(
            (p: any) => typeof p.t === 'string' && p.t.startsWith(dayAfterTomorrowLocalDate)
          );
          const day3Predictions = predictions.predictions.filter(
            (p: any) => typeof p.t === 'string' && p.t.startsWith(day3LocalDate)
          );
          const day4Predictions = predictions.predictions.filter(
            (p: any) => typeof p.t === 'string' && p.t.startsWith(day4LocalDate)
          );
          const day5Predictions = predictions.predictions.filter(
            (p: any) => typeof p.t === 'string' && p.t.startsWith(day5LocalDate)
          );

          // Build TidePoint[] for each day
          tides     = toTidePoints(todayPredictions);
          tidesDay1 = toTidePoints(tomorrowPredictions);
          tidesDay2 = toTidePoints(dayAfterTomorrowPredictions);
          tidesDay3 = toTidePoints(day3Predictions);
          tidesDay4 = toTidePoints(day4Predictions);
          tidesDay5 = toTidePoints(day5Predictions);

          // tideHigh / tideLow kept for backward compat (condition-alert monitor)
          // h.t is "YYYY-MM-DD HH:MM" in station local time; stored as isoRaw for
          // absolute-time comparisons in the alert monitor.
          tideHigh = todayPredictions
            .filter((p: any) => p.type === 'H')
            .slice(0, 2)
            .map((h: any) => ({
              time:   formatNoaaTime(h.t),
              height: parseFloat(h.v).toFixed(1),
              isoRaw: h.t,
            }));

          tideLow = todayPredictions
            .filter((p: any) => p.type === 'L')
            .slice(0, 2)
            .map((l: any) => ({
              time:   formatNoaaTime(l.t),
              height: parseFloat(l.v).toFixed(1),
              isoRaw: l.t,
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
        tides,      // empty array if NOAA returned no predictions; caller falls back to generated
        tidesDay1,  // tomorrow's real NOAA tides (empty if unavailable)
        tidesDay2,  // day-after-tomorrow's real NOAA tides (empty if unavailable)
        tidesDay3,  // day 3 real NOAA tides (empty if unavailable)
        tidesDay4,  // day 4 real NOAA tides (empty if unavailable)
        tidesDay5,  // day 5 real NOAA tides (empty if unavailable)
        source: station.name
      };
      
    } else {
      throw new Error('No tide data available');
    }
    
  } catch (error) {
    const errorReason = error instanceof Error ? error.message : String(error);
    console.error(`Tide data fetch failed for station ${station.stationId} (${station.name}): ${errorReason}`);
    
    // Fallback to generated data — source includes the station name so callers can
    // distinguish "no station mapped" (source: 'estimated') from "station matched
    // but temporarily unreachable" (source: '<name> (unavailable)').
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
      source: `${station.name} (unavailable)`
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
  const wavePeriod = marineData.wavePeriod != null ? Math.round(marineData.wavePeriod) : Math.round(8 + Math.random() * 8);
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
    timezone,
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
  // Return cached data if still fresh (avoids burning API quota on repeated calls)
  const cached = getCachedWeather(lat, lon);
  if (cached) {
    console.log(`📦 Weather cache hit for ${lat.toFixed(3)}, ${lon.toFixed(3)}`);
    return cached;
  }

  // Check if API key is valid (not demo_key and not empty)
  if (!API_KEY || API_KEY === "demo_key" || API_KEY.length < 10) {
    console.log("Using demo data - API key not configured");
    return await generateDemoWeatherData(lat, lon);
  }

  try {
    // Fetch current weather + forecast in parallel — we use forecast for wind because
    // the current-weather endpoint can lag behind by hours or pull from inland stations.
    // The forecast list[0] (nearest 3-hour block) is model-based and consistently accurate
    // for coastal wind speed and direction.
    const [weatherResponse, forecastResponse] = await Promise.all([
      fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=imperial`,
        { signal: AbortSignal.timeout(5000) }
      ),
      fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=imperial&cnt=2`,
        { signal: AbortSignal.timeout(5000) }
      ),
    ]);

    if (weatherResponse.status === 429) {
      console.warn('⚠️  OpenWeatherMap rate limit hit (429) — daily API cap likely reached. Falling back to demo data.');
      console.warn(`   Current cache size: ${weatherCache.size} location(s). Consider reducing alert frequency or upgrading the API plan.`);
      return await generateDemoWeatherData(lat, lon);
    }

    if (!weatherResponse.ok) {
      throw new Error(`Weather API error: ${weatherResponse.status}`);
    }

    const weatherData = await weatherResponse.json() as OpenWeatherMarineResponse;

    // Use forecast wind if available — it's more accurate than current-weather observations
    let windSpeed = weatherData.wind?.speed || 10;
    let windDeg   = weatherData.wind?.deg   || 180;
    let windGust  = weatherData.wind?.gust  || windSpeed * 1.3;
    if (forecastResponse.ok) {
      try {
        const forecastData = await forecastResponse.json();
        const nearest = forecastData?.list?.[0];
        if (nearest?.wind?.speed != null) {
          windSpeed = nearest.wind.speed;
          windDeg   = nearest.wind.deg   ?? windDeg;
          windGust  = nearest.wind.gust  ?? windSpeed * 1.3;
          console.log(`🌬️  Wind from forecast API: ${Math.round(windSpeed)} mph ${getWindDirection(windDeg)} (was ${Math.round(weatherData.wind?.speed || 0)} mph ${getWindDirection(weatherData.wind?.deg || 0)} from current-weather)`);
        }
      } catch { /* keep current-weather wind on parse error */ }
    }

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
      wavePeriod: marineData.wavePeriod != null ? Math.round(marineData.wavePeriod) : 8,
      waveDirection: marineData.waveDirection || getCoastalSwellDirection(lat, lon),
      windSpeed: Math.round(windSpeed).toString(),
      windDirection: getWindDirection(windDeg),
      windGusts: Math.round(windGust).toString(),
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
      timezone,
      primaryBuoy: marineData.primaryBuoy || null,
      backupBuoy: marineData.backupBuoy || null,
    };

    setCachedWeather(lat, lon, result);
    return result;

  } catch (error) {
    console.error('Weather data fetch failed:', error);
    console.log('Falling back to demo data');
    return await generateDemoWeatherData(lat, lon);
  }
}

// Cache NWS grid-point hourly URLs — these are geography-based and never change.
// Key: "lat,lon" rounded to 2 decimal places. Value: { hourlyUrl, gridId }.
const nwsGridCache = new Map<string, { hourlyUrl: string; gridId: string }>();

/**
 * Fetch current wind from the National Weather Service point forecast API.
 * Free, no key, NWS-calibrated to the exact coastal grid point.
 * The grid-point lookup (step 1) is cached per location so subsequent calls
 * only make ONE HTTP request instead of two.
 * Returns null if the location is outside NWS coverage (outside CONUS).
 */
export async function fetchNWSWind(lat: number, lon: number): Promise<{
  windSpeed: number;
  windDirection: string;
  windGusts: number | null;
  source: string;
} | null> {
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;

  try {
    // Step 1 — resolve the NWS grid point (cached after first lookup)
    let gridEntry = nwsGridCache.get(cacheKey);
    if (!gridEntry) {
      const pointsRes = await fetch(
        `https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`,
        {
          signal: AbortSignal.timeout(3500),
          headers: { 'User-Agent': 'LiveSwell/1.0 (surf conditions app)' },
        }
      );
      if (!pointsRes.ok) return null; // Outside CONUS

      const pointsData = await pointsRes.json();
      const hourlyUrl: string | undefined = pointsData?.properties?.forecastHourly;
      const gridId: string = pointsData?.properties?.gridId ?? 'NWS';
      if (!hourlyUrl) return null;

      gridEntry = { hourlyUrl, gridId };
      nwsGridCache.set(cacheKey, gridEntry);
    }

    // Step 2 — fetch the hourly forecast (always fresh — wind changes every hour)
    const forecastRes = await fetch(gridEntry.hourlyUrl, {
      signal: AbortSignal.timeout(3500),
      headers: { 'User-Agent': 'LiveSwell/1.0 (surf conditions app)' },
    });
    if (!forecastRes.ok) return null;

    const forecastData = await forecastRes.json();
    const periods: any[] = forecastData?.properties?.periods ?? [];
    if (periods.length === 0) return null;

    // The first period covers the current hour
    const current = periods[0];

    // windSpeed is a string like "10 mph" or "10 to 15 mph" — take the max value
    const rawSpeed: string = current.windSpeed ?? '';
    const speedNumbers = rawSpeed.match(/\d+/g)?.map(Number) ?? [];
    if (speedNumbers.length === 0) return null;
    const windSpeedMph = Math.max(...speedNumbers);

    const windDirection: string = current.windDirection ?? '';
    if (!windDirection) return null;

    console.log(`🌬️  Wind from NWS (${gridEntry.gridId}): ${windSpeedMph} mph ${windDirection}`);

    return { windSpeed: windSpeedMph, windDirection, windGusts: null, source: `NWS ${gridEntry.gridId}` };
  } catch {
    return null;
  }
}

// ── Multi-day forecast for the AI agent ──────────────────────────────────────

export interface AgentForecastDay {
  date: string;          // "Tomorrow", "Wednesday, Aug 1"
  waveHeight: string;    // "2.4ft"
  wavePeriod: string;    // "8s"
  waveDirection: string; // "SE"
  windSpeed: string;     // "12mph"
  windDirection: string; // "NE"
  tides: Array<{ type: 'High' | 'Low'; time: string; height: string }>;
}

/** Fetch 5-day surf forecast using Open-Meteo Marine (waves) + OWM (wind) + NOAA (tides). */
export async function fetchAgentForecast(lat: number, lon: number): Promise<AgentForecastDay[]> {
  const timezone = getTimezone(lat, lon);

  // NOAA tide station lookup (US coastal coverage)
  const tideStationMap = [
    { latRange: [29, 31], lonRange: [-82, -80], stationId: '8720218' },
    { latRange: [27, 29], lonRange: [-81, -79], stationId: '8721604' },
    { latRange: [25, 27], lonRange: [-81, -79], stationId: '8723214' },
    { latRange: [33, 35], lonRange: [-79, -77], stationId: '8665530' },
    { latRange: [35, 37], lonRange: [-77, -75], stationId: '8652587' },
    { latRange: [37, 39], lonRange: [-77, -75], stationId: '8594900' },
    { latRange: [39, 41], lonRange: [-76, -74], stationId: '8594900' },
    { latRange: [41, 43], lonRange: [-72, -70], stationId: '8461490' },
    { latRange: [43, 45], lonRange: [-71, -69], stationId: '8443970' },
    { latRange: [32, 34], lonRange: [-118, -116], stationId: '9410170' },
    { latRange: [34, 36], lonRange: [-120, -118], stationId: '9411340' },
    { latRange: [36, 38], lonRange: [-123, -121], stationId: '9413450' },
    { latRange: [37, 39], lonRange: [-123, -121], stationId: '9414290' },
    { latRange: [25, 27], lonRange: [-83, -81], stationId: '8724580' },
    { latRange: [27, 29], lonRange: [-85, -82], stationId: '8726520' },
    { latRange: [29, 31], lonRange: [-88, -85], stationId: '8729840' },
    { latRange: [29, 31], lonRange: [-95, -92], stationId: '8771450' },
  ];
  const tideStation = tideStationMap.find(
    s => lat >= s.latRange[0] && lat <= s.latRange[1] && lon >= s.lonRange[0] && lon <= s.lonRange[1]
  );

  // Build date strings for the forecast window
  const today = new Date();
  const toYMD = (d: Date) => d.toISOString().split('T')[0]; // "YYYY-MM-DD"
  const endDate = new Date(today.getTime() + 6 * 86_400_000);
  const beginStr = toYMD(today).replace(/-/g, '');
  const endStr   = toYMD(endDate).replace(/-/g, '');

  // Run all three data sources in parallel
  const [marineResult, windResult, tideResult] = await Promise.allSettled([
    fetch(
      `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}` +
      `&daily=wave_height_max,wave_direction_dominant,wave_period_max&timezone=auto&forecast_days=6`,
      { signal: AbortSignal.timeout(8000) }
    ).then(r => r.ok ? r.json() : null).catch(() => null),

    (API_KEY && API_KEY.length >= 10 && API_KEY !== 'demo_key')
      ? fetch(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=imperial`,
          { signal: AbortSignal.timeout(8000) }
        ).then(r => r.ok ? r.json() : null).catch(() => null)
      : Promise.resolve(null),

    tideStation
      ? fetch(
          `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter` +
          `?begin_date=${beginStr}&end_date=${endStr}&station=${tideStation.stationId}` +
          `&product=predictions&datum=MLLW&units=english&time_zone=lst_ldt&format=json&interval=hilo`,
          { signal: AbortSignal.timeout(8000) }
        ).then(r => r.ok ? r.json() : null).catch(() => null)
      : Promise.resolve(null),
  ]);

  // ── Parse wave data (Open-Meteo daily arrays, index 0 = today) ──
  const marineData = marineResult.status === 'fulfilled' ? marineResult.value : null;
  const rawHeights    = marineData?.daily?.wave_height_max    ?? [];
  const rawPeriods    = marineData?.daily?.wave_period_max    ?? [];
  const rawDirections = marineData?.daily?.wave_direction_dominant ?? [];

  // ── Parse wind data (OWM 3-hour, group by local calendar day) ──
  const windData = windResult.status === 'fulfilled' ? windResult.value : null;
  const windByDay = new Map<string, { speed: number; deg: number }>();
  if (windData?.list) {
    const grouped = new Map<string, any[]>();
    for (const item of windData.list) {
      const localStr = new Date(item.dt * 1000).toLocaleDateString('en-US', { timeZone: timezone });
      if (!grouped.has(localStr)) grouped.set(localStr, []);
      grouped.get(localStr)!.push(item);
    }
    for (const [dateStr, items] of grouped) {
      const afternoon = items.filter(item => {
        const h = new Date(new Date(item.dt * 1000).toLocaleString('en-US', { timeZone: timezone })).getHours();
        return h >= 12 && h < 18;
      });
      const pool = afternoon.length > 0 ? afternoon : items;
      const avgSpeed = pool.reduce((s: number, i: any) => s + (i.wind?.speed ?? 0), 0) / pool.length;
      const avgDeg   = pool.reduce((s: number, i: any) => s + (i.wind?.deg   ?? 0), 0) / pool.length;
      windByDay.set(dateStr, { speed: avgSpeed, deg: avgDeg });
    }
  }

  // ── Parse tide data (NOAA hilo predictions, group by YYYY-MM-DD prefix) ──
  const tideData = tideResult.status === 'fulfilled' ? tideResult.value : null;
  const tidesByDate = new Map<string, Array<{ type: 'High' | 'Low'; time: string; height: string }>>();
  if (tideData?.predictions) {
    for (const p of tideData.predictions) {
      const dateKey = p.t.split(' ')[0]; // "YYYY-MM-DD"
      if (!tidesByDate.has(dateKey)) tidesByDate.set(dateKey, []);
      tidesByDate.get(dateKey)!.push({
        type: p.type === 'H' ? 'High' : 'Low',
        time: new Date(p.t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        height: parseFloat(p.v).toFixed(1),
      });
    }
  }

  // ── Assemble 5-day forecast (days 1–5, skipping today at index 0) ──
  const days: AgentForecastDay[] = [];
  for (let i = 1; i <= 5; i++) {
    const dayDate = new Date(today.getTime() + i * 86_400_000);
    const isoDate = toYMD(dayDate);
    const label = i === 1
      ? 'Tomorrow'
      : dayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

    // Wave
    const heightM = rawHeights[i];
    const waveHeight = heightM != null ? `${(heightM * 3.28084).toFixed(1)}ft` : '?ft';
    const wavePeriod = rawPeriods[i] != null ? `${Math.round(rawPeriods[i])}s` : '?s';
    const waveDirDeg = rawDirections[i];
    const waveDirection = waveDirDeg != null ? getWindDirection(waveDirDeg) : '';

    // Wind (match by locale date string to align with how we keyed the map)
    const localDateStr = dayDate.toLocaleDateString('en-US', { timeZone: timezone });
    const wind = windByDay.get(localDateStr);
    const windSpeed     = wind ? `${Math.round(wind.speed)}mph` : '';
    const windDirection = wind ? getWindDirection(wind.deg) : '';

    // Tides
    const tides = tidesByDate.get(isoDate) ?? [];

    days.push({ date: label, waveHeight, wavePeriod, waveDirection, windSpeed, windDirection, tides });
  }

  return days;
}