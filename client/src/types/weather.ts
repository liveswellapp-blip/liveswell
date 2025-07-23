export interface Location {
  id: number;
  name: string;
  city: string;
  country: string;
  latitude: string;
  longitude: string;
  isCoastal: boolean;
}

export interface SurfConditions {
  id: number;
  locationId: number;
  waveHeight: string;
  wavePeriod: number;
  waveDirection: string;
  windSpeed: string;
  windDirection: string;
  windGusts: string;
  tideHeight: string;
  tideStatus: string;
  waterTemp: string;
  visibility: string;
  uvIndex: number;
  sunrise: string;
  sunset: string;
  lastUpdated: string | Date;
  warning?: string;
}

export interface TidePoint {
  time: string;
  height: number;
  type: 'high' | 'low';
}

export interface ForecastDay {
  date: string;
  waveHeight: string;
  conditions: string;
  wind: string;
  icon: string;
  tides: TidePoint[];
}

export interface NearbySpot extends Location {
  distance: string;
  waveHeight: string;
  wind: string;
}

export interface HistoricalWaveData {
  time: string;
  waveHeight: number;
  timestamp: string;
}
