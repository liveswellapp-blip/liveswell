import { users, locations, surfConditions, type User, type InsertUser, type Location, type InsertLocation, type SurfConditions, type InsertSurfConditions } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getLocation(id: number): Promise<Location | undefined>;
  getLocationByCoords(lat: number, lng: number): Promise<Location | undefined>;
  searchLocations(query: string): Promise<Location[]>;
  createLocation(location: InsertLocation): Promise<Location>;
  
  getSurfConditions(locationId: number): Promise<SurfConditions | undefined>;
  createSurfConditions(conditions: InsertSurfConditions): Promise<SurfConditions>;
  updateSurfConditions(locationId: number, conditions: Partial<InsertSurfConditions>): Promise<SurfConditions | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private locations: Map<number, Location>;
  private surfConditions: Map<number, SurfConditions>;
  private currentUserId: number;
  private currentLocationId: number;
  private currentConditionsId: number;

  constructor() {
    this.users = new Map();
    this.locations = new Map();
    this.surfConditions = new Map();
    this.currentUserId = 1;
    this.currentLocationId = 1;
    this.currentConditionsId = 1;
    
    // Add some default coastal locations
    this.seedDefaultLocations();
  }

  private seedDefaultLocations() {
    const defaultLocations: Omit<Location, 'id'>[] = [
      {
        name: "Malibu",
        city: "Malibu",
        country: "USA",
        latitude: "34.0259",
        longitude: "-118.7798",
        isCoastal: true,
      },
      {
        name: "Surfrider Beach",
        city: "Malibu",
        country: "USA",
        latitude: "34.0363",
        longitude: "-118.6747",
        isCoastal: true,
      },
      {
        name: "Zuma Beach",
        city: "Malibu",
        country: "USA",
        latitude: "34.0158",
        longitude: "-118.8228",
        isCoastal: true,
      },
      {
        name: "El Segundo Beach",
        city: "El Segundo",
        country: "USA",
        latitude: "33.9192",
        longitude: "-118.4165",
        isCoastal: true,
      },
    ];

    defaultLocations.forEach(location => {
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
    const location: Location = { ...insertLocation, id };
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
      ...insertConditions,
      id,
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
}

export const storage = new MemStorage();
