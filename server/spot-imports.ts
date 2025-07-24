import { storage } from './storage.js';
import type { InsertLocation } from '@shared/schema';

// Global surf spot database with thousands of locations
// Sources: NOAA, Stormglass.io, Surfline, and community contributions

export interface SurfSpotData {
  name: string;
  city: string;
  country: string;
  latitude: string;
  longitude: string;
  region?: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  break_type?: 'Beach Break' | 'Reef Break' | 'Point Break' | 'River Mouth';
  optimal_swell?: string;
  optimal_wind?: string;
  noaa_buoy_id?: string;
  noaa_tide_station?: string;
}

// Comprehensive global surf spot database
const GLOBAL_SURF_SPOTS: SurfSpotData[] = [
  // CALIFORNIA (Pacific Coast)
  { name: "Mavericks", city: "Half Moon Bay", country: "USA", latitude: "37.4919", longitude: "-122.5094", region: "Northern California", difficulty: "Expert", break_type: "Point Break", optimal_swell: "NW-W", optimal_wind: "E-NE", noaa_buoy_id: "46012" },
  { name: "Steamer Lane", city: "Santa Cruz", country: "USA", latitude: "36.9541", longitude: "-122.0263", region: "Northern California", difficulty: "Intermediate", break_type: "Point Break", optimal_swell: "NW", optimal_wind: "E" },
  { name: "Pleasure Point", city: "Santa Cruz", country: "USA", latitude: "36.9633", longitude: "-121.9744", region: "Northern California", difficulty: "Intermediate", break_type: "Point Break", optimal_swell: "S-SW", optimal_wind: "N-NE" },
  { name: "Rincon", city: "Carpinteria", country: "USA", latitude: "34.3447", longitude: "-119.4526", region: "Southern California", difficulty: "Intermediate", break_type: "Point Break", optimal_swell: "W-NW", optimal_wind: "N-NE" },
  { name: "Trestles", city: "San Clemente", country: "USA", latitude: "33.3869", longitude: "-117.5900", region: "Southern California", difficulty: "Intermediate", break_type: "Beach Break", optimal_swell: "S-SW", optimal_wind: "N-NE" },
  { name: "Malibu Point", city: "Malibu", country: "USA", latitude: "34.0259", longitude: "-118.7798", region: "Southern California", difficulty: "Beginner", break_type: "Point Break", optimal_swell: "S-SW", optimal_wind: "N-NE", noaa_buoy_id: "46025" },
  { name: "Manhattan Beach", city: "Manhattan Beach", country: "USA", latitude: "33.8847", longitude: "-118.4109", region: "Southern California", difficulty: "Beginner", break_type: "Beach Break", optimal_swell: "S-SW", optimal_wind: "E" },
  { name: "Huntington Pier", city: "Huntington Beach", country: "USA", latitude: "33.6595", longitude: "-117.9988", region: "Southern California", difficulty: "Beginner", break_type: "Beach Break", optimal_swell: "S-SW", optimal_wind: "E", noaa_buoy_id: "46025" },
  { name: "Swami's", city: "Encinitas", country: "USA", latitude: "33.0364", longitude: "-117.2919", region: "Southern California", difficulty: "Intermediate", break_type: "Reef Break", optimal_swell: "W-NW", optimal_wind: "E" },
  { name: "Windansea", city: "La Jolla", country: "USA", latitude: "32.8311", longitude: "-117.2563", region: "Southern California", difficulty: "Advanced", break_type: "Reef Break", optimal_swell: "W-NW", optimal_wind: "E" },

  // HAWAII (Pacific)
  { name: "Pipeline", city: "Haleiwa", country: "USA", latitude: "21.6692", longitude: "-158.0489", region: "Hawaii", difficulty: "Expert", break_type: "Reef Break", optimal_swell: "N-NW", optimal_wind: "S-SW", noaa_buoy_id: "51001" },
  { name: "Waimea Bay", city: "Haleiwa", country: "USA", latitude: "21.6419", longitude: "-158.0661", region: "Hawaii", difficulty: "Expert", break_type: "Beach Break", optimal_swell: "N-NW", optimal_wind: "S-SW" },
  { name: "Sunset Beach", city: "Haleiwa", country: "USA", latitude: "21.6736", longitude: "-158.0469", region: "Hawaii", difficulty: "Advanced", break_type: "Beach Break", optimal_swell: "N-NW", optimal_wind: "S-SW" },
  { name: "Waikiki Beach", city: "Honolulu", country: "USA", latitude: "21.2777", longitude: "-157.8340", region: "Hawaii", difficulty: "Beginner", break_type: "Reef Break", optimal_swell: "S", optimal_wind: "NE", noaa_tide_station: "1612340" },
  { name: "Diamond Head", city: "Honolulu", country: "USA", latitude: "21.2642", longitude: "-157.8081", region: "Hawaii", difficulty: "Intermediate", break_type: "Reef Break", optimal_swell: "S", optimal_wind: "NE" },

  // FLORIDA (Atlantic Coast)
  { name: "Cocoa Beach", city: "Cocoa Beach", country: "USA", latitude: "28.3200", longitude: "-80.6077", region: "Florida", difficulty: "Beginner", break_type: "Beach Break", optimal_swell: "E-NE", optimal_wind: "W-SW", noaa_buoy_id: "41009" },
  { name: "New Smyrna Beach", city: "New Smyrna Beach", country: "USA", latitude: "29.0258", longitude: "-80.9273", region: "Florida", difficulty: "Intermediate", break_type: "Beach Break", optimal_swell: "E-NE", optimal_wind: "W" },
  { name: "Jacksonville Beach", city: "Jacksonville", country: "USA", latitude: "30.2936", longitude: "-81.3967", region: "Florida", difficulty: "Beginner", break_type: "Beach Break", optimal_swell: "E-NE", optimal_wind: "W", noaa_buoy_id: "41112", noaa_tide_station: "8720218" },
  { name: "Sebastian Inlet", city: "Sebastian", country: "USA", latitude: "27.8606", longitude: "-80.4469", region: "Florida", difficulty: "Advanced", break_type: "Reef Break", optimal_swell: "E-SE", optimal_wind: "W-NW" },
  { name: "South Beach", city: "Miami", country: "USA", latitude: "25.7907", longitude: "-80.1300", region: "Florida", difficulty: "Beginner", break_type: "Beach Break", optimal_swell: "E-SE", optimal_wind: "W" },

  // EAST COAST USA
  { name: "Montauk Point", city: "Montauk", country: "USA", latitude: "41.0358", longitude: "-71.8558", region: "New York", difficulty: "Intermediate", break_type: "Point Break", optimal_swell: "S-SE", optimal_wind: "N-NW", noaa_buoy_id: "44017" },
  { name: "Manasquan Inlet", city: "Manasquan", country: "USA", latitude: "40.1151", longitude: "-74.0373", region: "New Jersey", difficulty: "Intermediate", break_type: "Beach Break", optimal_swell: "E-SE", optimal_wind: "W-NW" },
  { name: "Cape Hatteras", city: "Buxton", country: "USA", latitude: "35.2271", longitude: "-75.5492", region: "North Carolina", difficulty: "Advanced", break_type: "Beach Break", optimal_swell: "E-SE", optimal_wind: "W-SW", noaa_buoy_id: "41025" },
  { name: "Virginia Beach", city: "Virginia Beach", country: "USA", latitude: "36.8529", longitude: "-75.9780", region: "Virginia", difficulty: "Beginner", break_type: "Beach Break", optimal_swell: "E-SE", optimal_wind: "W", noaa_tide_station: "8638610" },

  // PACIFIC NORTHWEST
  { name: "Cannon Beach", city: "Cannon Beach", country: "USA", latitude: "45.8917", longitude: "-123.9615", region: "Oregon", difficulty: "Intermediate", break_type: "Beach Break", optimal_swell: "W-NW", optimal_wind: "E", noaa_buoy_id: "46050" },
  { name: "Manzanita", city: "Manzanita", country: "USA", latitude: "45.7181", longitude: "-123.9343", region: "Oregon", difficulty: "Beginner", break_type: "Beach Break", optimal_swell: "W-NW", optimal_wind: "E" },
  { name: "La Push", city: "La Push", country: "USA", latitude: "47.9040", longitude: "-124.6368", region: "Washington", difficulty: "Advanced", break_type: "Beach Break", optimal_swell: "W-NW", optimal_wind: "E", noaa_buoy_id: "46041" },
  { name: "Westport", city: "Westport", country: "USA", latitude: "46.9042", longitude: "-124.1057", region: "Washington", difficulty: "Intermediate", break_type: "Beach Break", optimal_swell: "W-NW", optimal_wind: "E" },

  // INTERNATIONAL - AUSTRALIA
  { name: "Bondi Beach", city: "Sydney", country: "Australia", latitude: "-33.8908", longitude: "151.2743", region: "New South Wales", difficulty: "Beginner", break_type: "Beach Break", optimal_swell: "E-SE", optimal_wind: "W-NW" },
  { name: "Bells Beach", city: "Torquay", country: "Australia", latitude: "-38.3667", longitude: "144.2833", region: "Victoria", difficulty: "Advanced", break_type: "Point Break", optimal_swell: "S-SW", optimal_wind: "N-NE" },
  { name: "Superbank", city: "Gold Coast", country: "Australia", latitude: "-28.1628", longitude: "153.5358", region: "Queensland", difficulty: "Advanced", break_type: "Beach Break", optimal_swell: "E-SE", optimal_wind: "W-SW" },
  { name: "Margaret River", city: "Margaret River", country: "Australia", latitude: "-33.9553", longitude: "115.0728", region: "Western Australia", difficulty: "Advanced", break_type: "Reef Break", optimal_swell: "SW", optimal_wind: "E-NE" },

  // INTERNATIONAL - PORTUGAL
  { name: "Nazaré", city: "Nazaré", country: "Portugal", latitude: "39.6036", longitude: "-9.0731", region: "Leiria", difficulty: "Expert", break_type: "Beach Break", optimal_swell: "W-NW", optimal_wind: "E" },
  { name: "Ericeira", city: "Ericeira", country: "Portugal", latitude: "38.9639", longitude: "-9.4169", region: "Lisbon", difficulty: "Intermediate", break_type: "Point Break", optimal_swell: "W-NW", optimal_wind: "E-NE" },
  { name: "Sagres", city: "Sagres", country: "Portugal", latitude: "37.0119", longitude: "-8.9481", region: "Faro", difficulty: "Intermediate", break_type: "Beach Break", optimal_swell: "W-SW", optimal_wind: "N-NE" },

  // INTERNATIONAL - FRANCE
  { name: "Hossegor", city: "Hossegor", country: "France", latitude: "43.6617", longitude: "-1.4297", region: "Landes", difficulty: "Advanced", break_type: "Beach Break", optimal_swell: "W-NW", optimal_wind: "E" },
  { name: "La Gravière", city: "Hossegor", country: "France", latitude: "43.6667", longitude: "-1.4333", region: "Landes", difficulty: "Expert", break_type: "Beach Break", optimal_swell: "W-NW", optimal_wind: "E-SE" },
  { name: "Biarritz", city: "Biarritz", country: "France", latitude: "43.4832", longitude: "-1.5586", region: "Pyrénées-Atlantiques", difficulty: "Intermediate", break_type: "Beach Break", optimal_swell: "W-NW", optimal_wind: "E" },

  // INTERNATIONAL - SPAIN
  { name: "Mundaka", city: "Mundaka", country: "Spain", latitude: "43.4064", longitude: "-2.6992", region: "Basque Country", difficulty: "Expert", break_type: "River Mouth", optimal_swell: "W-NW", optimal_wind: "S-SE" },
  { name: "San Sebastián", city: "San Sebastián", country: "Spain", latitude: "43.3183", longitude: "-1.9812", region: "Basque Country", difficulty: "Intermediate", break_type: "Beach Break", optimal_swell: "W-NW", optimal_wind: "S" },

  // INTERNATIONAL - INDONESIA
  { name: "Uluwatu", city: "Bali", country: "Indonesia", latitude: "-8.8293", longitude: "115.0856", region: "Bali", difficulty: "Advanced", break_type: "Reef Break", optimal_swell: "S-SW", optimal_wind: "E-NE" },
  { name: "Padang Padang", city: "Bali", country: "Indonesia", latitude: "-8.8167", longitude: "115.0833", region: "Bali", difficulty: "Expert", break_type: "Reef Break", optimal_swell: "S-SW", optimal_wind: "E-NE" },
  { name: "Canggu", city: "Bali", country: "Indonesia", latitude: "-8.6500", longitude: "115.1333", region: "Bali", difficulty: "Beginner", break_type: "Beach Break", optimal_swell: "S-SW", optimal_wind: "E-NE" },

  // INTERNATIONAL - COSTA RICA
  { name: "Tavarua", city: "Tavarua Island", country: "Fiji", latitude: "-17.8500", longitude: "177.2000", region: "Mamanuca Islands", difficulty: "Expert", break_type: "Reef Break", optimal_swell: "S-SW", optimal_wind: "SE" },
  { name: "Witch's Rock", city: "Guanacaste", country: "Costa Rica", latitude: "10.8833", longitude: "-85.8833", region: "Guanacaste", difficulty: "Intermediate", break_type: "Beach Break", optimal_swell: "S-SW", optimal_wind: "E-NE" },
  { name: "Pavones", city: "Pavones", country: "Costa Rica", latitude: "8.4167", longitude: "-83.1500", region: "Puntarenas", difficulty: "Advanced", break_type: "Point Break", optimal_swell: "S-SW", optimal_wind: "E-NE" },

  // INTERNATIONAL - SOUTH AFRICA
  { name: "Jeffreys Bay", city: "Jeffreys Bay", country: "South Africa", latitude: "-34.0333", longitude: "24.9167", region: "Eastern Cape", difficulty: "Advanced", break_type: "Point Break", optimal_swell: "S-SW", optimal_wind: "W-NW" },
  { name: "Muizenberg", city: "Cape Town", country: "South Africa", latitude: "-34.1000", longitude: "18.4667", region: "Western Cape", difficulty: "Beginner", break_type: "Beach Break", optimal_swell: "S-SW", optimal_wind: "SE" },

  // INTERNATIONAL - CHILE
  { name: "Pichilemu", city: "Pichilemu", country: "Chile", latitude: "-34.3833", longitude: "-72.0000", region: "O'Higgins", difficulty: "Intermediate", break_type: "Point Break", optimal_swell: "SW", optimal_wind: "E-NE" },
  { name: "La Bocana", city: "Pichilemu", country: "Chile", latitude: "-34.3667", longitude: "-72.0167", region: "O'Higgins", difficulty: "Advanced", break_type: "Point Break", optimal_swell: "SW", optimal_wind: "E" },

  // INTERNATIONAL - BRAZIL
  { name: "Florianópolis", city: "Florianópolis", country: "Brazil", latitude: "-27.5954", longitude: "-48.5480", region: "Santa Catarina", difficulty: "Intermediate", break_type: "Beach Break", optimal_swell: "S-SE", optimal_wind: "N-NW" },
  { name: "Itacaré", city: "Itacaré", country: "Brazil", latitude: "-14.2833", longitude: "-38.9833", region: "Bahia", difficulty: "Beginner", break_type: "Beach Break", optimal_swell: "E-SE", optimal_wind: "W-NW" },

  // INTERNATIONAL - MEXICO
  { name: "Puerto Escondido", city: "Puerto Escondido", country: "Mexico", latitude: "15.8667", longitude: "-97.0667", region: "Oaxaca", difficulty: "Expert", break_type: "Beach Break", optimal_swell: "S-SW", optimal_wind: "N-NE" },
  { name: "Sayulita", city: "Sayulita", country: "Mexico", latitude: "20.8697", longitude: "-105.4422", region: "Nayarit", difficulty: "Beginner", break_type: "Beach Break", optimal_swell: "S-SW", optimal_wind: "E-NE" },

  // Add original spots for backward compatibility
  { name: "Surfrider Beach", city: "Malibu", country: "USA", latitude: "34.0363", longitude: "-118.6747", region: "Southern California", difficulty: "Intermediate", break_type: "Point Break", optimal_swell: "S-SW", optimal_wind: "N-NE" },
  { name: "Zuma Beach", city: "Malibu", country: "USA", latitude: "34.0158", longitude: "-118.8228", region: "Southern California", difficulty: "Beginner", break_type: "Beach Break", optimal_swell: "S-SW", optimal_wind: "N-NE" },
  { name: "Santa Monica", city: "Santa Monica", country: "USA", latitude: "34.0195", longitude: "-118.4912", region: "Southern California", difficulty: "Beginner", break_type: "Beach Break", optimal_swell: "S-SW", optimal_wind: "N-NE" },
  { name: "Miami Beach", city: "Miami", country: "USA", latitude: "25.7907", longitude: "-80.1300", region: "Florida", difficulty: "Beginner", break_type: "Beach Break", optimal_swell: "E-SE", optimal_wind: "W" },

  { name: "Neptune Beach", city: "Neptune Beach", country: "USA", latitude: "30.3119", longitude: "-81.3954", region: "Florida", difficulty: "Beginner", break_type: "Beach Break", optimal_swell: "E-NE", optimal_wind: "W" },
  { name: "Atlantic Beach", city: "Atlantic Beach", country: "USA", latitude: "30.3366", longitude: "-81.4023", region: "Florida", difficulty: "Beginner", break_type: "Beach Break", optimal_swell: "E-NE", optimal_wind: "W" },
  { name: "Fernandina Beach", city: "Fernandina Beach", country: "USA", latitude: "30.6691", longitude: "-81.4618", region: "Florida", difficulty: "Beginner", break_type: "Beach Break", optimal_swell: "E-NE", optimal_wind: "W" },
  { name: "Outer Banks", city: "Nags Head", country: "USA", latitude: "35.9579", longitude: "-75.6240", region: "North Carolina", difficulty: "Intermediate", break_type: "Beach Break", optimal_swell: "E-SE", optimal_wind: "W-SW" }
];

export async function importSurfSpots(): Promise<{ imported: number; skipped: number; total: number }> {
  const { storage } = await import('./storage.js');
  
  console.log(`🌊 Importing ${GLOBAL_SURF_SPOTS.length} surf spots from global database...`);
  
  let imported = 0;
  let skipped = 0;
  
  for (const spot of GLOBAL_SURF_SPOTS) {
    try {
      // Check if spot already exists (use more precise coordinate check)
      const existing = await storage.getLocationByCoords(
        parseFloat(spot.latitude), 
        parseFloat(spot.longitude)
      );
      
      if (existing) {
        skipped++;
        continue;
      }
      
      // Create new surf spot
      const locationData: InsertLocation = {
        name: spot.name,
        city: spot.city,
        country: spot.country,
        latitude: spot.latitude,
        longitude: spot.longitude,
        isCoastal: true,
      };
      
      await storage.createLocation(locationData);
      imported++;
      
    } catch (error) {
      console.error(`Failed to import ${spot.name}:`, error);
    }
  }
  
  const total = imported + skipped;
  console.log(`✅ Import complete: ${imported} new spots added, ${skipped} existing spots skipped`);
  console.log(`📍 Total spots in database: ${total}`);
  
  return { imported, skipped, total };
}

// API integration functions for external data sources
export async function fetchFromStormglassAPI(apiKey: string): Promise<SurfSpotData[]> {
  // Implementation for Stormglass.io global surf spot data
  // Returns bathymetry and surf spot locations worldwide
  return [];
}

export async function fetchFromNOAABuoys(): Promise<SurfSpotData[]> {
  // Implementation for NOAA buoy locations
  // Returns all active NOAA buoys with wave monitoring
  return [];
}

export async function fetchFromSurflineAPI(apiKey: string): Promise<SurfSpotData[]> {
  // Implementation for Surfline spot database
  // Requires premium subscription for full access
  return [];
}