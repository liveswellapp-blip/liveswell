import { users, locations, surfConditions, favorites, userProfiles, notificationSettings, pushSubscriptions, userAlerts, alertTriggerLog, agentConversations, agentSmsThreads, verifiedPhones as verifiedPhonesTable, smsRateLimits, apnsDeviceTokens, fcmDeviceTokens, type User, type InsertUser, type UpsertUser, type Location, type InsertLocation, type SurfConditions, type InsertSurfConditions, type Favorite, type InsertFavorite, type UserProfile, type InsertUserProfile, type UpdateUserProfile, type NotificationSettings, type InsertNotificationSettings, type UpdateNotificationSettings, type PushSubscription, type InsertPushSubscription, type UserAlert, type InsertUserAlert, type UpdateUserAlert, type AlertTriggerLog, type AgentConversation, type AgentSmsThread, type ApnsDeviceToken, type FcmDeviceToken } from "@shared/schema";
import { db } from "./db";
import { eq, and, like, or, sql, ne, gt } from "drizzle-orm";

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
  getActiveDailyReportAlerts(): Promise<(UserAlert & { locationName: string; userEmail: string | null })[]>;
  getActiveConditionAlerts(): Promise<(UserAlert & { locationName: string; userEmail: string | null })[]>;
  updateAlertLastFiredAt(id: number, firedAt: Date): Promise<void>;
  logAlertTrigger(alertId: number, triggerReason: string, conditionSnapshot?: any): Promise<AlertTriggerLog>;
  getAlertTriggerLog(alertId: number, userId: string, limit?: number): Promise<AlertTriggerLog[]>;
  getRecentAlertTriggerLogs(userId: string, limit?: number): Promise<(AlertTriggerLog & { alertType: string; locationName: string; locationCity: string; alertLabel: string | null })[]>;
  /**
   * Removes 'email' from the alert's deliveryChannels for the given alert,
   * but only if the alert belongs to a user whose email matches tokenEmail.
   * Returns 'ok' on success, 'not_found' when the alertId doesn't exist,
   * and 'email_mismatch' when the token email doesn't match the user's email.
   * If 'email' was the only channel the alert is also deactivated.
   */
  disableEmailForAlert(alertId: number, tokenEmail: string): Promise<'ok' | 'not_found' | 'email_mismatch'>;

  /**
   * Re-adds 'sms' to the deliveryChannels of all alerts for the given user
   * that have smsOptedOut=true, and clears the smsOptedOut flag.
   * Returns the number of alerts that were re-enabled.
   */
  reenableSmsForUser(userId: string): Promise<number>;

  // Agent conversation history
  getAgentHistory(userId: string): Promise<AgentConversation[]>;
  addAgentMessage(userId: string, role: 'user' | 'assistant', content: string): Promise<AgentConversation>;
  clearAgentHistory(userId: string): Promise<void>;

  /**
   * Checks whether the given user/phone is within the inbound SMS rate limit
   * (10 requests per 10 minutes). If within the limit, records the request and
   * returns true. If over the limit, returns false without inserting.
   */
  checkAndRecordInboundSmsRateLimit(userId: string, phone: string): Promise<boolean>;

  // FCM Device Tokens (native Android)
  getFcmDeviceTokens(userId: string): Promise<FcmDeviceToken[]>;
  addFcmDeviceToken(userId: string, deviceToken: string): Promise<FcmDeviceToken>;
  removeFcmDeviceToken(userId: string, deviceToken: string): Promise<boolean>;
  removeAllUserFcmDeviceTokens(userId: string): Promise<boolean>;
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

  // ─── APNs Device Tokens ─────────────────────────────────────────────────────

  async getApnsDeviceTokens(userId: string): Promise<ApnsDeviceToken[]> {
    return db.select().from(apnsDeviceTokens).where(eq(apnsDeviceTokens.userId, userId));
  }

  async addApnsDeviceToken(userId: string, deviceToken: string): Promise<ApnsDeviceToken> {
    // Upsert: delete any existing row with the same token, then insert fresh
    await db.delete(apnsDeviceTokens).where(
      and(eq(apnsDeviceTokens.userId, userId), eq(apnsDeviceTokens.deviceToken, deviceToken))
    );
    const [row] = await db.insert(apnsDeviceTokens)
      .values({ userId, deviceToken, updatedAt: new Date() })
      .returning();
    return row;
  }

  async removeApnsDeviceToken(userId: string, deviceToken: string): Promise<boolean> {
    const result = await db.delete(apnsDeviceTokens).where(
      and(eq(apnsDeviceTokens.userId, userId), eq(apnsDeviceTokens.deviceToken, deviceToken))
    );
    return (result.rowCount ?? 0) > 0;
  }

  async removeAllUserApnsDeviceTokens(userId: string): Promise<boolean> {
    const result = await db.delete(apnsDeviceTokens).where(eq(apnsDeviceTokens.userId, userId));
    return (result.rowCount ?? 0) > 0;
  }

  // ─── FCM Device Tokens ──────────────────────────────────────────────────────

  async getFcmDeviceTokens(userId: string): Promise<FcmDeviceToken[]> {
    return db.select().from(fcmDeviceTokens).where(eq(fcmDeviceTokens.userId, userId));
  }

  async addFcmDeviceToken(userId: string, deviceToken: string): Promise<FcmDeviceToken> {
    // Upsert: delete any existing row with the same token, then insert fresh
    await db.delete(fcmDeviceTokens).where(
      and(eq(fcmDeviceTokens.userId, userId), eq(fcmDeviceTokens.deviceToken, deviceToken))
    );
    const [row] = await db.insert(fcmDeviceTokens)
      .values({ userId, deviceToken, updatedAt: new Date() })
      .returning();
    return row;
  }

  async removeFcmDeviceToken(userId: string, deviceToken: string): Promise<boolean> {
    const result = await db.delete(fcmDeviceTokens).where(
      and(eq(fcmDeviceTokens.userId, userId), eq(fcmDeviceTokens.deviceToken, deviceToken))
    );
    return (result.rowCount ?? 0) > 0;
  }

  async removeAllUserFcmDeviceTokens(userId: string): Promise<boolean> {
    const result = await db.delete(fcmDeviceTokens).where(eq(fcmDeviceTokens.userId, userId));
    return (result.rowCount ?? 0) > 0;
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
        phoneVerified: userAlerts.phoneVerified,
        active: userAlerts.active,
        thresholds: userAlerts.thresholds,
        lastFiredAt: userAlerts.lastFiredAt,
        cooldownHours: userAlerts.cooldownHours,
        emailUnsubscribed: userAlerts.emailUnsubscribed,
        smsOptedOut: userAlerts.smsOptedOut,
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

  async getUserAlertById(id: number, userId: string): Promise<UserAlert | undefined> {
    const [result] = await db
      .select()
      .from(userAlerts)
      .where(and(eq(userAlerts.id, id), eq(userAlerts.userId, userId)))
      .limit(1);
    return result;
  }

  async updateUserAlert(id: number, userId: string, updates: UpdateUserAlert): Promise<UserAlert | undefined> {
    // Auto-clear unsubscribed flags when the corresponding channel is re-added.
    const hasEmail = Array.isArray(updates.deliveryChannels) && updates.deliveryChannels.includes('email');
    const hasSms   = Array.isArray(updates.deliveryChannels) && updates.deliveryChannels.includes('sms');
    const extraUpdates = {
      ...(hasEmail ? { emailUnsubscribed: false } : {}),
      ...(hasSms   ? { smsOptedOut: false }       : {}),
    };
    const [result] = await db
      .update(userAlerts)
      .set({ ...updates, ...extraUpdates, updatedAt: new Date() })
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
        phoneVerified: userAlerts.phoneVerified,
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
        phoneVerified: userAlerts.phoneVerified,
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

  async getActiveDailyReportAlerts(): Promise<(UserAlert & { locationName: string; userEmail: string | null })[]> {
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
        phoneVerified: userAlerts.phoneVerified,
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
          eq(userAlerts.alertType, 'daily_report')
        )
      );
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
        phoneVerified: userAlerts.phoneVerified,
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

  async logAlertTrigger(alertId: number, triggerReason: string, conditionSnapshot?: any): Promise<AlertTriggerLog> {
    const [result] = await db
      .insert(alertTriggerLog)
      .values({ alertId, triggerReason, conditionSnapshot: conditionSnapshot ?? null })
      .returning();
    return result;
  }

  async getAlertTriggerLog(alertId: number, userId: string, limit: number = 10): Promise<AlertTriggerLog[]> {
    // Verify ownership via join then fetch log entries
    const ownerCheck = await db
      .select({ id: userAlerts.id })
      .from(userAlerts)
      .where(and(eq(userAlerts.id, alertId), eq(userAlerts.userId, userId)))
      .limit(1);
    if (ownerCheck.length === 0) return [];

    return db
      .select()
      .from(alertTriggerLog)
      .where(eq(alertTriggerLog.alertId, alertId))
      .orderBy(sql`${alertTriggerLog.firedAt} DESC`)
      .limit(limit);
  }

  async disableEmailForAlert(alertId: number, tokenEmail: string): Promise<'ok' | 'not_found' | 'email_mismatch'> {
    // Join with users to verify ownership by email
    const [row] = await db
      .select({
        id: userAlerts.id,
        deliveryChannels: userAlerts.deliveryChannels,
        userEmail: users.email,
      })
      .from(userAlerts)
      .innerJoin(users, eq(users.id, userAlerts.userId))
      .where(eq(userAlerts.id, alertId))
      .limit(1);

    if (!row) return 'not_found';

    // Validate the token email against the user's actual email (case-insensitive)
    if ((row.userEmail ?? '').toLowerCase() !== tokenEmail.toLowerCase()) {
      return 'email_mismatch';
    }

    const remaining = (row.deliveryChannels ?? []).filter((ch: string) => ch !== 'email');
    const nowDeactivate = remaining.length === 0;

    await db
      .update(userAlerts)
      .set({
        deliveryChannels: remaining,
        emailUnsubscribed: true,
        ...(nowDeactivate ? { active: false } : {}),
        updatedAt: new Date(),
      })
      .where(eq(userAlerts.id, alertId));

    return 'ok';
  }

  async reenableSmsForUser(userId: string): Promise<number> {
    // Find all alerts for this user that were opted out of SMS via STOP
    const optedOutAlerts = await db
      .select()
      .from(userAlerts)
      .where(and(eq(userAlerts.userId, userId), eq(userAlerts.smsOptedOut, true)));

    let count = 0;
    for (const alert of optedOutAlerts) {
      const channels = alert.deliveryChannels ?? [];
      // Re-add sms if not already present
      const updated = channels.includes("sms") ? channels : [...channels, "sms"];
      // Only reactivate the alert if it was deactivated solely because SMS was
      // the only channel (i.e. it became inactive as a direct consequence of
      // the STOP opt-out). If the user explicitly paused it before, leave it off.
      const wasDeactivatedByStop = !alert.active && channels.length === 0;
      await db
        .update(userAlerts)
        .set({
          deliveryChannels: updated,
          smsOptedOut: false,
          ...(wasDeactivatedByStop ? { active: true } : {}),
          updatedAt: new Date(),
        })
        .where(eq(userAlerts.id, alert.id));
      count++;
    }
    return count;
  }

  // ── Agent conversation history ──────────────────────────────────────────
  async getAgentHistory(userId: string): Promise<AgentConversation[]> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return db
      .select()
      .from(agentConversations)
      .where(and(eq(agentConversations.userId, userId), gt(agentConversations.createdAt, cutoff)))
      .orderBy(agentConversations.createdAt);
  }

  async addAgentMessage(userId: string, role: 'user' | 'assistant', content: string): Promise<AgentConversation> {
    const [row] = await db
      .insert(agentConversations)
      .values({ userId, role, content })
      .returning();
    return row;
  }

  async clearAgentHistory(userId: string): Promise<void> {
    await db.delete(agentConversations).where(eq(agentConversations.userId, userId));
  }

  // ── SMS thread storage (keyed by phone number) ──────────────────────────
  async getSmsThread(phone: string): Promise<{ messages: any[]; updatedAt: Date } | null> {
    const [row] = await db
      .select()
      .from(agentSmsThreads)
      .where(eq(agentSmsThreads.phoneNumber, phone))
      .limit(1);
    if (!row) return null;
    return { messages: row.messages as any[], updatedAt: row.updatedAt };
  }

  async upsertSmsThread(phone: string, messages: any[]): Promise<void> {
    const existing = await db
      .select({ phoneNumber: agentSmsThreads.phoneNumber })
      .from(agentSmsThreads)
      .where(eq(agentSmsThreads.phoneNumber, phone))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(agentSmsThreads)
        .set({ messages, updatedAt: new Date() })
        .where(eq(agentSmsThreads.phoneNumber, phone));
    } else {
      await db
        .insert(agentSmsThreads)
        .values({ phoneNumber: phone, messages, updatedAt: new Date() });
    }
  }

  async lookupUserByPhone(phone: string): Promise<string | null> {
    const [row] = await db
      .select({ userId: verifiedPhonesTable.userId })
      .from(verifiedPhonesTable)
      .where(eq(verifiedPhonesTable.phone, phone))
      .limit(1);
    return row?.userId ?? null;
  }

  // ── Inbound SMS rate limiting ────────────────────────────────────────────
  /**
   * Atomically checks and records an inbound SMS request for rate-limiting.
   *
   * Uses a per-(userId, phone) PostgreSQL advisory transaction lock so that
   * concurrent webhook calls are serialized and cannot both read count=9 and
   * both proceed past the limit. The 'inbound' limitType keeps these rows
   * separate from outbound verification rows so neither domain cross-throttles
   * the other.
   *
   * Returns true if the request is within the limit (10 req / 10 min) and the
   * attempt was recorded. Returns false if the limit has been reached.
   */
  async checkAndRecordInboundSmsRateLimit(userId: string, phone: string): Promise<boolean> {
    const LIMIT = 10;
    const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

    return await db.transaction(async (tx) => {
      // Advisory lock scoped to this transaction; serialises concurrent calls
      // for the same (userId, phone) pair so only one proceeds at a time.
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${userId}), hashtext(${phone}))`,
      );

      const windowStart = new Date(Date.now() - WINDOW_MS);

      const countResult = await tx
        .select({ count: sql<number>`count(*)` })
        .from(smsRateLimits)
        .where(
          and(
            eq(smsRateLimits.userId, userId),
            eq(smsRateLimits.phone, phone),
            eq(smsRateLimits.limitType, 'inbound'),
            gt(smsRateLimits.sentAt, windowStart),
          ),
        );

      const current = Number(countResult[0]?.count ?? 0);
      if (current >= LIMIT) {
        return false; // over limit — do not insert
      }

      await tx.insert(smsRateLimits).values({ userId, phone, limitType: 'inbound' });
      return true;
    });
  }

  async getRecentAlertTriggerLogs(userId: string, limit: number = 20): Promise<(AlertTriggerLog & { alertType: string; locationName: string; locationCity: string; alertLabel: string | null })[]> {
    const result = await db
      .select({
        id: alertTriggerLog.id,
        alertId: alertTriggerLog.alertId,
        firedAt: alertTriggerLog.firedAt,
        triggerReason: alertTriggerLog.triggerReason,
        conditionSnapshot: alertTriggerLog.conditionSnapshot,
        alertType: userAlerts.alertType,
        alertLabel: userAlerts.label,
        locationName: locations.name,
        locationCity: locations.city,
      })
      .from(alertTriggerLog)
      .innerJoin(userAlerts, eq(userAlerts.id, alertTriggerLog.alertId))
      .innerJoin(locations, eq(locations.id, userAlerts.locationId))
      .where(eq(userAlerts.userId, userId))
      .orderBy(sql`${alertTriggerLog.firedAt} DESC`)
      .limit(limit);
    return result;
  }
}

// Use database storage instead of memory storage
export const storage = new DatabaseStorage();
