/**
 * Returns the IANA timezone identifier for a given lat/lon (surf spot location).
 * Falls back to the browser's own timezone for unrecognized regions so times
 * are never silently wrong — they just reflect the user's clock instead.
 */
export function getLocationTimezone(lat: number, lon: number): string {
  // Hawaii
  if (lat >= 18 && lat <= 23 && lon >= -162 && lon <= -154) return "Pacific/Honolulu";

  // Alaska (mainland + Aleutians east of 169.5W)
  if (lat >= 54 && lat <= 72 && lon >= -170 && lon <= -130) return "America/Anchorage";

  // US West Coast (Pacific)
  if (lon >= -125 && lon <= -114 && lat >= 32 && lat <= 49) return "America/Los_Angeles";

  // US Mountain
  if (lon >= -115 && lon <= -102 && lat >= 31 && lat <= 49) return "America/Denver";

  // US Central
  if (lon >= -104 && lon <= -87 && lat >= 25 && lat <= 49) return "America/Chicago";

  // US East Coast + Gulf Coast
  if (lon >= -88 && lon <= -66 && lat >= 24 && lat <= 47) return "America/New_York";

  // Puerto Rico / US Virgin Islands
  if (lat >= 17 && lat <= 19 && lon >= -68 && lon <= -64) return "America/Puerto_Rico";

  // Mexico – Pacific Coast (Baja, Nayarit, Oaxaca surf spots)
  if (lat >= 14 && lat <= 32 && lon >= -120 && lon <= -105) return "America/Mazatlan";

  // Mexico – Yucatan / Gulf Coast
  if (lat >= 14 && lat <= 22 && lon >= -92 && lon <= -86) return "America/Cancun";

  // Central America (Costa Rica, El Salvador, Nicaragua, Panama, Guatemala)
  if (lat >= 7 && lat <= 18 && lon >= -93 && lon <= -75) return "America/Costa_Rica";

  // Caribbean / Lesser Antilles
  if (lat >= 10 && lat <= 25 && lon >= -85 && lon <= -59) return "America/Barbados";

  // Colombia / Ecuador / Peru
  if (lat >= -18 && lat <= 12 && lon >= -82 && lon <= -68) return "America/Lima";

  // Chile
  if (lat >= -56 && lat <= -17 && lon >= -76 && lon <= -66) return "America/Santiago";

  // Brazil (east coast surf spots)
  if (lat >= -34 && lat <= 5 && lon >= -50 && lon <= -34) return "America/Sao_Paulo";

  // Argentina / Uruguay
  if (lat >= -56 && lat <= -30 && lon >= -73 && lon <= -50) return "America/Argentina/Buenos_Aires";

  // Portugal (mainland)
  if (lat >= 36 && lat <= 42 && lon >= -10 && lon <= -6) return "Europe/Lisbon";

  // Azores
  if (lat >= 36 && lat <= 40 && lon >= -31 && lon <= -25) return "Atlantic/Azores";

  // Canary Islands
  if (lat >= 27 && lat <= 29 && lon >= -18 && lon <= -13) return "Atlantic/Canary";

  // UK / Ireland
  if (lat >= 49 && lat <= 61 && lon >= -11 && lon <= 2) return "Europe/London";

  // Western Europe (France, Spain, Netherlands, etc.)
  if (lat >= 35 && lat <= 60 && lon >= -9 && lon <= 15) return "Europe/Paris";

  // Morocco / West Africa
  if (lat >= 20 && lat <= 36 && lon >= -17 && lon <= -5) return "Africa/Casablanca";

  // South Africa
  if (lat >= -35 && lat <= -22 && lon >= 14 && lon <= 34) return "Africa/Johannesburg";

  // Indonesia / Bali / Java / Lombok
  if (lat >= -12 && lat <= 6 && lon >= 95 && lon <= 116) return "Asia/Jakarta";

  // Bali / Nusa Tenggara (slightly east of Jakarta zone)
  if (lat >= -12 && lat <= 0 && lon >= 115 && lon <= 125) return "Asia/Makassar";

  // Philippines
  if (lat >= 4 && lat <= 21 && lon >= 116 && lon <= 128) return "Asia/Manila";

  // Japan
  if (lat >= 24 && lat <= 46 && lon >= 123 && lon <= 146) return "Asia/Tokyo";

  // Australia – East Coast (QLD, NSW, VIC)
  if (lat >= -45 && lat <= -10 && lon >= 141 && lon <= 154) return "Australia/Sydney";

  // Australia – West Coast (WA)
  if (lat >= -35 && lat <= -13 && lon >= 112 && lon <= 130) return "Australia/Perth";

  // New Zealand
  if (lat >= -48 && lat <= -33 && lon >= 166 && lon <= 178) return "Pacific/Auckland";

  // Tahiti / French Polynesia
  if (lat >= -18 && lat <= -15 && lon >= -150 && lon <= -148) return "Pacific/Tahiti";

  // Fiji
  if (lat >= -20 && lat <= -15 && lon >= 177 && lon <= 180) return "Pacific/Fiji";

  // Fall back to browser timezone — better than UTC for unrecognised spots
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
