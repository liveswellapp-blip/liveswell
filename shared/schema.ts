import { pgTable, text, serial, integer, boolean, decimal, timestamp, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from 'drizzle-orm';

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  country: text("country").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  isCoastal: boolean("is_coastal").default(true),
});

export const surfConditions = pgTable("surf_conditions", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").references(() => locations.id).notNull(),
  waveHeight: decimal("wave_height", { precision: 4, scale: 2 }),
  wavePeriod: integer("wave_period"),
  waveDirection: text("wave_direction"),
  windSpeed: decimal("wind_speed", { precision: 4, scale: 2 }),
  windDirection: text("wind_direction"),
  windGusts: decimal("wind_gusts", { precision: 4, scale: 2 }),
  tideHeight: decimal("tide_height", { precision: 4, scale: 2 }),
  tideStatus: text("tide_status"),
  waterTemp: decimal("water_temp", { precision: 4, scale: 1 }),
  visibility: decimal("visibility", { precision: 4, scale: 1 }),
  uvIndex: integer("uv_index"),
  sunrise: text("sunrise"),
  sunset: text("sunset"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  locationId: integer("location_id").references(() => locations.id).notNull(),
  addedAt: timestamp("added_at").defaultNow(),
});

export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  defaultLocation: text("default_location"),
  units: text("units").default("metric"), // metric or imperial
  language: text("language").default("en"),
  pushNotifications: boolean("push_notifications").default(true),
  emailNotifications: boolean("email_notifications").default(false),
  autoRefresh: boolean("auto_refresh").default(true),
  refreshInterval: integer("refresh_interval").default(30), // minutes
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notificationSettings = pgTable("notification_settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  smsEnabled: boolean("sms_enabled").default(false),
  phoneNumber: varchar("phone_number"),
  pushEnabled: boolean("push_enabled").default(false),
  notificationTime: text("notification_time").default("08:00"), // HH:MM format
  timezone: text("timezone").default("America/New_York"), // IANA timezone identifier
  locationId: integer("location_id").references(() => locations.id), // Location to get conditions for
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userAlerts = pgTable("user_alerts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  locationId: integer("location_id").references(() => locations.id).notNull(),
  label: text("label"),
  alertType: text("alert_type").notNull().default("daily_report"),
  deliveryChannels: text("delivery_channels").array().notNull().default(sql`ARRAY[]::text[]`),
  frequency: text("frequency").notNull().default("once_daily"),
  notificationTime: text("notification_time").notNull().default("08:00"),
  notificationTimeTwo: text("notification_time_two"),
  timezone: text("timezone").notNull().default("America/New_York"),
  phoneNumber: text("phone_number"),
  phoneVerified: boolean("phone_verified").notNull().default(false),
  active: boolean("active").notNull().default(true),
  // Condition-based alert fields
  thresholds: jsonb("thresholds"),
  lastFiredAt: timestamp("last_fired_at"),
  cooldownHours: integer("cooldown_hours").notNull().default(4),
  // Set to true when email is removed via the unsubscribe link so the UI can
  // distinguish "never had email" from "accidentally unsubscribed".
  emailUnsubscribed: boolean("email_unsubscribed").notNull().default(false),
  // Set to true when SMS is removed because the user replied STOP to a text message.
  // Lets the UI distinguish "opted out via STOP" from "SMS was never enabled".
  smsOptedOut: boolean("sms_opted_out").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const alertTriggerLog = pgTable("alert_trigger_log", {
  id: serial("id").primaryKey(),
  alertId: integer("alert_id").references(() => userAlerts.id, { onDelete: "cascade" }).notNull(),
  firedAt: timestamp("fired_at").defaultNow().notNull(),
  triggerReason: text("trigger_reason").notNull(),
  conditionSnapshot: jsonb("condition_snapshot"),
}, (table) => [index("IDX_alert_trigger_log_alert_id").on(table.alertId)]);

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  endpoint: text("endpoint").notNull(),
  p256dhKey: text("p256dh_key").notNull(),
  authKey: text("auth_key").notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const phoneVerificationTokens = pgTable("phone_verification_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  phone: text("phone").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
}, (table) => [index("IDX_phone_verification_tokens_user_phone").on(table.userId, table.phone)]);

export const verifiedPhones = pgTable("verified_phones", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  phone: text("phone").notNull(),
  verifiedAt: timestamp("verified_at").defaultNow().notNull(),
}, (table) => [index("IDX_verified_phones_user_phone").on(table.userId, table.phone)]);

export const agentConversations = pgTable("agent_conversations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  role: text("role").notNull(), // 'user' | 'assistant'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [index("IDX_agent_conversations_user_id").on(table.userId)]);

// SMS-specific conversation threads (keyed by phone number, not userId)
export const agentSmsThreads = pgTable("agent_sms_threads", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number").notNull().unique(),
  messages: jsonb("messages").notNull().default(sql`'[]'::jsonb`),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [index("IDX_agent_sms_threads_phone").on(table.phoneNumber)]);

export type AgentSmsThread = typeof agentSmsThreads.$inferSelect;

export const weatherCacheEntries = pgTable("weather_cache_entries", {
  cacheKey: varchar("cache_key").primaryKey(), // "lat.toFixed(3),lon.toFixed(3)"
  data: jsonb("data").notNull(),
  fetchedAt: timestamp("fetched_at").notNull(),
});

// APNs device tokens for native iOS push notifications
export const apnsDeviceTokens = pgTable("apns_device_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  deviceToken: text("device_token").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [index("IDX_apns_device_tokens_user_id").on(table.userId)]);

// FCM device tokens for native Android push notifications
export const fcmDeviceTokens = pgTable("fcm_device_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  deviceToken: text("device_token").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [index("IDX_fcm_device_tokens_user_id").on(table.userId)]);

export const smsRateLimits = pgTable("sms_rate_limits", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  phone: text("phone").notNull(),
  // 'outbound' = verification SMS sent by the app; 'inbound' = AI-reply webhook
  limitType: text("limit_type").notNull().default("outbound"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
}, (table) => [index("IDX_sms_rate_limits_user_phone_type_sent").on(table.userId, table.phone, table.limitType, table.sentAt)]);

export const upsertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLocationSchema = createInsertSchema(locations).omit({
  id: true,
});

export const insertSurfConditionsSchema = createInsertSchema(surfConditions).omit({
  id: true,
  lastUpdated: true,
});

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
  addedAt: true,
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export const insertNotificationSettingsSchema = createInsertSchema(notificationSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateNotificationSettingsSchema = createInsertSchema(notificationSettings).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export const insertAlertTriggerLogSchema = createInsertSchema(alertTriggerLog).omit({
  id: true,
  firedAt: true,
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type SurfConditions = typeof surfConditions.$inferSelect;
export type InsertSurfConditions = z.infer<typeof insertSurfConditionsSchema>;
export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
export const insertUserAlertSchema = createInsertSchema(userAlerts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateUserAlertSchema = createInsertSchema(userAlerts).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export type NotificationSettings = typeof notificationSettings.$inferSelect;
export type InsertNotificationSettings = z.infer<typeof insertNotificationSettingsSchema>;
export type UpdateNotificationSettings = z.infer<typeof updateNotificationSettingsSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type UserAlert = typeof userAlerts.$inferSelect;
export type InsertUserAlert = z.infer<typeof insertUserAlertSchema>;
export type UpdateUserAlert = z.infer<typeof updateUserAlertSchema>;
export type AlertTriggerLog = typeof alertTriggerLog.$inferSelect;
export type InsertAlertTriggerLog = z.infer<typeof insertAlertTriggerLogSchema>;

export type AgentConversation = typeof agentConversations.$inferSelect;
export type ApnsDeviceToken = typeof apnsDeviceTokens.$inferSelect;
export const insertApnsDeviceTokenSchema = createInsertSchema(apnsDeviceTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertApnsDeviceToken = z.infer<typeof insertApnsDeviceTokenSchema>;

export type FcmDeviceToken = typeof fcmDeviceTokens.$inferSelect;
export const insertFcmDeviceTokenSchema = createInsertSchema(fcmDeviceTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFcmDeviceToken = z.infer<typeof insertFcmDeviceTokenSchema>;
