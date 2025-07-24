/**
 * Comprehensive Surf Spot Expansion Using NOAA Network
 * Leverages all 1,355+ NOAA stations to add hundreds of new surf spots
 */

import { findNearbyStations } from './noaa-integration';

interface NewSurfSpot {
  name: string;
  city: string;
  country: string;
  state?: string;
  latitude: string;
  longitude: string;
  isCoastal: boolean;
  breakType?: string;
  difficulty?: string;
  optimalConditions?: string;
  nearbyStations?: string[];
}

/**
 * Comprehensive surf spot database leveraging NOAA coverage
 */
const comprehensiveSurfSpots: NewSurfSpot[] = [
  // PACIFIC COAST - CALIFORNIA (Enhanced with NOAA coverage)
  { name: "Ocean Beach", city: "San Francisco", country: "USA", state: "California", latitude: "37.7749", longitude: "-122.5114", isCoastal: true, breakType: "Beach Break", difficulty: "Advanced", optimalConditions: "W-NW swells, offshore winds" },
  { name: "Pacifica", city: "Pacifica", country: "USA", state: "California", latitude: "37.6138", longitude: "-122.4869", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "W-NW swells, light winds" },
  { name: "Santa Cruz - Steamer Lane", city: "Santa Cruz", country: "USA", state: "California", latitude: "36.9741", longitude: "-122.0308", isCoastal: true, breakType: "Point Break", difficulty: "Advanced", optimalConditions: "NW swells, E winds" },
  { name: "Capitola", city: "Capitola", country: "USA", state: "California", latitude: "36.9741", longitude: "-121.9532", isCoastal: true, breakType: "Beach Break", difficulty: "Beginner", optimalConditions: "Small S swells" },
  { name: "Carmel Bay", city: "Carmel", country: "USA", state: "California", latitude: "36.5527", longitude: "-121.9233", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "NW swells, NE winds" },
  { name: "Big Sur", city: "Big Sur", country: "USA", state: "California", latitude: "36.2704", longitude: "-121.8075", isCoastal: true, breakType: "Point Break", difficulty: "Expert", optimalConditions: "Large NW swells" },
  { name: "Pismo Beach", city: "Pismo Beach", country: "USA", state: "California", latitude: "35.1428", longitude: "-120.6413", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "W-NW swells" },
  { name: "Jalama Beach", city: "Lompoc", country: "USA", state: "California", latitude: "34.5155", longitude: "-120.5015", isCoastal: true, breakType: "Point Break", difficulty: "Advanced", optimalConditions: "NW swells, NE winds" },
  { name: "Refugio State Beach", city: "Goleta", country: "USA", state: "California", latitude: "34.4619", longitude: "-120.0707", isCoastal: true, breakType: "Point Break", difficulty: "Intermediate", optimalConditions: "W swells" },
  { name: "Rincon", city: "Carpinteria", country: "USA", state: "California", latitude: "34.3747", longitude: "-119.4871", isCoastal: true, breakType: "Point Break", difficulty: "Advanced", optimalConditions: "W-NW swells, NE winds" },
  { name: "C-Street", city: "Ventura", country: "USA", state: "California", latitude: "34.2746", longitude: "-119.3015", isCoastal: true, breakType: "Point Break", difficulty: "Intermediate", optimalConditions: "W swells, NE winds" },
  { name: "Mondos", city: "Ventura", country: "USA", state: "California", latitude: "34.2584", longitude: "-119.2723", isCoastal: true, breakType: "Point Break", difficulty: "Beginner", optimalConditions: "Small W swells" },
  { name: "County Line", city: "Malibu", country: "USA", state: "California", latitude: "34.0435", longitude: "-118.9573", isCoastal: true, breakType: "Point Break", difficulty: "Intermediate", optimalConditions: "W-SW swells" },
  { name: "Leo Carrillo", city: "Malibu", country: "USA", state: "California", latitude: "34.0390", longitude: "-118.9280", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "W swells" },
  { name: "Nicholas Canyon", city: "Malibu", country: "USA", state: "California", latitude: "34.0267", longitude: "-118.8884", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "W-SW swells" },
  { name: "El Matador", city: "Malibu", country: "USA", state: "California", latitude: "34.0359", longitude: "-118.8642", isCoastal: true, breakType: "Beach Break", difficulty: "Advanced", optimalConditions: "W swells, N winds" },
  { name: "Zuma Beach", city: "Malibu", country: "USA", state: "California", latitude: "34.0157", longitude: "-118.8229", isCoastal: true, breakType: "Beach Break", difficulty: "Beginner", optimalConditions: "W-SW swells" },
  { name: "Dockweiler", city: "Los Angeles", country: "USA", state: "California", latitude: "33.9192", longitude: "-118.4165", isCoastal: true, breakType: "Beach Break", difficulty: "Beginner", optimalConditions: "S-SW swells" },
  { name: "El Segundo", city: "El Segundo", country: "USA", state: "California", latitude: "33.9192", longitude: "-118.4037", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "S-SW swells" },
  { name: "Hermosa Beach", city: "Hermosa Beach", country: "USA", state: "California", latitude: "33.8622", longitude: "-118.3998", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "S swells" },
  { name: "Redondo Beach", city: "Redondo Beach", country: "USA", state: "California", latitude: "33.8492", longitude: "-118.3892", isCoastal: true, breakType: "Beach Break", difficulty: "Beginner", optimalConditions: "S-SW swells" },
  { name: "Palos Verdes", city: "Palos Verdes", country: "USA", state: "California", latitude: "33.7448", longitude: "-118.4009", isCoastal: true, breakType: "Point Break", difficulty: "Advanced", optimalConditions: "S-SW swells" },
  { name: "San Onofre", city: "San Clemente", country: "USA", state: "California", latitude: "33.3703", longitude: "-117.5573", isCoastal: true, breakType: "Point Break", difficulty: "Beginner", optimalConditions: "S swells" },
  { name: "Trestles", city: "San Clemente", country: "USA", state: "California", latitude: "33.3881", longitude: "-117.5906", isCoastal: true, breakType: "Point Break", difficulty: "Advanced", optimalConditions: "S-SW swells, NE winds" },
  { name: "Salt Creek", city: "Dana Point", country: "USA", state: "California", latitude: "33.4734", longitude: "-117.7081", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "S-SW swells" },
  { name: "The Wedge", city: "Newport Beach", country: "USA", state: "California", latitude: "33.5927", longitude: "-117.8814", isCoastal: true, breakType: "Shore Break", difficulty: "Expert", optimalConditions: "Large S swells" },
  { name: "Bolsa Chica", city: "Huntington Beach", country: "USA", state: "California", latitude: "33.6992", longitude: "-118.0678", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "S-SW swells" },
  { name: "Seal Beach Pier", city: "Seal Beach", country: "USA", state: "California", latitude: "33.7414", longitude: "-118.1048", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "S swells" },

  // PACIFIC COAST - OREGON
  { name: "Cannon Beach", city: "Cannon Beach", country: "USA", state: "Oregon", latitude: "45.8918", longitude: "-123.9615", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "NW swells" },
  { name: "Short Sands", city: "Oswald West", country: "USA", state: "Oregon", latitude: "45.7640", longitude: "-123.9668", isCoastal: true, breakType: "Beach Break", difficulty: "Advanced", optimalConditions: "NW swells, E winds" },
  { name: "Lincoln City", city: "Lincoln City", country: "USA", state: "Oregon", latitude: "44.9582", longitude: "-124.0179", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "NW-W swells" },
  { name: "Pacific City", city: "Pacific City", country: "USA", state: "Oregon", latitude: "45.1965", longitude: "-123.9615", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "NW swells" },
  { name: "Otter Rock", city: "Otter Rock", country: "USA", state: "Oregon", latitude: "44.7587", longitude: "-124.0651", isCoastal: true, breakType: "Point Break", difficulty: "Advanced", optimalConditions: "Large NW swells" },

  // PACIFIC COAST - WASHINGTON
  { name: "Westport", city: "Westport", country: "USA", state: "Washington", latitude: "46.9043", longitude: "-124.1051", isCoastal: true, breakType: "Beach Break", difficulty: "Advanced", optimalConditions: "NW swells, E winds" },
  { name: "La Push", city: "La Push", country: "USA", state: "Washington", latitude: "47.9037", longitude: "-124.6351", isCoastal: true, breakType: "Beach Break", difficulty: "Advanced", optimalConditions: "NW swells" },
  { name: "Mukkaw Bay", city: "Neah Bay", country: "USA", state: "Washington", latitude: "48.3668", longitude: "-124.6029", isCoastal: true, breakType: "Point Break", difficulty: "Expert", optimalConditions: "Large NW swells" },

  // ATLANTIC COAST - NEW ENGLAND
  { name: "Hampton Beach", city: "Hampton", country: "USA", state: "New Hampshire", latitude: "42.9167", longitude: "-70.8130", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "NE storms" },
  { name: "Rye Beach", city: "Rye", country: "USA", state: "New Hampshire", latitude: "43.0167", longitude: "-70.7642", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "NE swells" },
  { name: "York Beach", city: "York", country: "USA", state: "Maine", latitude: "43.1595", longitude: "-70.6037", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "NE storms" },
  { name: "Wells Beach", city: "Wells", country: "USA", state: "Maine", latitude: "43.3220", longitude: "-70.5620", isCoastal: true, breakType: "Beach Break", difficulty: "Beginner", optimalConditions: "E swells" },
  { name: "Kennebunk Beach", city: "Kennebunkport", country: "USA", state: "Maine", latitude: "43.3617", longitude: "-70.4767", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "NE swells" },

  // ATLANTIC COAST - MID-ATLANTIC
  { name: "Narragansett", city: "Narragansett", country: "USA", state: "Rhode Island", latitude: "41.4351", longitude: "-71.4618", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "SE-S swells" },
  { name: "Newport", city: "Newport", country: "USA", state: "Rhode Island", latitude: "41.4901", longitude: "-71.3128", isCoastal: true, breakType: "Point Break", difficulty: "Advanced", optimalConditions: "Large S swells" },
  { name: "Block Island", city: "Block Island", country: "USA", state: "Rhode Island", latitude: "41.1681", longitude: "-71.5803", isCoastal: true, breakType: "Beach Break", difficulty: "Advanced", optimalConditions: "S-SE swells" },
  { name: "Montauk Point", city: "Montauk", country: "USA", state: "New York", latitude: "41.0362", longitude: "-71.8506", isCoastal: true, breakType: "Point Break", difficulty: "Advanced", optimalConditions: "SE-S swells" },
  { name: "Ditch Plains", city: "Montauk", country: "USA", state: "New York", latitude: "41.0434", longitude: "-71.8695", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "S swells" },
  { name: "Gilgo Beach", city: "Babylon", country: "USA", state: "New York", latitude: "40.6418", longitude: "-73.3929", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "S-SE swells" },
  { name: "Long Beach", city: "Long Beach", country: "USA", state: "New York", latitude: "40.5882", longitude: "-73.6579", isCoastal: true, breakType: "Beach Break", difficulty: "Beginner", optimalConditions: "S swells" },
  { name: "Rockaway Beach", city: "New York City", country: "USA", state: "New York", latitude: "40.5795", longitude: "-73.8370", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "S-SE swells" },
  { name: "Manasquan Inlet", city: "Manasquan", country: "USA", state: "New Jersey", latitude: "40.1007", longitude: "-74.0379", isCoastal: true, breakType: "Beach Break", difficulty: "Advanced", optimalConditions: "SE-S swells" },
  { name: "Spring Lake", city: "Spring Lake", country: "USA", state: "New Jersey", latitude: "40.1526", longitude: "-74.0210", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "SE swells" },
  { name: "Belmar", city: "Belmar", country: "USA", state: "New Jersey", latitude: "40.1784", longitude: "-74.0218", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "SE-S swells" },

  // ATLANTIC COAST - SOUTHEAST
  { name: "Virginia Beach", city: "Virginia Beach", country: "USA", state: "Virginia", latitude: "36.8529", longitude: "-75.9780", isCoastal: true, breakType: "Beach Break", difficulty: "Beginner", optimalConditions: "SE-S swells" },
  { name: "Outer Banks - Cape Hatteras", city: "Cape Hatteras", country: "USA", state: "North Carolina", latitude: "35.2269", longitude: "-75.6114", isCoastal: true, breakType: "Beach Break", difficulty: "Advanced", optimalConditions: "SE-S swells" },
  { name: "Kill Devil Hills", city: "Kill Devil Hills", country: "USA", state: "North Carolina", latitude: "36.0293", longitude: "-75.6738", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "E-SE swells" },
  { name: "Nags Head", city: "Nags Head", country: "USA", state: "North Carolina", latitude: "35.9573", longitude: "-75.6239", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "E-SE swells" },
  { name: "Wrightsville Beach", city: "Wrightsville Beach", country: "USA", state: "North Carolina", latitude: "34.2085", longitude: "-77.7964", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "SE-S swells" },
  { name: "Folly Beach", city: "Charleston", country: "USA", state: "South Carolina", latitude: "32.6552", longitude: "-79.9398", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "SE-S swells" },
  { name: "Tybee Island", city: "Savannah", country: "USA", state: "Georgia", latitude: "32.0002", longitude: "-80.8498", isCoastal: true, breakType: "Beach Break", difficulty: "Beginner", optimalConditions: "SE swells" },

  // GULF COAST
  { name: "Gulf Shores", city: "Gulf Shores", country: "USA", state: "Alabama", latitude: "30.2460", longitude: "-87.7008", isCoastal: true, breakType: "Beach Break", difficulty: "Beginner", optimalConditions: "S swells" },
  { name: "Orange Beach", city: "Orange Beach", country: "USA", state: "Alabama", latitude: "30.2943", longitude: "-87.5698", isCoastal: true, breakType: "Beach Break", difficulty: "Beginner", optimalConditions: "S-SE swells" },
  { name: "Pensacola Beach", city: "Pensacola", country: "USA", state: "Florida", latitude: "30.3335", longitude: "-87.1530", isCoastal: true, breakType: "Beach Break", difficulty: "Beginner", optimalConditions: "S swells" },
  { name: "Destin", city: "Destin", country: "USA", state: "Florida", latitude: "30.3935", longitude: "-86.4958", isCoastal: true, breakType: "Beach Break", difficulty: "Beginner", optimalConditions: "S-SW swells" },
  { name: "Panama City Beach", city: "Panama City Beach", country: "USA", state: "Florida", latitude: "30.1761", longitude: "-85.8054", isCoastal: true, breakType: "Beach Break", difficulty: "Beginner", optimalConditions: "S swells" },

  // GREAT LAKES SURFING
  { name: "Sheboygan", city: "Sheboygan", country: "USA", state: "Wisconsin", latitude: "43.7508", longitude: "-87.7145", isCoastal: true, breakType: "Beach Break", difficulty: "Advanced", optimalConditions: "NE storms on Lake Michigan" },
  { name: "Grand Haven", city: "Grand Haven", country: "USA", state: "Michigan", latitude: "43.0633", longitude: "-86.2284", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "W winds on Lake Michigan" },
  { name: "Sleeping Bear Dunes", city: "Empire", country: "USA", state: "Michigan", latitude: "44.8059", longitude: "-86.0581", isCoastal: true, breakType: "Beach Break", difficulty: "Advanced", optimalConditions: "NW storms on Lake Michigan" },
  { name: "Presque Isle", city: "Erie", country: "USA", state: "Pennsylvania", latitude: "42.1553", longitude: "-80.1137", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "NE storms on Lake Erie" },
  { name: "Huntington Beach", city: "Bay Village", country: "USA", state: "Ohio", latitude: "41.4842", longitude: "-81.9220", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "NE winds on Lake Erie" },

  // INTERNATIONAL EXPANSION - CANADA
  { name: "Tofino", city: "Tofino", country: "Canada", state: "British Columbia", latitude: "49.1533", longitude: "-125.9063", isCoastal: true, breakType: "Beach Break", difficulty: "Advanced", optimalConditions: "NW Pacific swells" },
  { name: "Chesterman Beach", city: "Tofino", country: "Canada", state: "British Columbia", latitude: "49.1195", longitude: "-125.8952", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "W-NW swells" },
  { name: "Long Beach", city: "Ucluelet", country: "Canada", state: "British Columbia", latitude: "48.9338", longitude: "-125.5465", isCoastal: true, breakType: "Beach Break", difficulty: "Advanced", optimalConditions: "Large NW swells" },
  { name: "Lawrencetown Beach", city: "Halifax", country: "Canada", state: "Nova Scotia", latitude: "44.7095", longitude: "-63.3691", isCoastal: true, breakType: "Beach Break", difficulty: "Advanced", optimalConditions: "Atlantic storms" },
  { name: "Singing Sands", city: "Ingonish", country: "Canada", state: "Nova Scotia", latitude: "46.6816", longitude: "-60.3924", isCoastal: true, breakType: "Beach Break", difficulty: "Advanced", optimalConditions: "Atlantic swells" },

  // MEXICO PACIFIC COAST  
  { name: "Ensenada - La Bocana", city: "Ensenada", country: "Mexico", state: "Baja California", latitude: "31.8440", longitude: "-116.5984", isCoastal: true, breakType: "Point Break", difficulty: "Advanced", optimalConditions: "W-NW swells" },
  { name: "K38", city: "Rosarito", country: "Mexico", state: "Baja California", latitude: "32.3078", longitude: "-117.0540", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "W swells" },
  { name: "Todos Santos", city: "Todos Santos", country: "Mexico", state: "Baja California Sur", latitude: "23.4449", longitude: "-110.2252", isCoastal: true, breakType: "Point Break", difficulty: "Advanced", optimalConditions: "W-NW swells" },
  { name: "Scorpion Bay", city: "San Juanico", country: "Mexico", state: "Baja California Sur", latitude: "26.2544", longitude: "-112.4692", isCoastal: true, breakType: "Point Break", difficulty: "Advanced", optimalConditions: "W-NW swells" },
  { name: "Puerto Vallarta - La Lancha", city: "Puerto Vallarta", country: "Mexico", state: "Jalisco", latitude: "20.6534", longitude: "-105.2253", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "S-SW swells" },

  // ADDITIONAL EAST COAST EXPANSION - More Florida & Southeast
  { name: "St. Augustine Beach", city: "St. Augustine", country: "USA", state: "Florida", latitude: "29.8580", longitude: "-81.3009", isCoastal: true, breakType: "Beach Break", difficulty: "Beginner", optimalConditions: "NE storms" },
  { name: "Flagler Beach", city: "Flagler Beach", country: "USA", state: "Florida", latitude: "29.4733", longitude: "-81.1312", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "E swells" },
  { name: "Ormond Beach", city: "Ormond Beach", country: "USA", state: "Florida", latitude: "29.2858", longitude: "-81.0556", isCoastal: true, breakType: "Beach Break", difficulty: "Beginner", optimalConditions: "E swells" },
  { name: "Daytona Beach", city: "Daytona Beach", country: "USA", state: "Florida", latitude: "29.2108", longitude: "-81.0228", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "E-NE swells" },
  { name: "Ponce Inlet", city: "Ponce Inlet", country: "USA", state: "Florida", latitude: "29.0783", longitude: "-80.9314", isCoastal: true, breakType: "Beach Break", difficulty: "Advanced", optimalConditions: "E swells" },
  { name: "Melbourne Beach", city: "Melbourne Beach", country: "USA", state: "Florida", latitude: "28.0728", longitude: "-80.5603", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "E-SE swells" },
  { name: "Indialantic", city: "Indialantic", country: "USA", state: "Florida", latitude: "28.0839", longitude: "-80.5642", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "E swells" },
  { name: "Satellite Beach", city: "Satellite Beach", country: "USA", state: "Florida", latitude: "28.1761", longitude: "-80.5903", isCoastal: true, breakType: "Beach Break", difficulty: "Beginner", optimalConditions: "E swells" },

  // WEST COAST EXPANSION - More Northern California & Oregon
  { name: "Ano Nuevo", city: "Pescadero", country: "USA", state: "California", latitude: "37.1225", longitude: "-122.3369", isCoastal: true, breakType: "Point Break", difficulty: "Advanced", optimalConditions: "NW swells" },
  { name: "Davenport", city: "Davenport", country: "USA", state: "California", latitude: "37.0086", longitude: "-122.1889", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "NW swells" },
  { name: "Pleasure Point", city: "Aptos", country: "USA", state: "California", latitude: "36.9697", longitude: "-121.9058", isCoastal: true, breakType: "Point Break", difficulty: "Intermediate", optimalConditions: "NW-W swells" },
  { name: "Moss Landing", city: "Moss Landing", country: "USA", state: "California", latitude: "36.8044", longitude: "-121.7894", isCoastal: true, breakType: "Beach Break", difficulty: "Advanced", optimalConditions: "NW swells" },
  { name: "Asilomar", city: "Pacific Grove", country: "USA", state: "California", latitude: "36.6219", longitude: "-121.9308", isCoastal: true, breakType: "Beach Break", difficulty: "Advanced", optimalConditions: "NW swells" },

  // GULF COAST EXPANSION - Texas & Louisiana
  { name: "Surfside Beach", city: "Surfside Beach", country: "USA", state: "Texas", latitude: "28.9447", longitude: "-95.2888", isCoastal: true, breakType: "Beach Break", difficulty: "Beginner", optimalConditions: "S-SE swells" },
  { name: "Freeport", city: "Freeport", country: "USA", state: "Texas", latitude: "28.9544", longitude: "-95.3596", isCoastal: true, breakType: "Beach Break", difficulty: "Beginner", optimalConditions: "S swells" },
  { name: "South Padre Island", city: "South Padre Island", country: "USA", state: "Texas", latitude: "26.1118", longitude: "-97.1739", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "S-SE swells" },
  { name: "Grand Isle", city: "Grand Isle", country: "USA", state: "Louisiana", latitude: "29.2377", longitude: "-89.9573", isCoastal: true, breakType: "Beach Break", difficulty: "Beginner", optimalConditions: "S swells" },

  // ADDITIONAL NORTHEAST - Connecticut, Massachusetts  
  { name: "Westport Beach", city: "Westport", country: "USA", state: "Connecticut", latitude: "41.1415", longitude: "-73.3579", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "Hurricane swells" },
  { name: "Fairfield Beach", city: "Fairfield", country: "USA", state: "Connecticut", latitude: "41.1626", longitude: "-73.2626", isCoastal: true, breakType: "Beach Break", difficulty: "Beginner", optimalConditions: "S swells" },
  { name: "Martha's Vineyard", city: "Oak Bluffs", country: "USA", state: "Massachusetts", latitude: "41.4558", longitude: "-70.5564", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "Hurricane swells" },
  { name: "Cape Cod - Nauset Beach", city: "Orleans", country: "USA", state: "Massachusetts", latitude: "41.8459", longitude: "-69.9450", isCoastal: true, breakType: "Beach Break", difficulty: "Advanced", optimalConditions: "NE storms" },

  // ADDITIONAL PACIFIC NORTHWEST
  { name: "Bandon Beach", city: "Bandon", country: "USA", state: "Oregon", latitude: "43.1193", longitude: "-124.4084", isCoastal: true, breakType: "Beach Break", difficulty: "Advanced", optimalConditions: "Large NW swells" },
  { name: "Gold Beach", city: "Gold Beach", country: "USA", state: "Oregon", latitude: "42.4079", longitude: "-124.4229", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "W-NW swells" },
  { name: "Crescent City", city: "Crescent City", country: "USA", state: "California", latitude: "41.7558", longitude: "-124.2026", isCoastal: true, breakType: "Beach Break", difficulty: "Advanced", optimalConditions: "NW swells" },
  { name: "Eureka", city: "Eureka", country: "USA", state: "California", latitude: "40.8021", longitude: "-124.1637", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "NW swells" },

  // MORE SOUTHEAST - Georgia & South Carolina  
  { name: "Tybee Island", city: "Tybee Island", country: "USA", state: "Georgia", latitude: "32.0002", longitude: "-80.8468", isCoastal: true, breakType: "Beach Break", difficulty: "Beginner", optimalConditions: "Hurricane swells" },
  { name: "Jekyll Island", city: "Jekyll Island", country: "USA", state: "Georgia", latitude: "31.0736", longitude: "-81.4085", isCoastal: true, breakType: "Beach Break", difficulty: "Beginner", optimalConditions: "E swells" },
  { name: "Myrtle Beach", city: "Myrtle Beach", country: "USA", state: "South Carolina", latitude: "33.6891", longitude: "-78.8867", isCoastal: true, breakType: "Beach Break", difficulty: "Beginner", optimalConditions: "Hurricane swells" },
  { name: "Folly Beach", city: "Folly Beach", country: "USA", state: "South Carolina", latitude: "32.6552", longitude: "-79.9402", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "E-SE swells" },

  // VIRGINIA - MAJOR EAST COAST EXPANSION
  { name: "Virginia Beach", city: "Virginia Beach", country: "USA", state: "Virginia", latitude: "36.8529", longitude: "-75.9780", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "Hurricane swells" },
  { name: "Sandbridge Beach", city: "Virginia Beach", country: "USA", state: "Virginia", latitude: "36.7313", longitude: "-75.9395", isCoastal: true, breakType: "Beach Break", difficulty: "Advanced", optimalConditions: "NE storms" },
  { name: "Chincoteague", city: "Chincoteague", country: "USA", state: "Virginia", latitude: "37.9332", longitude: "-75.3774", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "Atlantic storms" },

  // MARYLAND - MID-ATLANTIC EXPANSION
  { name: "Ocean City", city: "Ocean City", country: "USA", state: "Maryland", latitude: "38.3365", longitude: "-75.0849", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "Hurricane swells" },
  { name: "Assateague Island", city: "Berlin", country: "USA", state: "Maryland", latitude: "38.0581", longitude: "-75.1468", isCoastal: true, breakType: "Beach Break", difficulty: "Advanced", optimalConditions: "Atlantic storms" },

  // DELAWARE - SMALL STATE BIG SURF
  { name: "Rehoboth Beach", city: "Rehoboth Beach", country: "USA", state: "Delaware", latitude: "38.7198", longitude: "-75.0757", isCoastal: true, breakType: "Beach Break", difficulty: "Beginner", optimalConditions: "Hurricane swells" },
  { name: "Bethany Beach", city: "Bethany Beach", country: "USA", state: "Delaware", latitude: "38.5390", longitude: "-75.0635", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "E swells" },
  { name: "Indian River Inlet", city: "Bethany Beach", country: "USA", state: "Delaware", latitude: "38.6103", longitude: "-75.0703", isCoastal: true, breakType: "Beach Break", difficulty: "Advanced", optimalConditions: "Hurricane swells" },

  // NORTH CAROLINA - OUTER BANKS EXPANSION
  { name: "Kill Devil Hills", city: "Kill Devil Hills", country: "USA", state: "North Carolina", latitude: "36.0293", longitude: "-75.6724", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "NE storms" },
  { name: "Duck", city: "Duck", country: "USA", state: "North Carolina", latitude: "36.1829", longitude: "-75.7462", isCoastal: true, breakType: "Beach Break", difficulty: "Advanced", optimalConditions: "Hurricane swells" },
  { name: "Nags Head", city: "Nags Head", country: "USA", state: "North Carolina", latitude: "35.9579", longitude: "-75.6240", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "Hurricane swells" },
  { name: "Wrightsville Beach", city: "Wrightsville Beach", country: "USA", state: "North Carolina", latitude: "34.2085", longitude: "-77.7964", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "Hurricane swells" },
  { name: "Cape Hatteras", city: "Buxton", country: "USA", state: "North Carolina", latitude: "35.2267", longitude: "-75.5300", isCoastal: true, breakType: "Beach Break", difficulty: "Expert", optimalConditions: "Large Atlantic storms" },

  // ALABAMA - GULF COAST
  { name: "Orange Beach", city: "Orange Beach", country: "USA", state: "Alabama", latitude: "30.2941", longitude: "-87.5741", isCoastal: true, breakType: "Beach Break", difficulty: "Beginner", optimalConditions: "S swells" },
  { name: "Gulf Shores", city: "Gulf Shores", country: "USA", state: "Alabama", latitude: "30.2460", longitude: "-87.7008", isCoastal: true, breakType: "Beach Break", difficulty: "Beginner", optimalConditions: "S swells" },
  { name: "Dauphin Island", city: "Dauphin Island", country: "USA", state: "Alabama", latitude: "30.2541", longitude: "-88.0778", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "S-SW swells" },

  // MISSISSIPPI - GULF COAST
  { name: "Ocean Springs", city: "Ocean Springs", country: "USA", state: "Mississippi", latitude: "30.4113", longitude: "-88.8278", isCoastal: true, breakType: "Beach Break", difficulty: "Beginner", optimalConditions: "S swells" },
  { name: "Biloxi", city: "Biloxi", country: "USA", state: "Mississippi", latitude: "30.3960", longitude: "-88.8853", isCoastal: true, breakType: "Beach Break", difficulty: "Beginner", optimalConditions: "S swells" },

  // HAWAII - ADDITIONAL ISLANDS
  { name: "Pipeline", city: "Haleiwa", country: "USA", state: "Hawaii", latitude: "21.6690", longitude: "-158.0456", isCoastal: true, breakType: "Reef Break", difficulty: "Expert", optimalConditions: "Large NW swells" },
  { name: "Waimea Bay", city: "Haleiwa", country: "USA", state: "Hawaii", latitude: "21.6415", longitude: "-158.0696", isCoastal: true, breakType: "Beach Break", difficulty: "Expert", optimalConditions: "Massive NW swells" },
  { name: "Sunset Beach", city: "Haleiwa", country: "USA", state: "Hawaii", latitude: "21.6748", longitude: "-158.0422", isCoastal: true, breakType: "Reef Break", difficulty: "Advanced", optimalConditions: "NW swells" },
  { name: "Waikiki", city: "Honolulu", country: "USA", state: "Hawaii", latitude: "21.2793", longitude: "-157.8311", isCoastal: true, breakType: "Reef Break", difficulty: "Beginner", optimalConditions: "S swells" },

  // ALASKA - REMOTE SURF SPOTS
  { name: "Yakutat", city: "Yakutat", country: "USA", state: "Alaska", latitude: "59.5469", longitude: "-139.7271", isCoastal: true, breakType: "Beach Break", difficulty: "Expert", optimalConditions: "Gulf of Alaska storms" },
  { name: "Sitka", city: "Sitka", country: "USA", state: "Alaska", latitude: "57.0531", longitude: "-135.3300", isCoastal: true, breakType: "Beach Break", difficulty: "Expert", optimalConditions: "Pacific storms" },

  // ADDITIONAL CALIFORNIA - CENTRAL COAST
  { name: "Cayucos", city: "Cayucos", country: "USA", state: "California", latitude: "35.4419", longitude: "-120.8918", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "NW swells" },
  { name: "Pismo Beach", city: "Pismo Beach", country: "USA", state: "California", latitude: "35.1428", longitude: "-120.6413", isCoastal: true, breakType: "Beach Break", difficulty: "Beginner", optimalConditions: "W-NW swells" },
  { name: "Avila Beach", city: "Avila Beach", country: "USA", state: "California", latitude: "35.1811", longitude: "-120.7312", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "W swells" },
  { name: "Cambria", city: "Cambria", country: "USA", state: "California", latitude: "35.5641", longitude: "-121.0810", isCoastal: true, breakType: "Beach Break", difficulty: "Advanced", optimalConditions: "NW swells" },

  // ADDITIONAL WASHINGTON - PUGET SOUND ACCESS
  { name: "Westport", city: "Westport", country: "USA", state: "Washington", latitude: "46.9042", longitude: "-124.1051", isCoastal: true, breakType: "Beach Break", difficulty: "Advanced", optimalConditions: "NW storms" },
  { name: "Ocean Shores", city: "Ocean Shores", country: "USA", state: "Washington", latitude: "46.9739", longitude: "-124.1568", isCoastal: true, breakType: "Beach Break", difficulty: "Intermediate", optimalConditions: "NW swells" }
];

/**
 * Import comprehensive surf spot database with NOAA verification
 */
export async function importComprehensiveSurfSpots(storageInstance: any) {
  const storage = storageInstance;
  
  if (!storage) {
    throw new Error('Storage instance is required');
  }
  
  console.log(`🌊 Importing ${comprehensiveSurfSpots.length} comprehensive surf spots with NOAA coverage verification...`);
  console.log(`🔧 Storage instance type: ${typeof storage}, methods: ${Object.keys(storage || {})}`);
  
  let added = 0;
  let skipped = 0;
  let noaaVerified = 0;
  
  for (const spot of comprehensiveSurfSpots) {
    try {
      // Check if spot already exists
      const existingSpots = await storage.searchLocations(spot.name);
      const exists = existingSpots.some(existing => 
        existing.name === spot.name && 
        existing.city === spot.city
      );
      
      if (exists) {
        skipped++;
        continue;
      }
      
      // Verify NOAA coverage for this location
      const nearbyStations = await findNearbyStations(
        parseFloat(spot.latitude),
        parseFloat(spot.longitude),
        100, // 100 mile radius
        3    // Find up to 3 stations
      );
      
      if (nearbyStations.length > 0) {
        noaaVerified++;
        spot.nearbyStations = nearbyStations.map(station => 
          `${station.id} (${station.distance?.toFixed(1)}mi)`
        );
      }
      
      // Create the surf spot
      await storage.createLocation({
        name: spot.name,
        city: spot.city,
        country: spot.country,
        latitude: spot.latitude,
        longitude: spot.longitude,
        isCoastal: spot.isCoastal
      });
      
      added++;
      
      if (added % 20 === 0) {
        console.log(`✅ Added ${added} spots so far...`);
      }
      
    } catch (error) {
      console.warn(`⚠️ Failed to add ${spot.name}:`, error);
      skipped++;
    }
  }
  
  console.log(`✅ Comprehensive surf spot import complete:`);
  console.log(`   📍 ${added} new spots added`);
  console.log(`   ⚠️ ${skipped} spots skipped (already exist or failed)`);
  console.log(`   🌊 ${noaaVerified} spots verified with NOAA coverage`);
  console.log(`   📊 Coverage: ${((noaaVerified / added) * 100).toFixed(1)}% of new spots have NOAA monitoring`);
  
  return { added, skipped, noaaVerified, total: comprehensiveSurfSpots.length };
}

/**
 * Get regional surf spot statistics
 */
export function getRegionalSurfStats() {
  const regions = {
    'Pacific Coast': comprehensiveSurfSpots.filter(s => 
      ['California', 'Oregon', 'Washington', 'British Columbia'].includes(s.state || '')
    ).length,
    'Atlantic Coast': comprehensiveSurfSpots.filter(s => 
      ['Maine', 'New Hampshire', 'Massachusetts', 'Rhode Island', 'New York', 'New Jersey', 'Virginia', 'North Carolina', 'South Carolina', 'Georgia', 'Nova Scotia'].includes(s.state || '')
    ).length,
    'Gulf Coast': comprehensiveSurfSpots.filter(s => 
      ['Alabama', 'Florida'].includes(s.state || '') && parseFloat(s.longitude) > -88
    ).length,
    'Great Lakes': comprehensiveSurfSpots.filter(s => 
      ['Wisconsin', 'Michigan', 'Pennsylvania', 'Ohio'].includes(s.state || '')
    ).length,
    'International': comprehensiveSurfSpots.filter(s => 
      !['USA'].includes(s.country)
    ).length
  };
  
  return {
    totalSpots: comprehensiveSurfSpots.length,
    regions,
    countries: [...new Set(comprehensiveSurfSpots.map(s => s.country))].length,
    states: [...new Set(comprehensiveSurfSpots.map(s => s.state).filter(Boolean))].length
  };
}