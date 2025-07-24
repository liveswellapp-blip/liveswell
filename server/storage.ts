import { users, locations, surfConditions, favorites, type User, type InsertUser, type Location, type InsertLocation, type SurfConditions, type InsertSurfConditions, type Favorite, type InsertFavorite } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getLocation(id: number): Promise<Location | undefined>;
  getLocationByCoords(lat: number, lng: number): Promise<Location | undefined>;
  getAllLocations(): Promise<Location[]>;
  searchLocations(query: string): Promise<Location[]>;
  createLocation(location: InsertLocation): Promise<Location>;
  
  getSurfConditions(locationId: number): Promise<SurfConditions | undefined>;
  createSurfConditions(conditions: InsertSurfConditions): Promise<SurfConditions>;
  updateSurfConditions(locationId: number, conditions: Partial<InsertSurfConditions>): Promise<SurfConditions | undefined>;
  
  getUserFavorites(userId: number): Promise<Location[]>;
  addFavorite(favorite: InsertFavorite): Promise<Favorite>;
  removeFavorite(userId: number, locationId: number): Promise<boolean>;
  isFavorite(userId: number, locationId: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private locations: Map<number, Location>;
  private surfConditions: Map<number, SurfConditions>;
  private favorites: Map<number, Favorite>;
  private currentUserId: number;
  private currentLocationId: number;
  private currentConditionsId: number;
  private currentFavoriteId: number;

  constructor() {
    this.users = new Map();
    this.locations = new Map();
    this.surfConditions = new Map();
    this.favorites = new Map();
    this.currentUserId = 1;
    this.currentLocationId = 1;
    this.currentConditionsId = 1;
    this.currentFavoriteId = 1;
    
    // Initialize with global surf spot database
    this.initializeGlobalSurfSpots();
  }

  private async initializeGlobalSurfSpots() {
    // Import comprehensive global surf spot database on startup
    try {
      const { importSurfSpots } = await import('./spot-imports.js');
      await importSurfSpots();
      
      // Initialize comprehensive NOAA network
      const { fetchAllNOAAStations } = await import('./noaa-integration.js');
      const noaaStations = await fetchAllNOAAStations();
      console.log(`🌊 Connected to ${noaaStations.length} NOAA monitoring stations`);
      
      // Expand coverage with comprehensive surf spots using NOAA network
      const { importComprehensiveSurfSpots } = await import('./comprehensive-spot-expansion');
      await importComprehensiveSurfSpots(this);
      
    } catch (error) {
      console.error('Failed to import global surf spots and NOAA data:', error);
      // Fall back to basic locations if import fails
      this.seedBasicLocations();
    }
  }

  private seedBasicLocations() {
    // Fallback basic locations if global import fails
    const basicLocations: Omit<Location, 'id'>[] = [
      { name: "Malibu", city: "Malibu", country: "USA", latitude: "34.0259", longitude: "-118.7798", isCoastal: true },
      { name: "Cocoa Beach", city: "Cocoa Beach", country: "USA", latitude: "28.3200", longitude: "-80.6077", isCoastal: true },
      { name: "Waikiki Beach", city: "Honolulu", country: "USA", latitude: "21.2777", longitude: "-157.8340", isCoastal: true },
    ];

    basicLocations.forEach(location => {
      const id = this.currentLocationId++;
      this.locations.set(id, { ...location, id });
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getLocation(id: number): Promise<Location | undefined> {
    return this.locations.get(id);
  }

  async getLocationByCoords(lat: number, lng: number): Promise<Location | undefined> {
    const tolerance = 0.1; // roughly 11km
    return Array.from(this.locations.values()).find(location => {
      const latDiff = Math.abs(parseFloat(location.latitude) - lat);
      const lngDiff = Math.abs(parseFloat(location.longitude) - lng);
      return latDiff <= tolerance && lngDiff <= tolerance;
    });
  }

  async getAllLocations(): Promise<Location[]> {
    return Array.from(this.locations.values());
  }

  async searchLocations(query: string): Promise<Location[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.locations.values()).filter(location =>
      location.name.toLowerCase().includes(lowerQuery) ||
      location.city.toLowerCase().includes(lowerQuery) ||
      location.country.toLowerCase().includes(lowerQuery)
    );
  }

  async createLocation(insertLocation: InsertLocation): Promise<Location> {
    const id = this.currentLocationId++;
    const location: Location = { 
      ...insertLocation, 
      id,
      isCoastal: insertLocation.isCoastal ?? true
    };
    this.locations.set(id, location);
    return location;
  }

  async getSurfConditions(locationId: number): Promise<SurfConditions | undefined> {
    return Array.from(this.surfConditions.values()).find(
      conditions => conditions.locationId === locationId
    );
  }

  async createSurfConditions(insertConditions: InsertSurfConditions): Promise<SurfConditions> {
    const id = this.currentConditionsId++;
    const conditions: SurfConditions = {
      id,
      locationId: insertConditions.locationId,
      waveHeight: insertConditions.waveHeight ?? null,
      wavePeriod: insertConditions.wavePeriod ?? null,
      waveDirection: insertConditions.waveDirection ?? null,
      windSpeed: insertConditions.windSpeed ?? null,
      windDirection: insertConditions.windDirection ?? null,
      windGusts: insertConditions.windGusts ?? null,
      tideHeight: insertConditions.tideHeight ?? null,
      tideStatus: insertConditions.tideStatus ?? null,
      waterTemp: insertConditions.waterTemp ?? null,
      visibility: insertConditions.visibility ?? null,
      uvIndex: insertConditions.uvIndex ?? null,
      sunrise: insertConditions.sunrise ?? null,
      sunset: insertConditions.sunset ?? null,
      lastUpdated: new Date(),
    };
    this.surfConditions.set(id, conditions);
    return conditions;
  }

  async updateSurfConditions(locationId: number, updateData: Partial<InsertSurfConditions>): Promise<SurfConditions | undefined> {
    const existing = await this.getSurfConditions(locationId);
    if (!existing) return undefined;

    const updated: SurfConditions = {
      ...existing,
      ...updateData,
      lastUpdated: new Date(),
    };
    
    this.surfConditions.set(existing.id, updated);
    return updated;
  }

  async getUserFavorites(userId: number): Promise<Location[]> {
    const userFavorites = Array.from(this.favorites.values()).filter(
      favorite => favorite.userId === userId
    );
    
    const locations: Location[] = [];
    for (const favorite of userFavorites) {
      const location = this.locations.get(favorite.locationId);
      if (location) {
        locations.push(location);
      }
    }
    
    return locations;
  }

  async addFavorite(insertFavorite: InsertFavorite): Promise<Favorite> {
    const id = this.currentFavoriteId++;
    const favorite: Favorite = {
      id,
      userId: insertFavorite.userId,
      locationId: insertFavorite.locationId,
      addedAt: new Date(),
    };
    this.favorites.set(id, favorite);
    return favorite;
  }

  async removeFavorite(userId: number, locationId: number): Promise<boolean> {
    const favorite = Array.from(this.favorites.values()).find(
      f => f.userId === userId && f.locationId === locationId
    );
    
    if (favorite) {
      this.favorites.delete(favorite.id);
      return true;
    }
    
    return false;
  }

  async isFavorite(userId: number, locationId: number): Promise<boolean> {
    return Array.from(this.favorites.values()).some(
      favorite => favorite.userId === userId && favorite.locationId === locationId
    );
  }
}

export const storage = new MemStorage();
