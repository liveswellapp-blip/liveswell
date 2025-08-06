import { storage } from './storage.js';
import { findNearbyStations } from './noaa-integration.js';
import type { InsertLocation } from '@shared/schema';

// Major US coastal cities that can leverage nearby NOAA buoy data
// Each city will be mapped to the nearest buoy within a reasonable distance
export interface CoastalCityData {
  name: string;
  city: string;
  country: string;
  latitude: string;
  longitude: string;
  region: string;
  state: string;
  maxBuoyDistanceMiles: number; // Maximum distance to accept a buoy
  priority: 'high' | 'medium' | 'low'; // Priority for adding to database
}

const COASTAL_CITIES_USA: CoastalCityData[] = [
  // CALIFORNIA - Major coastal cities
  { name: "San Francisco Bay Area", city: "San Francisco", country: "USA", latitude: "37.7749", longitude: "-122.4194", region: "Northern California", state: "CA", maxBuoyDistanceMiles: 50, priority: "high" },
  { name: "San Jose Bay Area", city: "San Jose", country: "USA", latitude: "37.3382", longitude: "-121.8863", region: "Northern California", state: "CA", maxBuoyDistanceMiles: 60, priority: "medium" },
  { name: "Oakland Bay Area", city: "Oakland", country: "USA", latitude: "37.8044", longitude: "-122.2711", region: "Northern California", state: "CA", maxBuoyDistanceMiles: 40, priority: "medium" },
  { name: "Monterey Peninsula", city: "Monterey", country: "USA", latitude: "36.6002", longitude: "-121.8947", region: "Central California", state: "CA", maxBuoyDistanceMiles: 30, priority: "high" },
  { name: "Big Sur Coast", city: "Big Sur", country: "USA", latitude: "36.2704", longitude: "-121.8081", region: "Central California", state: "CA", maxBuoyDistanceMiles: 50, priority: "medium" },
  { name: "San Luis Obispo Coast", city: "San Luis Obispo", country: "USA", latitude: "35.2828", longitude: "-120.6596", region: "Central California", state: "CA", maxBuoyDistanceMiles: 40, priority: "medium" },
  { name: "Ventura Coast", city: "Ventura", country: "USA", latitude: "34.2746", longitude: "-119.2290", region: "Southern California", state: "CA", maxBuoyDistanceMiles: 35, priority: "high" },
  { name: "Long Beach", city: "Long Beach", country: "USA", latitude: "33.7701", longitude: "-118.1937", region: "Southern California", state: "CA", maxBuoyDistanceMiles: 40, priority: "high" },
  { name: "Newport Beach", city: "Newport Beach", country: "USA", latitude: "33.6189", longitude: "-117.9289", region: "Southern California", state: "CA", maxBuoyDistanceMiles: 45, priority: "high" },
  { name: "Laguna Beach", city: "Laguna Beach", country: "USA", latitude: "33.5427", longitude: "-117.7854", region: "Southern California", state: "CA", maxBuoyDistanceMiles: 45, priority: "high" },
  { name: "San Diego Bay", city: "San Diego", country: "USA", latitude: "32.7157", longitude: "-117.1611", region: "Southern California", state: "CA", maxBuoyDistanceMiles: 50, priority: "high" },
  { name: "Carlsbad Coast", city: "Carlsbad", country: "USA", latitude: "33.1581", longitude: "-117.3506", region: "Southern California", state: "CA", maxBuoyDistanceMiles: 40, priority: "medium" },

  // OREGON - Pacific Coast
  { name: "Portland Metro Coast", city: "Portland", country: "USA", latitude: "45.5152", longitude: "-122.6784", region: "Oregon Coast", state: "OR", maxBuoyDistanceMiles: 80, priority: "high" },
  { name: "Oregon Coast - Lincoln City", city: "Lincoln City", country: "USA", latitude: "44.9581", longitude: "-124.0179", region: "Oregon Coast", state: "OR", maxBuoyDistanceMiles: 25, priority: "high" },
  { name: "Oregon Coast - Seaside", city: "Seaside", country: "USA", latitude: "45.9932", longitude: "-123.9226", region: "Oregon Coast", state: "OR", maxBuoyDistanceMiles: 30, priority: "medium" },
  { name: "Oregon Coast - Cannon Beach", city: "Cannon Beach", country: "USA", latitude: "45.8918", longitude: "-123.9615", region: "Oregon Coast", state: "OR", maxBuoyDistanceMiles: 30, priority: "high" },
  { name: "Oregon Coast - Florence", city: "Florence", country: "USA", latitude: "43.9829", longitude: "-124.1056", region: "Oregon Coast", state: "OR", maxBuoyDistanceMiles: 35, priority: "medium" },

  // WASHINGTON - Pacific Coast
  { name: "Seattle Metro Coast", city: "Seattle", country: "USA", latitude: "47.6062", longitude: "-122.3321", region: "Washington Coast", state: "WA", maxBuoyDistanceMiles: 100, priority: "high" },
  { name: "Washington Coast - Ocean Shores", city: "Ocean Shores", country: "USA", latitude: "46.9739", longitude: "-124.1568", region: "Washington Coast", state: "WA", maxBuoyDistanceMiles: 35, priority: "medium" },
  { name: "Washington Coast - Long Beach", city: "Long Beach", country: "USA", latitude: "46.3523", longitude: "-124.0543", region: "Washington Coast", state: "WA", maxBuoyDistanceMiles: 30, priority: "medium" },
  { name: "Tacoma Metro Coast", city: "Tacoma", country: "USA", latitude: "47.2529", longitude: "-122.4443", region: "Washington Coast", state: "WA", maxBuoyDistanceMiles: 90, priority: "medium" },

  // NORTHEAST - Atlantic Coast
  { name: "Boston Harbor", city: "Boston", country: "USA", latitude: "42.3601", longitude: "-71.0589", region: "New England", state: "MA", maxBuoyDistanceMiles: 80, priority: "high" },
  { name: "Cape Cod", city: "Provincetown", country: "USA", latitude: "42.0526", longitude: "-70.1826", region: "New England", state: "MA", maxBuoyDistanceMiles: 40, priority: "high" },
  { name: "Martha's Vineyard", city: "Vineyard Haven", country: "USA", latitude: "41.4539", longitude: "-70.6000", region: "New England", state: "MA", maxBuoyDistanceMiles: 50, priority: "medium" },
  { name: "Nantucket Island", city: "Nantucket", country: "USA", latitude: "41.2835", longitude: "-70.0995", region: "New England", state: "MA", maxBuoyDistanceMiles: 45, priority: "medium" },
  { name: "New York Harbor", city: "New York", country: "USA", latitude: "40.7128", longitude: "-74.0060", region: "Mid-Atlantic", state: "NY", maxBuoyDistanceMiles: 70, priority: "high" },
  { name: "Atlantic City", city: "Atlantic City", country: "USA", latitude: "39.3643", longitude: "-74.4229", region: "Mid-Atlantic", state: "NJ", maxBuoyDistanceMiles: 50, priority: "high" },
  { name: "Jersey Shore - Asbury Park", city: "Asbury Park", country: "USA", latitude: "40.2204", longitude: "-74.0120", region: "Mid-Atlantic", state: "NJ", maxBuoyDistanceMiles: 45, priority: "medium" },
  { name: "Delaware Beaches", city: "Rehoboth Beach", country: "USA", latitude: "38.7198", longitude: "-75.0760", region: "Mid-Atlantic", state: "DE", maxBuoyDistanceMiles: 40, priority: "medium" },

  // SOUTHEAST - Atlantic Coast
  { name: "Virginia Beach Metro", city: "Virginia Beach", country: "USA", latitude: "36.8529", longitude: "-75.9780", region: "Southeast Atlantic", state: "VA", maxBuoyDistanceMiles: 45, priority: "high" },
  { name: "Outer Banks - Nags Head", city: "Nags Head", country: "USA", latitude: "35.9579", longitude: "-75.6240", region: "Outer Banks", state: "NC", maxBuoyDistanceMiles: 40, priority: "high" },
  { name: "Outer Banks - Cape Hatteras", city: "Buxton", country: "USA", latitude: "35.2701", longitude: "-75.5299", region: "Outer Banks", state: "NC", maxBuoyDistanceMiles: 30, priority: "high" },
  { name: "Wilmington Coast", city: "Wilmington", country: "USA", latitude: "34.2257", longitude: "-77.9447", region: "North Carolina Coast", state: "NC", maxBuoyDistanceMiles: 60, priority: "medium" },
  { name: "Myrtle Beach", city: "Myrtle Beach", country: "USA", latitude: "33.6891", longitude: "-78.8867", region: "South Carolina Coast", state: "SC", maxBuoyDistanceMiles: 50, priority: "high" },
  { name: "Charleston Harbor", city: "Charleston", country: "USA", latitude: "32.7765", longitude: "-79.9311", region: "South Carolina Coast", state: "SC", maxBuoyDistanceMiles: 45, priority: "high" },
  { name: "Savannah Coast", city: "Savannah", country: "USA", latitude: "32.0835", longitude: "-81.0998", region: "Georgia Coast", state: "GA", maxBuoyDistanceMiles: 50, priority: "medium" },

  // FLORIDA - East Coast
  { name: "Jacksonville Metro", city: "Jacksonville", country: "USA", latitude: "30.3322", longitude: "-81.6557", region: "Northeast Florida", state: "FL", maxBuoyDistanceMiles: 40, priority: "high" },
  { name: "Daytona Beach", city: "Daytona Beach", country: "USA", latitude: "29.2108", longitude: "-81.0228", region: "East Central Florida", state: "FL", maxBuoyDistanceMiles: 40, priority: "high" },
  { name: "New Smyrna Beach", city: "New Smyrna Beach", country: "USA", latitude: "29.0258", longitude: "-80.9270", region: "East Central Florida", state: "FL", maxBuoyDistanceMiles: 35, priority: "high" },
  { name: "Orlando Metro Coast", city: "Orlando", country: "USA", latitude: "28.5383", longitude: "-81.3792", region: "East Central Florida", state: "FL", maxBuoyDistanceMiles: 70, priority: "medium" },
  { name: "Melbourne Beach", city: "Melbourne", country: "USA", latitude: "28.0836", longitude: "-80.6081", region: "East Central Florida", state: "FL", maxBuoyDistanceMiles: 40, priority: "medium" },
  { name: "Vero Beach", city: "Vero Beach", country: "USA", latitude: "27.6386", longitude: "-80.3973", region: "Treasure Coast", state: "FL", maxBuoyDistanceMiles: 35, priority: "medium" },
  { name: "West Palm Beach", city: "West Palm Beach", country: "USA", latitude: "26.7153", longitude: "-80.0534", region: "Southeast Florida", state: "FL", maxBuoyDistanceMiles: 40, priority: "high" },
  { name: "Fort Lauderdale", city: "Fort Lauderdale", country: "USA", latitude: "26.1224", longitude: "-80.1373", region: "Southeast Florida", state: "FL", maxBuoyDistanceMiles: 45, priority: "high" },
  { name: "Miami Metro", city: "Miami", country: "USA", latitude: "25.7617", longitude: "-80.1918", region: "Southeast Florida", state: "FL", maxBuoyDistanceMiles: 50, priority: "high" },

  // FLORIDA - Gulf Coast
  { name: "Tampa Bay", city: "Tampa", country: "USA", latitude: "27.9506", longitude: "-82.4572", region: "West Central Florida", state: "FL", maxBuoyDistanceMiles: 60, priority: "high" },
  { name: "St. Petersburg", city: "St. Petersburg", country: "USA", latitude: "27.7676", longitude: "-82.6403", region: "West Central Florida", state: "FL", maxBuoyDistanceMiles: 55, priority: "medium" },
  { name: "Clearwater Beach", city: "Clearwater", country: "USA", latitude: "27.9659", longitude: "-82.8001", region: "West Central Florida", state: "FL", maxBuoyDistanceMiles: 50, priority: "high" },
  { name: "Sarasota", city: "Sarasota", country: "USA", latitude: "27.3364", longitude: "-82.5307", region: "Southwest Florida", state: "FL", maxBuoyDistanceMiles: 55, priority: "medium" },
  { name: "Naples Coast", city: "Naples", country: "USA", latitude: "26.1420", longitude: "-81.7948", region: "Southwest Florida", state: "FL", maxBuoyDistanceMiles: 60, priority: "medium" },
  { name: "Fort Myers Beach", city: "Fort Myers", country: "USA", latitude: "26.5628", longitude: "-81.8495", region: "Southwest Florida", state: "FL", maxBuoyDistanceMiles: 55, priority: "medium" },
  { name: "Pensacola Beach", city: "Pensacola", country: "USA", latitude: "30.4213", longitude: "-87.2169", region: "Northwest Florida", state: "FL", maxBuoyDistanceMiles: 40, priority: "high" },

  // GULF COAST - Texas
  { name: "Houston Metro Coast", city: "Houston", country: "USA", latitude: "29.7604", longitude: "-95.3698", region: "Texas Gulf Coast", state: "TX", maxBuoyDistanceMiles: 70, priority: "high" },
  { name: "Galveston Island", city: "Galveston", country: "USA", latitude: "29.3013", longitude: "-94.7977", region: "Texas Gulf Coast", state: "TX", maxBuoyDistanceMiles: 35, priority: "high" },
  { name: "Corpus Christi Bay", city: "Corpus Christi", country: "USA", latitude: "27.8006", longitude: "-97.3964", region: "South Texas Coast", state: "TX", maxBuoyDistanceMiles: 40, priority: "high" },
  { name: "South Padre Island", city: "South Padre Island", country: "USA", latitude: "26.1118", longitude: "-97.1681", region: "South Texas Coast", state: "TX", maxBuoyDistanceMiles: 50, priority: "high" },

  // GULF COAST - Louisiana/Alabama/Mississippi
  { name: "New Orleans Metro", city: "New Orleans", country: "USA", latitude: "29.9511", longitude: "-90.0715", region: "Louisiana Coast", state: "LA", maxBuoyDistanceMiles: 80, priority: "high" },
  { name: "Mobile Bay", city: "Mobile", country: "USA", latitude: "30.6954", longitude: "-88.0399", region: "Alabama Coast", state: "AL", maxBuoyDistanceMiles: 50, priority: "medium" },
  { name: "Gulf Shores", city: "Gulf Shores", country: "USA", latitude: "30.2460", longitude: "-87.7008", region: "Alabama Coast", state: "AL", maxBuoyDistanceMiles: 40, priority: "medium" },
  { name: "Biloxi Coast", city: "Biloxi", country: "USA", latitude: "30.3960", longitude: "-88.8853", region: "Mississippi Coast", state: "MS", maxBuoyDistanceMiles: 45, priority: "medium" },

  // HAWAII - Additional Islands
  { name: "Kauai - Lihue", city: "Lihue", country: "USA", latitude: "21.9811", longitude: "-159.3710", region: "Hawaii", state: "HI", maxBuoyDistanceMiles: 60, priority: "high" },
  { name: "Maui - Kahului", city: "Kahului", country: "USA", latitude: "20.8893", longitude: "-156.4729", region: "Hawaii", state: "HI", maxBuoyDistanceMiles: 60, priority: "high" },
  { name: "Big Island - Hilo", city: "Hilo", country: "USA", latitude: "19.7297", longitude: "-155.0900", region: "Hawaii", state: "HI", maxBuoyDistanceMiles: 70, priority: "medium" },
  { name: "Big Island - Kona", city: "Kailua-Kona", country: "USA", latitude: "19.6389", longitude: "-155.9969", region: "Hawaii", state: "HI", maxBuoyDistanceMiles: 70, priority: "medium" }
];

export async function expandCoastalCitiesWithBuoyData(): Promise<{ added: number; skipped: number; total: number }> {
  console.log(`🏙️ Expanding coverage with ${COASTAL_CITIES_USA.length} coastal cities using nearby NOAA buoy data...`);
  
  let added = 0;
  let skipped = 0;
  let totalProcessed = 0;

  for (const city of COASTAL_CITIES_USA) {
    try {
      totalProcessed++;
      
      // Check if city already exists
      const existing = await storage.getLocationByCoords(
        parseFloat(city.latitude), 
        parseFloat(city.longitude)
      );
      
      if (existing) {
        skipped++;
        continue;
      }

      // Find nearby NOAA stations within the city's maximum distance
      const nearbyStations = await findNearbyStations(
        parseFloat(city.latitude), 
        parseFloat(city.longitude), 
        city.maxBuoyDistanceMiles
      );

      // Only add city if it has at least one nearby station for data
      if (nearbyStations.length > 0) {
        const locationData: InsertLocation = {
          name: city.name,
          city: city.city,
          country: city.country,
          latitude: city.latitude,
          longitude: city.longitude,
          isCoastal: true,
        };
        
        await storage.createLocation(locationData);
        added++;
        
        console.log(`✅ Added ${city.name} with ${nearbyStations.length} nearby stations (closest: ${nearbyStations[0].name})`);
      } else {
        console.log(`⚠️ Skipped ${city.name} - no NOAA stations within ${city.maxBuoyDistanceMiles} miles`);
        skipped++;
      }
      
    } catch (error) {
      console.error(`Failed to process coastal city ${city.name}:`, error);
      skipped++;
    }
  }
  
  console.log(`✅ Coastal cities expansion complete: ${added} new cities added, ${skipped} skipped`);
  console.log(`📍 Processed ${totalProcessed} coastal cities with NOAA buoy coverage`);
  
  return { added, skipped, total: added + skipped };
}

export async function getCityBuoyMapping(cityLat: number, cityLng: number): Promise<{
  closestBuoy: any | null;
  allNearbyBuoys: any[];
  distanceToClosest: number | null;
}> {
  const nearbyStations = await findNearbyStations(cityLat, cityLng, 150); // 150 mile search radius
  
  if (nearbyStations.length === 0) {
    return { closestBuoy: null, allNearbyBuoys: [], distanceToClosest: null };
  }

  const closestBuoy = nearbyStations[0];
  const distanceToClosest = Math.sqrt(
    Math.pow(parseFloat(closestBuoy.latitude) - cityLat, 2) + 
    Math.pow(parseFloat(closestBuoy.longitude) - cityLng, 2)
  ) * 69; // Convert to miles

  return {
    closestBuoy,
    allNearbyBuoys: nearbyStations,
    distanceToClosest
  };
}

export function getCoastalCitiesByPriority(priority: 'high' | 'medium' | 'low'): CoastalCityData[] {
  return COASTAL_CITIES_USA.filter(city => city.priority === priority);
}

export function getCoastalCitiesByRegion(region: string): CoastalCityData[] {
  return COASTAL_CITIES_USA.filter(city => 
    city.region.toLowerCase().includes(region.toLowerCase()) ||
    city.state.toLowerCase() === region.toLowerCase()
  );
}