import { pgTable, text, serial, integer, boolean, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
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
  userId: integer("user_id").references(() => users.id).notNull(),
  locationId: integer("location_id").references(() => locations.id).notNull(),
  addedAt: timestamp("added_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
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

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type SurfConditions = typeof surfConditions.$inferSelect;
export type InsertSurfConditions = z.infer<typeof insertSurfConditionsSchema>;
export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
