/**
 * Comprehensive NOAA Buoy Integration System
 * Integrates with all 1,355+ active NOAA stations for complete marine data coverage
 */

import { parseString } from 'xml2js';

// Station types and categories
interface NOAAStation {
  id: string;
  lat: number;
  lon: number;
  name: string;
  owner: string;
  type: 'buoy' | 'fixed' | 'c-man' | 'dart' | 'usv' | 'other';
  hasMetData: boolean;
  hasWaveData: boolean;
  distance?: number; // Distance from query point in miles
}

interface BuoyData {
  waveHeight: number | null;
  wavePeriod: number | null;
  waveDirection: string | null;
  windSpeed: number | null;
  windDirection: string | null;
  waterTemp: number | null;
  stationId: string;
  stationName?: string;
  lastUpdate: Date | null;
}

let cachedStations: NOAAStation[] = [];
let lastStationFetch = 0;
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Fetch all active NOAA stations from official XML feed
 */
export async function fetchAllNOAAStations(): Promise<NOAAStation[]> {
  const now = Date.now();
  
  // Return cached data if still fresh
  if (cachedStations.length > 0 && now - lastStationFetch < CACHE_DURATION) {
    return cachedStations;
  }

  try {
    console.log('🌊 Fetching complete NOAA station network...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch('https://www.ndbc.noaa.gov/activestations.xml', {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`NOAA API responded with ${response.status}`);
    }

    const xmlData = await response.text();
    
    return new Promise((resolve, reject) => {
      parseString(xmlData, (err, result) => {
        if (err) {
          reject(err);
          return;
        }

        try {
          const stations: NOAAStation[] = result.stations.station.map((station: any) => ({
            id: station.$.id,
            lat: parseFloat(station.$.lat),
            lon: parseFloat(station.$.lon),
            name: station.$.name || `Station ${station.$.id}`,
            owner: station.$.owner || 'NOAA',
            type: station.$.type as NOAAStation['type'],
            hasMetData: station.$.met === 'y',
            hasWaveData: ['buoy', 'c-man'].includes(station.$.type) && station.$.met === 'y'
          }));

          // Cache the results
          cachedStations = stations;
          lastStationFetch = now;
          
          console.log(`✅ Successfully loaded ${stations.length} NOAA stations`);
          console.log(`📊 Station breakdown:`, {
            buoys: stations.filter(s => s.type === 'buoy').length,
            cman: stations.filter(s => s.type === 'c-man').length,
            fixed: stations.filter(s => s.type === 'fixed').length,
            withWaveData: stations.filter(s => s.hasWaveData).length
          });

          resolve(stations);
        } catch (parseError) {
          reject(parseError);
        }
      });
    });

  } catch (error) {
    console.error('❌ Failed to fetch NOAA stations:', error);
    // Return cached data as fallback if available
    return cachedStations;
  }
}

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Find the best NOAA stations for a given location
 */
export async function findNearbyStations(
  lat: number, 
  lon: number, 
  maxDistance: number = 100,
  maxStations: number = 5
): Promise<NOAAStation[]> {
  const allStations = await fetchAllNOAAStations();
  
  // Filter stations with wave/weather data and calculate distances
  const nearbyStations = allStations
    .filter(station => station.hasWaveData || station.hasMetData)
    .map(station => ({
      ...station,
      distance: calculateDistance(lat, lon, station.lat, station.lon)
    }))
    .filter(station => station.distance! <= maxDistance)
    .sort((a, b) => a.distance! - b.distance!)
    .slice(0, maxStations);

  console.log(`🎯 Found ${nearbyStations.length} stations within ${maxDistance} miles of ${lat.toFixed(2)}, ${lon.toFixed(2)}`);
  
  return nearbyStations;
}

/**
 * Fetch buoy data with comprehensive error handling and fallbacks
 */
export async function fetchBuoyData(stationId: string): Promise<BuoyData> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(`https://www.ndbc.noaa.gov/data/realtime2/${stationId}.txt`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        waveHeight: null,
        wavePeriod: null,
        waveDirection: null,
        windSpeed: null,
        windDirection: null,
        waterTemp: null,
        stationId,
        lastUpdate: null
      };
    }

    const data = await response.text();
    const lines = data.trim().split('\n');
    
    if (lines.length < 3) {
      throw new Error('Insufficient data lines');
    }

    // Parse the most recent data line
    const dataLine = lines[2].split(/\s+/);
    
    // NOAA format: YY MM DD hh mm WDIR WSPD GST WVHT DPD APD MWD PRES ATMP WTMP DEWP VIS TIDE
    const year = parseInt('20' + dataLine[0]);
    const month = parseInt(dataLine[1]);
    const day = parseInt(dataLine[2]);
    const hour = parseInt(dataLine[3]);
    const minute = parseInt(dataLine[4]);
    
    const windDir = parseInt(dataLine[5]);
    const windSpeed = parseFloat(dataLine[6]); // meters/second
    const waveHeightM = parseFloat(dataLine[8]); // meters
    const dominantPeriod = parseInt(dataLine[9]); // seconds
    const meanWaveDir = parseInt(dataLine[11]); // degrees
    const waterTempC = parseFloat(dataLine[14]); // water temperature in Celsius

    // Convert and validate data
    const lastUpdate = new Date(year, month - 1, day, hour, minute);
    const waveHeightFt = !isNaN(waveHeightM) ? waveHeightM * 3.28084 : null;
    const windSpeedMph = !isNaN(windSpeed) ? windSpeed * 2.237 : null;
    const waterTempF = !isNaN(waterTempC) ? waterTempC * 9/5 + 32 : null; // Convert Celsius to Fahrenheit
    
    const windDirectionStr = !isNaN(windDir) ? degreesToCompass(windDir) : null;
    const waveDirectionStr = !isNaN(meanWaveDir) ? degreesToCompass(meanWaveDir) : null;

    return {
      waveHeight: waveHeightFt,
      wavePeriod: !isNaN(dominantPeriod) ? dominantPeriod : null,
      waveDirection: waveDirectionStr,
      windSpeed: windSpeedMph,
      windDirection: windDirectionStr,
      waterTemp: waterTempF,
      stationId,
      lastUpdate
    };

  } catch (error) {
    console.warn(`⚠️ Error fetching data from buoy ${stationId}:`, error);
    return {
      waveHeight: null,
      wavePeriod: null,
      waveDirection: null,
      windSpeed: null,
      windDirection: null,
      waterTemp: null,
      stationId,
      lastUpdate: null
    };
  }
}

/**
 * Convert degrees to compass direction
 */
function degreesToCompass(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

/**
 * Get comprehensive marine data from multiple nearby stations
 */
export async function getComprehensiveMarineData(lat: number, lon: number): Promise<{
  primary: BuoyData | null;
  backup: BuoyData[];
  coverage: {
    totalStations: number;
    activeStations: number;
    dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
  };
}> {
  const nearbyStations = await findNearbyStations(lat, lon, 150, 10);
  
  if (nearbyStations.length === 0) {
    return {
      primary: null,
      backup: [],
      coverage: {
        totalStations: 0,
        activeStations: 0,
        dataQuality: 'poor'
      }
    };
  }

  // Fetch data from all nearby stations in parallel
  const dataPromises = nearbyStations.map(station => 
    fetchBuoyData(station.id).then(data => ({
      ...data,
      stationName: station.name
    }))
  );
  const allData = await Promise.all(dataPromises);

  // Find the best primary data source (closest with valid data)
  const validData = allData.filter(data => 
    data.waveHeight !== null || data.windSpeed !== null
  );

  const primary = validData.length > 0 ? validData[0] : null;
  const backup = validData.slice(1, 5); // Up to 4 backup sources

  // Assess data quality
  let dataQuality: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
  if (validData.length >= 3) dataQuality = 'excellent';
  else if (validData.length >= 2) dataQuality = 'good';
  else if (validData.length >= 1) dataQuality = 'fair';

  console.log(`🌊 Marine data summary for ${lat.toFixed(2)}, ${lon.toFixed(2)}:`, {
    nearbyStations: nearbyStations.length,
    validDataSources: validData.length,
    primaryStation: primary?.stationId,
    dataQuality
  });

  return {
    primary,
    backup,
    coverage: {
      totalStations: nearbyStations.length,
      activeStations: validData.length,
      dataQuality
    }
  };
}

/**
 * Regional specialization for different coastal areas
 */
export function getRegionalConfig(lat: number, lon: number) {
  // Pacific Coast
  if (lon >= -130 && lon <= -115 && lat >= 30 && lat <= 50) {
    return {
      region: 'Pacific Coast',
      maxDistance: 100,
      preferredStations: ['46013', '46042', '46025', '46086'],
      swellDirection: ['W', 'WNW', 'NW']
    };
  }
  
  // Atlantic Coast
  if (lon >= -85 && lon <= -65 && lat >= 25 && lat <= 45) {
    return {
      region: 'Atlantic Coast',
      maxDistance: 80,
      preferredStations: ['44013', '41009', '41010'],
      swellDirection: ['ESE', 'SE', 'E']
    };
  }
  
  // Gulf of Mexico
  if (lon >= -98 && lon <= -80 && lat >= 25 && lat <= 31) {
    return {
      region: 'Gulf of Mexico',
      maxDistance: 120,
      preferredStations: ['42001', '42040', '42035'],
      swellDirection: ['S', 'SE', 'SSE']
    };
  }

  // Great Lakes
  if (lon >= -95 && lon <= -75 && lat >= 41 && lat <= 49) {
    return {
      region: 'Great Lakes',
      maxDistance: 50,
      preferredStations: ['45001', '45002', '45007'],
      swellDirection: ['variable']
    };
  }

  // Default
  return {
    region: 'Other',
    maxDistance: 100,
    preferredStations: [],
    swellDirection: ['variable']
  };
}