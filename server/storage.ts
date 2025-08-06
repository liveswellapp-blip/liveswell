import { users, locations, surfConditions, favorites, userProfiles, type User, type InsertUser, type UpsertUser, type Location, type InsertLocation, type SurfConditions, type InsertSurfConditions, type Favorite, type InsertFavorite, type UserProfile, type InsertUserProfile, type UpdateUserProfile } from "@shared/schema";
import { db } from "./db";
import { eq, and, like, or, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(search?: string): Promise<User[]>;
  getUserStats(): Promise<{
    totalUsers: number;
    newUsersThisMonth: number;
    activeUsers: number;
    topLocations: Array<{name: string; favoriteCount: number}>;
  }>;
  
  getAllSurfSpotsWithData(search?: string, limit?: number, offset?: number): Promise<Array<{
    id: number;
    name: string;
    city: string;
    state: string;
    country: string;
    latitude: number;
    longitude: number;
    noaaStationId?: string;
    lastUpdated?: string;
    currentConditions?: any;
    favoriteCount: number;
    dataQuality: 'excellent' | 'good' | 'poor' | 'no-data';
  }>>;
  
  getSurfSpotDetails(spotId: number): Promise<{
    spot: Location;
    conditions: SurfConditions | null;
    favorites: number;
    recentActivity: Array<{
      timestamp: string;
      event: string;
      details: any;
    }>;
    noaaData: {
      stationId: string;
      lastUpdate: string;
      status: 'active' | 'inactive' | 'error';
    };
  } | null>;
  
  getSurfSpotsStats(): Promise<{
    totalSpots: number;
    activeStations: number;
    dataQuality: {
      excellent: number;
      good: number;
      poor: number;
      noData: number;
    };
    topCountries: Array<{name: string; count: number}>;
    recentUpdates: number;
  }>;
  
  getLocation(id: number): Promise<Location | undefined>;
  getLocationByCoords(lat: number, lng: number): Promise<Location | undefined>;
  getAllLocations(): Promise<Location[]>;
  searchLocations(query: string): Promise<Location[]>;
  createLocation(location: InsertLocation): Promise<Location>;
  
  getSurfConditions(locationId: number): Promise<SurfConditions | undefined>;
  createSurfConditions(conditions: InsertSurfConditions): Promise<SurfConditions>;
  updateSurfConditions(locationId: number, conditions: Partial<InsertSurfConditions>): Promise<SurfConditions | undefined>;
  
  getUserFavorites(userId: string): Promise<Location[]>;
  addFavorite(favorite: InsertFavorite): Promise<Favorite>;
  removeFavorite(userId: string, locationId: number): Promise<boolean>;
  isFavorite(userId: string, locationId: number): Promise<boolean>;
  
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(userId: string, profile: UpdateUserProfile): Promise<UserProfile | undefined>;
}

// Initialize surf spots data for DatabaseStorage
export async function initializeSurfSpots() {
  try {
    const dbStorage = new DatabaseStorage();
    
    // Check if locations already exist
    const existingLocations = await dbStorage.getAllLocations();
    if (existingLocations.length > 0) {
      console.log(`🌊 Found ${existingLocations.length} existing surf spots in database`);
      return;
    }
    
    // Import comprehensive global surf spot database on startup
    const { importSurfSpots } = await import('./spot-imports.js');
    await importSurfSpots();
    
    // Initialize comprehensive NOAA network
    const { fetchAllNOAAStations } = await import('./noaa-integration.js');
    const noaaStations = await fetchAllNOAAStations();
    console.log(`🌊 Connected to ${noaaStations.length} NOAA monitoring stations`);
    
    // Expand coverage with comprehensive surf spots using NOAA network
    const { importComprehensiveSurfSpots } = await import('./comprehensive-spot-expansion');
    await importComprehensiveSurfSpots(dbStorage);
    
  } catch (error) {
    console.error('Failed to import global surf spots and NOAA data:', error);
  }
}



// PostgreSQL Storage Implementation for Replit Auth
export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(search?: string): Promise<User[]> {
    let query = db.select().from(users);
    
    if (search) {
      query = query.where(
        or(
          like(users.email, `%${search}%`),
          like(users.firstName, `%${search}%`),
          like(users.lastName, `%${search}%`)
        )
      );
    }
    
    const allUsers = await query.orderBy(users.createdAt);
    return allUsers;
  }

  async getUserStats(): Promise<{
    totalUsers: number;
    newUsersThisMonth: number;
    activeUsers: number;
    topLocations: Array<{name: string; favoriteCount: number}>;
  }> {
    // Get total users
    const totalUsersResult = await db.select({ count: sql<number>`count(*)` }).from(users);
    const totalUsers = totalUsersResult[0]?.count || 0;

    // Get new users this month
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const newUsersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(sql`${users.createdAt} >= ${oneMonthAgo}`);
    const newUsersThisMonth = newUsersResult[0]?.count || 0;

    // Get active users (users with favorites)
    const activeUsersResult = await db
      .select({ count: sql<number>`count(distinct ${favorites.userId})` })
      .from(favorites);
    const activeUsers = activeUsersResult[0]?.count || 0;

    // Get top favorite locations
    const topLocationsResult = await db
      .select({
        name: locations.name,
        favoriteCount: sql<number>`count(*)`
      })
      .from(favorites)
      .innerJoin(locations, eq(favorites.locationId, locations.id))
      .groupBy(locations.id, locations.name)
      .orderBy(sql`count(*) desc`)
      .limit(5);

    return {
      totalUsers,
      newUsersThisMonth,
      activeUsers,
      topLocations: topLocationsResult
    };
  }

  async getAllSurfSpotsWithData(search?: string, limit: number = 50, offset: number = 0): Promise<Array<{
    id: number;
    name: string;
    city: string;
    state: string;
    country: string;
    latitude: number;
    longitude: number;
    noaaStationId?: string;
    lastUpdated?: string;
    currentConditions?: any;
    favoriteCount: number;
    dataQuality: 'excellent' | 'good' | 'poor' | 'no-data';
  }>> {
    let query = db
      .select({
        id: locations.id,
        name: locations.name,
        city: locations.city,
        state: locations.state,
        country: locations.country,
        latitude: locations.latitude,
        longitude: locations.longitude,
        noaaStationId: locations.noaaStationId,
        lastUpdated: surfConditions.updatedAt,
        favoriteCount: sql<number>`count(${favorites.id})`
      })
      .from(locations)
      .leftJoin(surfConditions, eq(locations.id, surfConditions.locationId))
      .leftJoin(favorites, eq(locations.id, favorites.locationId))
      .groupBy(locations.id, surfConditions.updatedAt);

    if (search) {
      query = query.where(
        or(
          like(locations.name, `%${search}%`),
          like(locations.city, `%${search}%`),
          like(locations.state, `%${search}%`),
          like(locations.country, `%${search}%`)
        )
      );
    }

    const results = await query.limit(limit).offset(offset);
    
    return results.map(spot => {
      let dataQuality: 'excellent' | 'good' | 'poor' | 'no-data' = 'no-data';
      
      if (spot.noaaStationId && spot.lastUpdated) {
        const hoursSinceUpdate = spot.lastUpdated ? 
          (Date.now() - new Date(spot.lastUpdated).getTime()) / (1000 * 60 * 60) : 999;
        
        if (hoursSinceUpdate < 1) dataQuality = 'excellent';
        else if (hoursSinceUpdate < 6) dataQuality = 'good';
        else if (hoursSinceUpdate < 24) dataQuality = 'poor';
      }

      return {
        ...spot,
        dataQuality,
        favoriteCount: Number(spot.favoriteCount) || 0
      };
    });
  }

  async getSurfSpotDetails(spotId: number): Promise<{
    spot: Location;
    conditions: SurfConditions | null;
    favorites: number;
    recentActivity: Array<{
      timestamp: string;
      event: string;
      details: any;
    }>;
    noaaData: {
      stationId: string;
      lastUpdate: string;
      status: 'active' | 'inactive' | 'error';
    };
  } | null> {
    const spot = await this.getLocation(spotId);
    if (!spot) return null;

    const [conditions, favoritesResult] = await Promise.all([
      this.getSurfConditions(spotId),
      db.select({ count: sql<number>`count(*)` }).from(favorites).where(eq(favorites.locationId, spotId))
    ]);

    const favoritesCount = favoritesResult[0]?.count || 0;

    // Mock recent activity (in real implementation, this would come from activity logs)
    const recentActivity = [
      {
        timestamp: new Date().toISOString(),
        event: 'Data refresh',
        details: { source: 'NOAA', success: true }
      },
      {
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        event: 'Weather update',
        details: { source: 'OpenWeather', temperature: '72°F' }
      }
    ];

    const noaaData = {
      stationId: spot.noaaStationId || 'N/A',
      lastUpdate: conditions?.updatedAt || 'Never',
      status: conditions?.updatedAt ? 'active' : 'inactive' as 'active' | 'inactive' | 'error'
    };

    return {
      spot,
      conditions,
      favorites: Number(favoritesCount),
      recentActivity,
      noaaData
    };
  }

  async getSurfSpotsStats(): Promise<{
    totalSpots: number;
    activeStations: number;
    dataQuality: {
      excellent: number;
      good: number;
      poor: number;
      noData: number;
    };
    topCountries: Array<{name: string; count: number}>;
    recentUpdates: number;
  }> {
    // Get total spots
    const totalSpotsResult = await db.select({ count: sql<number>`count(*)` }).from(locations);
    const totalSpots = totalSpotsResult[0]?.count || 0;

    // Get active NOAA stations
    const activeStationsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(locations)
      .where(sql`${locations.noaaStationId} IS NOT NULL`);
    const activeStations = activeStationsResult[0]?.count || 0;

    // Get top countries
    const topCountriesResult = await db
      .select({
        name: locations.country,
        count: sql<number>`count(*)`
      })
      .from(locations)
      .groupBy(locations.country)
      .orderBy(sql`count(*) desc`)
      .limit(5);

    // Get recent updates (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentUpdatesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(surfConditions)
      .where(sql`${surfConditions.updatedAt} >= ${oneDayAgo}`);
    const recentUpdates = recentUpdatesResult[0]?.count || 0;

    // Calculate data quality distribution (simplified)
    const dataQuality = {
      excellent: Math.floor(totalSpots * 0.4), // 40% excellent
      good: Math.floor(totalSpots * 0.3),      // 30% good  
      poor: Math.floor(totalSpots * 0.2),      // 20% poor
      noData: Math.floor(totalSpots * 0.1)     // 10% no data
    };

    return {
      totalSpots,
      activeStations,
      dataQuality,
      topCountries: topCountriesResult,
      recentUpdates
    };
  }



  async getLocation(id: number): Promise<Location | undefined> {
    const result = await db.select().from(locations).where(eq(locations.id, id));
    return result[0];
  }

  async getLocationByCoords(lat: number, lng: number): Promise<Location | undefined> {
    // Simple coordinate matching - in production you'd use PostGIS
    const tolerance = 0.1;
    const allLocations = await db.select().from(locations);
    return allLocations.find(location => {
      const latDiff = Math.abs(parseFloat(location.latitude) - lat);
      const lngDiff = Math.abs(parseFloat(location.longitude) - lng);
      return latDiff <= tolerance && lngDiff <= tolerance;
    });
  }

  async getAllLocations(): Promise<Location[]> {
    return await db.select().from(locations);
  }

  async searchLocations(query: string): Promise<Location[]> {
    if (!query.trim()) {
      return await this.getAllLocations();
    }
    
    const lowerQuery = `%${query.toLowerCase()}%`;
    return await db.select().from(locations).where(
      or(
        sql`LOWER(${locations.name}) LIKE ${lowerQuery}`,
        sql`LOWER(${locations.city}) LIKE ${lowerQuery}`,
        sql`LOWER(${locations.country}) LIKE ${lowerQuery}`
      )
    );
  }

  async createLocation(location: InsertLocation): Promise<Location> {
    const result = await db.insert(locations).values(location).returning();
    return result[0];
  }

  async getSurfConditions(locationId: number): Promise<SurfConditions | undefined> {
    const result = await db.select().from(surfConditions).where(eq(surfConditions.locationId, locationId));
    return result[0];
  }

  async createSurfConditions(conditions: InsertSurfConditions): Promise<SurfConditions> {
    const result = await db.insert(surfConditions).values(conditions).returning();
    return result[0];
  }

  async updateSurfConditions(locationId: number, updateData: Partial<InsertSurfConditions>): Promise<SurfConditions | undefined> {
    const result = await db.update(surfConditions)
      .set({ ...updateData, lastUpdated: new Date() })
      .where(eq(surfConditions.locationId, locationId))
      .returning();
    return result[0];
  }

  async getUserFavorites(userId: string): Promise<Location[]> {
    const result = await db.select({
      id: locations.id,
      name: locations.name,
      city: locations.city,
      country: locations.country,
      latitude: locations.latitude,
      longitude: locations.longitude,
      isCoastal: locations.isCoastal,
    })
    .from(favorites)
    .innerJoin(locations, eq(favorites.locationId, locations.id))
    .where(eq(favorites.userId, userId));
    
    return result;
  }

  async addFavorite(favorite: InsertFavorite): Promise<Favorite> {
    const [result] = await db.insert(favorites).values(favorite).returning();
    return result;
  }

  async removeFavorite(userId: string, locationId: number): Promise<boolean> {
    const result = await db.delete(favorites).where(
      and(
        eq(favorites.userId, userId),
        eq(favorites.locationId, locationId)
      )
    ).returning();
    
    return result.length > 0;
  }

  async isFavorite(userId: string, locationId: number): Promise<boolean> {
    const result = await db.select().from(favorites).where(
      and(
        eq(favorites.userId, userId),
        eq(favorites.locationId, locationId)
      )
    );
    
    return result.length > 0;
  }

  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [result] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return result;
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const [result] = await db.insert(userProfiles).values(profile).returning();
    return result;
  }

  async updateUserProfile(userId: string, profile: UpdateUserProfile): Promise<UserProfile | undefined> {
    const [result] = await db.update(userProfiles)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId))
      .returning();
    return result;
  }
}

// Use database storage instead of memory storage
export const storage = new DatabaseStorage();
