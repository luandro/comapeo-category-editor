import { boolean, integer, jsonb, pgTable, serial, text } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import type { z } from 'zod';

// Configuration models
export const configs = pgTable('configs', {
  id: serial('id').primaryKey(),
  hashId: text('hash_id').notNull().unique(),
  name: text('name').notNull(),
  version: text('version').notNull(),
  fileVersion: text('file_version').notNull(),
  buildDate: text('build_date').notNull(),
  data: jsonb('data').notNull(), // Stores the complete configuration data
  isMapeo: boolean('is_mapeo').default(false).notNull(),
  createdAt: text('created_at').notNull(),
});

export const insertConfigSchema = createInsertSchema(configs).omit({
  id: true,
});

export type InsertConfig = z.infer<typeof insertConfigSchema>;
export type Config = typeof configs.$inferSelect;

// Define the CoMapeo and Mapeo configuration file structures

// Common structures
export type OptionType = {
  label: string;
  value: string;
};

// CoMapeo specific structures
export type CoMapeoField = {
  id: string;
  name: string;
  tagKey: string;
  type: string;
  universal?: boolean;
  helperText?: string;
  options?: OptionType[];
};

export type CoMapeoPreset = {
  id: string;
  name: string;
  tags: Record<string, string>;
  color: string;
  icon: string;
  fieldRefs: string[];
  removeTags?: Record<string, string>;
  addTags?: Record<string, string>;
  geometry: string[];
};

export type CoMapeoMetadata = {
  name: string;
  version: string;
  fileVersion: string;
  description?: string;
  buildDate: string;
};

// Mapeo specific structures
export type MapeoField = {
  id: string;
  key: string;
  type: string;
  placeholder?: string;
  options?: string[];
};

export type MapeoPreset = {
  id: string;
  name: string;
  tags: Record<string, string>;
  icon: string;
  fields: string[];
  geometry: string[];
};

export type MapeoMetadata = {
  dataset_id: string;
  version: string;
  name: string;
};

// Complete configuration types
export type CoMapeoConfig = {
  fields: CoMapeoField[];
  presets: CoMapeoPreset[];
  metadata: CoMapeoMetadata;
  translations: Record<string, Record<string, string>>;
  icons: Record<string, unknown>;
};

export type MapeoConfig = {
  fields: MapeoField[];
  presets: MapeoPreset[];
  metadata: MapeoMetadata;
  translations: Record<string, Record<string, string>>;
  icons: Record<string, unknown>;
};

// Common file type for the application
export type ConfigFile = {
  name: string;
  content: string | ArrayBuffer;
  path: string;
};
