import { storage } from './storage.js';
import type { InsertLocation } from '@shared/schema';

// NOAA NDBC Active Buoy Stations with Wave Monitoring
// Source: https://www.ndbc.noaa.gov/activestations.xml
export interface NOAABuoyStation {
  id: string;
  name: string;
  latitude: string;
  longitude: string;
  type: string;
  program: string;
  location: string;
  timezone: string;
  established?: string;
}

// Comprehensive NOAA NDBC Buoy Stations for Surf Monitoring
const NOAA_SURF_BUOYS: NOAABuoyStation[] = [
  // PACIFIC COAST - CALIFORNIA
  { id: "46237", name: "San Francisco Bar", latitude: "37.370", longitude: "-122.977", type: "Offshore Buoy", program: "NDBC", location: "San Francisco Bay, CA", timezone: "PST" },
  { id: "46026", name: "San Francisco", latitude: "37.759", longitude: "-122.833", type: "Offshore Buoy", program: "NDBC", location: "San Francisco, CA", timezone: "PST" },
  { id: "46012", name: "Half Moon Bay", latitude: "37.361", longitude: "-122.881", type: "Offshore Buoy", program: "NDBC", location: "Half Moon Bay, CA", timezone: "PST" },
  { id: "46092", name: "Monterey Bay", latitude: "36.751", longitude: "-122.026", type: "Offshore Buoy", program: "NDBC", location: "Monterey Bay, CA", timezone: "PST" },
  { id: "46025", name: "Santa Monica Bay", latitude: "33.749", longitude: "-119.053", type: "Offshore Buoy", program: "NDBC", location: "Santa Monica, CA", timezone: "PST" },
  { id: "46221", name: "Santa Barbara", latitude: "34.274", longitude: "-119.878", type: "Offshore Buoy", program: "NDBC", location: "Santa Barbara, CA", timezone: "PST" },
  { id: "46218", name: "Harvest", latitude: "34.457", longitude: "-120.781", type: "Offshore Buoy", program: "NDBC", location: "Point Arguello, CA", timezone: "PST" },
  { id: "46053", name: "East Santa Barbara", latitude: "34.250", longitude: "-119.850", type: "Offshore Buoy", program: "NDBC", location: "Santa Barbara Channel, CA", timezone: "PST" },
  { id: "46086", name: "San Clemente Basin", latitude: "32.491", longitude: "-118.034", type: "Offshore Buoy", program: "NDBC", location: "San Clemente, CA", timezone: "PST" },
  { id: "46224", name: "Oceanside Offshore", latitude: "33.185", longitude: "-117.488", type: "Offshore Buoy", program: "NDBC", location: "Oceanside, CA", timezone: "PST" },

  // PACIFIC COAST - OREGON/WASHINGTON
  { id: "46050", name: "Stonewall Bank", latitude: "44.556", longitude: "-124.526", type: "Offshore Buoy", program: "NDBC", location: "Newport, OR", timezone: "PST" },
  { id: "46089", name: "Tillamook", latitude: "45.775", longitude: "-123.967", type: "Nearshore Buoy", program: "NDBC", location: "Tillamook, OR", timezone: "PST" },
  { id: "46029", name: "Columbia River Bar", latitude: "46.144", longitude: "-124.524", type: "Offshore Buoy", program: "NDBC", location: "Columbia River, OR/WA", timezone: "PST" },
  { id: "46041", name: "Cape Elizabeth", latitude: "47.353", longitude: "-124.731", type: "Offshore Buoy", program: "NDBC", location: "Westport, WA", timezone: "PST" },
  { id: "46014", name: "Point Arena", latitude: "38.236", longitude: "-123.317", type: "Offshore Buoy", program: "NDBC", location: "Point Arena, CA", timezone: "PST" },

  // HAWAII
  { id: "51001", name: "Northwest Hawaii", latitude: "23.445", longitude: "-162.279", type: "Deep Ocean Buoy", program: "NDBC", location: "NW Hawaii", timezone: "HST" },
  { id: "51002", name: "Molokai", latitude: "17.204", longitude: "-157.798", type: "Nearshore Buoy", program: "NDBC", location: "South of Molokai, HI", timezone: "HST" },
  { id: "51003", name: "Honolulu", latitude: "19.130", longitude: "-160.790", type: "Deep Ocean Buoy", program: "NDBC", location: "Honolulu, HI", timezone: "HST" },
  { id: "51004", name: "Hanauma Bay", latitude: "17.477", longitude: "-152.885", type: "Nearshore Buoy", program: "NDBC", location: "Southeast Hawaii", timezone: "HST" },
  { id: "51101", name: "Waimea", latitude: "21.674", longitude: "-158.123", type: "Nearshore Buoy", program: "NDBC", location: "Waimea, Kauai, HI", timezone: "HST" },
  { id: "51201", name: "Lanai", latitude: "21.414", longitude: "-158.129", type: "Nearshore Buoy", program: "NDBC", location: "Kaunakakai, HI", timezone: "HST" },

  // ATLANTIC COAST - NORTHEAST
  { id: "44017", name: "Montauk Point", latitude: "40.694", longitude: "-72.048", type: "Offshore Buoy", program: "NDBC", location: "Montauk, NY", timezone: "EST" },
  { id: "44025", name: "Long Island", latitude: "40.251", longitude: "-73.164", type: "Offshore Buoy", program: "NDBC", location: "Long Island, NY", timezone: "EST" },
  { id: "44065", name: "New York Harbor Entrance", latitude: "40.369", longitude: "-73.703", type: "Offshore Buoy", program: "NDBC", location: "New York Harbor, NY", timezone: "EST" },
  { id: "44009", name: "Delaware Bay", latitude: "38.457", longitude: "-74.703", type: "Offshore Buoy", program: "NDBC", location: "Delaware Bay, DE", timezone: "EST" },
  { id: "44014", name: "Virginia Beach", latitude: "36.610", longitude: "-74.842", type: "Offshore Buoy", program: "NDBC", location: "Virginia Beach, VA", timezone: "EST" },

  // ATLANTIC COAST - SOUTHEAST  
  { id: "41025", name: "Diamond Shoals", latitude: "35.006", longitude: "-75.402", type: "Offshore Buoy", program: "NDBC", location: "Cape Hatteras, NC", timezone: "EST" },
  { id: "41001", name: "East Hatteras", latitude: "34.700", longitude: "-72.660", type: "Deep Ocean Buoy", program: "NDBC", location: "E of Cape Hatteras, NC", timezone: "EST" },
  { id: "41002", name: "South Hatteras", latitude: "32.382", longitude: "-75.415", type: "Deep Ocean Buoy", program: "NDBC", location: "S of Cape Hatteras, NC", timezone: "EST" },
  { id: "41004", name: "Edisto", latitude: "32.501", longitude: "-79.099", type: "Offshore Buoy", program: "NDBC", location: "Charleston, SC", timezone: "EST" },
  { id: "41008", name: "Grays Reef", latitude: "31.400", longitude: "-80.868", type: "Offshore Buoy", program: "NDBC", location: "Savannah, GA", timezone: "EST" },
  { id: "41012", name: "St. Augustine", latitude: "30.041", longitude: "-80.554", type: "Offshore Buoy", program: "NDBC", location: "St. Augustine, FL", timezone: "EST" },

  // FLORIDA - EAST COAST
  { id: "41009", name: "Canaveral", latitude: "28.519", longitude: "-80.185", type: "Nearshore Buoy", program: "NDBC", location: "Cape Canaveral, FL", timezone: "EST" },
  { id: "41010", name: "Canaveral East", latitude: "28.878", longitude: "-78.485", type: "Deep Ocean Buoy", program: "NDBC", location: "E of Cape Canaveral, FL", timezone: "EST" },
  { id: "41113", name: "Cape Canaveral Nearshore", latitude: "28.400", longitude: "-80.100", type: "Nearshore Buoy", program: "NDBC", location: "Cape Canaveral, FL", timezone: "EST" },
  { id: "41114", name: "Fort Pierce", latitude: "27.551", longitude: "-80.225", type: "Nearshore Buoy", program: "NDBC", location: "Fort Pierce, FL", timezone: "EST" },
  { id: "41112", name: "Fernandina Beach", latitude: "30.709", longitude: "-81.293", type: "Nearshore Buoy", program: "NDBC", location: "Fernandina Beach, FL", timezone: "EST" },

  // FLORIDA - SOUTHEAST/KEYS
  { id: "41047", name: "Lake Worth", latitude: "26.040", longitude: "-80.100", type: "Nearshore Buoy", program: "NDBC", location: "Lake Worth, FL", timezone: "EST" },
  { id: "41046", name: "East Bahamas", latitude: "23.822", longitude: "-79.619", type: "Deep Ocean Buoy", program: "NDBC", location: "E of Bahamas", timezone: "EST" },
  { id: "SMKF1", name: "Sombrero Key", latitude: "24.627", longitude: "-81.110", type: "Fixed Station", program: "NDBC", location: "Sombrero Key, FL", timezone: "EST" },
  { id: "LONF1", name: "Long Key", latitude: "24.836", longitude: "-80.862", type: "Fixed Station", program: "NDBC", location: "Long Key, FL", timezone: "EST" },

  // GULF OF MEXICO
  { id: "42001", name: "East Gulf", latitude: "25.897", longitude: "-89.668", type: "Deep Ocean Buoy", program: "NDBC", location: "East Gulf of Mexico", timezone: "CST" },
  { id: "42002", name: "West Gulf", latitude: "26.055", longitude: "-93.640", type: "Deep Ocean Buoy", program: "NDBC", location: "West Gulf of Mexico", timezone: "CST" },
  { id: "42003", name: "East Gulf Outer", latitude: "26.008", longitude: "-85.648", type: "Deep Ocean Buoy", program: "NDBC", location: "East Gulf of Mexico", timezone: "CST" },
  { id: "42019", name: "Freeport", latitude: "27.907", longitude: "-95.352", type: "Offshore Buoy", program: "NDBC", location: "Freeport, TX", timezone: "CST" },
  { id: "42020", name: "Corpus Christi", latitude: "26.968", longitude: "-96.695", type: "Offshore Buoy", program: "NDBC", location: "Corpus Christi, TX", timezone: "CST" },
  { id: "42035", name: "Galveston", latitude: "29.232", longitude: "-94.413", type: "Offshore Buoy", program: "NDBC", location: "Galveston, TX", timezone: "CST" },
  { id: "42036", name: "West Louisiana", latitude: "28.500", longitude: "-84.517", type: "Offshore Buoy", program: "NDBC", location: "W Louisiana", timezone: "CST" },
  { id: "42039", name: "Pensacola", latitude: "28.790", longitude: "-86.008", type: "Offshore Buoy", program: "NDBC", location: "Pensacola, FL", timezone: "CST" },
  { id: "42040", name: "Luke", latitude: "29.208", longitude: "-88.238", type: "Offshore Buoy", program: "NDBC", location: "S of Dauphin Island, AL", timezone: "CST" },

  // GREAT LAKES
  { id: "45001", name: "North Michigan", latitude: "45.347", longitude: "-86.273", type: "Lake Buoy", program: "NDBC", location: "N Lake Michigan", timezone: "EST" },
  { id: "45002", name: "South Michigan", latitude: "42.588", longitude: "-87.381", type: "Lake Buoy", program: "NDBC", location: "S Lake Michigan", timezone: "EST" },
  { id: "45005", name: "East Michigan", latitude: "43.589", longitude: "-82.344", type: "Lake Buoy", program: "NDBC", location: "E Lake Michigan", timezone: "EST" },
  { id: "45007", name: "Southeast Michigan", latitude: "42.674", longitude: "-82.961", type: "Lake Buoy", program: "NDBC", location: "SE Lake Michigan", timezone: "EST" },
  { id: "45161", name: "South Haven", latitude: "42.353", longitude: "-86.280", type: "Lake Buoy", program: "NDBC", location: "South Haven, MI", timezone: "EST" },
];

export async function fetchNOAABuoyData(stationId: string): Promise<any> {
  try {
    const url = `https://www.ndbc.noaa.gov/data/realtime2/${stationId}.txt`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SurfCast-App/1.0 (contact@surfcast.app)'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    const lines = text.trim().split('\n');
    
    if (lines.length < 3) {
      throw new Error('Insufficient data');
    }

    // Parse NOAA data format
    // Line 0: Column headers
    // Line 1: Units  
    // Line 2+: Data rows
    const headers = lines[0].split(/\s+/);
    const units = lines[1].split(/\s+/);
    const latestData = lines[2].split(/\s+/);

    const data: any = {};
    headers.forEach((header, index) => {
      data[header] = latestData[index] || null;
    });

    return {
      stationId,
      timestamp: new Date(),
      waveHeight: data.WVHT ? parseFloat(data.WVHT) : null, // meters
      wavePeriod: data.DPD ? parseFloat(data.DPD) : null,   // seconds
      waveDirection: data.MWD ? parseFloat(data.MWD) : null, // degrees
      windSpeed: data.WSPD ? parseFloat(data.WSPD) : null,   // m/s
      windDirection: data.WDIR ? parseFloat(data.WDIR) : null, // degrees
      airTemp: data.ATMP ? parseFloat(data.ATMP) : null,     // celsius
      waterTemp: data.WTMP ? parseFloat(data.WTMP) : null,   // celsius
      pressure: data.PRES ? parseFloat(data.PRES) : null,    // hPa
      raw: data
    };
  } catch (error) {
    console.error(`Failed to fetch NOAA data for ${stationId}:`, error);
    return null;
  }
}

export async function importNOAABuoyStations(): Promise<{ imported: number; skipped: number; total: number }> {
  console.log(`🌊 Importing ${NOAA_SURF_BUOYS.length} NOAA NDBC buoy stations...`);
  
  let imported = 0;
  let skipped = 0;
  
  for (const buoy of NOAA_SURF_BUOYS) {
    try {
      // Check if buoy station already exists
      const existing = await storage.getLocationByCoords(
        parseFloat(buoy.latitude), 
        parseFloat(buoy.longitude)
      );
      
      if (existing) {
        skipped++;
        continue;
      }
      
      // Create new buoy location
      const locationData: InsertLocation = {
        name: buoy.name,
        city: buoy.location,
        country: "USA", // NDBC stations are primarily US
        latitude: buoy.latitude,
        longitude: buoy.longitude,
        isCoastal: true,
      };
      
      await storage.createLocation(locationData);
      imported++;
      
    } catch (error) {
      console.error(`Failed to import NOAA buoy ${buoy.id}:`, error);
    }
  }
  
  const total = imported + skipped;
  console.log(`✅ NOAA import complete: ${imported} new buoy stations added, ${skipped} existing skipped`);
  console.log(`📍 Total NOAA stations available: ${total}`);
  
  return { imported, skipped, total };
}

export async function getNearbyNOAABuoys(lat: number, lng: number, radiusMiles: number = 100): Promise<NOAABuoyStation[]> {
  return NOAA_SURF_BUOYS.filter(buoy => {
    const buoyLat = parseFloat(buoy.latitude);
    const buoyLng = parseFloat(buoy.longitude);
    
    // Simple distance calculation (not perfect but good enough for this use case)
    const distance = Math.sqrt(
      Math.pow(buoyLat - lat, 2) + Math.pow(buoyLng - lng, 2)
    ) * 69; // Rough miles conversion
    
    return distance <= radiusMiles;
  }).sort((a, b) => {
    // Sort by distance
    const distA = Math.sqrt(Math.pow(parseFloat(a.latitude) - lat, 2) + Math.pow(parseFloat(a.longitude) - lng, 2));
    const distB = Math.sqrt(Math.pow(parseFloat(b.latitude) - lat, 2) + Math.pow(parseFloat(b.longitude) - lng, 2));
    return distA - distB;
  });
}

export function getBuoysByRegion(region: string): NOAABuoyStation[] {
  const regionMap: Record<string, string[]> = {
    'california': ['46237', '46026', '46012', '46092', '46025', '46221', '46218', '46053', '46086', '46224'],
    'oregon': ['46050', '46089', '46029'],
    'washington': ['46041', '46029'],
    'hawaii': ['51001', '51002', '51003', '51004', '51101', '51201'],
    'northeast': ['44017', '44025', '44065', '44009', '44014'],
    'southeast': ['41025', '41001', '41002', '41004', '41008', '41012'],
    'florida': ['41009', '41010', '41113', '41114', '41112', '41047', '41046', 'SMKF1', 'LONF1'],
    'gulf': ['42001', '42002', '42003', '42019', '42020', '42035', '42036', '42039', '42040'],
    'greatlakes': ['45001', '45002', '45005', '45007', '45161']
  };
  
  const stationIds = regionMap[region.toLowerCase()] || [];
  return NOAA_SURF_BUOYS.filter(buoy => stationIds.includes(buoy.id));
}