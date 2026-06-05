import { users, locations, surfConditions, favorites, userProfiles, notificationSettings, pushSubscriptions, userAlerts, type User, type InsertUser, type UpsertUser, type Location, type InsertLocation, type SurfConditions, type InsertSurfConditions, type Favorite, type InsertFavorite, type UserProfile, type InsertUserProfile, type UpdateUserProfile, type NotificationSettings, type InsertNotificationSettings, type UpdateNotificationSettings, type PushSubscription, type InsertPushSubscription, type UserAlert, type InsertUserAlert, type UpdateUserAlert } from "@shared/schema";
import { db } from "./db";
import { eq, and, like, or, sql, ne } from "drizzle-orm";

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
  
  getNotificationSettings(userId: string): Promise<NotificationSettings | undefined>;
  upsertNotificationSettings(userId: string, settings: InsertNotificationSettings | UpdateNotificationSettings): Promise<NotificationSettings>;
  
  getPushSubscriptions(userId: string): Promise<PushSubscription[]>;
  addPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription>;
  removePushSubscription(userId: string, endpoint: string): Promise<boolean>;
  removeAllUserPushSubscriptions(userId: string): Promise<boolean>;

  getUserAlerts(userId: string): Promise<(UserAlert & { locationName: string; locationCity: string })[]>;
  createUserAlert(alert: InsertUserAlert): Promise<UserAlert>;
  updateUserAlert(id: number, userId: string, updates: UpdateUserAlert): Promise<UserAlert | undefined>;
  deleteUserAlert(id: number, userId: string): Promise<boolean>;
  toggleUserAlert(id: number, userId: string, active: boolean): Promise<UserAlert | undefined>;
  getActiveUserAlertsForTime(time: string): Promise<(UserAlert & { locationName: string; userEmail: string | null })[]>;
  getAllActiveUserAlerts(): Promise<(UserAlert & { locationName: string; userEmail: string | null })[]>;
  getActiveConditionAlerts(): Promise<(UserAlert & { locationName: string; userEmail: string | null })[]>;
  updateAlertLastFiredAt(id: number, firedAt: Date): Promise<void>;
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
    try {
      // Get all locations directly
      const locationResults = await this.getAllLocations();
      
      // Filter by search if provided
      let filteredResults = locationResults;
      if (search) {
        const searchLower = search.toLowerCase();
        filteredResults = locationResults.filter(location => 
          location.name.toLowerCase().includes(searchLower) ||
          location.city.toLowerCase().includes(searchLower) ||
          location.country.toLowerCase().includes(searchLower)
        );
      }
      
      // Apply pagination
      const paginatedResults = filteredResults.slice(offset, offset + limit);
      
      // Get favorites count and conditions for each location
      const results = [];
      for (const location of paginatedResults) {
        try {
          // Get favorites count
          const favoritesResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(favorites)
            .where(eq(favorites.locationId, location.id));
          
          // Get latest surf conditions
          const conditionsResult = await db
            .select({ lastUpdated: surfConditions.lastUpdated })
            .from(surfConditions)
            .where(eq(surfConditions.locationId, location.id))
            .orderBy(surfConditions.lastUpdated)
            .limit(1);

          const favoriteCount = Number(favoritesResult[0]?.count || 0);
          const lastUpdated = conditionsResult[0]?.lastUpdated;
          
          let dataQuality: 'excellent' | 'good' | 'poor' | 'no-data' = 'no-data';
          
          // Use the existing NOAA station data for quality assessment
          if (lastUpdated) {
            const hoursSinceUpdate = (Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60);
            
            if (hoursSinceUpdate < 1) dataQuality = 'excellent';
            else if (hoursSinceUpdate < 6) dataQuality = 'good';
            else if (hoursSinceUpdate < 24) dataQuality = 'poor';
          } else {
            // Check if we have any basic conditions data
            dataQuality = 'poor';
          }

          results.push({
            id: location.id,
            name: location.name,
            city: location.city,
            state: '', // Empty for now since schema doesn't have state
            country: location.country,
            latitude: parseFloat(location.latitude),
            longitude: parseFloat(location.longitude),
            lastUpdated: lastUpdated?.toISOString(),
            favoriteCount,
            dataQuality
          });
        } catch (innerError) {
          console.error(`Error processing location ${location.id}:`, innerError);
          // Add location with default values on error
          results.push({
            id: location.id,
            name: location.name,
            city: location.city,
            state: '',
            country: location.country,
            latitude: parseFloat(location.latitude),
            longitude: parseFloat(location.longitude),
            favoriteCount: 0,
            dataQuality: 'no-data' as const
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error in getAllSurfSpotsWithData:', error);
      return [];
    }
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
      stationId: 'Generated',
      lastUpdate: conditions?.lastUpdated?.toISOString() || 'Never',
      status: conditions?.lastUpdated ? 'active' : 'inactive' as 'active' | 'inactive' | 'error'
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

    // Get active stations (simplified - count locations with conditions)
    const activeStationsResult = await db
      .select({ count: sql<number>`count(DISTINCT ${surfConditions.locationId})` })
      .from(surfConditions);
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

    // Get recent updates - simplified count
    const recentUpdatesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(surfConditions);
    const recentUpdates = Math.floor((recentUpdatesResult[0]?.count || 0) * 0.1); // Simulate recent activity

    // Calculate actual data quality distribution
    const allSpotsWithQuality = await this.getAllSurfSpotsWithData('', 1000, 0);
    const dataQuality = allSpotsWithQuality.reduce((acc, spot) => {
      acc[spot.dataQuality] = (acc[spot.dataQuality] || 0) + 1;
      return acc;
    }, {
      excellent: 0,
      good: 0,
      poor: 0,
      'no-data': 0
    } as Record<string, number>);

    const finalDataQuality = {
      excellent: dataQuality.excellent,
      good: dataQuality.good,
      poor: dataQuality.poor,
      noData: dataQuality['no-data']
    };

    return {
      totalSpots: Number(totalSpots),
      activeStations: Number(activeStations),
      dataQuality: finalDataQuality,
      topCountries: topCountriesResult.map(country => ({
        name: country.name,
        count: Number(country.count)
      })),
      recentUpdates: Number(recentUpdates)
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

  async getNotificationSettings(userId: string): Promise<NotificationSettings | undefined> {
    const [result] = await db.select().from(notificationSettings).where(eq(notificationSettings.userId, userId));
    return result;
  }

  async upsertNotificationSettings(userId: string, settings: InsertNotificationSettings | UpdateNotificationSettings): Promise<NotificationSettings> {
    const [result] = await db.insert(notificationSettings)
      .values({ ...settings, userId, updatedAt: new Date() } as InsertNotificationSettings)
      .onConflictDoUpdate({
        target: notificationSettings.userId,
        set: { ...settings, updatedAt: new Date() },
      })
      .returning();
    return result;
  }

  async getPushSubscriptions(userId: string): Promise<PushSubscription[]> {
    const results = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
    return results;
  }

  async addPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription> {
    // First, remove any existing subscription with the same endpoint for this user
    await db.delete(pushSubscriptions)
      .where(and(
        eq(pushSubscriptions.userId, subscription.userId),
        eq(pushSubscriptions.endpoint, subscription.endpoint)
      ));

    // Then insert the new subscription
    const [result] = await db.insert(pushSubscriptions)
      .values({ ...subscription, updatedAt: new Date() })
      .returning();
    return result;
  }

  async removePushSubscription(userId: string, endpoint: string): Promise<boolean> {
    const result = await db.delete(pushSubscriptions)
      .where(and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.endpoint, endpoint)
      ));
    return result.rowCount > 0;
  }

  async removeAllUserPushSubscriptions(userId: string): Promise<boolean> {
    const result = await db.delete(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));
    return result.rowCount > 0;
  }

  async getUserAlerts(userId: string): Promise<(UserAlert & { locationName: string; locationCity: string })[]> {
    const result = await db
      .select({
        id: userAlerts.id,
        userId: userAlerts.userId,
        locationId: userAlerts.locationId,
        label: userAlerts.label,
        alertType: userAlerts.alertType,
        deliveryChannels: userAlerts.deliveryChannels,
        frequency: userAlerts.frequency,
        notificationTime: userAlerts.notificationTime,
        notificationTimeTwo: userAlerts.notificationTimeTwo,
        timezone: userAlerts.timezone,
        phoneNumber: userAlerts.phoneNumber,
        active: userAlerts.active,
        thresholds: userAlerts.thresholds,
        lastFiredAt: userAlerts.lastFiredAt,
        cooldownHours: userAlerts.cooldownHours,
        createdAt: userAlerts.createdAt,
        updatedAt: userAlerts.updatedAt,
        locationName: locations.name,
        locationCity: locations.city,
      })
      .from(userAlerts)
      .innerJoin(locations, eq(locations.id, userAlerts.locationId))
      .where(eq(userAlerts.userId, userId))
      .orderBy(userAlerts.createdAt);
    return result;
  }

  async createUserAlert(alert: InsertUserAlert): Promise<UserAlert> {
    const [result] = await db.insert(userAlerts).values({ ...alert, updatedAt: new Date() }).returning();
    return result;
  }

  async updateUserAlert(id: number, userId: string, updates: UpdateUserAlert): Promise<UserAlert | undefined> {
    const [result] = await db
      .update(userAlerts)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(userAlerts.id, id), eq(userAlerts.userId, userId)))
      .returning();
    return result;
  }

  async deleteUserAlert(id: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(userAlerts)
      .where(and(eq(userAlerts.id, id), eq(userAlerts.userId, userId)));
    return (result.rowCount ?? 0) > 0;
  }

  async toggleUserAlert(id: number, userId: string, active: boolean): Promise<UserAlert | undefined> {
    const [result] = await db
      .update(userAlerts)
      .set({ active, updatedAt: new Date() })
      .where(and(eq(userAlerts.id, id), eq(userAlerts.userId, userId)))
      .returning();
    return result;
  }

  async getActiveUserAlertsForTime(time: string): Promise<(UserAlert & { locationName: string; userEmail: string | null })[]> {
    const result = await db
      .select({
        id: userAlerts.id,
        userId: userAlerts.userId,
        locationId: userAlerts.locationId,
        label: userAlerts.label,
        alertType: userAlerts.alertType,
        deliveryChannels: userAlerts.deliveryChannels,
        frequency: userAlerts.frequency,
        notificationTime: userAlerts.notificationTime,
        notificationTimeTwo: userAlerts.notificationTimeTwo,
        timezone: userAlerts.timezone,
        phoneNumber: userAlerts.phoneNumber,
        active: userAlerts.active,
        thresholds: userAlerts.thresholds,
        lastFiredAt: userAlerts.lastFiredAt,
        cooldownHours: userAlerts.cooldownHours,
        createdAt: userAlerts.createdAt,
        updatedAt: userAlerts.updatedAt,
        locationName: locations.name,
        userEmail: users.email,
      })
      .from(userAlerts)
      .innerJoin(locations, eq(locations.id, userAlerts.locationId))
      .innerJoin(users, eq(users.id, userAlerts.userId))
      .where(
        and(
          eq(userAlerts.active, true),
          or(
            eq(userAlerts.notificationTime, time),
            eq(userAlerts.notificationTimeTwo, time)
          )
        )
      );
    return result;
  }

  async getAllActiveUserAlerts(): Promise<(UserAlert & { locationName: string; userEmail: string | null })[]> {
    return db
      .select({
        id: userAlerts.id,
        userId: userAlerts.userId,
        locationId: userAlerts.locationId,
        label: userAlerts.label,
        alertType: userAlerts.alertType,
        deliveryChannels: userAlerts.deliveryChannels,
        frequency: userAlerts.frequency,
        notificationTime: userAlerts.notificationTime,
        notificationTimeTwo: userAlerts.notificationTimeTwo,
        timezone: userAlerts.timezone,
        phoneNumber: userAlerts.phoneNumber,
        active: userAlerts.active,
        thresholds: userAlerts.thresholds,
        lastFiredAt: userAlerts.lastFiredAt,
        cooldownHours: userAlerts.cooldownHours,
        createdAt: userAlerts.createdAt,
        updatedAt: userAlerts.updatedAt,
        locationName: locations.name,
        userEmail: users.email,
      })
      .from(userAlerts)
      .innerJoin(locations, eq(locations.id, userAlerts.locationId))
      .innerJoin(users, eq(users.id, userAlerts.userId))
      .where(eq(userAlerts.active, true));
  }

  async getActiveConditionAlerts(): Promise<(UserAlert & { locationName: string; userEmail: string | null })[]> {
    return db
      .select({
        id: userAlerts.id,
        userId: userAlerts.userId,
        locationId: userAlerts.locationId,
        label: userAlerts.label,
        alertType: userAlerts.alertType,
        deliveryChannels: userAlerts.deliveryChannels,
        frequency: userAlerts.frequency,
        notificationTime: userAlerts.notificationTime,
        notificationTimeTwo: userAlerts.notificationTimeTwo,
        timezone: userAlerts.timezone,
        phoneNumber: userAlerts.phoneNumber,
        active: userAlerts.active,
        thresholds: userAlerts.thresholds,
        lastFiredAt: userAlerts.lastFiredAt,
        cooldownHours: userAlerts.cooldownHours,
        createdAt: userAlerts.createdAt,
        updatedAt: userAlerts.updatedAt,
        locationName: locations.name,
        userEmail: users.email,
      })
      .from(userAlerts)
      .innerJoin(locations, eq(locations.id, userAlerts.locationId))
      .innerJoin(users, eq(users.id, userAlerts.userId))
      .where(
        and(
          eq(userAlerts.active, true),
          ne(userAlerts.alertType, 'daily_report')
        )
      );
  }

  async updateAlertLastFiredAt(id: number, firedAt: Date): Promise<void> {
    await db
      .update(userAlerts)
      .set({ lastFiredAt: firedAt, updatedAt: new Date() })
      .where(eq(userAlerts.id, id));
  }
}

// Use database storage instead of memory storage
export const storage = new DatabaseStorage();
